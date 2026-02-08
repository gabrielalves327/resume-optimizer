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
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'docx'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Common technical skills to detect
TECH_SKILLS = [
    'python', 'javascript', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'typescript', 'go', 'rust', 'sql', 'html', 'css',
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel', '.net', 'jquery',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github', 'gitlab', 'ci/cd',
    'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'dynamodb', 'firebase',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'data science', 'ai', 'nlp',
    'agile', 'scrum', 'jira', 'confluence', 'rest api', 'graphql', 'microservices',
    'linux', 'windows', 'macos', 'unix', 'bash', 'powershell', 'active directory',
    'networking', 'tcp/ip', 'dns', 'dhcp', 'vpn', 'firewall', 'security', 'cybersecurity',
    'helpdesk', 'troubleshooting', 'technical support', 'customer service', 'ticketing',
    'servicenow', 'zendesk', 'salesforce', 'sap', 'oracle', 'sharepoint', 'office 365',
    'excel', 'powerpoint', 'outlook', 'teams', 'slack', 'zoom', 'virtualization', 'vmware'
]

# Strong action verbs
ACTION_VERBS = [
    'achieved', 'accomplished', 'accelerated', 'administered', 'analyzed', 'built', 'collaborated',
    'created', 'delivered', 'designed', 'developed', 'directed', 'drove', 'enhanced', 'established',
    'executed', 'expanded', 'generated', 'grew', 'implemented', 'improved', 'increased', 'initiated',
    'launched', 'led', 'managed', 'optimized', 'orchestrated', 'oversaw', 'pioneered', 'produced',
    'reduced', 'redesigned', 'resolved', 'restructured', 'revamped', 'scaled', 'spearheaded',
    'streamlined', 'strengthened', 'supervised', 'transformed', 'upgraded', 'troubleshot',
    'configured', 'installed', 'maintained', 'monitored', 'diagnosed', 'supported', 'trained'
]

