import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [apiMessage, setApiMessage] = useState('')

  useEffect(() => {
    // Test API connection on load
    fetch('http://localhost:5000/')
      .then(res => res.json())
      .then(data => {
        setApiStatus('✅ Connected')
        setApiMessage(data.message)
      })
      .catch(err => {
        setApiStatus('❌ Not Connected')
        setApiMessage('Make sure Flask backend is running on port 5000')
      })
  }, [])

  return (
    <div className="App">
      <nav className="navbar">
        <div className="logo">Resume Optimizer</div>
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#signin">Sign In</a>
        </div>
      </nav>

      <div className="hero">
        <h1>Optimize Your Resume with AI</h1>
        <p>Get instant feedback and actionable insights to make your resume stand out</p>
        
        <div className="upload-area">
          <div className="upload-icon">📄</div>
          <h3>Drop your resume here</h3>
          <p>Supports PDF, DOCX - Max 5MB</p>
          <button className="btn-primary">Choose File</button>
        </div>

        <div className="features-list">
          <span>✓ ATS-friendly analysis</span>
          <span>✓ Instant results</span>
          <span>✓ Secure & private</span>
        </div>
      </div>

      <div className="api-status">
        <h3>Backend API Status</h3>
        <p><strong>Status:</strong> {apiStatus}</p>
        <p><strong>Message:</strong> {apiMessage}</p>
      </div>
    </div>
  )
}

export default App