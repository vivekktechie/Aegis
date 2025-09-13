import os
import sqlite3
import uuid
import random
import re
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# -----------------------------------------------------------------------------
# App Setup
# -----------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)

# Config
DATABASE = "aegis.db"
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf", "docx", "doc"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# -----------------------------------------------------------------------------
# Database Helpers
# -----------------------------------------------------------------------------
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(error=None):
    """Close DB connection at end of request"""
    db = g.pop("db", None)
    if db is not None:
        db.close()


@app.teardown_appcontext
def teardown_db(error=None):
    close_db(error)


def init_db():
    """Initialize tables + sample data"""
    db = get_db()

    # Users
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('programmer','recruiter','guide')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Companies
    db.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            location TEXT,
            industry TEXT,
            employees TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Jobs
    db.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            requirements TEXT,
            location TEXT,
            company_id TEXT,
            recruiter_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies (id),
            FOREIGN KEY (recruiter_id) REFERENCES users (id)
        )
    """)

    # Sessions
    db.execute("""
        CREATE TABLE IF NOT EXISTS qa_sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            meeting_link TEXT NOT NULL,
            guide_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guide_id) REFERENCES users (id)
        )
    """)

    db.commit()
    insert_sample_data()


def insert_sample_data():
    """Insert demo companies + jobs once"""
    db = get_db()
    if db.execute("SELECT COUNT(*) FROM companies").fetchone()[0] > 0:
        return

    companies = [
        {"id": str(uuid.uuid4()), "name": "TechCorp", "description": "AI + ML", "location": "SF", "industry": "Tech", "employees": "500-1000"},
        {"id": str(uuid.uuid4()), "name": "DataFlow", "description": "Big Data", "location": "Austin", "industry": "Analytics", "employees": "100-500"},
    ]

    for c in companies:
        db.execute("INSERT INTO companies (id,name,description,location,industry,employees) VALUES (?,?,?,?,?,?)",
                   (c["id"], c["name"], c["description"], c["location"], c["industry"], c["employees"]))

    db.execute("INSERT INTO jobs (id,title,description,requirements,location,company_id) VALUES (?,?,?,?,?,?)",
               (str(uuid.uuid4()), "Full-Stack Dev", "Build web apps", "React, Node.js", "Remote", companies[0]["id"]))
    db.commit()


# -----------------------------------------------------------------------------
# AI Resume Functions (Mock)
# -----------------------------------------------------------------------------
def extract_skills_from_text(text):
    skills_db = ["Python", "JavaScript", "React", "Node.js", "SQL", "AWS", "Docker", "ML"]
    text = text.lower()
    return [s for s in skills_db if s.lower() in text]


def calculate_match_score(resume_skills, job_skills):
    if not job_skills:
        return 0
    return int((len(set(resume_skills) & set(job_skills)) / len(job_skills)) * 100)


def analyze_resume(resume_text, job_desc):
    resume_skills = extract_skills_from_text(resume_text)
    job_skills = extract_skills_from_text(job_desc)
    return {
        "score": calculate_match_score(resume_skills, job_skills),
        "skillsFound": list(set(resume_skills) & set(job_skills)),
        "skillsMissing": list(set(job_skills) - set(resume_skills)),
    }


# -----------------------------------------------------------------------------
# Auth Routes
# -----------------------------------------------------------------------------
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    name, email, password, role = data.get("name"), data.get("email"), data.get("password"), data.get("role")
    if not all([name, email, password, role]):
        return jsonify({"error": "Missing fields"}), 400

    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        return jsonify({"error": "User exists"}), 409

    uid = str(uuid.uuid4())
    db.execute("INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)",
               (uid, name, email, generate_password_hash(password), role))
    db.commit()
    return jsonify({"user": {"id": uid, "name": name, "email": email, "role": role}}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    email, password, role = data.get("email"), data.get("password"), data.get("role")
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email=? AND role=?", (email, role)).fetchone()
    if user and check_password_hash(user["password_hash"], password):
        return jsonify({"user": dict(user)}), 200
    return jsonify({"error": "Invalid credentials"}), 401


# -----------------------------------------------------------------------------
# Company + Job Routes
# -----------------------------------------------------------------------------
@app.route("/api/companies", methods=["GET"])
def get_companies():
    db = get_db()
    rows = db.execute("""SELECT c.*, COUNT(j.id) as job_count 
                         FROM companies c LEFT JOIN jobs j ON c.id=j.company_id 
                         GROUP BY c.id""").fetchall()
    return jsonify({"companies": [dict(r) for r in rows]})


@app.route("/api/jobs", methods=["POST"])
def create_job():
    data = request.get_json()
    jid = str(uuid.uuid4())
    db = get_db()
    db.execute("INSERT INTO jobs (id,title,description,recruiter_id) VALUES (?,?,?,?)",
               (jid, data["title"], data["description"], data["recruiterId"]))
    db.commit()
    return jsonify({"jobId": jid}), 201


# -----------------------------------------------------------------------------
# Resume Routes (Mock)
# -----------------------------------------------------------------------------
@app.route("/api/resume/analyze", methods=["POST"])
def analyze_resume_api():
    job_desc = request.form.get("jobDescription", "")
    resume_text = "Python, React, AWS, SQL experience"
    return jsonify({"analysis": analyze_resume(resume_text, job_desc)})


# -----------------------------------------------------------------------------
# Q&A Sessions
# -----------------------------------------------------------------------------
@app.route("/api/sessions", methods=["POST"])
def create_session():
    data = request.get_json()
    sid = str(uuid.uuid4())
    db = get_db()
    db.execute("INSERT INTO qa_sessions (id,title,description,meeting_link,guide_id) VALUES (?,?,?,?,?)",
               (sid, data["title"], data["description"], data["meetingLink"], data["guideId"]))
    db.commit()
    return jsonify({"sessionId": sid}), 201


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    with app.app_context():
        init_db()
    app.run(debug=True, port=5000)

# import os
# import sqlite3
# import uuid
# from datetime import datetime
# from flask import Flask, request, jsonify, g
# from flask_cors import CORS
# from werkzeug.security import generate_password_hash, check_password_hash
# from werkzeug.utils import secure_filename
# import random
# import re

# app = Flask(__name__)
# CORS(app)

# # Configuration
# DATABASE = 'aegis.db'
# UPLOAD_FOLDER = 'uploads'
# ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc'}

# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# # Ensure upload directory exists
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# def allowed_file(filename):
#     return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# def get_db():
#     if 'db' not in g:
#         g.db = sqlite3.connect(DATABASE)
#         g.db.row_factory = sqlite3.Row
#     return g.db

# def close_db(error):
#     db = g.pop('db', None)
#     if db is not None:
#         db.close()

# @app.teardown_appcontext
# def close_db(error):
#     close_db(error)

# def init_db():
#     with app.app_context():
#         db = get_db()
        
#         # Users table
#         db.execute('''
#             CREATE TABLE IF NOT EXISTS users (
#                 id TEXT PRIMARY KEY,
#                 name TEXT NOT NULL,
#                 email TEXT UNIQUE NOT NULL,
#                 password_hash TEXT NOT NULL,
#                 role TEXT NOT NULL CHECK (role IN ('programmer', 'recruiter', 'guide')),
#                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#             )
#         ''')
        
#         # Companies table
#         db.execute('''
#             CREATE TABLE IF NOT EXISTS companies (
#                 id TEXT PRIMARY KEY,
#                 name TEXT NOT NULL,
#                 description TEXT,
#                 location TEXT,
#                 industry TEXT,
#                 employees TEXT,
#                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#             )
#         ''')
        
#         # Jobs table
#         db.execute('''
#             CREATE TABLE IF NOT EXISTS jobs (
#                 id TEXT PRIMARY KEY,
#                 title TEXT NOT NULL,
#                 description TEXT NOT NULL,
#                 requirements TEXT,
#                 location TEXT,
#                 company_id TEXT,
#                 recruiter_id TEXT,
#                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#                 FOREIGN KEY (company_id) REFERENCES companies (id),
#                 FOREIGN KEY (recruiter_id) REFERENCES users (id)
#             )
#         ''')
        
#         # Q&A Sessions table
#         db.execute('''
#             CREATE TABLE IF NOT EXISTS qa_sessions (
#                 id TEXT PRIMARY KEY,
#                 title TEXT NOT NULL,
#                 description TEXT NOT NULL,
#                 meeting_link TEXT NOT NULL,
#                 guide_id TEXT NOT NULL,
#                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#                 FOREIGN KEY (guide_id) REFERENCES users (id)
#             )
#         ''')
        
#         db.commit()
        
#         # Insert sample data
#         insert_sample_data()

# def insert_sample_data():
#     db = get_db()
    
#     # Check if data already exists
#     existing = db.execute('SELECT COUNT(*) FROM companies').fetchone()[0]
#     if existing > 0:
#         return
    
#     # Sample companies
#     companies = [
#         {
#             'id': str(uuid.uuid4()),
#             'name': 'TechCorp Solutions',
#             'description': 'Leading software development company specializing in AI and machine learning solutions.',
#             'location': 'San Francisco, CA',
#             'industry': 'Technology',
#             'employees': '500-1000'
#         },
#         {
#             'id': str(uuid.uuid4()),
#             'name': 'DataFlow Systems',
#             'description': 'Big data analytics and cloud infrastructure services provider.',
#             'location': 'Austin, TX',
#             'industry': 'Data Analytics',
#             'employees': '100-500'
#         },
#         {
#             'id': str(uuid.uuid4()),
#             'name': 'CloudNine Technologies',
#             'description': 'Cloud-first software solutions and DevOps automation specialists.',
#             'location': 'Seattle, WA',
#             'industry': 'Cloud Computing',
#             'employees': '200-500'
#         },
#         {
#             'id': str(uuid.uuid4()),
#             'name': 'InnovateLab',
#             'description': 'Startup incubator focusing on fintech and blockchain innovations.',
#             'location': 'New York, NY',
#             'industry': 'Financial Technology',
#             'employees': '50-100'
#         }
#     ]
    
#     for company in companies:
#         db.execute('''
#             INSERT INTO companies (id, name, description, location, industry, employees)
#             VALUES (?, ?, ?, ?, ?, ?)
#         ''', (company['id'], company['name'], company['description'], 
#               company['location'], company['industry'], company['employees']))
    
#     # Sample jobs for companies
#     sample_jobs = [
#         {
#             'company_id': companies[0]['id'],
#             'title': 'Senior Full-Stack Developer',
#             'description': 'Join our dynamic team to build scalable web applications using React, Node.js, and cloud technologies. You will be responsible for developing user-facing features and backend APIs.',
#             'requirements': 'Bachelor\'s degree in Computer Science, 5+ years of experience with JavaScript, React, Node.js, and cloud platforms like AWS or Azure.',
#             'location': 'San Francisco, CA'
#         },
#         {
#             'company_id': companies[0]['id'],
#             'title': 'Machine Learning Engineer',
#             'description': 'Design and implement ML models for our AI-powered products. Work with large datasets and deploy models to production environments.',
#             'requirements': 'MS in Computer Science or related field, experience with Python, TensorFlow/PyTorch, and ML model deployment.',
#             'location': 'San Francisco, CA'
#         },
#         {
#             'company_id': companies[1]['id'],
#             'title': 'Data Engineer',
#             'description': 'Build and maintain data pipelines and infrastructure to support our analytics platform. Work with big data technologies and cloud services.',
#             'requirements': 'Experience with Spark, Kafka, SQL, and cloud data services. Knowledge of Python and Scala preferred.',
#             'location': 'Austin, TX'
#         },
#         {
#             'company_id': companies[2]['id'],
#             'title': 'DevOps Engineer',
#             'description': 'Manage cloud infrastructure and CI/CD pipelines. Automate deployment processes and ensure system reliability and scalability.',
#             'requirements': 'Experience with Docker, Kubernetes, AWS/GCP, and infrastructure as code tools like Terraform.',
#             'location': 'Seattle, WA'
#         }
#     ]
    
#     for job in sample_jobs:
#         job_id = str(uuid.uuid4())
#         db.execute('''
#             INSERT INTO jobs (id, title, description, requirements, location, company_id)
#             VALUES (?, ?, ?, ?, ?, ?)
#         ''', (job_id, job['title'], job['description'], job['requirements'], 
#               job['location'], job['company_id']))
    
#     db.commit()

# # AI Service Functions (Mock implementations)
# def extract_skills_from_text(text):
#     """Extract skills from text using basic keyword matching"""
#     skills_database = [
#         'Python', 'JavaScript', 'React', 'Node.js', 'Angular', 'Vue.js',
#         'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby',
#         'HTML', 'CSS', 'TypeScript', 'jQuery', 'Bootstrap',
#         'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
#         'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes',
#         'Git', 'Jenkins', 'CI/CD', 'DevOps', 'Linux',
#         'Machine Learning', 'AI', 'TensorFlow', 'PyTorch', 'Pandas',
#         'Agile', 'Scrum', 'REST API', 'GraphQL', 'Microservices'
#     ]
    
#     text_lower = text.lower()
#     found_skills = []
    
#     for skill in skills_database:
#         if skill.lower() in text_lower:
#             found_skills.append(skill)
    
#     return found_skills

# def calculate_match_score(resume_skills, job_skills):
#     """Calculate ATS match score based on skill overlap"""
#     if not job_skills:
#         return 0
    
#     matched_skills = set(resume_skills) & set(job_skills)
#     score = (len(matched_skills) / len(job_skills)) * 100
#     return min(int(score), 100)

# def generate_recommendations(missing_skills):
#     """Generate recommendations based on missing skills"""
#     recommendations = []
    
#     if missing_skills:
#         recommendations.append(f"Consider learning these in-demand skills: {', '.join(missing_skills[:3])}")
#         recommendations.append("Update your resume to highlight relevant projects and experience")
#         recommendations.append("Consider taking online courses or certifications in missing areas")
        
#     if len(missing_skills) > 5:
#         recommendations.append("Focus on the most critical skills first to maximize your impact")
    
#     return recommendations

# def analyze_resume(resume_text, job_description):
#     """Analyze resume against job description"""
#     resume_skills = extract_skills_from_text(resume_text)
#     job_skills = extract_skills_from_text(job_description)
    
#     matched_skills = list(set(resume_skills) & set(job_skills))
#     missing_skills = list(set(job_skills) - set(resume_skills))
    
#     score = calculate_match_score(resume_skills, job_skills)
#     recommendations = generate_recommendations(missing_skills)
    
#     return {
#         'score': score,
#         'skillsFound': matched_skills,
#         'skillsMissing': missing_skills,
#         'recommendations': recommendations
#     }

# def extract_name_from_resume(resume_text):
#     """Extract candidate name from resume text (mock implementation)"""
#     # In a real implementation, this would use NLP to extract names
#     lines = resume_text.split('\n')[:5]  # Check first few lines
#     for line in lines:
#         if len(line.strip()) > 2 and len(line.strip()) < 50:
#             # Simple heuristic: likely a name if it's a short line near the top
#             return line.strip()
#     return f"Candidate_{random.randint(1000, 9999)}"

# def extract_email_from_resume(resume_text):
#     """Extract email from resume text"""
#     email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
#     emails = re.findall(email_pattern, resume_text)
#     return emails[0] if emails else f"candidate_{random.randint(1000, 9999)}@example.com"

# # Authentication Routes
# @app.route('/api/auth/register', methods=['POST'])
# def register():
#     data = request.get_json()
#     name = data.get('name')
#     email = data.get('email')
#     password = data.get('password')
#     role = data.get('role')
    
#     if not all([name, email, password, role]):
#         return jsonify({'error': 'All fields are required'}), 400
    
#     if role not in ['programmer', 'recruiter', 'guide']:
#         return jsonify({'error': 'Invalid role'}), 400
    
#     db = get_db()
    
#     # Check if user exists
#     existing_user = db.execute(
#         'SELECT id FROM users WHERE email = ?', (email,)
#     ).fetchone()
    
#     if existing_user:
#         return jsonify({'error': 'User already exists'}), 409
    
#     # Create new user
#     user_id = str(uuid.uuid4())
#     password_hash = generate_password_hash(password)
    
#     try:
#         db.execute(
#             'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
#             (user_id, name, email, password_hash, role)
#         )
#         db.commit()
        
#         user = {
#             'id': user_id,
#             'name': name,
#             'email': email,
#             'role': role
#         }
        
#         return jsonify({'user': user}), 201
#     except Exception as e:
#         return jsonify({'error': 'Registration failed'}), 500

# @app.route('/api/auth/login', methods=['POST'])
# def login():
#     data = request.get_json()
#     email = data.get('email')
#     password = data.get('password')
#     role = data.get('role')
    
#     if not all([email, password, role]):
#         return jsonify({'error': 'All fields are required'}), 400
    
#     db = get_db()
#     user = db.execute(
#         'SELECT * FROM users WHERE email = ? AND role = ?',
#         (email, role)
#     ).fetchone()
    
#     if user and check_password_hash(user['password_hash'], password):
#         user_data = {
#             'id': user['id'],
#             'name': user['name'],
#             'email': user['email'],
#             'role': user['role']
#         }
#         return jsonify({'user': user_data}), 200
    
#     return jsonify({'error': 'Invalid credentials'}), 401

# # Company Routes
# @app.route('/api/companies', methods=['GET'])
# def get_companies():
#     db = get_db()
#     companies = db.execute('''
#         SELECT c.*, COUNT(j.id) as job_count 
#         FROM companies c 
#         LEFT JOIN jobs j ON c.id = j.company_id 
#         GROUP BY c.id
#         ORDER BY c.name
#     ''').fetchall()
    
#     companies_list = []
#     for company in companies:
#         companies_list.append({
#             'id': company['id'],
#             'name': company['name'],
#             'description': company['description'],
#             'location': company['location'],
#             'industry': company['industry'],
#             'employees': company['employees'],
#             'jobCount': company['job_count']
#         })
    
#     return jsonify({'companies': companies_list}), 200

# @app.route('/api/companies/<company_id>', methods=['GET'])
# def get_company(company_id):
#     db = get_db()
#     company = db.execute(
#         'SELECT * FROM companies WHERE id = ?', (company_id,)
#     ).fetchone()
    
#     if not company:
#         return jsonify({'error': 'Company not found'}), 404
    
#     company_data = {
#         'id': company['id'],
#         'name': company['name'],
#         'description': company['description'],
#         'location': company['location'],
#         'industry': company['industry'],
#         'employees': company['employees']
#     }
    
#     return jsonify({'company': company_data}), 200

# @app.route('/api/companies/<company_id>/jobs', methods=['GET'])
# def get_company_jobs(company_id):
#     db = get_db()
#     jobs = db.execute(
#         'SELECT * FROM jobs WHERE company_id = ? ORDER BY created_at DESC',
#         (company_id,)
#     ).fetchall()
    
#     jobs_list = []
#     for job in jobs:
#         jobs_list.append({
#             'id': job['id'],
#             'title': job['title'],
#             'description': job['description'],
#             'requirements': job['requirements'],
#             'location': job['location']
#         })
    
#     return jsonify({'jobs': jobs_list}), 200

# # Resume Analysis Routes
# @app.route('/api/resume/analyze', methods=['POST'])
# def analyze_resume_endpoint():
#     try:
#         if 'resume' not in request.files:
#             return jsonify({'error': 'No resume file uploaded'}), 400
        
#         file = request.files['resume']
#         job_description = request.form.get('jobDescription')
        
#         if not file or not allowed_file(file.filename):
#             return jsonify({'error': 'Invalid file type'}), 400
        
#         if not job_description:
#             return jsonify({'error': 'Job description is required'}), 400
        
#         # In a real implementation, you would extract text from PDF/DOCX
#         # For now, we'll use a mock resume text
#         mock_resume_text = """
#         John Doe
#         Software Engineer
#         john.doe@email.com
        
