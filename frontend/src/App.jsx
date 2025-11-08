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
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a PDF or DOCX file only.'
    }

    // Check file size
    if (file.size > maxSize) {
      return 'File size must be less than 5MB.'
    }

    return null // No errors
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      processFile(file)
    }
  }

  // Handle drag and drop
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

  // Process and validate file
  const processFile = (file) => {
    // Reset messages
    setUploadError('')
    setUploadSuccess('')

    // Validate file
    const error = validateFile(file)
    if (error) {
      setUploadError(error)
      setSelectedFile(null)
      return
    }

    // File is valid
    setSelectedFile(file)
    setUploadSuccess(`✓ ${file.name} is ready to upload (${(file.size / 1024).toFixed(2)} KB)`)
  }

  // Handle upload button click - ACTUALLY UPLOADS TO BACKEND
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file first.')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadSuccess('')

    // Create form data
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      console.log('Sending file to backend...')
      
      // Send to backend
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      })

      console.log('Response received:', response)
      
      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        setUploadSuccess(`✓ ${data.message}! File: ${data.filename} (${(data.size / 1024).toFixed(2)} KB)`)
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
              Upload & Analyze
            </button>
          )}

          {isUploading && (
            <div className="uploading-message">
              ⏳ Uploading...
            </div>
          )}
        </div>

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