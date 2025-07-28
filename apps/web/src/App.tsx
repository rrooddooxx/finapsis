import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState<string>('Checking...')
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Check API connectivity
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        setApiStatus(`API: ${data.status} (${data.environment})`)
      })
      .catch(() => {
        setApiStatus('API: Disconnected')
      })
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏦 Financial Assistant</h1>
        <p>Personal AI-powered financial coach</p>
        
        <div className="status-card">
          <h3>System Status</h3>
          <p>Frontend: ✅ Running</p>
          <p>{apiStatus}</p>
        </div>

        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            Test Counter: {count}
          </button>
          <p>
            Ready for deployment testing!
          </p>
        </div>

        <div className="features">
          <h3>Coming Soon:</h3>
          <ul>
            <li>📱 WhatsApp Integration</li>
            <li>🤖 AI-Powered Chat</li>
            <li>📊 Financial Insights</li>
            <li>🎯 Goal Tracking</li>
          </ul>
        </div>
      </header>
    </div>
  )
}

export default App
