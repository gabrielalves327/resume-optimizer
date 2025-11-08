from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'docx'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Create uploads folder if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
        "version": "1.0"
    })

# Upload and analyze endpoint
@app.route('/api/upload', methods=['POST'])
def upload_resume():
    """Handle resume file upload"""
    
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
    
    # Secure the filename
    filename = secure_filename(file.filename)
    
    # Save the file
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Get file size
    file_size = os.path.getsize(filepath)
    
    # Return success response
    return jsonify({
        "message": "File uploaded successfully",
        "filename": filename,
        "size": file_size,
        "status": "uploaded",
        "file_path": filepath
    }), 200

# Get resume analysis (placeholder for future)
@app.route('/api/analyze/<resume_id>')
def get_analysis(resume_id):
    """Get analysis results for a resume"""
    return jsonify({
        "resume_id": resume_id,
        "score": 78,
        "status": "complete",
        "sections": {
            "summary": {"status": "good", "score": 85},
            "experience": {"status": "needs_work", "score": 72},
            "skills": {"status": "critical", "score": 65}
        }
    })

if __name__ == '__main__':
    print("🚀 Starting Resume Optimizer API...")
    print("📍 Server running on http://localhost:5000")
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    app.run(debug=True, port=5000)