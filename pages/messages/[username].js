// frontend/pages/messages/[username].js
// Chat privata con un utente specifico
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function MessageThread() {
  const router = useRouter();
  const { username } = router.query;
  const { user, loading } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!username || !user) return;
    loadMessages();
    // Polling ogni 5 secondi per nuovi messaggi
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [username, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/messages/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setMessages(data);
    } catch (err) {
      setError('Errore caricamento messaggi');
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/messages/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: text.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, data]);
      setText('');
    } catch (err) {
      setError(err.message || 'Errore invio');
    } finally {
      setSending(false);
    }
  }

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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link href="/messages" style={{ color: '#a78bfa', fontSize: 20, textDecoration: 'none' }}>←</Link>
          <h2 style={{ margin: 0 }}>
            Chat con{' '}
            <Link href={`/profile/${username}`} style={{ color: '#a78bfa' }}>
              @{username}
            </Link>
          </h2>
        </div>

        {error && <p className="error-text">{error}</p>}

        {/* Messaggi */}
        <div style={{
          background: '#0e0e13',
          border: '1px solid #2a2a3f',
          borderRadius: 10,
          padding: 16,
          minHeight: 400,
          maxHeight: 500,
          overflowY: 'auto',
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {messages.length === 0 && (
            <p style={{ color: '#555', textAlign: 'center', margin: 'auto' }}>
              Nessun messaggio ancora. Scrivi il primo!
            </p>
          )}

          {messages.map(msg => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  background: isMe ? '#6a3de8' : '#1a1a2e',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  maxWidth: '75%',
                  fontSize: 14,
                  lineHeight: 1.5,
                  wordBreak: 'break-word'
                }}>
                  {msg.content}
                </div>
                <span style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
                  {new Date(msg.created_at).toLocaleTimeString('it-IT', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                  {' · '}
                  {new Date(msg.created_at).toLocaleDateString('it-IT')}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Scrivi a @${username}...`}
            maxLength={1000}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#0e0e13',
              border: '1px solid #333',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14
            }}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            style={{
              background: '#6a3de8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: !text.trim() || sending ? 'not-allowed' : 'pointer',
              opacity: !text.trim() || sending ? 0.6 : 1
            }}
          >
            Invia
          </button>
        </form>

        <p style={{ fontSize: 11, color: '#444', marginTop: 6, textAlign: 'right' }}>
          {text.length}/1000
        </p>
      </div>
    </div>
  );
}
