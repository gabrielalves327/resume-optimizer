from flask import Flask, jsonify, request
from flask_cors import CORS
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
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def extract_text(filepath, ext):
    text = ""
    try:
        if ext == 'pdf':
            with open(filepath, 'rb') as f:
                pdf = PyPDF2.PdfReader(f)
                for page in pdf.pages:
                    text += page.extract_text() or ""
        elif ext == 'docx':
            doc = Document(filepath)
            text = "\n".join([p.text for p in doc.paragraphs])
    except Exception as e:
        print(f"Extraction error: {e}")
    return text

def analyze_resume(resume_text, job_desc):
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert resume reviewer. Return ONLY valid JSON, no markdown."},
                {"role": "user", "content": f"Analyze this resume. Return JSON with: overall_score (number), summary (object with feedback string), experience (object with feedback string), skills (object with feedback string), education (object with feedback string), key_improvements (array of 3 strings). Resume: {resume_text[:3000]}. Job: {job_desc or 'General'}"}
            ],
            temperature=0.5
        )
        raw = response.choices[0].message.content.strip()
        clean = re.sub(r'```json|```', '', raw).strip()
        return json.loads(clean)
    except Exception as e:
        print(f"AI Error: {e}")
        return None

@app.route('/')
def home():
    return jsonify({"message": "API is live", "status": "online"})

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_file():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    
    file = request.files['file']
    job_desc = request.form.get('job_description', '')
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    ext = filename.rsplit('.', 1)[1].lower()
    text = extract_text(filepath, ext)
    os.remove(filepath) if os.path.exists(filepath) else None
    
    if not text:
        return jsonify({"error": "Could not extract text"}), 400
    
    analysis = analyze_resume(text, job_desc)
    
    if not analysis:
        return jsonify({"error": "AI analysis failed"}), 500
    
    return jsonify({"status": "success", "filename": filename, "analysis": analysis})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
