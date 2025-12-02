import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [apiMessage, setApiMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [currentView, setCurrentView] = useState('home')
  const [analysisHistory, setAnalysisHistory] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

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

  // Load history when switching to history view
  useEffect(() => {
    if (currentView === 'history') {
      loadHistory()
    }
  }, [currentView])

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch('http://localhost:5000/api/history')
      const data = await response.json()
      setAnalysisHistory(data.analyses)
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Validate file type and size
  const validateFile = (file) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const maxSize = 5 * 1024 * 1024

    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a PDF or DOCX file only.'
    }

    if (file.size > maxSize) {
      return 'File size must be less than 5MB.'
    }

    return null
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file) => {
    setUploadError('')
    setUploadSuccess('')
    setAnalysisResult(null)

    const error = validateFile(file)
    if (error) {
      setUploadError(error)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setUploadSuccess(`✓ ${file.name} is ready to upload (${(file.size / 1024).toFixed(2)} KB)`)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file first.')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadSuccess('')

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      console.log('Sending file to backend for AI analysis...')
      
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        setUploadSuccess(`✓ Analysis complete for ${data.filename}!`)
        
        // Parse AI analysis
        try {
          const analysis = JSON.parse(data.analysis)
          setAnalysisResult(analysis)
        } catch (e) {
          console.error('Error parsing analysis:', e)
          setUploadError('❌ Error parsing AI analysis. Please try again.')
        }
      } else {
        setUploadError(`❌ ${data.error || 'Upload failed. Please try again.'}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('❌ Failed to connect to server. Make sure the backend is running on port 5000.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRetry = () => {
    setUploadError('')
    setUploadSuccess('')
    setAnalysisResult(null)
    setSelectedFile(null)
  }

  const handleStartNewAnalysis = () => {
    setAnalysisResult(null)
    setSelectedFile(null)
    setUploadError('')
    setUploadSuccess('')
    setCurrentView('home')
  }

  const viewHistoryAnalysis = (analysis) => {
    setAnalysisResult(analysis.analysis_data)
    setCurrentView('results')
  }

  const getStatusColor = (status) => {
    if (status === 'good') return '#10b981'
    if (status === 'needs_work') return '#f59e0b'
    return '#ef4444'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="logo">Resume Optimizer</div>
        <div className="nav-links">
          <a href="#home" onClick={() => setCurrentView('home')}>Home</a>
          <a href="#history" onClick={() => setCurrentView('history')}>History</a>
          <a href="#features">Features</a>
        </div>
      </nav>

      <div className="hero">
        <h1>Optimize Your Resume with AI</h1>
        <p>Get instant feedback and actionable insights to make your resume stand out</p>
        
        {currentView === 'home' && !analysisResult && (
          <div 
            className={`upload-area ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon">📄</div>
            <h3>Drop your resume here</h3>
            <p>Supports PDF, DOCX - Max 5MB</p>
            
            <input 
              type="file" 
              id="file-input" 
              accept=".pdf,.docx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={isUploading}
            />
            
            <label htmlFor="file-input" className={`btn-primary ${isUploading ? 'disabled' : ''}`}>
              Choose File
            </label>

            {uploadError && (
              <div className="error-message">
                {uploadError}
                <button className="btn-retry" onClick={handleRetry}>
                  Try Again
                </button>
              </div>
            )}

            {uploadSuccess && !isUploading && (
              <div className="success-message">
                {uploadSuccess}
              </div>
            )}

            {selectedFile && !isUploading && !uploadError && (
              <button className="btn-upload" onClick={handleUpload}>
                Upload & Analyze with AI
              </button>
            )}

            {isUploading && (
              <div className="loading-container">
                <div className="spinner"></div>
                <div className="loading-message">
                  <strong>⏳ Analyzing your resume with AI...</strong>
                  <p>This may take 10-15 seconds. Please wait.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'history' && (
          <div className="history-view">
            <div className="history-header">
              <h2>Analysis History</h2>
              <button className="btn-primary" onClick={() => setCurrentView('home')}>
                New Analysis
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading history...</p>
              </div>
            ) : analysisHistory.length === 0 ? (
              <div className="empty-history">
                <p>No analyses yet. Upload your first resume to get started!</p>
                <button className="btn-primary" onClick={() => setCurrentView('home')}>
                  Upload Resume
                </button>
              </div>
            ) : (
              <div className="history-list">
                {analysisHistory.map((item) => (
                  <div key={item.id} className="history-item" onClick={() => viewHistoryAnalysis(item)}>
                    <div className="history-item-header">
                      <h3>📄 {item.filename}</h3>
                      <div className="history-score">{item.overall_score}/100</div>
                    </div>
                    <div className="history-item-date">
                      {formatDate(item.upload_date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(currentView === 'home' || currentView === 'results') && analysisResult && (
          <div className="analysis-results">
            <div className="results-header">
              <h2>Analysis Results</h2>
              <button className="btn-secondary" onClick={handleStartNewAnalysis}>
                Start New Analysis
              </button>
            </div>

            <div className="score-card">
              <div className="score-circle">
                <div className="score-number">{analysisResult.overall_score}</div>
                <div className="score-label">/ 100</div>
              </div>
              <h3>Overall Score</h3>
            </div>

            <div className="sections-grid">
              {analysisResult.summary && (
                <div className="section-card" style={{borderLeftColor: getStatusColor(analysisResult.summary.status)}}>
                  <h3>📝 Professional Summary</h3>
                  <div className="section-score">Score: {analysisResult.summary.score}/100</div>
                  <p>{analysisResult.summary.feedback}</p>
                </div>
              )}

              {analysisResult.experience && (
                <div className="section-card" style={{borderLeftColor: getStatusColor(analysisResult.experience.status)}}>
                  <h3>💼 Work Experience</h3>
                  <div className="section-score">Score: {analysisResult.experience.score}/100</div>
                  <p>{analysisResult.experience.feedback}</p>
                </div>
              )}

              {analysisResult.skills && (
                <div className="section-card" style={{borderLeftColor: getStatusColor(analysisResult.skills.status)}}>
                  <h3>⚡ Skills</h3>
                  <div className="section-score">Score: {analysisResult.skills.score}/100</div>
                  <p>{analysisResult.skills.feedback}</p>
                </div>
              )}

              {analysisResult.education && (
                <div className="section-card" style={{borderLeftColor: getStatusColor(analysisResult.education.status)}}>
                  <h3>🎓 Education</h3>
                  <div className="section-score">Score: {analysisResult.education.score}/100</div>
                  <p>{analysisResult.education.feedback}</p>
                </div>
              )}
            </div>

            {analysisResult.ats_score && (
              <div className="ats-card">
                <h3>🤖 ATS Compatibility Score</h3>
                <div className="ats-score">{analysisResult.ats_score}/100</div>
              </div>
            )}

            {analysisResult.key_improvements && (
              <div className="improvements-card">
                <h3>💡 Key Improvements</h3>
                <ul>
                  {analysisResult.key_improvements.map((improvement, index) => (
                    <li key={index}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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