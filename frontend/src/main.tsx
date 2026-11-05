import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { protectTranslatedText } from './utils/translationDom';
import '@fontsource/open-sans/latin-400.css';
import '@fontsource/open-sans/latin-500.css';
import '@fontsource/open-sans/latin-600.css';
import '@fontsource/open-sans/latin-700.css';
import '@fontsource/open-sans/latin-800.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/theme-dark.css';
import './styles/results.css';
import './styles/editorial.css';
import './styles/motion.css';

// Depois de um deploy, uma aba aberta pede blocos com hash antigo que não existem mais.
// Recarrega uma vez para pegar a versão nova; a trava evita laço se o bloco estiver mesmo quebrado.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'chunk-reload-at';
  try {
    const last = Number(window.sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last > 10_000) {
      event.preventDefault();
      window.sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  } catch {
    // sessionStorage indisponível: deixa o erro seguir o fluxo normal.
  }
});

const root = document.getElementById('root') as HTMLElement;
protectTranslatedText(root);

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
