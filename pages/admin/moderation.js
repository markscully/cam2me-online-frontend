// frontend/pages/admin/moderation.js
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function AdminModeration() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') { router.push('/'); return; }
    fetchReports();
  }, [user]);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/moderation/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReports(data);
    } catch { setMessage('Errore caricamento segnalazioni'); }
    setLoading(false);
  }

  async function suspendStream(streamId) {
    if (!confirm('Sospendere questo stream per 3 minuti?')) return;
    try {
      const res = await fetch(`${API}/api/moderation/suspend-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stream_id: streamId, minutes: 3 })
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      fetchReports();
    } catch { setMessage('Errore'); }
  }

  async function resolveReport(reportId) {
    try {
      await fetch(`${API}/api/moderation/resolve-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ report_id: reportId })
      });
      fetchReports();
    } catch { setMessage('Errore'); }
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div>
      <Navbar />
      <div className="form-box" style={{ maxWidth: 800 }}>
        <h2 style={{ marginBottom: '0.5rem' }}>🛡️ Moderazione Stream</h2>
        {message && (
          <p style={{ background: '#1a1a2e', border: '1px solid #6a3de8', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14 }}>
            {message}
          </p>
        )}
        {loading ? (
          <p style={{ color: '#666' }}>Caricamento...</p>
        ) : reports.length === 0 ? (
          <p style={{ color: '#666' }}>Nessuna segnalazione in sospeso ✓</p>
        ) : (
          <div>
            {reports.map(r => (
              <div key={r.id} style={{
                background: '#0e0e13',
                border: '1px solid #2a2a3f',
                borderRadius: 10,
                padding: '1rem',
                marginBottom: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
                      {r.is_live ? '🔴 LIVE' : '⚫ Offline'} — {r.stream_title}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
                      Broadcaster: <strong style={{ color: '#a78bfa' }}>{r.broadcaster}</strong>
                      {' · '}Segnalato da: {r.reporter}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#ccc' }}>
                      Motivo: <em>{r.reason}</em>
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>
                      {new Date(r.created_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => suspendStream(r.stream_id)}
                      style={{
                        background: '#c0392b', color: '#fff', border: 'none',
                        borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13
                      }}
                    >
                      Sospendi 3 min
                    </button>
                    <button
                      onClick={() => resolveReport(r.id)}
                      style={{
                        background: '#1a2a1a', color: '#4caf50', border: '1px solid #4caf50',
                        borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13
                      }}
                    >
                      Ignora
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={fetchReports}
          style={{ marginTop: '1rem', background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
        >
          ↻ Aggiorna
        </button>
      </div>
    </div>
  );
}
