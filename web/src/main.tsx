import { createRoot } from 'react-dom/client'
import '@xyflow/react/dist/style.css'
import './styles.css'
import App from './App'

// Surface crashes instead of a silent blank screen.
const showError = (msg: string) => {
  const el = document.createElement('pre')
  el.style.cssText =
    'position:fixed;inset:auto 8px 8px 8px;background:#c0392b;color:#fff;padding:10px;z-index:99999;font:12px monospace;white-space:pre-wrap;border-radius:6px'
  el.textContent = msg
  document.body.appendChild(el)
}
window.addEventListener('error', (e) => showError(`${e.message}\n${e.filename}:${e.lineno}`))
window.addEventListener('unhandledrejection', (e) => showError(`unhandled: ${e.reason}`))

createRoot(document.getElementById('root')!).render(<App />)
