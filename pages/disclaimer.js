import Navbar from '../components/Navbar';
import Link from 'next/link';

export default function Disclaimer() {
  return (
    <div>
      <Navbar />
      <div className="form-box" style={{ maxWidth: 700, textAlign: 'left' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Disclaimer</h2>
        <p style={{ fontSize: 12, color: '#666', marginBottom: '1.5rem' }}>
          Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
        </p>

        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: 15, marginBottom: '0.5rem', color: '#a78bfa' }}>Responsabilità dei Creator</h3>
          <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7 }}>
            Cam2Me è una piattaforma di streaming live che mette a disposizione degli utenti
            gli strumenti tecnici per trasmettere contenuti in diretta. Cam2Me non produce,
            non controlla e non è responsabile dei contenuti trasmessi dai creator.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: 15, marginBottom: '0.5rem', color: '#a78bfa' }}>Contenuti Vietati</h3>
          <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7 }}>
            È vietata la trasmissione di contenuti illegali, offensivi, diffamatori, violenti
            o che violino i diritti di terzi. Ogni creator è personalmente e legalmente
            responsabile dei contenuti che trasmette sulla piattaforma.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: 15, marginBottom: '0.5rem', color: '#a78bfa' }}>Limitazione di Responsabilità</h3>
          <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7 }}>
            Cam2Me declina ogni responsabilità per danni diretti o indiretti derivanti
            dall'utilizzo della piattaforma o dalla visione dei contenuti trasmessi dai creator.
            L'utente utilizza il servizio sotto la propria responsabilità.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: 15, marginBottom: '0.5rem', color: '#a78bfa' }}>Segnalazioni</h3>
          <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7 }}>
            Se ritieni che un contenuto violi le nostre linee guida o la legge,
            puoi segnalarlo contattandoci. Ci riserviamo il diritto di rimuovere
            contenuti e sospendere account che violino i presenti termini.
          </p>
        </section>

        <section>
          <h3 style={{ fontSize: 15, marginBottom: '0.5rem', color: '#a78bfa' }}>Accettazione</h3>
          <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7 }}>
            Utilizzando Cam2Me, l'utente dichiara di aver letto e accettato il presente
            disclaimer e i termini di utilizzo della piattaforma.
          </p>
        </section>

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #2a2a2f' }}>
          <Link href="/" style={{ color: '#a78bfa', fontSize: 13 }}>← Torna alla home</Link>
        </div>
      </div>
    </div>
  );
}
