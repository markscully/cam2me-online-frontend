// frontend/pages/profile.js
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProfilePage() {
  const { user, token, balance } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // 'overview' | 'transactions' | 'streams'

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const [txRes, stRes] = await Promise.all([
        fetch(`${API}/api/profile/transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/profile/streams`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);
      const txData = await txRes.json();
      const stData = await stRes.json();
      setTransactions(Array.isArray(txData) ? txData : []);
      setStreams(Array.isArray(stData) ? stData : []);
    } catch (err) {
      console.error('[profile]', err);
    }
    setLoading(false);
  }

  if (!user) return null;

  const totalTipsReceived = transactions
    .filter(t => t.type === 'tip_received')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalTipsSent = transactions
    .filter(t => t.type === 'tip_sent')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const totalStreams = streams.length;

  const typeLabel = (type) => {
    const map = {
      tip_sent: { label: 'Tip inviata', color: '#e74c3c' },
      tip_received: { label: 'Tip ricevuta', color: '#4caf50' },
      purchase: { label: 'Acquisto token', color: '#4fc3f7' },
      commission: { label: 'Commissione', color: '#a78bfa' },
    };
    return map[type] || { label: type, color: '#888' };
  };

  const tabStyle = (t) => ({
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? '#a78bfa' : '#666',
    background: 'transparent',
    border: 'none',
    borderBottom: tab === t ? '2px solid #a78bfa' : '2px solid transparent',
    cursor: 'pointer',
  });

  return (
    <div>
      <Navbar />
      <div className="container" style={{ maxWidth: 720 }}>

        {/* Header profilo */}
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
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6a3de8, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0
          }}>
            {user.username[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>@{user.username}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>{user.email}</p>
            {user.role === 'admin' && (
              <span style={{
                display: 'inline-block', marginTop: 6,
                background: '#3a1a6e', color: '#a78bfa',
                fontSize: 11, fontWeight: 600, padding: '2px 8px',
                borderRadius: 4, textTransform: 'uppercase'
              }}>Admin</span>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#ffd54f' }}>
              {balance} 🪙
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>token disponibili</p>
            <a href="/tokens" style={{
              display: 'inline-block', marginTop: 8,
              background: '#6a3de8', color: '#fff',
              fontSize: 12, padding: '4px 12px', borderRadius: 6,
              textDecoration: 'none'
            }}>+ Acquista token</a>
          </div>
        </div>

        {/* Statistiche rapide */}
        <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Stream effettuati', value: totalStreams, color: '#4fc3f7' },
            { label: 'Tip ricevute', value: `${totalTipsReceived} 🪙`, color: '#4caf50' },
            { label: 'Tip inviate', value: `${totalTipsSent} 🪙`, color: '#e74c3c' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, minWidth: 140,
              background: '#0e0e13', border: '1px solid #2a2a3f',
              borderRadius: 10, padding: '1rem'
            }}>
              <p style={{ margin: 0, fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</p>
              <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tab */}
        <div style={{ borderBottom: '1px solid #2a2a3f', marginBottom: '1rem', display: 'flex' }}>
          <button style={tabStyle('overview')} onClick={() => setTab('overview')}>Panoramica</button>
          <button style={tabStyle('transactions')} onClick={() => setTab('transactions')}>Transazioni</button>
          <button style={tabStyle('streams')} onClick={() => setTab('streams')}>I miei stream</button>
        </div>

        {loading ? (
          <p style={{ color: '#666', fontSize: 13 }}>Caricamento...</p>
        ) : (
          <>
            {/* TAB PANORAMICA */}
            {tab === 'overview' && (
              <div>
                <h3 style={{ fontSize: 14, color: '#888', marginBottom: '0.75rem' }}>Ultime transazioni</h3>
                {transactions.slice(0, 5).length === 0 ? (
                  <p style={{ color: '#555', fontSize: 13 }}>Nessuna transazione ancora.</p>
                ) : transactions.slice(0, 5).map(t => {
                  const { label, color } = typeLabel(t.type);
                  const positive = Number(t.amount) > 0;
                  return (
                    <div key={t.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0', borderBottom: '1px solid #1a1a1f'
                    }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: '#ccc' }}>{t.description || label}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#555' }}>
                          {new Date(t.created_at).toLocaleString('it-IT')}
                        </p>
                      </div>
                      <span style={{ fontWeight: 700, color: positive ? '#4caf50' : '#e74c3c', fontSize: 14 }}>
                        {positive ? '+' : ''}{t.amount} 🪙
                      </span>
                    </div>
                  );
                })}
                {transactions.length > 5 && (
                  <button onClick={() => setTab('transactions')} style={{
                    background: 'transparent', border: 'none', color: '#a78bfa',
                    fontSize: 13, cursor: 'pointer', marginTop: 8
                  }}>
                    Vedi tutte ({transactions.length}) →
                  </button>
                )}

                <h3 style={{ fontSize: 14, color: '#888', margin: '1.5rem 0 0.75rem' }}>Ultimi stream</h3>
                {streams.slice(0, 3).length === 0 ? (
                  <p style={{ color: '#555', fontSize: 13 }}>Non hai ancora fatto stream.</p>
                ) : streams.slice(0, 3).map(s => (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid #1a1a1f'
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: '#ccc' }}>{s.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#555' }}>
                        {new Date(s.created_at).toLocaleDateString('it-IT')}
                        {s.category && <span style={{ color: '#6a3de8', marginLeft: 8 }}>{s.category}</span>}
                      </p>
                    </div>
                    {s.is_live && (
                      <span style={{ color: '#e53935', fontSize: 12, fontWeight: 600 }}>● LIVE</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TAB TRANSAZIONI */}
            {tab === 'transactions' && (
              <div>
                {transactions.length === 0 ? (
                  <p style={{ color: '#555', fontSize: 13 }}>Nessuna transazione ancora.</p>
                ) : transactions.map(t => {
                  const { label, color } = typeLabel(t.type);
                  const positive = Number(t.amount) > 0;
                  return (
                    <div key={t.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0', borderBottom: '1px solid #1a1a1f'
                    }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: '#ccc' }}>{t.description || label}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11 }}>
                          <span style={{ color, fontSize: 11 }}>{label}</span>
                          <span style={{ color: '#555', marginLeft: 8 }}>
                            {new Date(t.created_at).toLocaleString('it-IT')}
                          </span>
                        </p>
                      </div>
                      <span style={{ fontWeight: 700, color: positive ? '#4caf50' : '#e74c3c', fontSize: 14 }}>
                        {positive ? '+' : ''}{t.amount} 🪙
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB STREAM */}
            {tab === 'streams' && (
              <div>
                {streams.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ color: '#555', fontSize: 14 }}>Non hai ancora fatto stream.</p>
                    <a href="/" style={{ color: '#a78bfa', fontSize: 13 }}>Inizia il tuo primo stream →</a>
                  </div>
                ) : streams.map(s => (
                  <div key={s.id} style={{
                    background: '#0e0e13', border: '1px solid #2a2a3f',
                    borderRadius: 8, padding: '0.9rem 1rem',
                    marginBottom: '0.6rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{s.title}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: '#555' }}>
                        {new Date(s.created_at).toLocaleDateString('it-IT')}
                        {s.category && <span style={{ color: '#6a3de8', marginLeft: 8 }}>{s.category}</span>}
                      </p>
                    </div>
                    {s.is_live ? (
                      <span style={{ color: '#e53935', fontSize: 12, fontWeight: 600 }}>● LIVE ora</span>
                    ) : (
                      <span style={{ color: '#444', fontSize: 12 }}>Terminato</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