#         SKILLS:
#         - Python, JavaScript, React, Node.js
#         - SQL, MongoDB, PostgreSQL
#         - AWS, Docker, Git
#         - Machine Learning, TensorFlow
        
#         EXPERIENCE:
#         Senior Software Engineer at TechCorp (2020-Present)
#         - Developed scalable web applications using React and Node.js
#         - Implemented machine learning models for data analysis
#         - Managed cloud infrastructure on AWS
        
#         EDUCATION:
#         Bachelor of Science in Computer Science
#         """
        
#         analysis = analyze_resume(mock_resume_text, job_description)
        
#         return jsonify({'analysis': analysis}), 200
        
#     except Exception as e:
#         return jsonify({'error': 'Analysis failed'}), 500

# @app.route('/api/resume/screen', methods=['POST'])
# def screen_resumes():
#     try:
#         if 'resumes' not in request.files:
#             return jsonify({'error': 'No resume files uploaded'}), 400
        
#         files = request.files.getlist('resumes')
#         job_description = request.form.get('jobDescription')
        
#         if not job_description:
#             return jsonify({'error': 'Job description is required'}), 400
        
#         candidates = []
        
#         # Mock resume data for demonstration
#         mock_resumes = [
#             {
#                 'name': 'Alice Johnson',
#                 'email': 'alice.johnson@email.com',
#                 'text': 'Experienced Python developer with React, AWS, Machine Learning, TensorFlow, Docker skills. 5 years of experience.',
#                 'filename': 'alice_resume.pdf'
#             },
#             {
#                 'name': 'Bob Smith',
#                 'email': 'bob.smith@email.com',
#                 'text': 'Frontend developer specializing in JavaScript, React, HTML, CSS, Node.js. 3 years experience.',
#                 'filename': 'bob_resume.pdf'
#             },
#             {
#                 'name': 'Carol Davis',
#                 'email': 'carol.davis@email.com',
#                 'text': 'Full-stack engineer with Java, Python, SQL, Angular, Spring Boot experience. 4 years in software development.',
#                 'filename': 'carol_resume.pdf'
#             }
#         ]
        
