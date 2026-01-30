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
        setApiMessage('Backend is spinning up or unavailable')
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
      const response = await fetch(`${API_URL}/api/history`)
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
    if (jobDescription.trim()) {
      formData.append('job_description', jobDescription.trim())
    }

    try {
      console.log('Sending file to backend for AI analysis...')
      
      const response = await fetch(`${API_URL}/api/upload`, {
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
      setUploadError('❌ Failed to connect to server. Backend may be spinning up (takes 30-60 seconds on first request).')
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

  // Resume Builder Functions
  const updatePersonalInfo = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }))
  }

  const updateSummary = (value) => {
    setResumeData(prev => ({ ...prev, summary: value }))
  }

  const addExperience = () => {
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, { company: '', position: '', location: '', startDate: '', endDate: '', description: '' }]
    }))
  }

  const updateExperience = (index, field, value) => {
    setResumeData(prev => {
      const newExperience = [...prev.experience]
      newExperience[index][field] = value
      return { ...prev, experience: newExperience }
    })
  }

  const removeExperience = (index) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }))
  }

  const addEducation = () => {
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, { school: '', degree: '', field: '', location: '', graduationDate: '', gpa: '' }]
    }))
  }

  const updateEducation = (index, field, value) => {
    setResumeData(prev => {
      const newEducation = [...prev.education]
      newEducation[index][field] = value
      return { ...prev, education: newEducation }
    })
  }

  const removeEducation = (index) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }))
  }

  const updateSkills = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      skills: { ...prev.skills, [field]: value }
    }))
  }

  const generateResumePreview = () => {
    return `
${resumeData.personalInfo.name}
${resumeData.personalInfo.email} | ${resumeData.personalInfo.phone} | ${resumeData.personalInfo.location}
${resumeData.personalInfo.linkedin ? `LinkedIn: ${resumeData.personalInfo.linkedin}` : ''}
${resumeData.personalInfo.website ? `Website: ${resumeData.personalInfo.website}` : ''}

PROFESSIONAL SUMMARY
${resumeData.summary}

EXPERIENCE
${resumeData.experience.map(exp => `
${exp.position} - ${exp.company}
${exp.location} | ${exp.startDate} - ${exp.endDate || 'Present'}
${exp.description}
`).join('\n')}

EDUCATION
${resumeData.education.map(edu => `
${edu.degree} in ${edu.field} - ${edu.school}
${edu.location} | Graduated: ${edu.graduationDate}
${edu.gpa ? `GPA: ${edu.gpa}` : ''}
`).join('\n')}

SKILLS
Technical Skills: ${resumeData.skills.technical}
Soft Skills: ${resumeData.skills.soft}
Languages: ${resumeData.skills.languages}
Certifications: ${resumeData.skills.certifications}
    `.trim()
  }

  const downloadResumeAsText = () => {
    const resumeText = generateResumePreview()
    const blob = new Blob([resumeText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resumeData.personalInfo.name.replace(/\s+/g, '_')}_Resume.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadResumeAsPDF = () => {
    const doc = new jsPDF()
    let yPosition = 20
    const lineHeight = 7
    const pageHeight = doc.internal.pageSize.height
    const margin = 20
    
    const addText = (text, fontSize = 11, isBold = false) => {
      doc.setFontSize(fontSize)
      if (isBold) {
        doc.setFont(undefined, 'bold')
      } else {
        doc.setFont(undefined, 'normal')
      }
      const lines = doc.splitTextToSize(text, 170)
      lines.forEach(line => {
        if (yPosition > pageHeight - margin) {
          doc.addPage()
          yPosition = 20
        }
        doc.text(line, 20, yPosition)
        yPosition += lineHeight
      })
    }
    
    addText(resumeData.personalInfo.name, 18, true)
    yPosition += 3
    const contactInfo = [resumeData.personalInfo.email, resumeData.personalInfo.phone, resumeData.personalInfo.location].filter(Boolean).join(' | ')
    addText(contactInfo, 10)
    if (resumeData.personalInfo.linkedin) addText(`LinkedIn: ${resumeData.personalInfo.linkedin}`, 10)
    if (resumeData.personalInfo.website) addText(`Website: ${resumeData.personalInfo.website}`, 10)
    yPosition += 5
    if (resumeData.summary) {
      addText('PROFESSIONAL SUMMARY', 14, true)
      yPosition += 2
      addText(resumeData.summary, 11)
      yPosition += 5
    }
    if (resumeData.experience.some(exp => exp.company || exp.position)) {
      addText('EXPERIENCE', 14, true)
      yPosition += 2
      resumeData.experience.forEach(exp => {
        if (exp.position || exp.company) {
          addText(`${exp.position}${exp.position && exp.company ? ' - ' : ''}${exp.company}`, 12, true)
          const expDetails = [exp.location, exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : exp.startDate || exp.endDate].filter(Boolean).join(' | ')
          if (expDetails) addText(expDetails, 10)
          if (exp.description) { yPosition += 1; addText(exp.description, 11) }
          yPosition += 3
        }
      })
      yPosition += 2
    }
    if (resumeData.education.some(edu => edu.school || edu.degree)) {
      addText('EDUCATION', 14, true)
      yPosition += 2
      resumeData.education.forEach(edu => {
        if (edu.degree || edu.field || edu.school) {
          const degreeText = [edu.degree, edu.field ? `in ${edu.field}` : '', edu.school ? `- ${edu.school}` : ''].filter(Boolean).join(' ')
          addText(degreeText, 12, true)
          const eduDetails = [edu.location, edu.graduationDate ? `Graduated: ${edu.graduationDate}` : '', edu.gpa ? `GPA: ${edu.gpa}` : ''].filter(Boolean).join(' | ')
          if (eduDetails) addText(eduDetails, 10)
          yPosition += 3
        }
      })
      yPosition += 2
    }
    const hasSkills = Object.values(resumeData.skills).some(skill => skill.trim())
    if (hasSkills) {
      addText('SKILLS', 14, true)
      yPosition += 2
      if (resumeData.skills.technical) addText(`Technical Skills: ${resumeData.skills.technical}`, 11)
      if (resumeData.skills.soft) addText(`Soft Skills: ${resumeData.skills.soft}`, 11)
      if (resumeData.skills.languages) addText(`Languages: ${resumeData.skills.languages}`, 11)
      if (resumeData.skills.certifications) addText(`Certifications: ${resumeData.skills.certifications}`, 11)
    }
    const fileName = resumeData.personalInfo.name ? `${resumeData.personalInfo.name.replace(/\s+/g, '_')}_Resume.pdf` : 'Resume.pdf'
    doc.save(fileName)
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="logo">Resume Optimizer</div>
        <div className="nav-links">
          <a onClick={() => { setCurrentView('home'); setAnalysisResult(null); }}>Home</a>
          <a onClick={() => setCurrentView('builder')}>Resume Builder</a>
          <a onClick={() => setCurrentView('history')}>History</a>
          <a onClick={() => setCurrentView('features')}>Features</a>
        </div>
      </nav>

      {currentView === 'home' && !analysisResult && (
        <div className="hero">
          <h1>Optimize Your Resume with AI</h1>
          <p>Get instant feedback and actionable insights to make your resume stand out</p>
          
          <div className={`upload-area ${isDragging ? 'dragging' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            <div className="upload-icon">📄</div>
            <h3>Drop your resume here</h3>
            <p>Supports PDF, DOCX - Max 5MB</p>
            <input type="file" id="file-input" accept=".pdf,.docx" onChange={handleFileSelect} style={{ display: 'none' }} disabled={isUploading} />
            <label htmlFor="file-input" className={`btn-primary ${isUploading ? 'disabled' : ''}`}>Choose File</label>
            {uploadError && <div className="error-message">{uploadError}<button className="btn-retry" onClick={handleRetry}>Try Again</button></div>}
            {uploadSuccess && !isUploading && <div className="success-message">{uploadSuccess}</div>}
          </div>

          <div className="job-description-area">
            <h3>📋 Job Description (Optional)</h3>
            <p>Paste the job description to get tailored feedback</p>
            <textarea className="job-description-input" placeholder="Paste the job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} disabled={isUploading} rows={8} />
          </div>

          {selectedFile && !isUploading && !uploadError && (
            <button className="btn-upload-large" onClick={handleUpload}>Upload & Analyze with AI</button>
          )}

          {isUploading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <div className="loading-message">
                <strong>⏳ Analyzing your resume with AI...</strong>
                <p>This may take 10-15 seconds.</p>
              </div>
            </div>
          )}

          <div className="features-list">
            <span>✓ ATS-friendly analysis</span>
            <span>✓ Instant results</span>
            <span>✓ Secure & private</span>
          </div>
        </div>
      )}

      {currentView === 'builder' && (
        <div className="resume-builder">
          <h1>Resume Builder</h1>
          <p>Create an ATS-friendly resume from scratch</p>
          <div className="builder-container">
            <div className="builder-form">
              <div className="form-section">
                <h2>Personal Information</h2>
                <div className="form-grid">
                  <input type="text" placeholder="Full Name *" value={resumeData.personalInfo.name} onChange={(e) => updatePersonalInfo('name', e.target.value)} className="form-input" />
                  <input type="email" placeholder="Email *" value={resumeData.personalInfo.email} onChange={(e) => updatePersonalInfo('email', e.target.value)} className="form-input" />
                  <input type="tel" placeholder="Phone *" value={resumeData.personalInfo.phone} onChange={(e) => updatePersonalInfo('phone', e.target.value)} className="form-input" />
                  <input type="text" placeholder="Location" value={resumeData.personalInfo.location} onChange={(e) => updatePersonalInfo('location', e.target.value)} className="form-input" />
                  <input type="url" placeholder="LinkedIn" value={resumeData.personalInfo.linkedin} onChange={(e) => updatePersonalInfo('linkedin', e.target.value)} className="form-input" />
                  <input type="url" placeholder="Website" value={resumeData.personalInfo.website} onChange={(e) => updatePersonalInfo('website', e.target.value)} className="form-input" />
                </div>
              </div>
              <div className="form-section">
                <h2>Professional Summary</h2>
                <textarea placeholder="Write a brief summary..." value={resumeData.summary} onChange={(e) => updateSummary(e.target.value)} className="form-textarea" rows={5} />
              </div>
              <div className="form-section">
                <div className="section-header"><h2>Work Experience</h2><button className="btn-add" onClick={addExperience}>+ Add</button></div>
                {resumeData.experience.map((exp, index) => (
                  <div key={index} className="repeatable-section">
                    {resumeData.experience.length > 1 && <button className="btn-remove" onClick={() => removeExperience(index)}>Remove</button>}
                    <div className="form-grid">
                      <input type="text" placeholder="Job Title *" value={exp.position} onChange={(e) => updateExperience(index, 'position', e.target.value)} className="form-input" />
                      <input type="text" placeholder="Company *" value={exp.company} onChange={(e) => updateExperience(index, 'company', e.target.value)} className="form-input" />
                      <input type="text" placeholder="Location" value={exp.location} onChange={(e) => updateExperience(index, 'location', e.target.value)} className="form-input" />
                      <input type="text" placeholder="Start Date" value={exp.startDate} onChange={(e) => updateExperience(index, 'startDate', e.target.value)} className="form-input" />
                      <input type="text" placeholder="End Date" value={exp.endDate} onChange={(e) => updateExperience(index, 'endDate', e.target.value)} className="form-input" />
                    </div>
                    <textarea placeholder="Description..." value={exp.description} onChange={(e) => updateExperience(index, 'description', e.target.value)} className="form-textarea" rows={4} />
                  </div>
                ))}
              </div>
              <div className="form-section">
                <div className="section-header"><h2>Education</h2><button className="btn-add" onClick={addEducation}>+ Add</button></div>
                {resumeData.education.map((edu, index) => (
                  <div key={index} className="repeatable-section">
                    {resumeData.education.length > 1 && <button className="btn-remove" onClick={() => removeEducation(index)}>Remove</button>}
                    <div className="form-grid">
                      <input type="text" placeholder="School *" value={edu.school} onChange={(e) => updateEducation(index, 'school', e.target.value)} className="form-input" />
                      <input type="text" placeholder="Degree" value={edu.degree} onChange={(e) => updateEducation(index, 'degree', e.target.value)} className="form-input" />
                      <input type="text" placeholder="Field" value={edu.field} onChange={(e) => updateEducation(index, 'field', e.target.value)} className="form-input" />
                      <input type="text" placeholder="Graduation Date" value={edu.graduationDate} onChange={(e) => updateEducation(index, 'graduationDate', e.target.value)} className="form-input" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-section">
                <h2>Skills</h2>
                <textarea placeholder="Technical Skills..." value={resumeData.skills.technical} onChange={(e) => updateSkills('technical', e.target.value)} className="form-textarea" rows={2} />
                <textarea placeholder="Soft Skills..." value={resumeData.skills.soft} onChange={(e) => updateSkills('soft', e.target.value)} className="form-textarea" rows={2} />
              </div>
              <div className="builder-actions">
                <button className="btn-secondary" onClick={downloadResumeAsText}>Download TXT</button>
                <button className="btn-primary" onClick={downloadResumeAsPDF}>Download PDF</button>
              </div>
            </div>
            <div className="resume-preview"><h3>Preview</h3><pre>{generateResumePreview()}</pre></div>
          </div>
        </div>
      )}

      {currentView === 'features' && (
        <div className="features-page">
          <h1>Features</h1>
          <div className="features-grid">
            <div className="feature-card"><div className="feature-icon">🤖</div><h3>AI-Powered Analysis</h3><p>GPT-3.5 technology for instant feedback.</p></div>
            <div className="feature-card"><div className="feature-icon">🎯</div><h3>Job Matching</h3><p>Compare against job descriptions.</p></div>
            <div className="feature-card"><div className="feature-icon">📊</div><h3>Section Scoring</h3><p>Detailed analysis of each section.</p></div>
            <div className="feature-card"><div className="feature-icon">✅</div><h3>ATS Compatible</h3><p>Pass applicant tracking systems.</p></div>
          </div>
        </div>
      )}

      {currentView === 'history' && (
        <div className="history-view">
          <h1>Analysis History</h1>
          <button className="btn-primary" onClick={() => setCurrentView('home')}>New Analysis</button>
          {isLoadingHistory ? <div className="spinner"></div> : analysisHistory.length === 0 ? <p>No history yet.</p> : (
            <div className="history-list">
              {analysisHistory.map((item) => (
                <div key={item.id} className="history-item" onClick={() => viewHistoryAnalysis(item)}>
                  <h3>📄 {item.filename}</h3>
                  <p>{item.overall_score}/100</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {analysisResult && (
        <div className="analysis-results">
          <h1>Analysis Results</h1>
          <button className="btn-secondary" onClick={handleStartNewAnalysis}>New Analysis</button>
          <div className="score-card">
            <div className="score-number">{analysisResult.overall_score}</div>
            <p>Overall Score</p>
          </div>
          <div className="sections-grid">
            {analysisResult.summary && <div className="section-card"><h3>📝 Summary</h3><p>{analysisResult.summary.feedback || analysisResult.summary}</p></div>}
            {analysisResult.experience && <div className="section-card"><h3>💼 Experience</h3><p>{analysisResult.experience.feedback || analysisResult.experience}</p></div>}
            {analysisResult.skills && <div className="section-card"><h3>⚡ Skills</h3><p>{analysisResult.skills.feedback || analysisResult.skills}</p></div>}
            {analysisResult.education && <div className="section-card"><h3>🎓 Education</h3><p>{analysisResult.education.feedback || analysisResult.education}</p></div>}
          </div>
          {analysisResult.key_improvements && (
            <div className="improvements-card">
              <h3>💡 Key Improvements</h3>
              <ul>{analysisResult.key_improvements.map((imp, i) => <li key={i}>{imp}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <div className="api-status">
        <h3>Backend Status</h3>
        <p><strong>Status:</strong> {apiStatus}</p>
        <p><strong>Message:</strong> {apiMessage}</p>
      </div>
    </div>
  )
}

export default App
