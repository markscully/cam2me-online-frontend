import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { api, API_URL } from '../../lib/api';

const TIP_PRESETS = [10, 25, 50, 100];

// Componente broadcaster LiveKit (caricato dinamicamente per evitare SSR)
function BroadcasterView({ streamId, onEnd }) {
  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [facingMode, setFacingMode] = useState('user'); // 'user' = frontale, 'environment' = posteriore
  const videoRef = useRef(null);
  const currentVideoTrack = useRef(null);

  useEffect(() => {
    let lkRoom;

    async function start() {
      try {
        const { Room, createLocalTracks } = await import('livekit-client');
        const { token, livekitUrl } = await api.getBroadcasterToken(streamId);

        lkRoom = new Room();
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
      if (lkRoom) lkRoom.disconnect();
    };
  }, [streamId]);

  // Cambio camera frontale/posteriore
  async function switchCamera() {
    if (!room || !currentVideoTrack.current) return;
    try {
      const newFacing = facingMode === 'user' ? 'environment' : 'user';
      const { createLocalVideoTrack } = await import('livekit-client');

      // Ferma il track attuale
      await room.localParticipant.unpublishTrack(currentVideoTrack.current.mediaStreamTrack);
      currentVideoTrack.current.stop();

      // Crea nuovo track con la camera opposta
      const newTrack = await createLocalVideoTrack({ facingMode: newFacing });
      await room.localParticipant.publishTrack(newTrack);

      if (videoRef.current) {
        newTrack.attach(videoRef.current);
      }

      currentVideoTrack.current = newTrack;
      setFacingMode(newFacing);
    } catch (err) {
      console.error('[switchCamera]', err);
    }
  }

  async function handleEnd() {
    if (room) room.disconnect();
    await api.endStream(streamId);
    onEnd();
  }

  return (
    <div>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 600,
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
            // Adatta l'aspect ratio al video reale (verticale su mobile)
            objectFit: 'contain',
            maxHeight: '70vh'
          }}
        />

        {status === 'connecting' && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            color: '#fff', fontSize: 14
          }}>
            Connessione in corso...
          </div>
        )}

        {status === 'error' && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            color: '#ff6b6b', fontSize: 14, textAlign: 'center', padding: '1rem'
          }}>
            Errore connessione LiveKit.<br />
            Controlla i permessi della fotocamera.
          </div>
        )}

        {/* Badge LIVE */}
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

        {/* Pulsanti in overlay sul video */}
        {status === 'live' && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            display: 'flex', gap: 8
          }}>
            {/* Cambio camera — visibile solo su mobile */}
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
                cursor: 'pointer'
              }}
            >
              🔄
            </button>
            <button
              onClick={handleEnd}
              style={{
                background: '#e53935',
                border: 'none',
                color: '#fff',
                borderRadius: 6,
                padding: '8px 16px',
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
