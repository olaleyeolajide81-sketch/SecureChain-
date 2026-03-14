import '../styles/globals.css';
import { StellarProvider } from '../utils/StellarContext';

function MyApp({ Component, pageProps }) {
  return (
    <StellarProvider>
      <Component {...pageProps} />
    </StellarProvider>
  );
}

export default MyApp;
