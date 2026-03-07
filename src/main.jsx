import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BattleProvider } from './context/BattleContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BattleProvider>
      <App />
    </BattleProvider>
  </StrictMode>,
)
