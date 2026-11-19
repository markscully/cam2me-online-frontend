// frontend/pages/profile/[username].js
// Profilo pubblico di un broadcaster
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function PublicProfile() {
  const router = useRouter();
  const { username } = router.query;
  const { user } = useAuth();

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOwnProfile = user?.username === username;

  useEffect(() => {
    if (!username) return;
    async function load() {
      try {
        const res = await fetch(`${API}/api/streams?broadcaster=${username}`);
        const data = await res.json();
        setStreams(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Errore caricamento profilo');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username]);

  const liveStreams = streams.filter(s => s.is_live);
  const pastStreams = streams.filter(s => !s.is_live);

  return (
    <div>
      <Navbar />
      <div className="container" style={{ maxWidth: 720 }}>

        {/* Header */}
        <div style={{
          background: '#0e0e13',
          border: '1px solid #2a2a3f',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6a3de8, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 700, color: '#fff', flexShrink: 0
          }}>
            {username?.[0]?.toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>@{username}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
              {streams.length} stream totali
            </p>
          </div>

          {/* Pulsanti azione */}
          {user && !isOwnProfile && (
            <Link href={`/messages/${username}`}>
              <button style={{
                background: '#6a3de8',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: 14
              }}>
                💬 Invia messaggio
              </button>
            </Link>
          )}

          {isOwnProfile && (
            <Link href="/dashome">
              <button style={{
                background: '#1a1a2e',
                color: '#a78bfa',
                border: '1px solid #2a2a3f',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: 14
              }}>
                ⚙️ Dashboard
              </button>
            </Link>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        {loading ? (
          <p style={{ color: '#666', fontSize: 13 }}>Caricamento...</p>
        ) : (
          <>
            {/* Stream in diretta */}
            {liveStreams.length > 0 && (
              <>
                <h3 style={{ color: '#e53935', marginBottom: 12 }}>● In diretta ora</h3>
                <div className="grid" style={{ marginBottom: '2rem' }}>
                  {liveStreams.map(s => (
                    <Link key={s.id} href={`/stream/${s.id}`}>
                      <div className="card" style={{ cursor: 'pointer' }}>
                        <span className="live-badge">LIVE</span>
                        <p style={{ fontWeight: 500, margin: '4px 0' }}>{s.title}</p>
                        {s.category && (
                          <p style={{ fontSize: 12, color: '#6a3de8', margin: 0 }}>{s.category}</p>
                        )}
                        <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
                          👁 {s.viewers} spettatori
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Stream passati */}
            <h3 style={{ marginBottom: 12 }}>Stream precedenti</h3>
            {pastStreams.length === 0 ? (
              <p style={{ color: '#555', fontSize: 13 }}>Nessuno stream ancora.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pastStreams.map(s => (
                  <Link key={s.id} href={`/stream/${s.id}`}>
                    <div className="card" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 500 }}>{s.title}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#555' }}>
                          {new Date(s.created_at).toLocaleDateString('it-IT')}
                          {s.category && <span style={{ color: '#6a3de8', marginLeft: 8 }}>{s.category}</span>}
                        </p>
                      </div>
                      <span style={{ color: '#444', fontSize: 12 }}>Terminato</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