# Words to IGNORE in keyword matching (generic/filler words)
STOPWORDS = {
    # Common verbs
    'make', 'made', 'making', 'take', 'taking', 'taken', 'give', 'giving', 'given',
    'come', 'coming', 'came', 'going', 'went', 'gone', 'know', 'known', 'knowing',
    'think', 'thinking', 'want', 'wanting', 'look', 'looking', 'use', 'using', 'used',
    'find', 'finding', 'found', 'tell', 'telling', 'told', 'ask', 'asking', 'asked',
    'work', 'working', 'worked', 'seem', 'feel', 'try', 'leave', 'call', 'keep',
    'let', 'begin', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe',
    'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet',
    'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch',
    'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow',
    'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear',
    'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall',
    'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require',
    'report', 'decide', 'pull',
    
    # Common nouns
    'time', 'year', 'years', 'people', 'way', 'day', 'days', 'man', 'woman', 'child', 'world',
    'life', 'hand', 'part', 'place', 'case', 'week', 'weeks', 'company', 'system', 'program',
    'question', 'work', 'government', 'number', 'night', 'point', 'home', 'water',
    'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'months', 'lot', 'right',
    'study', 'book', 'eye', 'job', 'jobs', 'word', 'business', 'issue', 'issues', 'side', 'kind',
    'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'hours', 'game', 'line',
    'end', 'member', 'law', 'car', 'city', 'community', 'name', 'president', 'team', 'teams',
    'minute', 'idea', 'kid', 'body', 'information', 'back', 'parent', 'face', 'others',
    'level', 'office', 'door', 'health', 'person', 'art', 'war', 'history', 'party',
    'result', 'results', 'change', 'morning', 'reason', 'research', 'girl', 'guy', 'moment',
    'air', 'teacher', 'force', 'education', 'thing', 'things', 'stuff',
    
    # Prepositions & conjunctions
    'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
    'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'but',
    'down', 'during', 'except', 'for', 'from', 'inside', 'into', 'like',
    'near', 'off', 'onto', 'out', 'outside', 'over', 'past', 'since',
    'through', 'throughout', 'till', 'toward', 'under', 'underneath', 'until',
    'upon', 'with', 'within', 'without', 'and', 'nor', 'yet',
    
    # Articles & pronouns
    'the', 'this', 'that', 'these', 'those', 'your', 'his', 'her',
    'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'whose',
    'she', 'they', 'him', 'them', 'myself', 'yourself',
    'himself', 'herself', 'itself', 'ourselves', 'themselves', 'each', 'few', 'many',
    'some', 'any', 'not', 'only', 'own', 'same', 'than', 'too', 'very',
    
    # Adjectives & adverbs
    'able', 'bad', 'best', 'better', 'big', 'black', 'certain', 'clear', 'different',
    'early', 'easy', 'economic', 'federal', 'free', 'full', 'good', 'great', 'hard',
    'high', 'human', 'important', 'international', 'large', 'late', 'little', 'local',
    'long', 'low', 'major', 'military', 'national', 'new', 'old', 'other',
    'political', 'possible', 'public', 'real', 'recent', 'right', 'small', 'social',
    'special', 'strong', 'sure', 'true', 'white', 'whole', 'young', 'available',
    'just', 'also', 'now', 'then', 'more', 'most', 'well', 'even', 'back', 'still',
    'already', 'always', 'never', 'often', 'however', 'together', 'likely', 'simply',
    'generally', 'instead', 'actually', 'usually', 'especially', 'really', 'almost',
    'enough', 'less', 'much', 'either', 'else', 'far', 'perhaps', 'quite', 'rather',
    
    # Common filler/generic words in job postings
    'step', 'steps', 'center', 'informed', 'making', 'skilled', 'based', 'related',
    'including', 'such', 'need', 'needs', 'needed', 'must', 'should', 'would', 'could',
    'might', 'will', 'shall', 'may', 'can', 'have', 'has', 'had', 'having', 'does',
    'did', 'doing', 'done', 'been', 'being', 'are', 'was', 'were',
    'get', 'gets', 'got', 'getting', 'gotten', 'see', 'seen', 'seeing', 'saw',
    'say', 'says', 'said', 'saying', 'goes', 'per', 'via', 'etc',
    'position', 'role', 'responsibilities', 'duties', 'tasks', 'ability', 'abilities',
    'candidate', 'candidates', 'applicant', 'applicants', 'employee', 'employer',
    'opportunity', 'opportunities', 'environment', 'environments', 'organization',
    'department', 'division', 'location', 'locations', 'schedule',
    'preferred', 'required', 'requirements', 'qualifications', 'minimum', 'maximum',
    'daily', 'annually', 'salary', 'benefits', 'compensation', 'equal', 'employment',
    'please', 'apply', 'resume', 'cover', 'letter', 'experience', 'experienced',
    'looking', 'seeking', 'join', 'exciting', 'dynamic', 'fast-paced', 'growing',
    'responsible', 'ensure', 'assist', 'help', 'support', 'perform', 'complete',
    'various', 'multiple', 'several', 'additional', 'specific', 'appropriate',
    'necessary', 'relevant', 'effective', 'efficient', 'excellent', 'outstanding',
    'strong', 'proven', 'demonstrated', 'successful', 'professional'
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

def extract_keywords(text, job_description=None):
    """Extract technical skills, action verbs, and analyze keyword matching"""
    text_lower = text.lower()
    
    # Find technical skills
    found_tech_skills = [skill for skill in TECH_SKILLS if skill.lower() in text_lower]
    
    # Find action verbs
    found_action_verbs = [verb for verb in ACTION_VERBS if verb.lower() in text_lower]
    
    # Count metrics (numbers with context)
    metrics = re.findall(r'\d+[%+]|\$[\d,]+|\d+\s*(?:years?|months?|projects?|clients?|users?|team|people)', text_lower)
    
    # Count bullet points
    bullet_count = text.count('•') + text.count('-') + text.count('*')
    
    # Word count
    word_count = len(text.split())
    
    # Job description matching - IMPROVED FILTERING
    job_match = None
    if job_description:
        job_lower = job_description.lower()
        # Only get words 4+ characters
        job_words = set(re.findall(r'\b[a-z]{4,}\b', job_lower))
        resume_words = set(re.findall(r'\b[a-z]{4,}\b', text_lower))
        
        # Filter out stopwords - keep only meaningful keywords
        important_job_keywords = [w for w in job_words if w not in STOPWORDS and len(w) >= 4]
        
        matching = [w for w in important_job_keywords if w in resume_words]
        missing = [w for w in important_job_keywords if w not in resume_words][:15]
        
        match_percentage = int((len(matching) / max(len(important_job_keywords), 1)) * 100)
        
        job_match = {
            "match_percentage": min(match_percentage, 100),
            "matching_keywords": matching[:20],
            "missing_keywords": missing
        }
    
    return {
        "technical_skills": found_tech_skills,
        "action_verbs": found_action_verbs,
        "metrics_count": len(metrics),
        "bullet_points": bullet_count,
        "word_count": word_count,
        "job_match": job_match
    }

def analyze_resume_with_ai(resume_text, job_description=None):
    """Comprehensive AI analysis of resume"""
    
    job_context = f"\n\nJob Description to match against:\n{job_description}" if job_description else "\n\nAnalyze for a general professional position."
    
    prompt = f"""You are an expert resume reviewer, career coach, and ATS specialist. Analyze this resume comprehensively.

Resume:
{resume_text[:5000]}
{job_context}

Provide a thorough analysis. Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:

{{
    "overall_score": <0-100 integer>,
    "ats_score": <0-100 integer for ATS compatibility>,
    "keyword_score": <0-100 integer for keyword optimization>,
    "impact_score": <0-100 integer for achievement/metrics usage>,
    
    "executive_summary": "<2-3 sentence overall assessment>",
    
    "summary": {{
        "score": <0-100>,
        "status": "excellent/good/needs_work/critical",
        "feedback": "<detailed feedback on professional summary>",
        "suggestions": ["<specific suggestion 1>", "<specific suggestion 2>"]
    }},
    
    "experience": {{
        "score": <0-100>,
        "status": "excellent/good/needs_work/critical",
        "feedback": "<detailed feedback on work experience section>",
        "suggestions": ["<specific suggestion 1>", "<specific suggestion 2>", "<specific suggestion 3>"]
    }},
    
    "skills": {{
        "score": <0-100>,
        "status": "excellent/good/needs_work/critical",
        "feedback": "<detailed feedback on skills section>",
        "suggestions": ["<specific suggestion 1>", "<specific suggestion 2>"]
    }},
    
    "education": {{
        "score": <0-100>,
        "status": "excellent/good/needs_work/critical",
        "feedback": "<detailed feedback on education section>"
    }},
    
    "formatting": {{
        "score": <0-100>,
        "feedback": "<feedback on resume structure, length, formatting>"
    }},
    
    "strengths": [
        "<strength 1>",
        "<strength 2>",
        "<strength 3>"
    ],
    
    "weaknesses": [
        "<weakness 1>",
        "<weakness 2>",
        "<weakness 3>"
    ],
    
    "key_improvements": [
        "<most important improvement 1>",
        "<most important improvement 2>",
        "<most important improvement 3>",
        "<most important improvement 4>",
        "<most important improvement 5>"
    ],
    
    "quick_wins": [
        "<easy fix 1>",
        "<easy fix 2>",
        "<easy fix 3>"
    ],
    
    "ats_tips": [
        "<ATS optimization tip 1>",
        "<ATS optimization tip 2>",
        "<ATS optimization tip 3>"
    ],
    
    "suggested_keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"]
}}

Be specific, actionable, and helpful. Scores should reflect real quality - don't inflate them."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert resume reviewer and career coach. You must output valid JSON only - no markdown, no code blocks, no explanations. Be thorough and specific in your analysis."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=2000
        )
        raw_content = response.choices[0].message.content.strip()
        
        # Clean any markdown formatting
        clean_content = re.sub(r'```json\s*', '', raw_content)
        clean_content = re.sub(r'```\s*', '', clean_content)
        clean_content = clean_content.strip()
        
        return json.loads(clean_content)
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        print(f"Raw content: {raw_content[:500] if 'raw_content' in locals() else 'N/A'}")
        return None
    except Exception as e:
        print(f"OpenAI API Error: {e}")
        return None

@app.route('/')
def home():
    return jsonify({
        "message": "Resume Optimizer API is running!",
        "status": "online",
        "version": "2.1 Enhanced",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/health')
def health():
    return jsonify({
        "status": "healthy",
        "openai_connected": os.getenv('OPENAI_API_KEY') is not None
    })

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
        return jsonify({"error": "Only PDF and DOCX files are allowed"}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Extract text
    file_extension = filename.rsplit('.', 1)[1].lower()
    if file_extension == 'pdf':
        resume_text = extract_text_from_pdf(filepath)
    else:
        resume_text = extract_text_from_docx(filepath)
    
    # Clean up
    if os.path.exists(filepath):
        os.remove(filepath)
    
    if not resume_text or len(resume_text.strip()) < 50:
        return jsonify({"error": "Could not extract enough text from resume."}), 400
    
    # Extract keywords and stats
    keyword_data = extract_keywords(resume_text, job_description)
    
    # Get AI analysis
    ai_analysis = analyze_resume_with_ai(resume_text, job_description)
    
    if not ai_analysis:
        return jsonify({"error": "AI analysis failed. Please try again."}), 500
    
    # Merge keyword data with AI analysis
    ai_analysis['technical_skills'] = keyword_data['technical_skills']
    ai_analysis['action_verbs'] = keyword_data['action_verbs']
    ai_analysis['metrics_count'] = keyword_data['metrics_count']
    ai_analysis['bullet_points'] = keyword_data['bullet_points']
    ai_analysis['word_count'] = keyword_data['word_count']
    
    if keyword_data['job_match']:
        ai_analysis['job_match'] = keyword_data['job_match']
        ai_analysis['keywords_found'] = keyword_data['job_match']['matching_keywords']
        ai_analysis['keywords_missing'] = keyword_data['job_match']['missing_keywords']
    
    return jsonify({
        "message": "Analysis complete",
        "filename": filename,
        "analysis": ai_analysis
    }), 200

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify({"analyses": []})

if __name__ == '__main__':
    print("\n" + "="*50)
    print("Resume Optimizer Backend v2.1")
    print("="*50)
    print("Make sure OPENAI_API_KEY is set in your .env file!")
    print("Server starting at http://localhost:5000")
    print("="*50 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)