import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

// In a real production app, this should be an environment variable. 
const clientId = "477275093563-5lhc32s82amtp198ekklvuh6nfmu8c8q.apps.googleusercontent.com"; 

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
