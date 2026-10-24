import { createRoot } from 'react-dom/client'
import '@fontsource-variable/rubik'
import '@xyflow/react/dist/style.css'
import './styles.css'
import App from './App'
import { toast } from './toast'

// Surface crashes instead of failing silently: one plain line with a way forward,
// details in the console, and not more than once every 10 seconds.
let lastReport = 0
const report = (msg: string) => {
  console.error(msg)
  if (Date.now() - lastReport < 10_000) return
  lastReport = Date.now()
  toast('Something broke. If the sound stops, press play again, or reload the page.', { tone: 'error', ms: 8000 })
}
window.addEventListener('error', (e) => report(e.message))
window.addEventListener('unhandledrejection', (e) => report(String(e.reason?.message ?? e.reason)))

createRoot(document.getElementById('root')!).render(<App />)
