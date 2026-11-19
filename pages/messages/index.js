// frontend/pages/messages/index.js
// Lista di tutte le conversazioni
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Messages() {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API}/api/messages/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setConversations(data);
        else throw new Error(data.error);
      } catch (err) {
        setError(err.message || 'Errore caricamento');
      }
    }
    load();
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <div><Navbar />
        <div className="container"><p>Accedi per vedere i messaggi.</p></div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container" style={{ maxWidth: 700 }}>
        <h1>💬 Messaggi</h1>

        {error && <p className="error-text">{error}</p>}

        {conversations.length === 0 && (
          <p style={{ color: '#666' }}>
            Nessuna conversazione. Vai sul profilo di un broadcaster per scrivergli!
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {conversations.map(conv => (
            <Link key={conv.other_user} href={`/messages/${conv.username}`}>
              <div className="card" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}>
                {/* Avatar */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#6a3de8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0
                }}>
                  {conv.username[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>@{conv.username}</p>
                  <p style={{
                    margin: '2px 0 0',
                    fontSize: 13,
                    color: '#666',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {conv.sender_id === user.id ? 'Tu: ' : ''}{conv.content}
                  </p>
                </div>

                <span style={{ fontSize: 11, color: '#444', flexShrink: 0 }}>
                  {new Date(conv.created_at).toLocaleDateString('it-IT')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
