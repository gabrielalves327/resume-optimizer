from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv
import PyPDF2
from docx import Document
import sqlite3
import json
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'docx'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
DATABASE = 'resume_optimizer.db'

# Create uploads folder if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Common technical skills and keywords to look for
TECH_KEYWORDS = {
    'languages': ['Python', 'JavaScript', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'TypeScript', 'Go', 'Rust', 'SQL', 'HTML', 'CSS'],
    'frameworks': ['React', 'Angular', 'Vue', 'Django', 'Flask', 'Spring', 'Node.js', 'Express', 'Laravel', 'Rails', 'ASP.NET', 'jQuery'],
    'tools': ['Git', 'Docker', 'Kubernetes', 'Jenkins', 'AWS', 'Azure', 'GCP', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch'],
    'concepts': ['Agile', 'Scrum', 'DevOps', 'CI/CD', 'API', 'REST', 'GraphQL', 'Microservices', 'Machine Learning', 'AI', 'Data Analysis']
}

ACTION_VERBS = [
    'Led', 'Managed', 'Developed', 'Created', 'Implemented', 'Designed', 'Built', 'Improved', 
    'Increased', 'Reduced', 'Achieved', 'Delivered', 'Launched', 'Collaborated', 'Coordinated',
    'Optimized', 'Streamlined', 'Automated', 'Analyzed', 'Established', 'Spearheaded'
]

def init_database():
    """Initialize SQLite database with analyses table"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            upload_date TEXT NOT NULL,
            overall_score INTEGER,
            analysis_data TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized")

def save_analysis_to_db(filename, analysis_json):
    """Save analysis result to database"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # Parse the analysis to get overall score
        analysis_data = json.loads(analysis_json)
        overall_score = analysis_data.get('overall_score', 0)
        
        cursor.execute('''
            INSERT INTO analyses (filename, upload_date, overall_score, analysis_data)
            VALUES (?, ?, ?, ?)
        ''', (filename, datetime.now().isoformat(), overall_score, analysis_json))
        
        conn.commit()
        analysis_id = cursor.lastrowid
        conn.close()
        
        print(f"✅ Analysis saved to database with ID: {analysis_id}")
        return analysis_id
    except Exception as e:
        print(f"❌ Error saving to database: {e}")
        return None

def get_all_analyses():
    """Get all analyses from database"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, filename, upload_date, overall_score, analysis_data
            FROM analyses
            ORDER BY upload_date DESC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        analyses = []
        for row in rows:
            analyses.append({
                'id': row[0],
                'filename': row[1],
                'upload_date': row[2],
                'overall_score': row[3],
                'analysis_data': json.loads(row[4])
            })
        
        return analyses
    except Exception as e:
        print(f"❌ Error fetching analyses: {e}")
        return []

def extract_keywords(resume_text):
    """Extract important keywords from resume"""
    found_keywords = {
        'technical_skills': [],
        'action_verbs': [],
        'total_count': 0
    }
    
    # Extract technical skills
    for category, keywords in TECH_KEYWORDS.items():
        for keyword in keywords:
            # Case insensitive search with word boundaries
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, resume_text, re.IGNORECASE):
                found_keywords['technical_skills'].append(keyword)
    
    # Extract action verbs
    for verb in ACTION_VERBS:
        pattern = r'\b' + re.escape(verb) + r'\b'
        if re.search(pattern, resume_text, re.IGNORECASE):
            found_keywords['action_verbs'].append(verb)
    
    # Remove duplicates and sort
    found_keywords['technical_skills'] = sorted(list(set(found_keywords['technical_skills'])))
    found_keywords['action_verbs'] = sorted(list(set(found_keywords['action_verbs'])))
    found_keywords['total_count'] = len(found_keywords['technical_skills']) + len(found_keywords['action_verbs'])
    
    return found_keywords

def extract_all_keywords_from_text(text):
    """Extract all possible keywords from any text"""
    all_keywords = []
    
    # Extract technical skills
    for category, keywords in TECH_KEYWORDS.items():
        for keyword in keywords:
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                all_keywords.append(keyword)
    
    # Remove duplicates and sort
    return sorted(list(set(all_keywords)))

def compare_resume_to_job(resume_keywords, job_description):
    """Compare resume keywords against job description"""
    if not job_description:
        return None
    
    # Extract keywords from job description
    job_keywords = extract_all_keywords_from_text(job_description)
    
    if not job_keywords:
        return {
            'match_percentage': 0,
            'matching_keywords': [],
            'missing_keywords': [],
            'job_keywords_count': 0,
            'resume_keywords_count': len(resume_keywords['technical_skills'])
        }
    
    # Get all resume technical keywords
    resume_tech_keywords = [k.lower() for k in resume_keywords['technical_skills']]
    job_keywords_lower = [k.lower() for k in job_keywords]
    
    # Find matching and missing keywords
    matching = [k for k in job_keywords if k.lower() in resume_tech_keywords]
    missing = [k for k in job_keywords if k.lower() not in resume_tech_keywords]
    
    # Calculate match percentage
    match_percentage = int((len(matching) / len(job_keywords)) * 100) if job_keywords else 0
    
    return {
        'match_percentage': match_percentage,
        'matching_keywords': sorted(matching),
        'missing_keywords': sorted(missing),
        'job_keywords_count': len(job_keywords),
        'resume_keywords_count': len(resume_tech_keywords)
    }

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(filepath):
    """Extract text from PDF file"""
    text = ""
    try:
        with open(filepath, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text()
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
    return text

def extract_text_from_docx(filepath):
    """Extract text from DOCX file"""
    text = ""
    try:
        doc = Document(filepath)
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
    except Exception as e:
        print(f"Error extracting DOCX text: {e}")
    return text

def analyze_resume_with_ai(resume_text, job_description=None):
    """Send resume to OpenAI for analysis"""
    
    if job_description:
        prompt = f"""You are an expert resume reviewer and career coach. Analyze the following resume against this job description and provide detailed feedback.

Job Description:
{job_description}

Resume:
{resume_text}

Please provide:
1. An overall score from 0-100 based on how well the resume matches the job
2. Analysis of each major section (Summary, Experience, Skills, Education)
3. Specific suggestions for improvement to better match the job requirements
4. ATS compatibility assessment

Format your response as JSON with this structure:
{{
    "overall_score": <number 0-100>,
    "summary": {{
        "score": <number 0-100>,
        "status": "good/needs_work/critical",
        "feedback": "<detailed feedback>"
    }},
    "experience": {{
        "score": <number 0-100>,
        "status": "good/needs_work/critical",
        "feedback": "<detailed feedback>"
    }},
    "skills": {{
        "score": <number 0-100>,
        "status": "good/needs_work/critical",
        "feedback": "<detailed feedback>"
    }},
    "education": {{
        "score": <number 0-100>,
        "status": "good/needs_work/critical",
        "feedback": "<detailed feedback>"
    }},
    "ats_score": <number 0-100>,
    "key_improvements": ["improvement 1", "improvement 2", "improvement 3"]
}}"""
    else:
        prompt = f"""You are an expert resume reviewer and career coach. Analyze the following resume and provide detailed feedback.

Resume:
{resume_text}

Please provide:
1. An overall score from 0-100
2. Analysis of each major section (Summary, Experience, Skills, Education)
3. Specific suggestions for improvement
4. ATS compatibility assessment

Format your response as JSON with this structure:
{{
    "overall_score": <number 0-100>,
    "summary": {{
        "score": <number 0-100>,
        "status": "good/needs_work/critical",
        "feedback": "<detailed feedback>"
    }},
    "experience": {{
        "score": <number 0-100>,
        "status": "good/needs_work/critical",
        "feedback": "<detailed feedback>"
    }},
    "skills": {{
        "score": <number 0-100>,
        "status": "good/needs_work/critical",
        "feedback": "<detailed feedback>"
    }},
    "education": {{
        "score": <number 0-100>,
        "status": "good/needs_work/critical",
        "feedback": "<detailed feedback>"
    }},
    "ats_score": <number 0-100>,
    "key_improvements": ["improvement 1", "improvement 2", "improvement 3"]
}}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert resume reviewer. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"OpenAI API Error: {e}")
        return None

