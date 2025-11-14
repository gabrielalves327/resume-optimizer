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
          setUploadError('❌ Error parsing AI analysis')
        }
      } else {
        setUploadError(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('❌ Failed to upload. Make sure backend is running.')
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusColor = (status) => {
    if (status === 'good') return '#10b981'
    if (status === 'needs_work') return '#f59e0b'
    return '#ef4444'
  }

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
        
        {!analysisResult && (
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
            />
            
            <label htmlFor="file-input" className="btn-primary">
              Choose File
            </label>

            {uploadError && (
              <div className="error-message">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="success-message">
                {uploadSuccess}
              </div>
            )}

            {selectedFile && !isUploading && (
              <button className="btn-upload" onClick={handleUpload}>
                Upload & Analyze with AI
              </button>
            )}

            {isUploading && (
              <div className="uploading-message">
                ⏳ Analyzing with AI... This may take 10-15 seconds
              </div>
            )}
          </div>
        )}

        {analysisResult && (
          <div className="analysis-results">
            <div className="results-header">
              <h2>Analysis Results</h2>
              <button className="btn-secondary" onClick={() => {
                setAnalysisResult(null)
                setSelectedFile(null)
              }}>
                Upload New Resume
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