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

# FIXED CORS: Using the most permissive setting to bypass the error in your screenshot
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration
UPLOAD_FOLDER = '/tmp'  # Required for Render Free Tier
ALLOWED_EXTENSIONS = {'pdf', 'docx'}
MAX_FILE_SIZE = 5 * 1024 * 1024 

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# --- HELPER FUNCTIONS ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(filepath):
    text = ""
    try:
        with open(filepath, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() or ""
    except Exception as e: print(f"Error: {e}")
    return text

def extract_text_from_docx(filepath):
    text = ""
    try:
        doc = Document(filepath)
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
    except Exception as e: print(f"Error: {e}")
    return text

# --- ROUTES ---

@app.route('/')
def home():
    return jsonify({"message": "API is live", "status": "online"})

@app.route('/api/health')
def health():
    return jsonify({
        "status": "healthy",
        "openai_key": os.getenv('OPENAI_API_KEY') is not None
    })

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_resume():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Determine extraction method
        ext = filename.rsplit('.', 1)[1].lower()
        resume_text = extract_text_from_pdf(filepath) if ext == 'pdf' else extract_text_from_docx(filepath)
        
        # Cleanup file immediately after reading to save space
        if os.path.exists(filepath):
            os.remove(filepath)

        if not resume_text:
            return jsonify({"error": "Failed to extract text"}), 400

        # Mock Analysis for now to ensure connection works
        return jsonify({
            "status": "success",
            "message": "Resume received and processed",
            "text_length": len(resume_text)
        }), 200

    return jsonify({"error": "Invalid file type"}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)