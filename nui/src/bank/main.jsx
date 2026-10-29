import React from 'react';
import { createRoot } from 'react-dom/client';
import BankApp from './BankApp.jsx';
import './bank.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BankApp />
  </React.StrictMode>,
);
