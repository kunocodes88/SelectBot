import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SupabaseAuthProvider } from './context/SupabaseAuthContext';
import { FirebaseAuthProvider } from './context/FirebaseAuthContext';

createRoot(document.getElementById('root')!).render(
  <SupabaseAuthProvider>
    <FirebaseAuthProvider>
      <App />
    </FirebaseAuthProvider>
  </SupabaseAuthProvider>
);
