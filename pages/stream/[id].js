import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { api, API_URL } from '../../lib/api';
import ReportButton from '../../components/ReportButton';

const TIP_PRESETS = [10, 25, 50, 100];

function isTrackLive(track) {
  return Boolean(
    track &&
    track.mediaStreamTrack &&
    track.mediaStreamTrack.readyState === 'live'
  );
}

// Componente broadcaster LiveKit
function BroadcasterView({ streamId, onEnd }) {
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState('idle');
  const [facingMode, setFacingMode] = useState('user');
  const [micMuted, setMicMuted] = useState(false);
  const [micNotice, setMicNotice] = useState('');

  const videoRef = useRef(null);
  const currentVideoTrack = useRef(null);
  const currentAudioTrack = useRef(null);
  const lkRoomRef = useRef(null);

  async function attachFreshAudioTrack(room, { forceRecreate = false } = {}) {
    const { createLocalAudioTrack } = await import('livekit-client');

    if (forceRecreate && currentAudioTrack.current) {
      try {
        if (room && room.localParticipant) {
          await room.localParticipant.unpublishTrack(currentAudioTrack.current);
        }
      } catch (e) {}

      try {
        currentAudioTrack.current.stop();
      } catch (e) {}

      currentAudioTrack.current = null;
    }

    let audioTrack = currentAudioTrack.current;

    if (!isTrackLive(audioTrack)) {
      audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      });
      currentAudioTrack.current = audioTrack;

      if (room && room.localParticipant) {
        await room.localParticipant.publishTrack(audioTrack);
      }
    }

    if (audioTrack && typeof audioTrack.unmute === 'function') {
      await audioTrack.unmute();
    }

    if (audioTrack && audioTrack.mediaStreamTrack) {
      audioTrack.mediaStreamTrack.enabled = true;
    }

    return audioTrack;
  }

  useEffect(() => {
    if (!started) return;

    let cancelled = false;
    let localRoom = null;

    async function start() {
      try {
        setStatus('connecting');
        setMicNotice('');

        const {
          Room,
          createLocalVideoTrack
        } = await import('livekit-client');

        const { token, livekitUrl } =
          await api.getBroadcasterToken(streamId);

        if (cancelled) return;

        const lkRoom = new Room();
        localRoom = lkRoom;
        lkRoomRef.current = lkRoom;

        lkRoom.on('connected', () => {
          if (!cancelled) setStatus('live');
        });

        lkRoom.on('disconnected', () => {
          if (!cancelled) setStatus('ended');
        });

        await lkRoom.connect(livekitUrl, token);

        if (cancelled) {
          lkRoom.disconnect(false);
          return;
        }

        const videoTrack = await createLocalVideoTrack({ facingMode: 'user' });

        if (cancelled) {
          videoTrack.stop();
          lkRoom.disconnect(false);
          return;
        }

        await lkRoom.localParticipant.publishTrack(videoTrack);
        currentVideoTrack.current = videoTrack;

        if (videoRef.current) {
          videoTrack.attach(videoRef.current);
        }

        try {
          await attachFreshAudioTrack(lkRoom, { forceRecreate: false });
          if (!cancelled) {
            setMicMuted(false);
            setMicNotice('');
          }
        } catch (audioErr) {
          console.warn('[LiveKit audio init]', audioErr);
          if (!cancelled) {
            setMicMuted(true);
            setMicNotice(
              'Audio non attivo al momento: clicca l’icona 🎙️/🔇 per sbloccare il microfono.'
            );
          }
        }

        if (!cancelled) {
          setStatus('live');
        }
      } catch (err) {
        console.error('[LiveKit broadcaster]', err);

        if (!cancelled) {
          setStatus('error');
        }

        if (localRoom) {
          localRoom.disconnect(false);
        }
      }
    }

    start();

    return () => {
      cancelled = true;

      if (currentVideoTrack.current) {
        try {
          currentVideoTrack.current.stop();
        } catch (e) {}
        currentVideoTrack.current = null;
      }

      if (currentAudioTrack.current) {
        try {
          currentAudioTrack.current.stop();
        } catch (e) {}
        currentAudioTrack.current = null;
      }

      if (lkRoomRef.current) {
        lkRoomRef.current.disconnect(false);
        lkRoomRef.current = null;
      }
    };
  }, [streamId, started]);

  // Cambio fotocamera
  async function switchCamera() {
    if (!lkRoomRef.current || !currentVideoTrack.current) return;

    try {
      const newFacing =
        facingMode === 'user' ? 'environment' : 'user';

      const { createLocalVideoTrack } =
        await import('livekit-client');

      const oldTrack = currentVideoTrack.current;

      await lkRoomRef.current.localParticipant.unpublishTrack(oldTrack);

      oldTrack.stop();

      const newTrack = await createLocalVideoTrack({
        facingMode: newFacing
      });

      await lkRoomRef.current.localParticipant.publishTrack(newTrack);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        newTrack.attach(videoRef.current);
      }

      currentVideoTrack.current = newTrack;
      setFacingMode(newFacing);
    } catch (err) {
      console.error('[switchCamera]', err);
    }
  }

  // Attiva/disattiva microfono (e ricrea la traccia se era muta/bloccata).
  async function toggleMic() {
    try {
      setMicNotice('');

      if (!micMuted && isTrackLive(currentAudioTrack.current)) {
        await currentAudioTrack.current.mute();
        setMicMuted(true);
        return;
      }

      await attachFreshAudioTrack(lkRoomRef.current, { forceRecreate: true });
      setMicMuted(false);
    } catch (err) {
      console.error('[toggleMic]', err);
      setMicMuted(true);
      setMicNotice(
        err?.name === 'NotAllowedError'
          ? 'Permesso microfono bloccato nel browser. Controlla i permessi del sito in Chrome.'
          : 'Impossibile attivare il microfono. Verifica che non sia usato da un’altra app.'
      );
    }
  }

  // Termina definitivamente la diretta
  async function handleEnd() {
    try {
      if (lkRoomRef.current) {
        lkRoomRef.current.disconnect(true);
        lkRoomRef.current = null;
      }

      if (currentVideoTrack.current) {
        try {
          currentVideoTrack.current.stop();
        } catch (err) {
          console.warn('[video cleanup]', err);
        }
        currentVideoTrack.current = null;
      }

      if (currentAudioTrack.current) {
        try {
          currentAudioTrack.current.stop();
        } catch (err) {
          console.warn('[audio cleanup]', err);
        }
        currentAudioTrack.current = null;
      }

      await api.endStream(streamId);

      onEnd();
    } catch (err) {
      console.error('[handleEnd]', err);
    }
  }

  return (
    <div>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 560,
        minHeight: 280,
        margin: '0 auto',
        background: '#000',
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            maxHeight: '72vh',
            objectFit: 'contain',
            background: '#000'
          }}
        />

        {!started && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)'
          }}>
            <button
              type="button"
              onClick={() => setStarted(true)}
              style={{
                background: '#e53935',
                border: 'none',
                color: '#fff',
                borderRadius: 8,
                padding: '12px 22px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Avvia diretta (Video + Audio)
            </button>
          </div>
        )}

        {started && status === 'connecting' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffb74d',
            fontSize: 14,
            background: 'rgba(0,0,0,0.7)'
          }}>
            Connessione in corso...
          </div>
        )}

        {started && status === 'error' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff6b6b',
            fontSize: 14,
            textAlign: 'center',
            padding: '1rem',
            background: 'rgba(0,0,0,0.8)'
          }}>
            Errore connessione LiveKit.<br />
            Controlla i permessi della fotocamera e del microfono.
          </div>
        )}

        {started && status === 'live' && (
          <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: '#e53935',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 4
          }}>
            ● LIVE
          </div>
        )}

        {started && status === 'live' && (
          <div style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            display: 'flex',
            gap: 8
          }}>
            {/* Microfono */}
            <button
              type="button"
              onClick={toggleMic}
              title={micMuted ? 'Attiva microfono' : 'Silenzia microfono'}
              style={{
                background: micMuted
                  ? 'rgba(220,50,50,0.8)'
                  : 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 18,
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              {micMuted ? '🔇' : '🎙️'}
            </button>

            {/* Cambia camera */}
            <button
              type="button"
              onClick={switchCamera}
              title={
                facingMode === 'user'
                  ? 'Passa a camera posteriore'
                  : 'Passa a camera frontale'
              }
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 18,
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              🔄
            </button>

            {/* Termina */}
            <button
              type="button"
              onClick={handleEnd}
              style={{
                background: '#c62828',
                border: 'none',
                color: '#fff',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Termina stream
            </button>
          </div>
        )}
      </div>

      {micNotice && (
        <p style={{
          maxWidth: 560,
          margin: '8px auto 0',
          fontSize: 12,
          color: '#ffb74d',
          textAlign: 'center'
        }}>
          {micNotice}
        </p>
      )}
    </div>
  );
}