#         for i, file in enumerate(files[:3]):  # Limit to 3 files for demo
#             if i < len(mock_resumes):
#                 resume_data = mock_resumes[i]
#                 analysis = analyze_resume(resume_data['text'], job_description)
                
#                 candidate = {
#                     'name': resume_data['name'],
#                     'email': resume_data['email'],
#                     'score': analysis['score'],
#                     'matchedSkills': analysis['skillsFound'],
#                     'fileName': file.filename if file.filename else resume_data['filename']
#                 }
#                 candidates.append(candidate)
        
#         # Sort by score (highest first)
#         candidates.sort(key=lambda x: x['score'], reverse=True)
        
#         return jsonify({'candidates': candidates}), 200
        
#     except Exception as e:
#         return jsonify({'error': 'Screening failed'}), 500

# # Job Management Routes
# @app.route('/api/jobs', methods=['POST'])
# def create_job():
#     data = request.get_json()
#     title = data.get('title')
#     description = data.get('description')
#     recruiter_id = data.get('recruiterId')
    
#     if not all([title, description, recruiter_id]):
#         return jsonify({'error': 'All fields are required'}), 400
    
#     db = get_db()
#     job_id = str(uuid.uuid4())
    
#     try:
#         db.execute(
#             'INSERT INTO jobs (id, title, description, recruiter_id) VALUES (?, ?, ?, ?)',
#             (job_id, title, description, recruiter_id)
#         )
#         db.commit()
        
