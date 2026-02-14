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

# WHITELIST: Only these keywords matter for ATS - real technical/professional terms
ATS_KEYWORDS = {
    # Programming Languages
    'python', 'javascript', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 
    'typescript', 'golang', 'rust', 'scala', 'perl', 'bash', 'powershell', 'sql',
    'html', 'css', 'sass', 'less', 'xml', 'json', 'yaml',
    
    # Frameworks & Libraries
    'react', 'angular', 'vue', 'node', 'nodejs', 'express', 'django', 'flask',
    'spring', 'springboot', 'laravel', 'rails', 'asp.net', '.net', 'dotnet',
    'jquery', 'bootstrap', 'tailwind', 'nextjs', 'nuxt', 'gatsby',
    
    # Cloud & DevOps
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s',
    'jenkins', 'terraform', 'ansible', 'puppet', 'chef', 'circleci', 'travis',
    'github actions', 'gitlab', 'bitbucket', 'ci/cd', 'cicd', 'devops',
    
    # Databases
    'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch',
    'dynamodb', 'firebase', 'oracle', 'sql server', 'sqlite', 'cassandra',
    'mariadb', 'neo4j', 'couchdb',
    
    # Operating Systems
    'linux', 'ubuntu', 'centos', 'redhat', 'windows server', 'macos', 'unix',
    
    # IT & Networking
    'active directory', 'tcp/ip', 'dns', 'dhcp', 'vpn', 'lan', 'wan', 'vlan',
    'firewall', 'router', 'switch', 'cisco', 'juniper', 'palo alto',
    'vmware', 'hyper-v', 'virtualization', 'esxi', 'vsphere',
    
    # Security & Cybersecurity
    'cybersecurity', 'infosec', 'penetration testing', 'pentest', 'vulnerability',
    'siem', 'splunk', 'wireshark', 'nmap', 'metasploit', 'burp suite',
    'iso 27001', 'nist', 'sox', 'hipaa', 'gdpr', 'pci-dss', 'encryption',
    'ssl', 'tls', 'oauth', 'saml', 'ldap', 'kerberos',
    
    # IT Tools & Platforms
    'servicenow', 'jira', 'confluence', 'zendesk', 'freshdesk', 'remedy',
    'salesforce', 'sap', 'sharepoint', 'office 365', 'microsoft 365', 'm365',
    'teams', 'slack', 'zoom', 'webex', 'gsuite', 'google workspace',
    'outlook', 'exchange', 'intune', 'sccm', 'endpoint manager',
    
    # Data & Analytics
    'tableau', 'power bi', 'looker', 'qlik', 'excel', 'pandas', 'numpy',
    'tensorflow', 'pytorch', 'scikit-learn', 'keras', 'spark', 'hadoop',
    'etl', 'data warehouse', 'snowflake', 'databricks', 'airflow',
    
    # Methodologies
    'agile', 'scrum', 'kanban', 'waterfall', 'lean', 'six sigma', 'itil',
    'devops', 'devsecops', 'sdlc', 'ci/cd',
    
    # Certifications (without "certified" word)
    'comptia', 'a+', 'network+', 'security+', 'ccna', 'ccnp', 'ccie',
    'aws certified', 'azure certified', 'gcp certified', 'pmp', 'cissp',
    'ceh', 'oscp', 'mcsa', 'mcse', 'rhce', 'rhcsa', 'itil',
    
    # Job-specific technical terms
    'helpdesk', 'help desk', 'desktop support', 'technical support', 'it support',
    'system administration', 'sysadmin', 'network administration', 'dba',
    'full stack', 'fullstack', 'frontend', 'backend', 'api', 'rest', 'restful',
    'graphql', 'microservices', 'soa', 'web services', 'soap',
    
    # Software & Tools
    'git', 'github', 'gitlab', 'bitbucket', 'svn', 'mercurial',
    'visual studio', 'vscode', 'intellij', 'eclipse', 'xcode', 'android studio',
    'postman', 'insomnia', 'swagger', 'figma', 'sketch', 'adobe xd',
    'photoshop', 'illustrator', 'premiere', 'after effects',
    
    # Hardware & Infrastructure
    'server', 'servers', 'workstation', 'laptop', 'desktop', 'printer',
    'scanner', 'peripheral', 'hardware', 'firmware', 'bios', 'uefi',
    'raid', 'nas', 'san', 'backup', 'disaster recovery', 'high availability',
    
    # Ticketing & ITSM
    'ticketing', 'incident management', 'problem management', 'change management',
    'asset management', 'cmdb', 'itsm', 'itil', 'sla',
    
    # Communication Protocols
    'http', 'https', 'ftp', 'sftp', 'ssh', 'telnet', 'smtp', 'imap', 'pop3',
    'tcp', 'udp', 'icmp', 'snmp', 'ntp',
    
    # Specific Technologies for IT Support
    'remote desktop', 'rdp', 'vnc', 'teamviewer', 'bomgar', 'logmein',
    'imaging', 'deployment', 'ghost', 'wds', 'mdt', 'autopilot',
    'group policy', 'gpo', 'registry', 'cmd', 'command line', 'terminal',
    'scripting', 'automation', 'batch', 'vbscript',
    
    # Business/Enterprise Software
    'erp', 'crm', 'hris', 'ats', 'lms', 'cms', 'ecommerce',
    'quickbooks', 'netsuite', 'workday', 'bamboohr', 'adp',
}

