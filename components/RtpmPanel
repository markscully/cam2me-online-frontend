// frontend/components/RtmpPanel.js
// Pannello chiave RTMP per Streamlabs/OBS — mostrato nella pagina stream al broadcaster
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function RtmpPanel({ streamId, token }) {
  const [rtmpUrl, setRtmpUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  async function generateKey() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/ingress/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stream_id: streamId })
      });
      const data = await res.json();
      if (data.rtmp_url) {
        setRtmpUrl(data.rtmp_url);
        setStreamKey(data.stream_key);
      } else {
        setError(data.error || 'Errore generazione chiave');
      }
    } catch {
      setError('Errore di rete');
    }
    setLoading(false);
  }

  function copy(text, label) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  }

  const inputStyle = {
    width: '100%', background: '#0a0a0f', border: '1px solid #2a2a3f',
    color: '#ccc', borderRadius: 6, padding: '8px 10px',
    fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box',
    marginBottom: 4
  };

  const copyBtn = (text, label) => (
    <button
      onClick={() => copy(text, label)}
      style={{
        background: copied === label ? '#1a3a1a' : '#1a1a2e',
        border: `1px solid ${copied === label ? '#4caf50' : '#444'}`,
        color: copied === label ? '#4caf50' : '#888',
        borderRadius: 6, padding: '4px 12px',
        fontSize: 12, cursor: 'pointer', marginBottom: 12
      }}
    >
      {copied === label ? '✓ Copiato' : 'Copia'}
    </button>
  );

  return (
    <div style={{
      background: '#0e0e13', border: '1px solid #2a2a3f',
      borderRadius: 10, padding: '1rem', marginTop: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
        <span style={{ fontSize: 16 }}>📡</span>
        <strong style={{ fontSize: 14 }}>Streamlabs / OBS</strong>
        <span style={{ fontSize: 12, color: '#666' }}>— trasmetti con un software esterno</span>
      </div>

      {!rtmpUrl ? (
        <>
          <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>
            Genera la chiave RTMP da incollare in Streamlabs o OBS per iniziare la diretta.
          </p>
          {error && <p style={{ color: '#e74c3c', fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <button
            onClick={generateKey}
            disabled={loading}
            style={{
              background: '#6a3de8', color: '#fff', border: 'none',
              borderRadius: 6, padding: '8px 18px', fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Generazione...' : 'Genera chiave RTMP'}
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>
            Incolla questi valori in <strong style={{ color: '#ccc' }}>Streamlabs → Impostazioni → Stream</strong> o <strong style={{ color: '#ccc' }}>OBS → Impostazioni → Stream → Personalizzato</strong>
          </p>

          <label style={{ fontSize: 12, color: '#666' }}>URL Server RTMP</label>
          <input readOnly value={rtmpUrl} style={inputStyle} />
          {copyBtn(rtmpUrl, 'url')}

          <label style={{ fontSize: 12, color: '#666' }}>Chiave Stream</label>
          <input readOnly value={streamKey} style={inputStyle} />
          {copyBtn(streamKey, 'key')}

          <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
            ⚠️ Non condividere la chiave stream — chiunque la possieda può trasmettere al posto tuo.
          </p>
        </>
      )}
    </div>
  );
}