#         return jsonify({'success': True, 'jobId': job_id}), 201
#     except Exception as e:
#         return jsonify({'error': 'Failed to create job'}), 500

# @app.route('/api/jobs/recruiter/<recruiter_id>', methods=['GET'])
# def get_recruiter_jobs(recruiter_id):
#     db = get_db()
#     jobs = db.execute(
#         'SELECT * FROM jobs WHERE recruiter_id = ? ORDER BY created_at DESC',
#         (recruiter_id,)
#     ).fetchall()
    
#     jobs_list = []
#     for job in jobs:
#         jobs_list.append({
#             'id': job['id'],
#             'title': job['title'],
#             'description': job['description'],
#             'createdAt': job['created_at']
#         })
    
#     return jsonify({'jobs': jobs_list}), 200

# @app.route('/api/jobs/<job_id>', methods=['PUT'])
# def update_job(job_id):
#     data = request.get_json()
#     title = data.get('title')
#     description = data.get('description')
    
#     if not all([title, description]):
#         return jsonify({'error': 'All fields are required'}), 400
    
#     db = get_db()
    
#     try:
#         db.execute(
#             'UPDATE jobs SET title = ?, description = ? WHERE id = ?',
#             (title, description, job_id)
#         )
#         db.commit()
        
#         return jsonify({'success': True}), 200
#     except Exception as e:
#         return jsonify({'error': 'Failed to update job'}), 500