# Home route
@app.route('/')
def home():
    return jsonify({
        "message": "Resume Optimizer API is running!",
        "version": "1.0",
        "timestamp": datetime.now().isoformat()
    })

# Health check endpoint
@app.route('/api/health')
def health():
    return jsonify({
        "status": "healthy",
        "service": "Resume Optimizer API",
        "version": "1.0",
        "openai_connected": os.getenv('OPENAI_API_KEY') is not None
    })

# Upload and analyze endpoint
@app.route('/api/upload', methods=['POST'])
def upload_resume():
    """Handle resume file upload and analysis"""
    
    # Check if file is in request
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    
    # Check if file was selected
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF and DOCX files are allowed"}), 400
    
    # Get job description if provided
    job_description = request.form.get('job_description', '').strip()
    
    # Secure the filename
    filename = secure_filename(file.filename)
    
    # Save the file
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Get file size
    file_size = os.path.getsize(filepath)
    
    # Extract text based on file type
    file_extension = filename.rsplit('.', 1)[1].lower()
    
    if file_extension == 'pdf':
        resume_text = extract_text_from_pdf(filepath)
    elif file_extension == 'docx':
        resume_text = extract_text_from_docx(filepath)
    else:
        return jsonify({"error": "Unsupported file type"}), 400
    
    if not resume_text or len(resume_text.strip()) < 100:
        return jsonify({"error": "Could not extract enough text from resume. Please ensure the file contains readable text."}), 400
    
    # Extract keywords
    keywords = extract_keywords(resume_text)
    print(f"✅ Extracted {keywords['total_count']} keywords from resume")
    
    # Compare to job description if provided
    job_match = None
    if job_description:
        job_match = compare_resume_to_job(keywords, job_description)
        print(f"✅ Job match: {job_match['match_percentage']}%")
    
    # Analyze with AI
    print(f"Analyzing resume with {len(resume_text)} characters...")
    analysis_result = analyze_resume_with_ai(resume_text, job_description)
    
    if not analysis_result:
        return jsonify({"error": "AI analysis failed. Please try again."}), 500
    
    # Add keywords and job match to analysis result
    try:
        analysis_data = json.loads(analysis_result)
        analysis_data['keywords'] = keywords
        if job_match:
            analysis_data['job_match'] = job_match
        analysis_result = json.dumps(analysis_data)
    except:
        print("Could not add keywords to analysis")
    
    # Save to database
    analysis_id = save_analysis_to_db(filename, analysis_result)
    
    # Return success response with analysis
    return jsonify({
        "message": "File uploaded and analyzed successfully",
        "filename": filename,
        "size": file_size,
        "status": "analyzed",
        "analysis": analysis_result,
        "analysis_id": analysis_id
    }), 200

# History route - Get all analyses
@app.route('/api/history', methods=['GET'])
def get_history():
    """Get all saved analyses"""
    analyses = get_all_analyses()
    return jsonify({
        "count": len(analyses),
        "analyses": analyses
    }), 200

if __name__ == '__main__':
    print("🚀 Starting Resume Optimizer API...")
    print("📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"🤖 OpenAI API: {'Connected' if os.getenv('OPENAI_API_KEY') else 'Not configured'}")
    
    # Initialize database
    init_database()
    
    # Run on 0.0.0.0 to be accessible from internet (required for Render)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)