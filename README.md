\# Resume Optimizer 📄



An AI-powered resume analysis and optimization tool that helps job seekers create ATS-friendly resumes and get actionable feedback to improve their chances of landing interviews.



!\[Project Status](https://img.shields.io/badge/Status-Alpha-yellow)

!\[License](https://img.shields.io/badge/License-MIT-blue)

!\[Python](https://img.shields.io/badge/Python-3.12-green)

!\[React](https://img.shields.io/badge/React-18-blue)



---



\## 📖 Introduction



\*\*Resume Optimizer\*\* addresses a critical challenge faced by job seekers: creating resumes that successfully pass Applicant Tracking Systems (ATS) while catching recruiters' attention. Many qualified candidates get rejected simply because their resumes aren't optimized for automated screening systems.



This tool analyzes uploaded resumes, provides detailed feedback on formatting, content, and keyword optimization, and compares resumes against specific job descriptions to identify gaps and opportunities for improvement.



\### Why is it useful?



\- \*\*For Students\*\*: Preparing for their first job search and unsure how to structure a professional resume

\- \*\*For Career Changers\*\*: Transitioning to new industries and need to highlight transferable skills

\- \*\*For Active Job Seekers\*\*: Want data-driven insights to improve their application success rate

\- \*\*For Everyone\*\*: Seeking to understand how ATS systems evaluate resumes



---



\## ✨ Features



\### Current Features (Week 2)



\- \*\*File Upload with Validation\*\*

&nbsp; - Drag-and-drop or click-to-upload interface

&nbsp; - Accepts PDF and DOCX formats only

&nbsp; - File size validation (max 5MB)

&nbsp; - Real-time client-side and server-side validation

&nbsp; - Clear error messaging for invalid uploads



\- \*\*Backend API\*\*

&nbsp; - RESTful Flask API for file handling

&nbsp; - Secure file storage with filename sanitization

&nbsp; - CORS-enabled for frontend communication

&nbsp; - Health check endpoints for monitoring



\- \*\*Responsive UI\*\*

&nbsp; - Clean, professional landing page

&nbsp; - Real-time backend connectivity status

&nbsp; - Color-coded feedback (success/error states)

&nbsp; - Mobile-responsive design



\### Planned Features (Roadmap)



\- \*\*AI-Powered Analysis\*\* (Week 3-4)

&nbsp; - Resume scoring (0-100 scale)

&nbsp; - Section-by-section feedback (Summary, Experience, Skills, Education)

&nbsp; - ATS compatibility assessment

&nbsp; - Keyword density analysis



\- \*\*Job Description Matching\*\* (Week 5-6)

&nbsp; - Side-by-side resume vs. job description comparison

&nbsp; - Missing keyword identification

&nbsp; - Skills gap analysis

&nbsp; - Tailored optimization suggestions



\- \*\*Progress Tracking\*\* (Week 7-8)

&nbsp; - Historical analysis storage

&nbsp; - Score improvement visualization

&nbsp; - Version comparison

&nbsp; - Download optimized resumes



\- \*\*User Accounts\*\* (Future)

&nbsp; - Save multiple resume versions

&nbsp; - Track application success rates

&nbsp; - Personalized recommendations



---



\## 🛠️ Technologies



\### Frontend

\- \*\*React 18\*\* - UI framework

\- \*\*Vite 7.1.12\*\* - Build tool and dev server

\- \*\*CSS3\*\* - Styling and animations

\- \*\*Fetch API\*\* - HTTP requests to backend



\### Backend

\- \*\*Python 3.12\*\* - Core language

\- \*\*Flask 3.0.0\*\* - Web framework

\- \*\*Flask-CORS 4.0.0\*\* - Cross-origin resource sharing

\- \*\*Werkzeug\*\* - File handling utilities



\### APIs \& Services (Planned)

\- \*\*OpenAI API\*\* - Resume analysis and scoring (Integration in progress)

\- \*\*Natural Language Processing\*\* - Text extraction and analysis



\### Development Tools

\- \*\*Git/GitHub\*\* - Version control

\- \*\*Jira\*\* - Project management and sprint planning

\- \*\*npm\*\* - Frontend package management

\- \*\*pip\*\* - Python package management



---



\## 📦 Installation (End User)



\### Prerequisites

\- \*\*Node.js\*\* (v18 or higher) - \[Download here](https://nodejs.org/)

\- \*\*Python 3.12\*\* - \[Download here](https://www.python.org/downloads/)

\- \*\*Git\*\* - \[Download here](https://git-scm.com/)



\### Step 1: Clone the Repository

```bash

git clone https://github.com/gabrielalves327/resume-optimizer.git

cd resume-optimizer

```



\### Step 2: Set Up Backend

```bash

cd backend

python -m venv venv



\# Windows

venv\\Scripts\\activate



\# Mac/Linux

source venv/bin/activate



pip install -r requirements.txt

```



\### Step 3: Set Up Frontend

```bash

cd ../frontend

npm install

```



\### Step 4: Run the Application



\*\*Terminal 1 - Backend:\*\*

```bash

cd backend

venv\\Scripts\\activate  # Windows

python app.py

```

Backend will run on `http://localhost:5000`



\*\*Terminal 2 - Frontend:\*\*

```bash

cd frontend

npm run dev

```

Frontend will run on `http://localhost:5173`



\### Step 5: Use the Application

1\. Open your browser to `http://localhost:5173`

2\. Click "Choose File" or drag-and-drop your resume (PDF or DOCX)

3\. Click "Upload \& Analyze"

4\. View your results (AI analysis coming in Week 3!)



---



\## 💻 Development Setup



\### For New Developers



This section explains how to set up the development environment and understand the project structure.



\### Project Structure

```

resume-optimizer/

├── frontend/              # React application

│   ├── src/

│   │   ├── App.jsx       # Main React component

│   │   ├── App.css       # Styling

│   │   └── main.jsx      # React entry point

│   ├── public/           # Static assets

│   ├── package.json      # Frontend dependencies

│   └── vite.config.js    # Vite configuration

│

├── backend/              # Flask API

│   ├── app.py           # Main Flask application

│   ├── requirements.txt # Python dependencies

│   ├── uploads/         # Uploaded resume storage

│   └── venv/            # Virtual environment (not in git)

│

├── README.md            # This file

└── .gitignore          # Git ignore rules

```



\### Development Workflow



\#### 1. Branch Strategy

\- `main` - Production-ready code

\- `development` - Active development branch

\- Feature branches - For specific tasks



\#### 2. Making Changes



\*\*Frontend Changes:\*\*

1\. Navigate to `frontend/`

2\. Edit files in `src/`

3\. Vite hot-reloads automatically

4\. Test in browser at `localhost:5173`



\*\*Backend Changes:\*\*

1\. Navigate to `backend/`

2\. Activate virtual environment

3\. Edit `app.py` or create new modules

4\. Flask auto-reloads in debug mode

5\. Test endpoints at `localhost:5000`



\#### 3. Git Workflow

```bash

\# Create feature branch

git checkout -b feature/your-feature-name



\# Make changes and commit

git add .

git commit -m "\[JIRA-ID] Brief description of changes"



\# Push to GitHub

git push origin feature/your-feature-name



\# Merge to development when complete

git checkout development

git merge feature/your-feature-name

git push origin development

```



\#### 4. Running Tests

```bash

\# Frontend (when tests are added)

cd frontend

npm test



\# Backend (when tests are added)

cd backend

pytest

```



\### Environment Variables (Future)



Create a `.env` file in the `backend/` directory:

```env

OPENAI\_API\_KEY=your\_api\_key\_here

FLASK\_ENV=development

MAX\_FILE\_SIZE=5242880

```



\### Common Issues \& Solutions



\*\*Issue: Flask won't start - "No module named 'flask'"\*\*

\- Solution: Activate virtual environment first: `venv\\Scripts\\activate`



\*\*Issue: React shows blank page\*\*

\- Solution: Check browser console (F12) for errors. Ensure backend is running.



\*\*Issue: CORS errors when uploading\*\*

\- Solution: Verify Flask-CORS is installed and backend is running on port 5000



\*\*Issue: Files not uploading\*\*

\- Solution: Check that `uploads/` folder exists in backend directory



\### Adding New Features



1\. Create Jira task for the feature

2\. Create feature branch from `development`

3\. Implement feature with tests

4\. Test locally (both frontend and backend)

5\. Commit with descriptive message

6\. Push and create pull request

7\. Mark Jira task complete



---



\## 📄 License



This project is licensed under the \*\*MIT License\*\*.



```

MIT License



Copyright (c) 2025 Gabriel Alves



Permission is hereby granted, free of charge, to any person obtaining a copy

of this software and associated documentation files (the "Software"), to deal

in the Software without restriction, including without limitation the rights

to use, copy, modify, merge, publish, distribute, sublicense, and/or sell

copies of the Software, and to permit persons to whom the Software is

furnished to do so, subject to the following conditions:



The above copyright notice and this permission notice shall be included in all

copies or substantial portions of the Software.



THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR

IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,

FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE

AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER

LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,

OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE

SOFTWARE.

```



---



\## 👥 Contributors



\### Project Team

\- \*\*Gabriel Alves\*\* - \*Lead Developer\* - \[GitHub](https://github.com/gabrielalves327)



\### Acknowledgments

\- Full Sail University - Capstone Program

\- OpenAI - API for resume analysis (integration planned)

\- React and Flask communities for excellent documentation



\*\*Project Maintainer:\*\* Gabriel Alves (gahftw@hotmail.com)



---



\## 🚀 Project Status



\*\*Current Status:\*\* \*\*Alpha Development\*\*



\### What's Working:

✅ Frontend UI with file upload  

✅ Client-side validation (file type, size)  

✅ Backend API endpoints  

✅ File storage and handling  

✅ CORS-enabled communication  



\### In Progress:

🔨 OpenAI API integration  

🔨 Resume text extraction  

🔨 AI-powered analysis engine  



\### Coming Soon:

📅 Score calculation  

📅 Section-by-section feedback  

📅 Job description matching  

📅 User dashboard  

📅 Historical tracking  



\### Version History

\- \*\*v0.2.0\*\* (Week 2) - File upload and backend API

\- \*\*v0.1.0\*\* (Week 1) - Initial project setup and UI



---



\## 🛟 Support



\### Getting Help

\- \*\*Issues\*\*: Report bugs or request features via \[GitHub Issues](https://github.com/gabrielalves327/resume-optimizer/issues)

\- \*\*Email\*\*: gahftw@hotmail.com

\- \*\*Documentation\*\*: This README and inline code comments



\### Development Community

\- Full Sail University Capstone cohort discussions

\- Weekly build reviews with instructor



---



\## 🗺️ Roadmap



\### Week 3-4: Core Analysis Features

\- \[ ] Integrate OpenAI API

\- \[ ] Implement resume text extraction (PDF/DOCX parsing)

\- \[ ] Create AI prompt for resume analysis

\- \[ ] Build scoring algorithm (0-100 scale)

\- \[ ] Parse AI responses for structured feedback



\### Week 5-6: Job Matching

\- \[ ] Build job description input interface

\- \[ ] Implement keyword matching algorithm

\- \[ ] Create comparison visualization

\- \[ ] Generate gap analysis and recommendations



\### Week 7-8: User Experience

\- \[ ] Database integration for storing analyses

\- \[ ] Historical tracking and progress charts

\- \[ ] Download optimized resume feature

\- \[ ] Improve UI/UX based on testing



\### Future Enhancements

\- \[ ] User authentication and accounts

\- \[ ] Multiple resume version management

\- \[ ] Industry-specific analysis templates

\- \[ ] Browser extension for LinkedIn profiles

\- \[ ] Mobile app (React Native)

\- \[ ] Batch processing for multiple resumes

\- \[ ] Integration with job boards (Indeed, LinkedIn)



---



\## 📝 Known Issues



\- File upload button styling inconsistent across browsers (minor)

\- Large files (>3MB) may take longer to process without progress indicator

\- AI analysis not yet implemented (planned for Week 3)



---



\## 💡 Code Examples



\### API Endpoints



\#### Health Check

```bash

GET http://localhost:5000/api/health



Response:

{

&nbsp; "status": "healthy",

&nbsp; "service": "Resume Optimizer API",

&nbsp; "version": "1.0"

}

```



\#### Upload Resume

```bash

POST http://localhost:5000/api/upload

Content-Type: multipart/form-data



Body: file (PDF or DOCX)



Success Response (200):

{

&nbsp; "message": "File uploaded successfully",

&nbsp; "filename": "resume.pdf",

&nbsp; "size": 98145,

&nbsp; "status": "uploaded",

&nbsp; "file\_path": "uploads/resume.pdf"

}



Error Response (400):

{

&nbsp; "error": "Only PDF and DOCX files are allowed"

}

```



\#### Frontend Usage Example

```javascript

// Upload file to backend

const formData = new FormData()

formData.append('file', selectedFile)



const response = await fetch('http://localhost:5000/api/upload', {

&nbsp; method: 'POST',

&nbsp; body: formData

})



const data = await response.json()

console.log(data.message) // "File uploaded successfully"

```



---



\## 📊 Project Metrics



\- \*\*Lines of Code\*\*: ~800 (and growing)

\- \*\*Commits\*\*: 15+

\- \*\*Development Time\*\*: 2 weeks

\- \*\*Team Size\*\*: 1 (Solo project)

\- \*\*Completion\*\*: ~25% (on track for February 2026 deadline)



---



\*\*Built with ❤️ by Gabriel Alves | Full Sail University Capstone 2025\*\*



\*Last Updated: November 7, 2025\*

