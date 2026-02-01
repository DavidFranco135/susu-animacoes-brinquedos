import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Removemos qualquer import de .css aqui para evitar o erro de MIME type,
// já que você usa Tailwind via CDN no index.html

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar o sistema.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
