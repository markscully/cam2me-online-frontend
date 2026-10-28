import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { api, API_URL } from '../../lib/api';
import ReportButton from '../../components/ReportButton';

const TIP_PRESETS = [10, 25, 50, 100];

// Componente broadcaster LiveKit
function BroadcasterView({ streamId, onEnd }) {
  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [facingMode, setFacingMode] = useState('user'); // 'user' = frontale, 'environment' = posteriore
  const videoRef = useRef(null);
  const currentVideoTrack = useRef(null);
  const lkRoomRef = useRef(null);

  useEffect(() => {
    async function start() {
      try {
        const { Room, createLocalTracks } = await import('livekit-client');
        const { token, livekitUrl } = await api.getBroadcasterToken(streamId);

        const lkRoom = new Room();
        lkRoomRef.current = lkRoom;
        setRoom(lkRoom);

        lkRoom.on('connected', () => setStatus('live'));
        lkRoom.on('disconnected', () => setStatus('ended'));

        await lkRoom.connect(livekitUrl, token);

        const tracks = await createLocalTracks({
          audio: true,
          video: { facingMode: 'user' }
        });

        for (const track of tracks) {
          await lkRoom.localParticipant.publishTrack(track);
          if (track.kind === 'video') {
            currentVideoTrack.current = track;
            if (videoRef.current) track.attach(videoRef.current);
          }
        }
        setStatus('live');
      } catch (err) {
        console.error('[LiveKit broadcaster]', err);
        setStatus('error');
      }
    }

    start();

    return () => {
      if (lkRoomRef.current) lkRoomRef.current.disconnect();
    };
  }, [streamId]);

  // Cambio camera frontale ↔ posteriore
  async function switchCamera() {
    if (!lkRoomRef.current || !currentVideoTrack.current) return;
    try {
      const newFacing = facingMode === 'user' ? 'environment' : 'user';
      const { createLocalVideoTrack } = await import('livekit-client');

      // Ferma il track attuale
      currentVideoTrack.current.stop();
      await lkRoomRef.current.localParticipant.unpublishTrack(currentVideoTrack.current);

      // Crea nuovo track con la camera opposta
      const newTrack = await createLocalVideoTrack({ facingMode: newFacing });
      await lkRoomRef.current.localParticipant.publishTrack(newTrack);

      if (videoRef.current) {
        // Stacca il vecchio e attacca il nuovo
        videoRef.current.srcObject = null;
        newTrack.attach(videoRef.current);
      }

      currentVideoTrack.current = newTrack;
      setFacingMode(newFacing);
    } catch (err) {
      console.error('[switchCamera]', err);
    }
  }

  async function handleEnd() {
    if (lkRoomRef.current) lkRoomRef.current.disconnect();
    await api.endStream(streamId);
    onEnd();
  }

  return (
    <div>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 560,
        margin: '0 auto',
        background: '#000',
        borderRadius: 8,
        overflow: 'hidden',
        // Nessun aspect-ratio fisso — si adatta al video reale (verticale o orizzontale)
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

        {status === 'connecting' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffb74d', fontSize: 14, background: 'rgba(0,0,0,0.7)'
          }}>
            Connessione in corso...
          </div>
        )}

        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ff6b6b', fontSize: 14, textAlign: 'center',
            padding: '1rem', background: 'rgba(0,0,0,0.8)'
          }}>
            Errore connessione LiveKit.<br />
            Controlla i permessi della fotocamera.
          </div>
        )}

        {status === 'live' && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: '#e53935', color: '#fff',
            fontSize: 11, fontWeight: 700,
            padding: '3px 8px', borderRadius: 4
          }}>
            ● LIVE
          </div>
        )}

        {status === 'live' && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            display: 'flex', gap: 8
          }}>
            {/* Pulsante cambio camera */}
            <button
              onClick={switchCamera}
              title={facingMode === 'user' ? 'Passa a camera posteriore' : 'Passa a camera frontale'}
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
            {/* Pulsante termina stream */}
            <button
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
    </div>
  );
}

