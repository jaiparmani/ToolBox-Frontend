import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/geist'; // self-hosted display font (registers "Geist Variable")
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();

// Register the service worker so push events work even with the tab closed.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
