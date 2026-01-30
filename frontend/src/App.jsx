import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import './App.css'

const API_URL = 'https://resume-optimizer-production-e852.up.railway.app'

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [apiMessage, setApiMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [currentView, setCurrentView] = useState('home')

  // history disabled for now
  const [analysisHistory] = useState([])
  const [isLoadingHistory] = useState(false)

  // Resume builder state
  const [resumeData, setResumeData] = useState({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      website: ''
    },
    summary: '',
    experience: [
      { company: '', position: '', location: '', startDate: '', endDate: '', description: '' }
    ],
    education: [
      { school: '', degree: '', field: '', location: '', graduationDate: '', gpa: '' }
    ],
    skills: {
      technical: '',
      soft: '',
      languages: '',
      certifications: ''
    }
  })

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then(res => res.json())
      .then(data => {
        setApiStatus('✅ Connected')
        setApiMessage(data.message)
      })
      .catch(() => {
        setApiStatus('❌ Not Connected')
        setApiMessage('Backend unavailable or spinning up')
      })
  }, [])

  const validateFile = (file) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    const maxSize = 5 * 1024 * 1024

    if (!allowedTypes.includes(file.type)) return 'Please upload a PDF or DOCX file.'
    if (file.size > maxSize) return 'File must be under 5MB.'
    return null
  }

  const processFile = (file) => {
    setUploadError('')
    setUploadSuccess('')
    setAnalysisResult(null)

    const error = validateFile(file)
    if (error) {
      setUploadError(error)
      return
    }

    setSelectedFile(file)
    setUploadSuccess(`✓ ${file.name} ready (${(file.size / 1024).toFixed(2)} KB)`)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Select a file first.')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadSuccess('')

    const formData = new FormData()
    formData.append('file', selectedFile)
    if (jobDescription.trim()) {
      formData.append('job_description', jobDescription.trim())
    }

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setUploadError(`❌ ${data.error || 'Upload failed.'}`)
        return
      }

      setUploadSuccess(`✓ Analysis complete for ${data.filename}`)
      setAnalysisResult(data.analysis)
      setCurrentView('results')

    } catch (err) {
      setUploadError('❌ Failed to connect to backend.')
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
    setJobDescription('')
    setUploadError('')
    setUploadSuccess('')
    setCurrentView('home')
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="logo">Resume Optimizer</div>
        <div className="nav-links">
          <a onClick={() => handleStartNewAnalysis()}>Home</a>
          <a onClick={() => setCurrentView('builder')}>Resume Builder</a>
          <a onClick={() => setCurrentView('features')}>Features</a>
        </div>
      </nav>

      {currentView === 'home' && !analysisResult && (
        <div className="hero">
          <h1>Optimize Your Resume with AI</h1>
          <p>Instant feedback that actually helps</p>

          <div
            className={`upload-area ${isDragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault()
              setIsDragging(false)
              processFile(e.dataTransfer.files[0])
            }}
          >
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={e => processFile(e.target.files[0])}
              hidden
              id="file-input"
            />
            <label htmlFor="file-input" className="btn-primary">
              Choose File
            </label>

            {uploadError && (
              <div className="error-message">
                {uploadError}
                <button className="btn-retry" onClick={handleRetry}>Try Again</button>
              </div>
            )}

            {uploadSuccess && <div className="success-message">{uploadSuccess}</div>}
          </div>

          <textarea
            className="job-description-input"
            placeholder="Paste job description (optional)"
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            rows={6}
          />

          {selectedFile && !isUploading && (
            <button className="btn-upload-large" onClick={handleUpload}>
              Upload & Analyze
            </button>
          )}

          {isUploading && <div className="spinner"></div>}
        </div>
      )}

      {analysisResult && (
        <div className="analysis-results">
          <h1>Analysis Results</h1>
          <button className="btn-secondary" onClick={handleStartNewAnalysis}>
            New Analysis
          </button>

          <div className="score-card">
            <div className="score-number">{analysisResult.overall_score}</div>
            <p>Overall Score</p>
          </div>

          <div className="sections-grid">
            <div className="section-card"><h3>Summary</h3><p>{analysisResult.summary?.feedback}</p></div>
            <div className="section-card"><h3>Experience</h3><p>{analysisResult.experience?.feedback}</p></div>
            <div className="section-card"><h3>Skills</h3><p>{analysisResult.skills?.feedback}</p></div>
            <div className="section-card"><h3>Education</h3><p>{analysisResult.education?.feedback}</p></div>
          </div>

          <div className="improvements-card">
            <h3>Key Improvements</h3>
            <ul>
              {analysisResult.key_improvements?.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {currentView === 'features' && (
        <div className="features-page">
          <h1>Features</h1>
          <p>Modern GPT-4-level AI resume analysis</p>
        </div>
      )}

      <div className="api-status">
        <p><strong>Status:</strong> {apiStatus}</p>
        <p><strong>Message:</strong> {apiMessage}</p>
      </div>
    </div>
  )
}

export default App
