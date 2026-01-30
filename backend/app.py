from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv
import PyPDF2
from docx import Document
import json
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)

# LOOSENED CORS: This allows your Vercel app to talk to Render without a handshake fail
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration
UPLOAD_FOLDER = '/tmp' # Use /tmp for Render free tier to avoid permission errors
ALLOWED_EXTENSIONS = {'pdf', 'docx'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Ensure upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Common technical skills and keywords
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

# --- DATABASE REMOVED FOR STABILITY ON RENDER FREE TIER ---

def extract_keywords(resume_text):
    found_keywords = {'technical_skills': [], 'action_verbs': [], 'total_count': 0}
    for category, keywords in TECH_KEYWORDS.items():
        for keyword in keywords:
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, resume_text, re.IGNORECASE):
                found_keywords['technical_skills'].append(keyword)
    for verb in ACTION_VERBS:
        pattern = r'\b' + re.escape(verb) + r'\b'
        if re.search(pattern, resume_text, re.IGNORECASE):
            found_keywords['action_verbs'].append(verb)
    found_keywords['technical_skills'] = sorted(list(set(found_keywords['technical_skills'])))
    found_keywords['action_verbs'] = sorted(list(set(found_keywords['action_verbs'])))
    found_keywords['total_count'] = len(found_keywords['technical_skills']) + len(found_keywords['action_verbs'])
    return found_keywords

def extract_all_keywords_from_text(text):
    all_keywords = []
    for category, keywords in TECH_KEYWORDS.items():
        for keyword in keywords:
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                all_keywords.append(keyword)
    return sorted(list(set(all_keywords)))

def compare_resume_to_job(resume_keywords, job_description):
    if not job_description: return None
    job_keywords = extract_all_keywords_from_text(job_description)
    if not job_keywords: return {'match_percentage': 0}
    resume_tech_keywords = [k.lower() for k in resume_keywords['technical_skills']]
    matching = [k for k in job_keywords if k.lower() in resume_tech_keywords]
    missing = [k for k in job_keywords if k.lower() not in resume_tech_keywords]
    match_percentage = int((len(matching) / len(job_keywords)) * 100)
    return {
        'match_percentage': match_percentage,
        'matching_keywords': sorted(matching),
        'missing_keywords': sorted(missing)
    }

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(filepath):
    text = ""
    try:
        with open(filepath, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() or ""
    except Exception as e: print(f"Error PDF: {e}")
    return text

def extract_text_from_docx(filepath):
    text = ""
    try:
        doc = Document(filepath)
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
    except Exception as e: print(f"Error DOCX: {e}")
    return text

def analyze_resume_with_ai(resume_text, job_description=None):
    prompt = f"Analyze this resume {'against the job description' if job_description else ''}. Resume: {resume_text}. Job: {job_description if job_description else 'N/A'}. Return JSON with overall_score, summary, experience, skills, education, and key_improvements."
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a resume reviewer. Respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return None

@app.route('/')
def home():
    return jsonify({"message": "API is live", "timestamp": datetime.now().isoformat()})

@app.route('/api/health')
def health():
    return jsonify({"status": "healthy", "openai": os.getenv('OPENAI_API_KEY') is not None})

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_resume():
    if request.method == 'OPTIONS': return jsonify({'status': 'ok'})
    
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({"error": "No selection"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        file_extension = filename.rsplit('.', 1)[1].lower()
        resume_text = extract_text_from_pdf(filepath) if file_extension == 'pdf' else extract_text_from_docx(filepath)
        
        if not resume_text: return jsonify({"error": "Extraction failed"}), 400
        
        job_description = request.form.get('job_description', '')
        keywords = extract_keywords(resume_text)
        job_match = compare_resume_to_job(keywords, job_description)
        analysis_result = analyze_resume_with_ai(resume_text, job_description)
        
        # Cleanup uploaded file
        if os.path.exists(filepath): os.remove(filepath)

        return jsonify({
            "status": "success",
            "analysis": json.loads(analysis_result) if analysis_result else {},
            "keywords": keywords,
            "job_match": job_match
        }), 200

    return jsonify({"error": "Invalid file type"}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)