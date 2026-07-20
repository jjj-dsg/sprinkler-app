import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DeviceGate from './components/DeviceGate.tsx'

// Safari fires 'gesturestart' for the two-finger pinch gesture regardless of the
// viewport-meta user-scalable setting. Suppressing it is the only reliable way to stop
// page-level pinch-zoom on iOS Safari (Chrome/other engines already respect the meta tag).
document.addEventListener('gesturestart', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeviceGate>
      <App />
    </DeviceGate>
  </StrictMode>,
)