# @app.route('/api/jobs/<job_id>', methods=['DELETE'])
# def delete_job(job_id):
#     db = get_db()
    
#     try:
#         db.execute('DELETE FROM jobs WHERE id = ?', (job_id,))
#         db.commit()
        
#         return jsonify({'success': True}), 200
#     except Exception as e:
#         return jsonify({'error': 'Failed to delete job'}), 500

# # Q&A Session Routes
# @app.route('/api/sessions', methods=['GET'])
# def get_sessions():
#     db = get_db()
#     sessions = db.execute('''
#         SELECT s.*, u.name as guide_name 
#         FROM qa_sessions s 
#         JOIN users u ON s.guide_id = u.id 
#         ORDER BY s.created_at DESC
#     ''').fetchall()
    
#     sessions_list = []
#     for session in sessions:
#         sessions_list.append({
#             'id': session['id'],
#             'title': session['title'],
#             'description': session['description'],
#             'meetingLink': session['meeting_link'],
#             'guideName': session['guide_name'],
#             'createdAt': session['created_at']
#         })
    
#     return jsonify({'sessions': sessions_list}), 200

# @app.route('/api/sessions', methods=['POST'])
# def create_session():
#     data = request.get_json()
#     title = data.get('title')
#     description = data.get('description')
#     meeting_link = data.get('meetingLink')
#     guide_id = data.get('guideId')
    
