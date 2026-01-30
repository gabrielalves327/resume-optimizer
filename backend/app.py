from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv
import PyPDF2
from docx import Document
import json

load_dotenv()

app = Flask(__name__)
# Permit access from your Vercel frontend
CORS(app, resources={r"/*": {"origins": "*"}})

UPLOAD_FOLDER = '/tmp'
ALLOWED_EXTENSIONS = {'pdf', 'docx'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
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
    except Exception as e: print(f"PDF Error: {e}")
    return text

def extract_text_from_docx(filepath):
    text = ""
    try:
        doc = Document(filepath)
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
    except Exception as e: print(f"Docx Error: {e}")
    return text

def analyze_resume_with_ai(resume_text, job_description=None):
    prompt = f"""Analyze this resume {'against the job description' if job_description else ''}. 
    Resume: {resume_text}
    Job Description: {job_description if job_description else 'N/A'}
    
    Return ONLY a JSON object with these keys: 
    overall_score (number), summary (string), experience (string), skills (string), education (string), key_improvements (list of strings)."""
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional resume reviewer. Your output must be valid JSON only. No markdown, no backticks."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        content = response.choices[0].message.content.strip()
        # Clean AI filler
        content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"AI Error: {e}")
        return None

@app.route('/')
def home():
    return jsonify({"message": "API is live", "status": "online"})

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_resume():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    job_desc = request.form.get('job_description', '')

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        ext = filename.rsplit('.', 1)[1].lower()
        resume_text = extract_text_from_pdf(filepath) if ext == 'pdf' else extract_text_from_docx(filepath)
        
        if os.path.exists(filepath):
            os.remove(filepath)

        if not resume_text:
            return jsonify({"error": "Failed to extract text"}), 400

        analysis = analyze_resume_with_ai(resume_text, job_desc)

        if not analysis:
            return jsonify({"error": "AI analysis failed"}), 500

        return jsonify({
            "status": "success",
            "analysis": analysis # This is now a dict, not a string
        }), 200

    return jsonify({"error": "Invalid file type"}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)