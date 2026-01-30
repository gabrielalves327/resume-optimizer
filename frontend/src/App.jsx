import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import './App.css'

// MAKE SURE THIS MATCHES YOUR RAILWAY URL EXACTLY
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

  // Resume builder state
  const [resumeData, setResumeData] = useState({
    personalInfo: { name: '', email: '', phone: '', location: '', linkedin: '', website: '' },
    summary: '',
    experience: [{ company: '', position: '', location: '', startDate: '', endDate: '', description: '' }],
    education: [{ school: '', degree: '', field: '', location: '', graduationDate: '', gpa: '' }],
    skills: { technical: '', soft: '', languages: '', certifications: '' }
  })

  useEffect(() => {
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  const processFile = (file) => {
    setUploadError('')
    setUploadSuccess('')
    setAnalysisResult(null)
    setSelectedFile(file)
    setUploadSuccess(`✓ ${file.name} ready (${(file.size / 1024).toFixed(2)} KB)`)
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
        // The backend now sends a clean object, no JSON.parse needed
        if (data.analysis) {
          setAnalysisResult(data.analysis)
          setCurrentView('results')
        } else {
          setUploadError('❌ No analysis data found.')
        }
      } else {
        setUploadError(`❌ ${data.error || 'Upload failed.'}`)
      }
    } catch (error) {
      setUploadError('❌ Connection failed. Ensure your Railway URL is correct.')
    } finally {
      setIsUploading(false)
    }
  }

  // --- BUILDER LOGIC ---
  const updatePersonalInfo = (field, value) => setResumeData(p => ({ ...p, personalInfo: { ...p.personalInfo, [field]: value } }))
  const updateSummary = (value) => setResumeData(p => ({ ...p, summary: value }))
  
  const downloadResumeAsPDF = () => {
    const doc = new jsPDF()
    doc.text(resumeData.personalInfo.name || "Resume", 20, 20)
    doc.text(resumeData.summary || "", 20, 30)
    doc.save('resume.pdf')
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="logo" onClick={() => setCurrentView('home')}>Resume Optimizer</div>
        <div className="nav-links">
          <button onClick={() => setCurrentView('home')}>Home</button>
          <button onClick={() => setCurrentView('builder')}>Builder</button>
          <button onClick={() => setCurrentView('features')}>Features</button>
        </div>
      </nav>

      {currentView === 'home' && (
        <div className="hero">
          <h1>Optimize Your Resume with AI</h1>
          <div className={`upload-area ${isDragging ? 'dragging' : ''}`} 
               onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
               onDragLeave={() => setIsDragging(false)}
               onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}>
            <h3>{selectedFile ? selectedFile.name : 'Drop resume here'}</h3>
            <input type="file" id="file-input" onChange={handleFileSelect} style={{ display: 'none' }} />
            <label htmlFor="file-input" className="btn-primary">Choose File</label>
          </div>

          <textarea 
            className="job-description-input"
            placeholder="Paste job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={6}
          />

          {selectedFile && !isUploading && (
            <button className="btn-upload-large" onClick={handleUpload}>Analyze with AI</button>
          )}

          {isUploading && <div className="spinner"></div>}
          {uploadError && <p className="error-message">{uploadError}</p>}
        </div>
      )}

      {currentView === 'results' && analysisResult && (
        <div className="analysis-results">
          <div className="score-card">
            <div className="score-number">{analysisResult.