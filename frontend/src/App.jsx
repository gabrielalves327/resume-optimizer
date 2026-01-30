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
      .catch(() => {
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
    setUploadSuccess(`✓ ${file.name} ready`)
  }

  const handleUpload = async () => {
    if (!selectedFile) return setUploadError('Please select a file first.')
    setIsUploading(true)
    setUploadError('')
    
    const formData = new FormData()
    formData.append('file', selectedFile)
    if (jobDescription.trim()) formData.append('job_description', jobDescription.trim())

    try {
      const response = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData })
      const data = await response.json()

      if (response.ok) {
        setUploadSuccess(`✓ Analysis complete!`)
        if (data.analysis) {
          setAnalysisResult(data.analysis)
          setCurrentView('results')
        }
      } else {
        setUploadError(`❌ ${data.error || 'Upload failed.'}`)
      }
    } catch (err) {
      setUploadError('❌ Connection failed.')
    } finally {
      setIsUploading(false)
    }
  }

  // Resume Builder Functions
  const updatePersonalInfo = (field, value) => setResumeData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }))
  const updateSummary = (value) => setResumeData(prev => ({ ...prev, summary: value }))
  const addExperience = () => setResumeData(prev => ({ ...prev, experience: [...prev.experience, { company: '', position: '', description: '' }] }))
  const addEducation = () => setResumeData(prev => ({ ...prev, education: [...prev.education, { school: '', degree: '' }] }))

  const generateResumePreview = () => {
    return `
${resumeData.personalInfo.name}
${resumeData.personalInfo.email} | ${resumeData.personalInfo.phone}
${resumeData.summary}
    `.trim()
  }

  const downloadResumeAsPDF = () => {
    const doc = new jsPDF()
    doc.text(generateResumePreview(), 10, 10)
    doc.save('resume.pdf')
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="logo" onClick={() => { setCurrentView('home'); setAnalysisResult(null); }}>Resume Optimizer</div>
        <div className="nav-links">
          <a onClick={() => { setCurrentView('home'); setAnalysisResult(null); }}>Home</a>
          <a onClick={() => setCurrentView('builder')}>Resume Builder</a>
          <a onClick={() => setCurrentView('features')}>Features</a>
        </div>
      </nav>

      {currentView === 'home' && !analysisResult && (
        <div className="hero">
          <h1>Optimize Your Resume with AI</h1>
          <div className="upload-area">
            <input type="file" id="file-input" onChange={handleFileSelect} style={{ display: 'none' }} />
            <label htmlFor="file-input" className="btn-primary">Choose File</label>
            {uploadSuccess && <p>{uploadSuccess}</p>}
          </div>
          <textarea 
            className="job-description-input" 
            placeholder="Paste job description (optional)..." 
            value={jobDescription} 
            onChange={(e) => setJobDescription(e.target.value)} 
            rows={8} 
          />
          {selectedFile && !isUploading && (
            <button className="btn-upload-large" onClick={handleUpload}>Analyze with AI</button>
          )}
          {isUploading && <div className="spinner"></div>}
          {uploadError && <p className="error-message">{uploadError}</p>}
        </div>
      )}

      {currentView === 'builder' && (
        <div className="resume-builder">
          <h1>Resume Builder</h1>
          <div className="builder-container">
            <div className="builder-form">
              <input placeholder="Name" value={resumeData.personalInfo.name} onChange={(e) => updatePersonalInfo('name', e.target.value)} className="form-input" />
              <input placeholder="Email" value={resumeData.personalInfo.email} onChange={(e) => updatePersonalInfo('email', e.target.value)} className="form-input" />
              <textarea placeholder="Professional Summary" value={resumeData.summary} onChange={(e) => updateSummary(e.target.value)} className="form-textarea" rows={4} />
              <button className="btn-primary" onClick={downloadResumeAsPDF}>Download PDF</button>
            </div>
            <div className="resume-preview">
               <pre>{generateResumePreview()}</pre>
            </div>
          </div>
        </div>
      )}

      {currentView === 'results' && analysisResult && (
        <div className="analysis-results">
          <h1>Analysis Results</h1>
          <div className="score-card">
            <div className="score-number">{analysisResult.overall_score}</div>
            <p>Score</p>
          </div>
          <div className="results-grid">
             <div className="result-item"><h3>Summary</h3><p>{analysisResult.summary}</p></div>
             <div className="result-item"><h3>Experience</h3><p>{analysisResult.experience}</p></div>
             <div className="result-item"><h3>Skills</h3><p>{analysisResult.skills}</p></div>
             <div className="result-item"><h3>Improvements</h3>
                <ul>{analysisResult.key_improvements?.map((item, i) => <li key={i}>{item}</li>)}</ul>
             </div>
          </div>
          <button className="btn-primary" onClick={() => { setAnalysisResult(null); setCurrentView('home'); }}>New Analysis</button>
        </div>
      )}

      {currentView === 'features' && (
        <div className="features-page">
          <h1>Features</h1>
          <div className="features-grid">
            <div className="feature-card"><h3>🤖 AI Analysis</h3><p>Powered by GPT-4.</p></div>
            <div className="feature-card"><h3>✅ ATS Check</h3><p>Beat the bots.</p></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App