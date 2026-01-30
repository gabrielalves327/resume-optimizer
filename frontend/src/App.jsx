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
      setUploadError('❌ Connection failed.')
    } finally {
      setIsUploading(false)
    }
  }

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
          {uploadSuccess && <p className="success-message">{uploadSuccess}</p>}
        </div>
      )}

      {currentView === 'results' && analysisResult && (
        <div className="analysis-results">
          <h2>Analysis Results</h2>
          <div className="score-card">
            <div className="score-number">{analysisResult.overall_score || 'N/A'}</div>
            <p>Overall Score</p>
          </div>
          
          <div className="results-grid">
            <section>
              <h3>Summary</h3>
              <p>{analysisResult.summary || 'No summary available'}</p>
            </section>
            <section>
              <h3>Experience</h3>
              <p>{analysisResult.experience || 'No experience feedback'}</p>
            </section>
            <section>
              <h3>Skills</h3>
              <p>{analysisResult.skills || 'No skills feedback'}</p>
            </section>
            <section>
              <h3>Key Improvements</h3>
              <ul>
                {analysisResult.key_improvements && analysisResult.key_improvements.map((imp, i) => <li key={i}>{imp}</li>)}
              </ul>
            </section>
          </div>
          <button className="btn-primary" onClick={() => { setCurrentView('home'); setAnalysisResult(null); setSelectedFile(null); }}>New Analysis</button>
        </div>
      )}

      {currentView === 'builder' && (
        <div className="resume-builder">
          <h2>Resume Builder</h2>
          <input placeholder="Full Name" onChange={(e) => updatePersonalInfo('name', e.target.value)} />
          <textarea placeholder="Summary" onChange={(e) => updateSummary(e.target.value)} />
          <button onClick={downloadResumeAsPDF} className="btn-primary">Download PDF</button>
        </div>
      )}

      <div className="api-status">
        <p>Backend: {apiStatus}</p>
      </div>
    </div>
  )
}

export default App