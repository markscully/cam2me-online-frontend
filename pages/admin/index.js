// frontend/pages/admin/index.js
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') { router.push('/'); return; }
    if (token) {
      fetchStats();
      fetchUsers();
    }
  }, [user, token]);

  async function fetchStats() {
    if (!token) return;
    setLoadingStats(true);
    try {
      const res = await fetch(`${API}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(res.ok ? data : null);
    } catch { 
      setMessage('Errore caricamento statistiche'); 
    }
    setLoadingStats(false);
  }

  async function fetchUsers() {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // GARANZIA: Assicuriamoci che 'data' sia un array, altrimenti mettiamo []
      setUsers(Array.isArray(data) ? data : []);
    } catch { 
      setMessage('Errore caricamento utenti'); 
      setUsers([]);
    }
    setLoadingUsers(false);
  }

  async function changeRole(userId, newRole) {
    if (!token) return;
    const label = newRole === 'admin' ? 'admin' : newRole === 'banned' ? 'bannato' : 'utente normale';
    if (!confirm(`Impostare questo utente come ${label}?`)) return;
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Ruolo aggiornato`);
        fetchUsers();
      } else setMessage(data.error || 'Errore');
    } catch { setMessage('Errore'); }
    setTimeout(() => setMessage(''), 3000);
  }

  // CONTROLLO DI SICUREZZA: se users non è un array, usiamo una lista vuota
  const safeUsers = Array.isArray(users) ? users : [];
  const filtered = safeUsers.filter(u =>
    (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  if (!user || user.role !== 'admin') return null;

  const statCard = (label, value, color = '#a78bfa') => (
    <div style={{
      background: '#0e0e13', border: '1px solid #2a2a3f',
      borderRadius: 10, padding: '1.2rem 1.5rem', flex: 1, minWidth: 140
    }}>
      <p style={{ margin: 0, fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 700, color }}>{value ?? '—'}</p>
    </div>
  );

  const roleBadge = (role) => {
    const map = {
      admin: { bg: '#3a1a6e', color: '#a78bfa', label: 'Admin' },
      banned: { bg: '#3a0a0a', color: '#e74c3c', label: 'Bannato' },
      user: { bg: '#1a1a1f', color: '#666', label: 'Utente' },
    };
    const s = map[role] || map.user;
    return (
      <span style={{
        background: s.bg, color: s.color,
        fontSize: 11, fontWeight: 600, padding: '2px 8px',
        borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5
      }}>{s.label}</span>
    );
  };

  return (
    <div>
      <Navbar />
      <div className="container" style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>🛡️ Pannello Admin</h2>
          <Link href="/admin/moderation" style={{
            background: '#1a1a2e', border: '1px solid #6a3de8',
            color: '#a78bfa', borderRadius: 6, padding: '6px 14px',
            fontSize: 13, textDecoration: 'none'
          }}>
            ⚑ Segnalazioni stream
          </Link>
        </div>

        {message && (
          <p style={{ background: '#1a1a2e', border: '1px solid #6a3de8', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14 }}>
            {message}
          </p>
        )}

        {/* STATISTICHE */}
        <h3 style={{ fontSize: 15, color: '#888', marginBottom: '0.75rem' }}>Statistiche sito</h3>
        {loadingStats ? (
          <p style={{ color: '#666', fontSize: 13 }}>Caricamento...</p>
        ) : stats && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '2rem' }}>
            {statCard('Iscritti totali', stats.total_users)}
            {statCard('Stream effettuati', stats.total_streams, '#4fc3f7')}
            {statCard('Stream attivi ora', stats.live_streams, '#e53935')}
            {statCard('Token in circolo', stats.total_tokens, '#ffd54f')}
            {statCard('Tip totali', stats.total_tips, '#81c784')}
          </div>
        )}

        {/* LISTA UTENTI */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 15, color: '#888', margin: 0 }}>Utenti ({filtered.length})</h3>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per username o email..."
            style={{
              background: '#0e0e13', border: '1px solid #2a2a3f',
              color: '#fff', borderRadius: 6, padding: '6px 12px',
              fontSize: 13, width: 240, outline: 'none'
            }}
          />
        </div>

        {loadingUsers ? (
          <p style={{ color: '#666', fontSize: 13 }}>Caricamento...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a3f', color: '#555', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Username</th>
                  <th style={{ padding: '8px 10px' }}>Email</th>
                  <th style={{ padding: '8px 10px' }}>Ruolo</th>
                  <th style={{ padding: '8px 10px' }}>Token</th>
                  <th style={{ padding: '8px 10px' }}>Iscritto il</th>
                  <th style={{ padding: '8px 10px' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1a1a1f' }}>
                    <td style={{ padding: '8px 10px', color: '#fff', fontWeight: 500 }}>@{u.username}</td>
                    <td style={{ padding: '8px 10px', color: '#666' }}>{u.email}</td>
                    <td style={{ padding: '8px 10px' }}>{roleBadge(u.role)}</td>
                    <td style={{ padding: '8px 10px', color: '#ffd54f' }}>{u.token_balance} 🪙</td>
                    <td style={{ padding: '8px 10px', color: '#555' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {u.id !== user.id && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {u.role !== 'banned' && (
                            <button onClick={() => changeRole(u.id, 'banned')} style={{
                              background: '#3a0a0a', color: '#e74c3c', border: '1px solid #e74c3c',
                              borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer'
                            }}>Banna</button>
                          )}
                          {u.role === 'banned' && (
                            <button onClick={() => changeRole(u.id, 'user')} style={{
                              background: '#0a2a0a', color: '#4caf50', border: '1px solid #4caf50',
                              borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer'
                            }}>Ripristina</button>
                          )}
                          {u.role === 'user' && (
                            <button onClick={() => changeRole(u.id, 'admin')} style={{
                              background: '#1a0a3a', color: '#a78bfa', border: '1px solid #a78bfa',
                              borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer'
                            }}>Rendi admin</button>
                          )}
                          {u.role === 'admin' && (
                            <button onClick={() => changeRole(u.id, 'user')} style={{
                              background: '#1a1a2e', color: '#888', border: '1px solid #444',
                              borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer'
                            }}>Rimuovi admin</button>
                          )}
                        </div>
                      )}
                      {u.id === user.id && <span style={{ color: '#555', fontSize: 11 }}>tu</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: '2rem' }}>Nessun utente trovato</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