# Strong action verbs - keep these for display
ACTION_VERBS = [
    'achieved', 'accomplished', 'administered', 'analyzed', 'built', 'collaborated',
    'configured', 'created', 'delivered', 'deployed', 'designed', 'developed',
    'diagnosed', 'documented', 'enhanced', 'established', 'executed', 'implemented',
    'improved', 'installed', 'integrated', 'launched', 'led', 'maintained',
    'managed', 'migrated', 'monitored', 'optimized', 'orchestrated', 'oversaw',
    'reduced', 'refactored', 'resolved', 'scaled', 'secured', 'spearheaded',
    'streamlined', 'supervised', 'supported', 'tested', 'trained', 'troubleshot',
    'upgraded', 'automated'
]

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
    """Extract ONLY meaningful ATS keywords using whitelist approach"""
    text_lower = text.lower()
    
    # Find technical skills from whitelist
    found_tech_skills = []
    for skill in ATS_KEYWORDS:
        if skill.lower() in text_lower:
            found_tech_skills.append(skill)
    
    # Find action verbs
    found_action_verbs = [verb for verb in ACTION_VERBS if verb.lower() in text_lower]
    
    # Count metrics (numbers with context)
    metrics = re.findall(r'\d+[%+]|\$[\d,]+|\d+\s*(?:years?|months?|projects?|clients?|users?|team|people)', text_lower)
    
    # Count bullet points
    bullet_count = text.count('•') + text.count('-') + text.count('*')
    
    # Word count
    word_count = len(text.split())
    
    # Job description matching - ONLY match keywords from whitelist
    job_match = None
    if job_description:
        job_lower = job_description.lower()
        
        # Find ATS keywords in job description
        job_keywords = []
        for skill in ATS_KEYWORDS:
            if skill.lower() in job_lower:
                job_keywords.append(skill)
        
        # Find which job keywords are in resume
        matching = [kw for kw in job_keywords if kw.lower() in text_lower]
        missing = [kw for kw in job_keywords if kw.lower() not in text_lower]
        
        match_percentage = int((len(matching) / max(len(job_keywords), 1)) * 100)
        
        job_match = {
            "match_percentage": min(match_percentage, 100),
            "matching_keywords": matching[:20],
            "missing_keywords": missing[:15]
        }
    
    return {
        "technical_skills": found_tech_skills[:20],
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
        "version": "3.0 - Whitelist Keywords",
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
    print("Resume Optimizer Backend v3.0")
    print("Whitelist-based ATS Keywords")
    print("="*50)
    print("Make sure OPENAI_API_KEY is set in your .env file!")
    print("Server starting at http://localhost:5000")
    print("="*50 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)