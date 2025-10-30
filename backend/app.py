from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

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

# Test upload endpoint (placeholder for future resume upload)
@app.route('/api/upload', methods=['POST'])
def upload_resume():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # For now, just return success (actual upload logic will be added later)
    return jsonify({
        "message": "File received successfully",
        "filename": file.filename,
        "status": "pending_analysis"
    }), 200

# Get resume analysis (placeholder)
@app.route('/api/analyze/<resume_id>')
def get_analysis(resume_id):
    # Mock response for now
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
    app.run(debug=True, port=5000)