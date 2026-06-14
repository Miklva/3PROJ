import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import axios from 'axios'
import { Capacitor } from '@capacitor/core'

if ( Capacitor.isNativePlatform() )
{
  axios.defaults.baseURL = 'http://10.0.2.2:5000'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