// Componente viewer LiveKit — solo ricezione, niente microfono/camera
function ViewerPlayer({ streamId }) {
  const [status, setStatus] = useState('connecting');
  const [muted, setMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let lkRoom;
    let cancelled = false;

    async function start() {
      try {
        const { Room } = await import('livekit-client');

        const { token, livekitUrl } =
          await api.getViewerToken(streamId);

        if (cancelled) return;

        lkRoom = new Room({
          audioCaptureDefaults: {
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false
          },
          publishDefaults: {
            simulcast: false
          }
        });

        lkRoom.on('trackSubscribed', (track) => {
          if (cancelled) return;

          if (track.kind === 'video' && videoRef.current) {
            track.attach(videoRef.current);
            setStatus('playing');
          }

          if (track.kind === 'audio' && audioRef.current) {
            track.attach(audioRef.current);
          }
        });

        lkRoom.on('disconnected', () => {
          if (!cancelled) setStatus('offline');
        });

        lkRoom.on('connected', () => {
          if (!cancelled) setStatus('waiting');
        });

        await lkRoom.connect(livekitUrl, token, {
          autoSubscribe: true
        });
      } catch (err) {
        console.error('[LiveKit viewer]', err);

        if (!cancelled) {
          setStatus('error');
        }
      }
    }

    start();

    return () => {
      cancelled = true;

      if (lkRoom) {
        lkRoom.disconnect();
      }
    };
  }, [streamId]);

  // Gestione fullscreen standard e WebKit.
  useEffect(() => {
    function onFsChange() {
      const fullscreenActive = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        videoRef.current?.webkitDisplayingFullscreen
      );

      setIsFullscreen(fullscreenActive);
    }

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    const video = videoRef.current;

    if (video) {
      video.addEventListener('webkitbeginfullscreen', onFsChange);
      video.addEventListener('webkitendfullscreen', onFsChange);
    }

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);

      if (video) {
        video.removeEventListener('webkitbeginfullscreen', onFsChange);
        video.removeEventListener('webkitendfullscreen', onFsChange);
      }
    };
  }, []);

  // Attiva audio dopo il clic dell'utente.
  async function enableAudio() {
    if (audioRef.current) {
      try {
        audioRef.current.muted = false;
        await audioRef.current.play();
        setMuted(false);
      } catch (err) {
        console.error('[enableAudio]', err);
      }
    }
  }

  // Fullscreen viewer.
  async function toggleFullscreen() {
    const el = containerRef.current;

    if (!el) return;

    const video = videoRef.current;

    try {
      const fullscreenElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement;

      if (fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }

        return;
      }

      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return;
      }

      if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        return;
      }

      if (video && video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
        return;
      }

      console.warn('[fullscreen] API non supportata');
    } catch (err) {
      console.error('[fullscreen]', err);
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        background: '#000',
        borderRadius: isFullscreen ? 0 : 8,
        overflow: 'hidden',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : 'auto',
        display: isFullscreen ? 'flex' : 'block',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: '100%',
          height: isFullscreen ? '100%' : 'auto',
          display: 'block',
          maxHeight: isFullscreen ? '100vh' : '72vh',
          objectFit: 'contain',
          background: '#000'
        }}
      />

      <audio
        ref={audioRef}
        autoPlay
        muted
      />

      {/* Pulsanti sovrapposti */}
      {status === 'playing' && (
        <div style={{
          position: 'absolute',
          bottom: 14,
          right: 14,
          display: 'flex',
          gap: 8,
          zIndex: 10
        }}>
          {/* Audio */}
          <button
            type="button"
            onClick={muted ? enableAudio : () => {
              if (audioRef.current) {
                audioRef.current.muted = true;
              }
              setMuted(true);
            }}
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 16,
              cursor: 'pointer',
              lineHeight: 1
            }}
            title={muted ? 'Attiva audio' : 'Silenzia'}
          >
            {muted ? '🔇' : '🔊'}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 16,
              cursor: 'pointer',
              lineHeight: 1
            }}
            title={
              isFullscreen
                ? 'Esci da schermo intero'
                : 'Schermo intero'
            }
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        </div>
      )}

      {status === 'connecting' && (
        <p style={{
          color: '#ffb74d',
          fontSize: 13,
          padding: '0.5rem'
        }}>
          Connessione allo stream...
        </p>
      )}

      {status === 'waiting' && (
        <p style={{
          color: '#888',
          fontSize: 13,
          padding: '0.5rem'
        }}>
          In attesa del broadcaster...
        </p>
      )}

      {status === 'offline' && (
        <p style={{
          color: '#888',
          fontSize: 13,
          padding: '0.5rem'
        }}>
          Lo stream è terminato.
        </p>
      )}

      {status === 'error' && (
        <p className="error-text" style={{
          fontSize: 13,
          padding: '0.5rem'
        }}>
          Errore connessione.
        </p>
      )}
    </div>
  );
}

