import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CurrencyProvider } from './context/CurrencyContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Оборачиваем App в CurrencyProvider */}
    <CurrencyProvider>
      <GoogleOAuthProvider clientId="252544602687-r6q4n8fsmg4vlj3djke65tjgmh5mnbkc.apps.googleusercontent.com">
        <App />
      </GoogleOAuthProvider>
    </CurrencyProvider>
  </React.StrictMode>,
)