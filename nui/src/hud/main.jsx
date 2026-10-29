import React from 'react';
import { createRoot } from 'react-dom/client';
import HudApp from './HudApp.jsx';
import './hud.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HudApp />
  </React.StrictMode>,
);
