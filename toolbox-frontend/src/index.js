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
    // PUBLIC_URL is "/ToolBox-Frontend" on GitHub Pages and "" at a domain root,
    // so the worker is found (and scoped) wherever the app is hosted.
    navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/service-worker.js`).catch(() => {});
  });
}
