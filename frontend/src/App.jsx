import { useState, useEffect } from 'react'
import './App.css'

const API_URL = 'https://resume-optimizer-production-e852.up.railway.app'

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [selectedFile, setSelectedFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then(res => res.json())
      .then(data => setApiStatus('✅ Connected'))
      .catch(() => setApiStatus('❌ Not Connected'))
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setUploadError('')
      setUploadSuccess(`✓ ${file.name} ready`)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadError('')

    const formData = new FormData()
    formData.append('file', selectedFile)
    if (jobDescription) formData.append('job_description', jobDescription)

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()

      if (response.ok && data.analysis) {
        let analysis = data.analysis
        if (typeof analysis === 'string') {
          analysis = JSON.parse(analysis)
        }
        setAnalysisResult(analysis)
        setUploadSuccess('✓ Analysis complete!')
      } else {
        setUploadError(data.error || 'Upload failed')
      }
    } catch (error) {
      setUploadError('Connection failed. Try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setAnalysisResult(null)
    setUploadError('')
    setUploadSuccess('')
    setJobDescription('')
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="logo">Resume Optimizer</div>
      </nav>

      {!analysisResult ? (
        <div className="hero">
          <h1>Optimize Your Resume with AI</h1>
          <p>Get instant feedback to make your resume stand out</p>

          <div className="upload-area">
            <h3>{selectedFile ? selectedFile.name : 'Choose your resume'}</h3>
            <p>PDF or DOCX - Max 5MB</p>
            <input type="file" id="file-input" accept=".pdf,.docx" onChange={handleFileSelect} style={{display: 'none'}} />
            <label htmlFor="file-input" className="btn-primary">Choose File</label>
          </div>

          <textarea
            className="job-description-input"
            placeholder="Paste job description here (optional)..."
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
      ) : (
        <div className="analysis-results">
          <h2>Analysis Results</h2>
          
          <div className="score-card">
            <div className="score-number">{analysisResult.overall_score || 'N/A'}</div>
            <p>Overall Score</p>
          </div>

          <div className="sections-grid">
            <div className="section-card">
              <h3>Summary</h3>
              <p>{analysisResult.summary?.feedback || analysisResult.summary || 'N/A'}</p>
            </div>
            <div className="section-card">
              <h3>Experience</h3>
              <p>{analysisResult.experience?.feedback || analysisResult.experience || 'N/A'}</p>
            </div>
            <div className="section-card">
              <h3>Skills</h3>
              <p>{analysisResult.skills?.feedback || analysisResult.skills || 'N/A'}</p>
            </div>
            <div className="section-card">
              <h3>Education</h3>
              <p>{analysisResult.education?.feedback || analysisResult.education || 'N/A'}</p>
            </div>
          </div>

          {analysisResult.key_improvements && (
            <div className="improvements-card">
              <h3>Key Improvements</h3>
              <ul>
                {analysisResult.key_improvements.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}

          <button className="btn-primary" onClick={resetForm}>New Analysis</button>
        </div>
      )}

      <div className="api-status">
        <p>Backend: {apiStatus}</p>
      </div>
    </div>
  )
}

export default App