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

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

UPLOAD_FOLDER = '/tmp'
ALLOWED_EXTENSIONS = {'pdf', 'docx'}
MAX_FILE_SIZE = 5 * 1024 * 1024

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(filepath):
    text = ""
    try:
        with open(filepath, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"PDF Error: {e}")
    return text

def extract_text_from_docx(filepath):
    text = ""
    try:
        doc = Document(filepath)
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
    except Exception as e:
        print(f"DOCX Error: {e}")
    return text

def analyze_resume_with_ai(resume_text, job_description=None):
    prompt = f"""Analyze this resume and provide feedback.

Resume:
{resume_text}

{f"Job Description: {job_description}" if job_description else ""}

Return ONLY valid JSON with these keys:
{{
    "overall_score": <0-100>,
    "summary": {{"score": <0-100>, "status": "good/needs_work/critical", "feedback": "<feedback>"}},
    "experience": {{"score": <0-100>, "status": "good/needs_work/critical", "feedback": "<feedback>"}},
    "skills": {{"score": <0-100>, "status": "good/needs_work/critical", "feedback": "<feedback>"}},
    "education": {{"score": <0-100>, "status": "good/needs_work/critical", "feedback": "<feedback>"}},
    "ats_score": <0-100>,
    "key_improvements": ["improvement 1", "improvement 2", "improvement 3"]
}}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert resume reviewer. Always respond with valid JSON only, no markdown."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API Error: {e}")
        return None

@app.route('/')
def home():
    return jsonify({"message": "Resume Optimizer API is running!", "status": "online"})

@app.route('/api/health')
def health():
    return jsonify({"status": "healthy", "openai_connected": os.getenv('OPENAI_API_KEY') is not None})

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_resume():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    job_description = request.form.get('job_description', '').strip()
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF and DOCX allowed"}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    ext = filename.rsplit('.', 1)[1].lower()
    resume_text = extract_text_from_pdf(filepath) if ext == 'pdf' else extract_text_from_docx(filepath)
    
    if os.path.exists(filepath):
        os.remove(filepath)
    
    if not resume_text or len(resume_text.strip()) < 50:
        return jsonify({"error": "Could not extract text from resume"}), 400
    
    analysis = analyze_resume_with_ai(resume_text, job_description)
    
    if not analysis:
        return jsonify({"error": "AI analysis failed"}), 500
    
    return jsonify({
        "message": "Analysis complete",
        "filename": filename,
        "analysis": analysis
    }), 200

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify({"analyses": []})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
