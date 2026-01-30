import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import './App.css';

const API_URL = 'https://resume-optimizer-production-e852.up.railway.app';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [currentView, setCurrentView] = useState('home');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return setUploadError('Please select a file.');
    setIsUploading(true);
    setUploadError('');
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (jobDescription.trim()) formData.append('job_description', jobDescription.trim());

    try {
      const response = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok) {
        setAnalysisResult(data.analysis);
        setCurrentView('results');
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch (err) {
      setUploadError('Connection to backend failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="App">
      <nav className="navbar">
        <div className="logo" onClick={() => setCurrentView('home')}>Resume AI</div>
      </nav>

      {currentView === 'home' && (
        <div className="hero">
          <h1>Optimize Your Resume</h1>
          <input type="file" onChange={handleFileSelect} />
          <textarea 
            placeholder="Paste Job Description..." 
            value={jobDescription} 
            onChange={(e) => setJobDescription(e.target.value)} 
          />
          <button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
          {uploadError && <p className="error">{uploadError}</p>}
        </div>
      )}

      {currentView === 'results' && analysisResult && (
        <div className="results">
          <h2>Score: {analysisResult.overall_score}%</h2>
          <div className="grid">
            <section><h3>Summary</h3><p>{analysisResult.summary}</p></section>
            <section><h3>Experience</h3><p>{analysisResult.experience}</p></section>
            <section><h3>Skills</h3><p>{analysisResult.skills}</p></section>
            <section>
              <h3>Improvements</h3>
              <ul>{analysisResult.key_improvements?.map((li, i) => <li key={i}>{li}</li>)}</ul>
            </section>
          </div>
          <button onClick={() => setCurrentView('home')}>Try Another</button>
        </div>
      )}
    </div>
  );
}

export default App;