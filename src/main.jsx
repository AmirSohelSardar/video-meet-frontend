import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Buffer } from 'buffer'
import process from 'process'
import { UserProvider } from './context/UserContextApi.jsx'

// Polyfill Buffer and process for browser
window.Buffer = window.Buffer || Buffer
window.process = window.process || process
window.global = window.global || window

createRoot(document.getElementById('root')).render(
  <UserProvider>
    <App />
  </UserProvider>
)