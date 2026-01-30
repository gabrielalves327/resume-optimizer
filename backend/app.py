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
    prompt = f"""Analyze this resume. Return ONLY valid JSON with these exact keys:
{{"overall_score": 75, "summary": {{"score": 70, "feedback": "..."}}, "experience": {{"score": 80, "feedback": "..."}}, "skills": {{"score": 75, "feedback": "..."}}, "education": {{"score": 70, "feedback": "..."}}, "key_improvements": ["improvement 1", "improvement 2", "improvement 3"]}}

Resume: {resume_text[:3000]}
Job Description: {job_desc if job_desc else 'General position'}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional resume reviewer. Output valid JSON only, no markdown, no explanation."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=1000
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
    
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        ext = filename.rsplit('.', 1)[1].lower()
        text = extract_text(filepath, ext)
        
        if os.path.exists(filepath):
            os.remove(filepath)
        
        if not text or len(text) < 50:
            return jsonify({"error": "Could not extract text"}), 400
        
        analysis = analyze_resume(text, job_desc)
        
        if not analysis:
            return jsonify({"error": "AI analysis failed"}), 500
            
        return jsonify({
            "status": "success",
            "filename": filename,
            "analysis": analysis
        })
    
    return jsonify({"error": "Invalid file"}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
```
