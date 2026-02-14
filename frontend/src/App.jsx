import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import './App.css'

const API_URL = 'http://localhost:5000'

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
  const [builderTab, setBuilderTab] = useState('personal')
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
      .catch(err => {
        setApiStatus('❌ Not Connected')
        setApiMessage('Backend is spinning up or unavailable')
      })
  }, [])

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

  const validateFile = (file) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const maxSize = 5 * 1024 * 1024
    if (!allowedTypes.includes(file.type)) return 'Please upload a PDF or DOCX file only.'
    if (file.size > maxSize) return 'File size must be less than 5MB.'
    return null
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false) }
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
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
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()

      if (response.ok) {
        setUploadSuccess(`✓ Analysis complete for ${data.filename}!`)
        if (data.analysis) {
          let analysis = data.analysis
          if (typeof analysis === 'string') {
            try { analysis = JSON.parse(analysis) } catch (e) { console.error('Error parsing analysis:', e) }
          }
          setAnalysisResult(analysis)
        }
      } else {
        setUploadError(`❌ ${data.error || 'Upload failed. Please try again.'}`)
      }
    } catch (error) {
      setUploadError('❌ Failed to connect to server. Make sure backend is running.')
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

  const getStatusColor = (status) => {
    if (status === 'good') return '#10b981'
    if (status === 'needs_work') return '#f59e0b'
    return '#ef4444'
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

  const getBuilderProgress = () => {
    let filled = 0
    let total = 5
    if (resumeData.personalInfo.name && resumeData.personalInfo.email) filled++
    if (resumeData.summary) filled++
    if (resumeData.experience[0].position || resumeData.experience[0].company) filled++
    if (resumeData.education[0].school || resumeData.education[0].degree) filled++
    if (resumeData.skills.technical || resumeData.skills.soft) filled++
    return Math.round((filled / total) * 100)
  }

  const downloadResumeAsPDF = () => {
    const doc = new jsPDF()
    let yPosition = 20
    const lineHeight = 7
    const pageHeight = doc.internal.pageSize.height
    const margin = 20

    const addText = (text, fontSize = 11, isBold = false) => {
      doc.setFontSize(fontSize)
      if (isBold) doc.setFont(undefined, 'bold')
      else doc.setFont(undefined, 'normal')
      const lines = doc.splitTextToSize(text, 170)
      lines.forEach(line => {
        if (yPosition > pageHeight - margin) { doc.addPage(); yPosition = 20 }
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

  const builderTabs = [
    { id: 'personal', label: 'Personal', icon: '👤' },
    { id: 'summary', label: 'Summary', icon: '📝' },
    { id: 'experience', label: 'Experience', icon: '💼' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'skills', label: 'Skills', icon: '⚡' }
  ]

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

      {/* HOME PAGE */}
      {currentView === 'home' && !analysisResult && (
        <div className="hero">
          <h1>Optimize Your Resume with AI</h1>
          <p>Get instant feedback and actionable insights to make your resume stand out</p>
          
          <div className={`upload-area ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
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
            <p>Paste the job description to get tailored feedback and see how well your resume matches</p>
            <textarea className="job-description-input" placeholder="Paste the job description here to compare your resume against specific requirements..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} disabled={isUploading} rows={8} />
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

      {/* ENHANCED RESUME BUILDER */}
      {currentView === 'builder' && (
        <div className="builder-page">
          <div className="builder-header">
            <h1>Resume Builder</h1>
            <p>Create a professional, ATS-friendly resume in minutes</p>
          </div>

          <div className="builder-progress">
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${getBuilderProgress()}%` }}></div>
            </div>
            <span className="progress-text">{getBuilderProgress()}% Complete</span>
          </div>

          <div className="builder-layout">
            {/* Left Side - Form */}
            <div className="builder-form-section">
              <div className="builder-tabs">
                {builderTabs.map((tab, index) => (
                  <button 
                    key={tab.id}
                    className={`builder-tab ${builderTab === tab.id ? 'active' : ''}`} 
                    onClick={() => setBuilderTab(tab.id)}
                  >
                    <span className="tab-number">{index + 1}</span>
                    <span className="tab-icon">{tab.icon}</span>
                    <span className="tab-label">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="builder-form-content">
                {/* Personal Info Tab */}
                {builderTab === 'personal' && (
                  <div className="form-tab-content">
                    <div className="form-tab-header">
                      <h2>Personal Information</h2>
                      <p>Let employers know how to reach you</p>
                    </div>
                    
                    <div className="form-group">
                      <label>Full Name <span className="required">*</span></label>
                      <input type="text" placeholder="John Doe" value={resumeData.personalInfo.name} onChange={(e) => updatePersonalInfo('name', e.target.value)} />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Email <span className="required">*</span></label>
                        <input type="email" placeholder="john@example.com" value={resumeData.personalInfo.email} onChange={(e) => updatePersonalInfo('email', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Phone <span className="required">*</span></label>
                        <input type="tel" placeholder="(555) 123-4567" value={resumeData.personalInfo.phone} onChange={(e) => updatePersonalInfo('phone', e.target.value)} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Location</label>
                      <input type="text" placeholder="City, State" value={resumeData.personalInfo.location} onChange={(e) => updatePersonalInfo('location', e.target.value)} />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>LinkedIn</label>
                        <input type="url" placeholder="linkedin.com/in/johndoe" value={resumeData.personalInfo.linkedin} onChange={(e) => updatePersonalInfo('linkedin', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Website / Portfolio</label>
                        <input type="url" placeholder="johndoe.com" value={resumeData.personalInfo.website} onChange={(e) => updatePersonalInfo('website', e.target.value)} />
                      </div>
                    </div>

                    <div className="form-nav">
                      <div></div>
                      <button className="btn-next" onClick={() => setBuilderTab('summary')}>Next: Summary →</button>
                    </div>
                  </div>
                )}

                {/* Summary Tab */}
                {builderTab === 'summary' && (
                  <div className="form-tab-content">
                    <div className="form-tab-header">
                      <h2>Professional Summary</h2>
                      <p>Write a brief overview of your experience and goals (2-4 sentences)</p>
                    </div>
                    
                    <div className="form-group">
                      <label>Summary</label>
                      <textarea 
                        placeholder="Results-driven professional with X years of experience in... Skilled in... Seeking to leverage my expertise in..."
                        value={resumeData.summary}
                        onChange={(e) => updateSummary(e.target.value)}
                        rows={6}
                      />
                      <div className="char-count">{resumeData.summary.length} / 500 characters</div>
                    </div>

                    <div className="form-nav">
                      <button className="btn-back" onClick={() => setBuilderTab('personal')}>← Back</button>
                      <button className="btn-next" onClick={() => setBuilderTab('experience')}>Next: Experience →</button>
                    </div>
                  </div>
                )}

                {/* Experience Tab */}
                {builderTab === 'experience' && (
                  <div className="form-tab-content">
                    <div className="form-tab-header">
                      <h2>Work Experience</h2>
                      <p>List your relevant work history, starting with the most recent</p>
                      <button className="btn-add" onClick={addExperience}>+ Add Position</button>
                    </div>

                    {resumeData.experience.map((exp, index) => (
                      <div key={index} className="entry-card">
                        <div className="entry-card-header">
                          <span className="entry-number">Position {index + 1}</span>
                          {resumeData.experience.length > 1 && (
                            <button className="btn-remove" onClick={() => removeExperience(index)}>Remove</button>
                          )}
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Job Title <span className="required">*</span></label>
                            <input type="text" placeholder="Software Engineer" value={exp.position} onChange={(e) => updateExperience(index, 'position', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Company <span className="required">*</span></label>
                            <input type="text" placeholder="Tech Company Inc." value={exp.company} onChange={(e) => updateExperience(index, 'company', e.target.value)} />
                          </div>
                        </div>

                        <div className="form-row three-col">
                          <div className="form-group">
                            <label>Location</label>
                            <input type="text" placeholder="City, State" value={exp.location} onChange={(e) => updateExperience(index, 'location', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Start Date</label>
                            <input type="text" placeholder="Jan 2020" value={exp.startDate} onChange={(e) => updateExperience(index, 'startDate', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>End Date</label>
                            <input type="text" placeholder="Present" value={exp.endDate} onChange={(e) => updateExperience(index, 'endDate', e.target.value)} />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Description</label>
                          <textarea 
                            placeholder="• Led development of new features&#10;• Increased efficiency by 30%&#10;• Collaborated with cross-functional teams"
                            value={exp.description}
                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                            rows={4}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="form-nav">
                      <button className="btn-back" onClick={() => setBuilderTab('summary')}>← Back</button>
                      <button className="btn-next" onClick={() => setBuilderTab('education')}>Next: Education →</button>
                    </div>
                  </div>
                )}

                {/* Education Tab */}
                {builderTab === 'education' && (
                  <div className="form-tab-content">
                    <div className="form-tab-header">
                      <h2>Education</h2>
                      <p>Add your educational background</p>
                      <button className="btn-add" onClick={addEducation}>+ Add Education</button>
                    </div>

                    {resumeData.education.map((edu, index) => (
                      <div key={index} className="entry-card">
                        <div className="entry-card-header">
                          <span className="entry-number">Education {index + 1}</span>
                          {resumeData.education.length > 1 && (
                            <button className="btn-remove" onClick={() => removeEducation(index)}>Remove</button>
                          )}
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>School / University <span className="required">*</span></label>
                            <input type="text" placeholder="University Name" value={edu.school} onChange={(e) => updateEducation(index, 'school', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Degree</label>
                            <input type="text" placeholder="Bachelor's" value={edu.degree} onChange={(e) => updateEducation(index, 'degree', e.target.value)} />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Field of Study</label>
                            <input type="text" placeholder="Computer Science" value={edu.field} onChange={(e) => updateEducation(index, 'field', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Graduation Date</label>
                            <input type="text" placeholder="May 2024" value={edu.graduationDate} onChange={(e) => updateEducation(index, 'graduationDate', e.target.value)} />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Location</label>
                            <input type="text" placeholder="City, State" value={edu.location} onChange={(e) => updateEducation(index, 'location', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>GPA (Optional)</label>
                            <input type="text" placeholder="3.8" value={edu.gpa} onChange={(e) => updateEducation(index, 'gpa', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="form-nav">
                      <button className="btn-back" onClick={() => setBuilderTab('experience')}>← Back</button>
                      <button className="btn-next" onClick={() => setBuilderTab('skills')}>Next: Skills →</button>
                    </div>
                  </div>
                )}

                {/* Skills Tab */}
                {builderTab === 'skills' && (
                  <div className="form-tab-content">
                    <div className="form-tab-header">
                      <h2>Skills</h2>
                      <p>Highlight your technical and soft skills</p>
                    </div>

                    <div className="form-group">
                      <label>Technical Skills</label>
                      <textarea 
                        placeholder="Python, JavaScript, React, SQL, AWS, Git, Docker..."
                        value={resumeData.skills.technical}
                        onChange={(e) => updateSkills('technical', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="form-group">
                      <label>Soft Skills</label>
                      <textarea 
                        placeholder="Leadership, Communication, Problem-solving, Teamwork, Time Management..."
                        value={resumeData.skills.soft}
                        onChange={(e) => updateSkills('soft', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="form-group">
                      <label>Languages</label>
                      <input 
                        type="text"
                        placeholder="English (Native), Spanish (Fluent), French (Basic)"
                        value={resumeData.skills.languages}
                        onChange={(e) => updateSkills('languages', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Certifications</label>
                      <input 
                        type="text"
                        placeholder="AWS Certified, Google IT Support, PMP, CompTIA A+..."
                        value={resumeData.skills.certifications}
                        onChange={(e) => updateSkills('certifications', e.target.value)}
                      />
                    </div>

                    <div className="form-nav">
                      <button className="btn-back" onClick={() => setBuilderTab('education')}>← Back</button>
                      <button className="btn-download-main" onClick={downloadResumeAsPDF}>📥 Download Resume PDF</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Live Preview */}
            <div className="builder-preview-section">
              <div className="preview-header">
                <h3>Live Preview</h3>
                <button className="btn-download-small" onClick={downloadResumeAsPDF}>Download PDF</button>
              </div>
              
              <div className="resume-paper">
                {/* Header */}
                <div className="resume-header">
                  <h1 className="resume-name">{resumeData.personalInfo.name || 'Your Name'}</h1>
                  <div className="resume-contact">
                    {[resumeData.personalInfo.email, resumeData.personalInfo.phone, resumeData.personalInfo.location].filter(Boolean).join(' • ') || 'email@example.com • (555) 123-4567 • City, State'}
                  </div>
                  {(resumeData.personalInfo.linkedin || resumeData.personalInfo.website) && (
                    <div className="resume-links">
                      {resumeData.personalInfo.linkedin && <span>{resumeData.personalInfo.linkedin}</span>}
                      {resumeData.personalInfo.linkedin && resumeData.personalInfo.website && <span> • </span>}
                      {resumeData.personalInfo.website && <span>{resumeData.personalInfo.website}</span>}
                    </div>
                  )}
                </div>

                {/* Summary */}
                {resumeData.summary && (
                  <div className="resume-section">
                    <h2 className="resume-section-title">Professional Summary</h2>
                    <p className="resume-text">{resumeData.summary}</p>
                  </div>
                )}

                {/* Experience */}
                {resumeData.experience.some(exp => exp.position || exp.company) && (
                  <div className="resume-section">
                    <h2 className="resume-section-title">Experience</h2>
                    {resumeData.experience.map((exp, index) => (
                      exp.position || exp.company ? (
                        <div key={index} className="resume-entry">
                          <div className="resume-entry-header">
                            <strong>{exp.position}{exp.position && exp.company && ' | '}{exp.company}</strong>
                            <span className="resume-date">{exp.startDate}{exp.startDate && exp.endDate && ' - '}{exp.endDate}</span>
                          </div>
                          {exp.location && <div className="resume-location">{exp.location}</div>}
                          {exp.description && <p className="resume-description">{exp.description}</p>}
                        </div>
                      ) : null
                    ))}
                  </div>
                )}

                {/* Education */}
                {resumeData.education.some(edu => edu.school || edu.degree) && (
                  <div className="resume-section">
                    <h2 className="resume-section-title">Education</h2>
                    {resumeData.education.map((edu, index) => (
                      edu.school || edu.degree ? (
                        <div key={index} className="resume-entry">
                          <div className="resume-entry-header">
                            <strong>{edu.degree}{edu.field && ` in ${edu.field}`}{edu.school && ` | ${edu.school}`}</strong>
                            <span className="resume-date">{edu.graduationDate}</span>
                          </div>
                          {edu.location && <div className="resume-location">{edu.location}</div>}
                          {edu.gpa && <p className="resume-description">GPA: {edu.gpa}</p>}
                        </div>
                      ) : null
                    ))}
                  </div>
                )}

                {/* Skills */}
                {(resumeData.skills.technical || resumeData.skills.soft || resumeData.skills.languages || resumeData.skills.certifications) && (
                  <div className="resume-section">
                    <h2 className="resume-section-title">Skills</h2>
                    {resumeData.skills.technical && <p className="resume-text"><strong>Technical:</strong> {resumeData.skills.technical}</p>}
                    {resumeData.skills.soft && <p className="resume-text"><strong>Soft Skills:</strong> {resumeData.skills.soft}</p>}
                    {resumeData.skills.languages && <p className="resume-text"><strong>Languages:</strong> {resumeData.skills.languages}</p>}
                    {resumeData.skills.certifications && <p className="resume-text"><strong>Certifications:</strong> {resumeData.skills.certifications}</p>}
                  </div>
                )}

                {/* Empty State */}
                {!resumeData.personalInfo.name && !resumeData.summary && !resumeData.experience[0].position && !resumeData.education[0].school && !resumeData.skills.technical && (
                  <div className="resume-empty">
                    <p>Start filling out the form to see your resume preview here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEATURES PAGE */}
      {currentView === 'features' && (
        <div className="features-page">
          <h1>Features</h1>
          <p>Powerful tools to help you land your dream job</p>
          <div className="features-grid">
            <div className="feature-card"><div className="feature-icon">🤖</div><h3>AI-Powered Analysis</h3><p>Get instant feedback on your resume using advanced GPT-3.5 AI technology that understands what recruiters look for.</p></div>
            <div className="feature-card"><div className="feature-icon">🎯</div><h3>Job Description Matching</h3><p>Compare your resume against specific job postings to see exactly which keywords you're missing.</p></div>
            <div className="feature-card"><div className="feature-icon">🔑</div><h3>Keyword Extraction</h3><p>Automatically identifies technical skills and action verbs in your resume.</p></div>
            <div className="feature-card"><div className="feature-icon">📊</div><h3>Section-by-Section Scoring</h3><p>Detailed analysis of your professional summary, experience, skills, and education.</p></div>
            <div className="feature-card"><div className="feature-icon">✅</div><h3>ATS Compatibility</h3><p>Check if your resume will pass Applicant Tracking Systems.</p></div>
            <div className="feature-card"><div className="feature-icon">📝</div><h3>Resume Builder</h3><p>Create professional, ATS-friendly resumes from scratch with our guided builder.</p></div>
          </div>
          <div className="cta-section">
            <h2>Ready to optimize your resume?</h2>
            <button className="btn-primary" onClick={() => setCurrentView('home')}>Get Started Now</button>
          </div>
        </div>
      )}

      {/* HISTORY PAGE */}
      {currentView === 'history' && (
        <div className="history-view">
          <h1>Analysis History</h1>
          <p>View your past resume analyses</p>
          <div className="history-header">
            <button className="btn-primary" onClick={() => setCurrentView('home')}>New Analysis</button>
          </div>
          {isLoadingHistory ? (
            <div className="loading-container"><div className="spinner"></div><p>Loading history...</p></div>
          ) : analysisHistory.length === 0 ? (
            <div className="empty-history"><p>No analyses yet. Upload your first resume to get started!</p><button className="btn-primary" onClick={() => setCurrentView('home')}>Upload Resume</button></div>
          ) : (
            <div className="history-list">{analysisHistory.map((item) => (
              <div key={item.id} className="history-item"><div className="history-item-header"><h3>📄 {item.filename}</h3><div className="history-score">{item.overall_score}/100</div></div></div>
            ))}</div>
          )}
        </div>
      )}

      {/* RESULTS PAGE */}
      {analysisResult && (
        <div className="analysis-results">
          <div className="results-header">
            <h2>Analysis Results</h2>
            <button className="btn-secondary" onClick={handleStartNewAnalysis}>Start New Analysis</button>
          </div>

          <div className="score-card">
            <div className="score-circle"><div className="score-number">{analysisResult.overall_score}</div><div className="score-label">/ 100</div></div>
            <h3>Overall Score</h3>
          </div>

          {analysisResult.job_match && (
            <div className="job-match-card">
              <h3>🎯 Job Match Analysis</h3>
              <div className="match-percentage"><div className="match-circle"><div className="match-number">{analysisResult.job_match.match_percentage}%</div></div><p>Match Rate</p></div>
              {analysisResult.job_match.matching_keywords?.length > 0 && (
                <div className="keyword-match-section"><h4>✅ Matching Keywords ({analysisResult.job_match.matching_keywords.length})</h4><div className="keyword-tags">{analysisResult.job_match.matching_keywords.map((keyword, index) => (<span key={index} className="keyword-tag matching-tag">{keyword}</span>))}</div></div>
              )}
              {analysisResult.job_match.missing_keywords?.length > 0 && (
                <div className="keyword-match-section"><h4>❌ Missing Keywords ({analysisResult.job_match.missing_keywords.length})</h4><div className="keyword-tags">{analysisResult.job_match.missing_keywords.map((keyword, index) => (<span key={index} className="keyword-tag missing-tag">{keyword}</span>))}</div></div>
              )}
            </div>
          )}

          <div className="sections-grid">
            {analysisResult.summary && (<div className="section-card" style={{borderLeftColor: getStatusColor(analysisResult.summary.status)}}><h3>📝 Professional Summary</h3><div className="section-score">Score: {analysisResult.summary.score}/100</div><p>{analysisResult.summary.feedback}</p></div>)}
            {analysisResult.experience && (<div className="section-card" style={{borderLeftColor: getStatusColor(analysisResult.experience.status)}}><h3>💼 Work Experience</h3><div className="section-score">Score: {analysisResult.experience.score}/100</div><p>{analysisResult.experience.feedback}</p></div>)}
            {analysisResult.skills && (<div className="section-card" style={{borderLeftColor: getStatusColor(analysisResult.skills.status)}}><h3>⚡ Skills</h3><div className="section-score">Score: {analysisResult.skills.score}/100</div><p>{analysisResult.skills.feedback}</p></div>)}
            {analysisResult.education && (<div className="section-card" style={{borderLeftColor: getStatusColor(analysisResult.education.status)}}><h3>🎓 Education</h3><div className="section-score">Score: {analysisResult.education.score}/100</div><p>{analysisResult.education.feedback}</p></div>)}
          </div>

          {analysisResult.ats_score && (<div className="ats-card"><h3>🤖 ATS Compatibility Score</h3><div className="ats-score">{analysisResult.ats_score}/100</div></div>)}
          {analysisResult.key_improvements && (<div className="improvements-card"><h3>💡 Key Improvements</h3><ul>{analysisResult.key_improvements.map((improvement, index) => (<li key={index}>{improvement}</li>))}</ul></div>)}
        </div>
      )}

      <div className="api-status">
        <p><strong>Status:</strong> {apiStatus}</p>
      </div>
    </div>
  )
}

export default App