export default function StreamPage() {
  const router = useRouter();

  const { id, broadcaster: isBroadcasterParam } = router.query;

  const { user, balance, setBalanceDirect } = useAuth();

  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [viewers, setViewers] = useState(0);
  const [error, setError] = useState('');
  const [tipError, setTipError] = useState('');
  const [tipSending, setTipSending] = useState(false);
  const [chatError, setChatError] = useState('');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isBroadcaster =
    isBroadcasterParam === '1' ||
    (user && stream && stream.broadcaster === user.username);

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token')
    : null;

  // Caricamento stream e messaggi.
  useEffect(() => {
    if (!id) return;

    api.getStream(id)
      .then(s => {
        setStream(s);
        setViewers(s.viewers);
      })
      .catch(err => setError(err.message));

    api.getMessages(id)
      .then(setMessages)
      .catch(() => {});

    const interval = setInterval(() => {
      api.getStream(id)
        .then(s => {
          setStream(prev =>
            prev ? { ...prev, is_live: s.is_live } : s
          );
        })
        .catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [id]);

  // Socket.IO.
  useEffect(() => {
    if (!id || !user) return;

    const socket = io(API_URL, {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_stream', id);
    });

    socket.on('chat_message', msg => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('viewer_count', count => {
      setViewers(count);
    });

    socket.on('balance_update', ({ balance }) => {
      setBalanceDirect(balance);
    });

    socket.on('tip_error', ({ error }) => {
      setTipError(error);
      setTipSending(false);
    });

    socket.on('stream_offline', () => {
      router.push('/');
    });

    socket.on('chat_error', ({ error }) => {
      setChatError(error);
      setTimeout(() => setChatError(''), 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, [id, user, setBalanceDirect]);

  // Scroll automatico chat.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);

  // Invio messaggio chat.
  function sendMessage(e) {
    e.preventDefault();

    if (!input.trim() || !socketRef.current) return;

    socketRef.current.emit('chat_message', {
      streamId: id,
      message: input
    });

    setInput('');
  }

  // Invio token.
  function sendTip(amount) {
    if (!socketRef.current) return;

    setTipError('');
    setTipSending(true);

    socketRef.current.emit('send_tip', {
      streamId: id,
      amount
    });

    setTimeout(() => setTipSending(false), 600);
  }

  if (!stream) {
    return (
      <div>
        <Navbar />

        <div className="container">
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <div className="container">
        {error && (
          <p className="error-text">{error}</p>
        )}

        <h1 style={{
          fontSize: 20,
          margin: '0 0 4px'
        }}>
          {stream.title}
        </h1>

        <p style={{
          color: '#888',
          fontSize: 13,
          margin: '0 0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap'
        }}>
          <Link
            href={`/profile/${stream.broadcaster}`}
            style={{
              color: '#a78bfa',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            @{stream.broadcaster}
          </Link>

          {stream.category && (
            <span style={{ color: '#6a3de8' }}>
              {stream.category}
            </span>
          )}

          <span>
            &mdash; {viewers} spettatori
          </span>

          {stream.is_live && (
            <span style={{ color: '#e53935' }}>
              ● LIVE
            </span>
          )}

          {user && !isBroadcaster && (
            <ReportButton
              streamId={id}
              token={token}
            />
          )}
        </p>

        {isBroadcaster ? (
          <BroadcasterView
            streamId={id}
            onEnd={() => router.push('/')}
          />
        ) : (
          <ViewerPlayer streamId={id} />
        )}

        {/* Supporto token */}
        {user && !isBroadcaster && (
          <div className="card" style={{
            margin: '1rem 0'
          }}>
            <strong>
              Supporta il creator 🪙
            </strong>

            <p style={{
              fontSize: 12,
              color: '#888',
              margin: '4px 0 8px'
            }}>
              Saldo: {balance} token
            </p>

            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              {TIP_PRESETS.map(amount => (
                <button
                  key={amount}
                  disabled={tipSending || balance < amount}
                  onClick={() => sendTip(amount)}
                  style={{ fontSize: 13 }}
                >
                  🪙 {amount}
                </button>
              ))}
            </div>

            {tipError && (
              <p className="error-text" style={{
                fontSize: 12,
                margin: '4px 0 0'
              }}>
                {tipError}
              </p>
            )}

            {balance < 10 && (
              <p style={{
                fontSize: 12,
                color: '#666',
                marginTop: 6
              }}>
                <a
                  href="/tokens"
                  style={{ color: '#a78bfa' }}
                >
                  Acquista token →
                </a>
              </p>
            )}
          </div>
        )}

        {/* Chat */}
        <div className="chat-box">
          <div className="chat-messages">
            {messages.map(m => (
              <div
                key={m.id}
                className={`msg${m.is_tip ? ' tip' : ''}`}
              >
                {m.is_tip ? (
                  <span>
                    🪙{' '}
                    <span className="username">
                      {m.username}
                    </span>{' '}
                    {m.message}
                  </span>
                ) : (
                  <>
                    <span className="username">
                      {m.username}:{' '}
                    </span>

                    <span>
                      {m.message}
                    </span>
                  </>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {user ? (
            <>
              {chatError && (
                <p style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: 12,
                  color: '#e74c3c',
                  background: '#1a0a0a',
                  margin: 0
                }}>
                  {chatError}
                </p>
              )}

              <form
                className="chat-input"
                onSubmit={sendMessage}
              >
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Scrivi un messaggio..."
                />

                <button type="submit">
                  Invia
                </button>
              </form>
            </>
          ) : (
            <p style={{
              padding: '0.5rem',
              fontSize: 13,
              color: '#666'
            }}>
              <a
                href="/login"
                style={{ color: '#a78bfa' }}
              >
                Accedi
              </a>{' '}
              per partecipare alla chat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
