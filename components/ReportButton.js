// frontend/components/ReportButton.js
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

const REASONS = [
  'Nudità esplicita',
  'Fumo o alcol',
  'Autolesionismo',
  'Violenza',
  'Contenuto illegale',
  'Spam o truffa',
  'Altro',
];

export default function ReportButton({ streamId, token }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function sendReport() {
    if (!reason) return setError('Seleziona un motivo');
    try {
      const res = await fetch(`${API}/api/moderation/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stream_id: streamId, reason })
      });
      const data = await res.json();
      if (data.success) { setSent(true); setTimeout(() => { setOpen(false); setSent(false); }, 2000); }
      else setError(data.error || 'Errore');
    } catch { setError('Errore di rete'); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'transparent',
          border: '1px solid #333',
          color: '#666',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        ⚑ Segnala
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#0e0e13', border: '1px solid #2a2a3f',
            borderRadius: 12, padding: '1.5rem', width: 320, maxWidth: '90vw'
          }}>
            {sent ? (
              <p style={{ textAlign: 'center', color: '#4caf50', fontSize: 15 }}>✓ Segnalazione inviata</p>
            ) : (
              <>
                <h3 style={{ margin: '0 0 1rem', fontSize: 16 }}>Segnala stream</h3>
                <p style={{ fontSize: 13, color: '#888', marginBottom: '0.75rem' }}>
                  Seleziona il motivo della segnalazione:
                </p>
                {REASONS.map(r => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => { setReason(r); setError(''); }}
                    />
                    <span style={{ fontSize: 14 }}>{r}</span>
                  </label>
                ))}
                {error && <p style={{ color: '#e74c3c', fontSize: 13, marginTop: 4 }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                  <button
                    onClick={sendReport}
                    style={{
                      flex: 1, background: '#6a3de8', color: '#fff',
                      border: 'none', borderRadius: 6, padding: '8px', cursor: 'pointer', fontSize: 14
                    }}
                  >
                    Invia segnalazione
                  </button>
                  <button
                    onClick={() => { setOpen(false); setReason(''); setError(''); }}
                    style={{
                      flex: 1, background: 'transparent', color: '#888',
                      border: '1px solid #333', borderRadius: 6, padding: '8px', cursor: 'pointer', fontSize: 14
                    }}
                  >
                    Annulla
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
