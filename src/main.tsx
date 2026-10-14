import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './analytics'
import { recoverActiveTrip } from './logbook'

initAnalytics()

// Was er nog een tocht bezig toen de app werd afgesloten? Dan komt hij alsnog in het logboek.
const recovered = recoverActiveTrip()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App recovered={recovered} />
  </StrictMode>,
)