// Componente viewer LiveKit
function ViewerPlayer({ streamId }) {
  const [status, setStatus] = useState('connecting');
  const videoRef = useRef(null);

  useEffect(() => {
    let lkRoom;

    async function start() {
      try {
        const { Room } = await import('livekit-client');
        const { token, livekitUrl } = await api.getViewerToken(streamId);

        lkRoom = new Room();

        lkRoom.on('trackSubscribed', (track) => {
          if (track.kind === 'video' && videoRef.current) {
            track.attach(videoRef.current);
            setStatus('playing');
          }
        });

        lkRoom.on('disconnected', () => setStatus('offline'));
        lkRoom.on('connected', () => setStatus('waiting'));

        await lkRoom.connect(livekitUrl, token);
      } catch (err) {
        console.error('[LiveKit viewer]', err);
        setStatus('error');
      }
    }

    start();
    return () => { if (lkRoom) lkRoom.disconnect(); };
  }, [streamId]);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          maxHeight: '72vh',
          objectFit: 'contain',
          borderRadius: 8,
          background: '#000'
        }}
      />
      {status === 'connecting' && <p style={{ color: '#ffb74d', fontSize: 13 }}>Connessione allo stream...</p>}
      {status === 'waiting' && <p style={{ color: '#888', fontSize: 13 }}>In attesa del broadcaster...</p>}
      {status === 'offline' && <p style={{ color: '#888', fontSize: 13 }}>Lo stream è terminato.</p>}
      {status === 'error' && <p className="error-text" style={{ fontSize: 13 }}>Errore connessione.</p>}
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

  const isBroadcaster = isBroadcasterParam === '1' || (user && stream && stream.broadcaster === user.username);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!id) return;
    api.getStream(id).then(s => { setStream(s); setViewers(s.viewers); }).catch(err => setError(err.message));
    api.getMessages(id).then(setMessages).catch(() => {});

    const interval = setInterval(() => {
      api.getStream(id).then(s => setStream(prev => prev ? { ...prev, is_live: s.is_live } : s)).catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join_stream', id));
    socket.on('chat_message', msg => setMessages(prev => [...prev, msg]));
    socket.on('viewer_count', count => setViewers(count));
    socket.on('balance_update', ({ balance }) => setBalanceDirect(balance));
    socket.on('tip_error', ({ error }) => { setTipError(error); setTipSending(false); });
    socket.on('stream_offline', () => router.push('/'));
    socket.on('chat_error', ({ error }) => {
      setChatError(error);
      setTimeout(() => setChatError(''), 5000);
    });

    return () => socket.disconnect();
  }, [id, user, setBalanceDirect]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit('chat_message', { streamId: id, message: input });
    setInput('');
  }

  function sendTip(amount) {
    if (!socketRef.current) return;
    setTipError('');
    setTipSending(true);
    socketRef.current.emit('send_tip', { streamId: id, amount });
    setTimeout(() => setTipSending(false), 600);
  }

  if (!stream) return <div><Navbar /><div className="container"><p>Caricamento...</p></div></div>;

  return (
    <div>
      <Navbar />
      <div className="container">
        {error && <p className="error-text">{error}</p>}

        <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>{stream.title}</h1>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          @{stream.broadcaster}
          {stream.category && <span style={{ color: '#6a3de8' }}>{stream.category}</span>}
          <span>&mdash; {viewers} spettatori</span>
          {stream.is_live && <span style={{ color: '#e53935' }}>● LIVE</span>}
          {/* Pulsante segnala — visibile solo ai viewer loggati */}
          {user && !isBroadcaster && (
            <ReportButton streamId={id} token={token} />
          )}
        </p>

        {isBroadcaster ? (
          <BroadcasterView streamId={id} onEnd={() => router.push('/')} />
        ) : (
          <ViewerPlayer streamId={id} />
        )}

        {user && !isBroadcaster && (
          <div className="card" style={{ margin: '1rem 0' }}>
            <strong>Supporta il creator 🪙</strong>
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 8px' }}>Saldo: {balance} token</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {TIP_PRESETS.map(amount => (
                <button key={amount} disabled={tipSending || balance < amount} onClick={() => sendTip(amount)}
                  style={{ fontSize: 13 }}>
                  🪙 {amount}
                </button>
              ))}
            </div>
            {tipError && <p className="error-text" style={{ fontSize: 12, margin: '4px 0 0' }}>{tipError}</p>}
            {balance < 10 && (
              <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                <a href="/tokens" style={{ color: '#a78bfa' }}>Acquista token →</a>
              </p>
            )}
          </div>
        )}

        <div className="chat-box">
          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={`msg${m.is_tip ? ' tip' : ''}`}>
                {m.is_tip
                  ? <span>🪙 <span className="username">{m.username}</span> {m.message}</span>
                  : <><span className="username">{m.username}: </span><span>{m.message}</span></>
                }
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {user ? (
            <>
              {chatError && (
                <p style={{ padding: '0.4rem 0.75rem', fontSize: 12, color: '#e74c3c', background: '#1a0a0a', margin: 0 }}>
                  {chatError}
                </p>
              )}
              <form className="chat-input" onSubmit={sendMessage}>
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Scrivi un messaggio..." />
                <button type="submit">Invia</button>
              </form>
            </>
          ) : (
            <p style={{ padding: '0.5rem', fontSize: 13, color: '#666' }}>
              <a href="/login" style={{ color: '#a78bfa' }}>Accedi</a> per partecipare alla chat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
