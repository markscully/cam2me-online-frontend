import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      marginTop: '3rem',
      borderTop: '1px solid #1a1a1f',
      padding: '1.5rem 1rem',
      textAlign: 'center',
      fontSize: 12,
      color: '#444'
    }}>
      <p style={{ margin: '0 0 6px' }}>
        © {new Date().getFullYear()} Cam2Me — Tutti i diritti riservati
      </p>
      <p style={{ margin: 0 }}>
        <Link href="/disclaimer" style={{ color: '#6a3de8' }}>Disclaimer</Link>
        {' · '}
        <Link href="/disclaimer" style={{ color: '#6a3de8' }}>Termini di utilizzo</Link>
      </p>
    </footer>
  );
}
