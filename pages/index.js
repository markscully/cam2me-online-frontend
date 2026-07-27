import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const CATEGORIES = ['Tutti', 'Musica', 'Gaming', 'Arte', 'Cucina', 'Sport', 'Tecnologia', 'Chiacchiere'];

function HomePage() {
  const [streams, setStreams] = useState([]);
  const [category, setCategory] = useState('Tutti');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== 'Tutti') params.set('category', category);
    if (search) params.set('q', search);
    api.getStreams(params.toString()).then(setStreams).catch(err => setError(err.message));
  }, [category, search]);

  return (
    <div>
      <Navbar />
      <div className="container">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1.5rem 0 1rem' }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                background: category === c ? '#6a3de8' : '#1a1a1f',
                border: '1px solid #2a2a2f',
                padding: '6px 14px',
                fontSize: 13
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <input
          placeholder="Cerca stream..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320, marginBottom: '1rem' }}
        />

        {error && <p className="error-text">{error}</p>}
        {streams.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#666' }}>
            <p style={{ fontSize: 48, marginBottom: '1rem' }}>🎥</p>
            <p style={{ fontSize: 16, marginBottom: '0.5rem' }}>Nessuno stream live al momento.</p>
            <p style={{ fontSize: 13 }}>
              Sii il primo a <Link href="/create-stream" style={{ color: '#a78bfa' }}>andare live!</Link>
            </p>
          </div>
        )}

        <div className="grid">
          {streams.map(s => (
            <Link key={s.id} href={`/stream/${s.id}`}>
              <div className="card">
                <div className="card-thumb">
                  {s.avatar_url
                    ? <img src={s.avatar_url} alt={s.broadcaster} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                    : <span style={{ fontSize: 36 }}>🎥</span>
                  }
                  <span className="live-badge" style={{ position: 'absolute', top: 8, left: 8 }}>LIVE</span>
                  <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.7)', fontSize: 12, padding: '2px 8px', borderRadius: 4 }}>
                    👁 {s.viewers}
                  </span>
                </div>
                <span className="live-badge">LIVE</span>
                <h3 style={{ margin: '4px 0', fontSize: 14 }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#888' }}>@{s.broadcaster}</p>
                {s.category && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6a3de8' }}>{s.category}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function WelcomePage() {
  return (
    <div>
      <Navbar />

      {/* HERO */}
      <div style={{
        textAlign: 'center',
        padding: '80px 24px 60px',
        background: 'radial-gradient(ellipse at top, #1e1040 0%, #0f0f12 70%)'
      }}>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: 700,
          lineHeight: 1.15,
          marginBottom: 16,
          background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Benvenuto su Cam2Me
        </h1>
        <p style={{ fontSize: 18, color: '#888', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
          La piattaforma di streaming live dove puoi esprimerti liberamente,
          connetterti con il tuo pubblico e guadagnare dai tuoi fan.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register">
            <button style={{ padding: '14px 32px', fontSize: 16 }}>
              Inizia gratis
            </button>
          </Link>
          <Link href="/login">
            <button style={{ padding: '14px 32px', fontSize: 16, background: 'transparent', border: '1px solid #6a3de8', color: '#a78bfa' }}>
              Accedi
            </button>
          </Link>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
          {[
            { icon: '🎥', title: 'Streaming dal browser', desc: 'Vai live direttamente dal browser, senza installare nessun software.' },
            { icon: '💬', title: 'Chat in tempo reale', desc: 'Interagisci con il tuo pubblico durante la diretta.' },
            { icon: '🪙', title: 'Guadagna con i token', desc: 'I tuoi fan ti supportano con token. Commissione zero per i creator.' },
            { icon: '🔒', title: 'Piattaforma sicura', desc: 'Account protetti e pagamenti sicuri.' }
          ].map(f => (
            <div key={f.title} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA FINALE */}
      <div style={{
        textAlign: 'center',
        padding: '60px 24px',
        background: 'radial-gradient(ellipse at bottom, #1e1040 0%, #0f0f12 70%)'
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Pronto a iniziare?</h2>
        <p style={{ color: '#666', marginBottom: 28, fontSize: 15 }}>Crea il tuo account gratis e vai live in pochi minuti.</p>
        <Link href="/register">
          <button style={{ padding: '14px 36px', fontSize: 16 }}>
            Crea account gratis
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // Utente loggato → lista stream
  // Utente non loggato → pagina di benvenuto
  return user ? <HomePage /> : <WelcomePage />;
}
