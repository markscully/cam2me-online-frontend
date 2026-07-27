import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    birthdate: '',
    location: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const fileRef = useRef(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Controlla dimensione (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La foto deve essere inferiore a 5MB');
      return;
    }

    setAvatarFile(file);

    // Anteprima locale
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      // Se c'è un avatar, lo convertiamo in base64 per mandarlo al backend
      // (per ora lo passiamo come data URL — in produzione usare R2)
      let avatarUrl = null;
      if (avatarPreview) {
        avatarUrl = avatarPreview; // data URL come placeholder
      }

      const data = await api.register({ ...form, avatarUrl });
      login(data.token, data.user);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Navbar />
      <div className="form-box" style={{ maxWidth: 480 }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Crea il tuo account</h2>

        <form onSubmit={handleSubmit}>

          {/* FOTO PROFILO */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: '#1a1a1f',
                border: '2px dashed #6a3de8',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8
              }}
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="anteprima" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 36 }}>👤</span>
              }
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{ background: 'transparent', border: '1px solid #444', color: '#888', fontSize: 13, padding: '4px 12px' }}
            >
              {avatarPreview ? 'Cambia foto' : 'Aggiungi foto (opzionale)'}
            </button>
            <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>JPEG, PNG o WebP — max 5MB</p>
          </div>

          {/* USERNAME */}
          <label style={{ fontSize: 13, color: '#aaa' }}>Username *</label>
          <input
            name="username"
            placeholder="Es. mario_rossi"
            required
            value={form.username}
            onChange={handleChange}
          />

          {/* EMAIL */}
          <label style={{ fontSize: 13, color: '#aaa' }}>Email *</label>
          <input
            name="email"
            type="email"
            placeholder="la-tua@email.com"
            required
            value={form.email}
            onChange={handleChange}
          />

          {/* PASSWORD */}
          <label style={{ fontSize: 13, color: '#aaa' }}>Password * (min 8 caratteri)</label>
          <input
            name="password"
            type="password"
            placeholder="Almeno 8 caratteri"
            required
            value={form.password}
            onChange={handleChange}
          />

          {/* DATA DI NASCITA */}
          <label style={{ fontSize: 13, color: '#aaa' }}>Data di nascita</label>
          <input
            name="birthdate"
            type="date"
            value={form.birthdate}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
          />

          {/* LUOGO */}
          <label style={{ fontSize: 13, color: '#aaa' }}>Dove sei? (opzionale)</label>
          <input
            name="location"
            placeholder="Es. Milano, Roma, Palermo..."
            value={form.location}
            onChange={handleChange}
          />

          {error && <p className="error-text">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}
          >
            {busy ? 'Creazione account...' : 'Crea account gratis'}
          </button>
        </form>

        <p style={{ marginTop: '1rem', fontSize: 13, color: '#888', textAlign: 'center' }}>
          Hai già un account?{' '}
          <Link href="/login" style={{ color: '#a78bfa' }}>Accedi</Link>
        </p>
      </div>
    </div>
  );
}
