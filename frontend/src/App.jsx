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
  const [analysisHistory, setAnalysisHistory] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

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
    // Test API connection on load
    fetch(`${API_URL}/`)
      .then(res => res.json())
      .then(data => {
        setApiStatus('✅ Connected')
        setApiMessage(data.message)
      })
      .catch(err => {
        setApiStatus('❌ Not Connected')
        setApiMessage('Backend is offline')
      })
  }, [])

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`${API_URL}/api/history`)
      const data = await response.json()
      setAnalysisHistory(data.analyses)
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  const processFile = (file) => {
    setUploadError('')
    setUploadSuccess('')
    setSelectedFile(file)
    setUploadSuccess(`✓ ${file.name} ready`)
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
    if (jobDescription.trim()) {
      formData.append('job_description', jobDescription.trim())
    }

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setUploadSuccess(`✓ Analysis complete!`)
        try {
          // This was the original logic that expected a JSON string
          const analysis = JSON.parse(data.analysis)
          setAnalysisResult(analysis)
        } catch (e) {
          console.error('Parsing error:', e)
          setUploadError('❌ Failed to parse analysis.')
        }
      } else {
        setUploadError(`❌ ${data.error || 'Upload failed.'}`)
      }
    } catch (error) {
      setUploadError('❌ Connection failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const updatePersonalInfo = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }))
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="logo" onClick={() => setCurrentView('home')}>Resume Optimizer</div>
        <div className="nav-links">
          <button onClick={() => setCurrentView('home')}>Home</button>
          <button onClick={() => setCurrentView('builder')}>Builder</button>
          <button onClick={() => {setCurrentView('history'); loadHistory();}}>History</button>
        </div>
      </nav>

      <div className="status-bar">
        <span>API: {apiStatus}</span>
      </div>

      {currentView === 'home' && (
        <div className="hero">
          <h1>AI Resume Optimizer</h1>
          <div className="upload-section">
            <input type="file" onChange={handleFileSelect} />
            <textarea 
              placeholder="Paste Job Description..." 
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? 'Analyzing...' : 'Upload & Analyze'}
            </button>
          </div>
          {uploadError && <p className="error">{uploadError}</p>}
          {uploadSuccess && <p className="success">{uploadSuccess}</p>}
        </div>
      )}

      {currentView === 'builder' && (
        <div className="builder-view">
          <h2>Resume Builder</h2>
          <input 
            placeholder="Full Name" 
            onChange={(e) => updatePersonalInfo('name', e.target.value)} 
          />
          {/* Builder content */}
        </div>
      )}

      {currentView === 'history' && (
        <div className="history-view">
          <h2>Analysis History</h2>
          {isLoadingHistory ? <p>Loading...</p> : (
            <ul>
              {analysisHistory.map((item, index) => (
                <li key={index}>{item.filename} - {item.date}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default App
