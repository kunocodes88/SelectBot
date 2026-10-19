import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SupabaseAuthProvider } from './context/SupabaseAuthContext';

createRoot(document.getElementById('root')!).render(
  <SupabaseAuthProvider>
    <App />
  </SupabaseAuthProvider>
);
