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
CORS(app, resources={r"/*": {"origins": "*"}})

UPLOAD_FOLDER = "/tmp"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ------------------------
# Helpers
# ------------------------

def extract_text(filepath, ext):
    text = ""
    try:
        if ext == "pdf":
            with open(filepath, "rb") as f:
                pdf = PyPDF2.PdfReader(f)
                for page in pdf.pages:
                    text += page.extract_text() or ""
        elif ext == "docx":
            doc = Document(filepath)
            text = "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        print("Extraction error:", e)
    return text.strip()

def analyze_resume(resume_text, job_desc):
    try:
        response = openai_client.responses.create(
            model="gpt-4.1-mini",
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert resume reviewer. "
                        "Return ONLY valid JSON. No markdown. No explanations."
                    ),
                },
                {
                    "role": "user",
                    "content": f"""
Analyze this resume and return JSON with:

- overall_score (number 0-100)
- summary (object with feedback string)
- experience (object with feedback string)
- skills (object with feedback string)
- education (object with feedback string)
- key_improvements (array of 3 strings)

Resume:
{resume_text[:3000]}

Job description:
{job_desc or "General"}
"""
                }
            ],
            temperature=0.5,
        )

        raw = response.output_text.strip()
        return json.loads(raw)

    except Exception as e:
        print("AI ERROR:", e)
        return None

# ------------------------
# Routes
# ------------------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "online", "message": "API is live"})

@app.route("/api/upload", methods=["POST", "OPTIONS"])
def upload_file():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    job_desc = request.form.get("job_description", "")

    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    filename = secure_filename(file.filename)
    ext = filename.rsplit(".", 1)[-1].lower()

    if ext not in {"pdf", "docx"}:
        return jsonify({"error": "Unsupported file type"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        text = extract_text(filepath, ext)
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

    if not text:
        return jsonify({"error": "Could not extract text"}), 400

    analysis = analyze_resume(text, job_desc)

    if not analysis:
        return jsonify({"error": "AI analysis failed"}), 500

    return jsonify({
        "status": "success",
        "filename": filename,
        "analysis": analysis
    })

# ------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
