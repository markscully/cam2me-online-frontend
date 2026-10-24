import { AuthProvider } from '../context/AuthContext';
import '../styles/globals.css';
import '@livekit/components-styles';
import Footer from '../components/Footer';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Footer />
    </AuthProvider>
  );
}