#     if not all([title, description, meeting_link, guide_id]):
#         return jsonify({'error': 'All fields are required'}), 400
    
#     db = get_db()
#     session_id = str(uuid.uuid4())
    
#     try:
#         db.execute(
#             'INSERT INTO qa_sessions (id, title, description, meeting_link, guide_id) VALUES (?, ?, ?, ?, ?)',
#             (session_id, title, description, meeting_link, guide_id)
#         )
#         db.commit()
        
#         return jsonify({'success': True, 'sessionId': session_id}), 201
#     except Exception as e:
#         return jsonify({'error': 'Failed to create session'}), 500

# @app.route('/api/sessions/guide/<guide_id>', methods=['GET'])
# def get_guide_sessions(guide_id):
#     db = get_db()
#     sessions = db.execute(
#         'SELECT * FROM qa_sessions WHERE guide_id = ? ORDER BY created_at DESC',
#         (guide_id,)
#     ).fetchall()
    
#     sessions_list = []
#     for session in sessions:
#         sessions_list.append({
#             'id': session['id'],
#             'title': session['title'],
#             'description': session['description'],
#             'meetingLink': session['meeting_link'],
#             'createdAt': session['created_at']
#         })
    
#     return jsonify({'sessions': sessions_list}), 200

# @app.route('/api/sessions/<session_id>', methods=['DELETE'])
# def delete_session(session_id):
#     db = get_db()
    
#     try:
#         db.execute('DELETE FROM qa_sessions WHERE id = ?', (session_id,))
#         db.commit()
        
#         return jsonify({'success': True}), 200
#     except Exception as e:
#         return jsonify({'error': 'Failed to delete session'}), 500

# if __name__ == '__main__':
#     init_db()
#     app.run(debug=True)