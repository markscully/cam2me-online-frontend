
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function Dashboard() {
  const { user, loading, balance } = useAuth();

  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  // Stato OBS / Streamlabs
  const [selectedStream, setSelectedStream] = useState('');
  const [rtmpData, setRtmpData] = useState(null);
  const [rtmpLoading, setRtmpLoading] = useState(false);
  const [rtmpError, setRtmpError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      try {
        const [streams, transactions] = await Promise.all([
          api.getStreams('q='),
          api.getTransactions()
        ]);

        const myStreams = streams.filter(
          s => s.broadcaster === user.username
        );

        const tipsReceived = transactions.filter(
          t => t.type === 'tip_received'
        );

        const totalTips = tipsReceived.reduce(
          (sum, t) => sum + t.amount,
          0
        );

        const tips30 = tipsReceived
          .filter(
            t => new Date(t.created_at) >
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          )
          .reduce((sum, t) => sum + t.amount, 0);

        setStats({
          myStreams,
          totalTips,
          tips30,
          tipCount: tipsReceived.length
        });
      } catch (err) {
        setError(err.message);
      }
    }

    loadStats();
  }, [user]);

  // Genera credenziali RTMP tramite LiveKit Ingress
  async function generateRtmpKey() {
    if (!selectedStream) {
      setRtmpError('Seleziona prima una diretta.');
      return;
    }

    setRtmpLoading(true);
    setRtmpError('');
    setRtmpData(null);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Sessione scaduta. Effettua nuovamente il login.');
      }

      const res = await fetch(`${API}/api/ingress/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stream_id: selectedStream
        })
      });

      const data = await res.json();

      if (!res.ok || !data.rtmp_url || !data.stream_key) {
        throw new Error(
          data.error || 'Errore durante la generazione della chiave RTMP.'
        );
      }

      setRtmpData(data);
    } catch (err) {
      setRtmpError(err.message || 'Errore di rete.');
    } finally {
      setRtmpLoading(false);
    }
  }

  // Copia URL o Stream Key
  async function copyRtmp(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);

      setTimeout(() => setCopied(''), 2000);
    } catch {
      setRtmpError('Impossibile copiare negli appunti.');
    }
  }

  if (loading) return null;

  if (!user) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <p>Accedi per vedere la tua dashboard.</p>
        </div>
      </div>
    );
  }

  const myStreams = stats?.myStreams || [];

  return (
    <div>
      <Navbar />

      <div className="container">
        <h1>Ciao, @{user.username}!</h1>

        {error && <p className="error-text">{error}</p>}

        {/* Statistiche */}
        <div className="grid" style={{ marginBottom: '2rem' }}>
          {[
            { label: 'Saldo token', value: `🪙 ${balance}` },
            { label: 'Token ricevuti (totale)', value: stats?.totalTips || 0 },
            { label: 'Token ultimi 30gg', value: stats?.tips30 || 0 },
            { label: 'Tip ricevuti', value: stats?.tipCount || 0 }
          ].map(s => (
            <div
              key={s.label}
              className="card"
              style={{ textAlign: 'center' }}
            >
              <p style={{
                fontSize: 26,
                fontWeight: 600,
                color: '#a78bfa',
                margin: '0 0 4px'
              }}>
                {s.value}
              </p>

              <p style={{
                fontSize: 12,
                color: '#888',
                margin: 0
              }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Pulsanti principali */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <Link href="/create-stream">
            <button>🎥 Vai Live</button>
          </Link>

          <Link href="/tokens">
            <button style={{
              background: '#1a1a1f',
              border: '1px solid #2a2a2f'
            }}>
              🪙 Gestisci token
            </button>
          </Link>
        </div>

        {/* Pannello OBS / Streamlabs */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>
            📡 Streaming con OBS / Streamlabs
          </h2>

          <p style={{
            color: '#888',
            fontSize: 13,
            lineHeight: 1.6
          }}>
            Trasmetti su Cam2Me utilizzando OBS Studio o Streamlabs.
            Seleziona una tua diretta e genera le credenziali RTMP
            da inserire nel software.
          </p>

          <label style={{
            display: 'block',
            color: '#aaa',
            fontSize: 13,
            marginBottom: 6
          }}>
            Seleziona la tua diretta
          </label>

          <select
            value={selectedStream}
            onChange={e => {
              setSelectedStream(e.target.value);
              setRtmpData(null);
              setRtmpError('');
              setCopied('');
            }}
            style={{
              width: '100%',
              maxWidth: 500,
              padding: 10,
              background: '#0e0e13',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: 6,
              marginBottom: 12
            }}
          >
            <option value="">Seleziona una diretta...</option>

            {myStreams.map(s => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          {stats && myStreams.length === 0 && (
            <p style={{ color: '#888', fontSize: 13 }}>
              Non hai ancora creato una diretta.
              <Link
                href="/create-stream"
                style={{ color: '#a78bfa', marginLeft: 4 }}
              >
                Creane una.
              </Link>
            </p>
          )}

          {rtmpError && (
            <p className="error-text" style={{ fontSize: 13 }}>
              {rtmpError}
            </p>
          )}

          <button
            onClick={generateRtmpKey}
            disabled={!selectedStream || rtmpLoading}
            style={{
              background: '#6a3de8',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '9px 18px',
              opacity: !selectedStream || rtmpLoading ? 0.6 : 1,
              cursor: !selectedStream || rtmpLoading
                ? 'not-allowed'
                : 'pointer'
            }}
          >
            {rtmpLoading
              ? 'Generazione in corso...'
              : 'Genera chiave RTMP'}
          </button>

          {/* Credenziali generate */}
          {rtmpData && (
            <div style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #2a2a3f'
            }}>
              <h3 style={{ fontSize: 15 }}>
                Le tue credenziali RTMP
              </h3>

              <p style={{
                color: '#888',
                fontSize: 12,
                lineHeight: 1.5
              }}>
                Inserisci questi dati in OBS Studio o Streamlabs,
                nella sezione Impostazioni → Stream → Personalizzato.
              </p>

              <label style={{
                display: 'block',
                fontSize: 12,
                color: '#aaa',
                marginBottom: 5
              }}>
                Server URL
              </label>

              <input
                readOnly
                value={rtmpData.rtmp_url}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: 10,
                  background: '#0a0a0f',
                  border: '1px solid #333',
                  color: '#ccc',
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  marginBottom: 6
                }}
              />

              <button
                onClick={() => copyRtmp(rtmpData.rtmp_url, 'url')}
                style={{ marginBottom: 16 }}
              >
                {copied === 'url' ? '✓ Copiato' : 'Copia Server URL'}
              </button>

              <label style={{
                display: 'block',
                fontSize: 12,
                color: '#aaa',
                marginBottom: 5
              }}>
                Stream Key
              </label>

              <input
                readOnly
                type="password"
                value={rtmpData.stream_key}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: 10,
                  background: '#0a0a0f',
                  border: '1px solid #333',
                  color: '#ccc',
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  marginBottom: 6
                }}
              />

              <button
                onClick={() => copyRtmp(rtmpData.stream_key, 'key')}
              >
                {copied === 'key' ? '✓ Copiata' : 'Copia Stream Key'}
              </button>

              <p style={{
                color: '#d9a441',
                fontSize: 12,
                marginTop: 14
              }}>
                ⚠️ Non condividere la Stream Key. Chiunque la possieda
                potrebbe trasmettere al posto tuo.
              </p>
            </div>
          )}
        </div>

        {/* Stream recenti */}
        <h2>I tuoi stream recenti</h2>

        {stats && myStreams.length === 0 && (
          <p style={{ color: '#666' }}>
            Non hai ancora fatto stream.{' '}
            <Link
              href="/create-stream"
              style={{ color: '#a78bfa' }}
            >
              Vai live ora!
            </Link>
          </p>
        )}

        <div className="grid">
          {myStreams.map(s => (
            <Link key={s.id} href={`/stream/${s.id}`}>
              <div className="card">
                {s.is_live && (
                  <span className="live-badge">LIVE</span>
                )}

                <p style={{
                  fontWeight: 500,
                  margin: '4px 0'
                }}>
                  {s.title}
                </p>

                {s.category && (
                  <p style={{
                    fontSize: 12,
                    color: '#6a3de8',
                    margin: 0
                  }}>
                    {s.category}
                  </p>
                )}

                {s.is_live && (
                  <p style={{
                    fontSize: 12,
                    color: '#888',
                    margin: '4px 0 0'
                  }}>
                    👁 {s.viewers} spettatori
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
