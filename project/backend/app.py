import os
import sqlite3
import uuid
import random
import re
import pdfplumber
import docx2txt
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
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
    """Get companies with their job roles"""
    db = get_db()
    rows = db.execute("""
        SELECT c.id as company_id, c.name as company_name, 
               j.id as job_id, j.title as job_title
        FROM companies c
        LEFT JOIN jobs j ON c.id = j.company_id
        ORDER BY c.name, j.title
    """).fetchall()

    companies = {}
    for row in rows:
        company_id = row["company_id"]
        if company_id not in companies:
            companies[company_id] = {
                "id": company_id,
                "name": row["company_name"],
                "jobRoles": []
            }
        
        # Add job roles if they exist
        if row["job_id"]:
            companies[company_id]["jobRoles"].append({
                "id": row["job_id"],
                "title": row["job_title"]
            })

    return jsonify({"companies": list(companies.values())})


@app.route("/api/jobs", methods=["GET"])
def get_jobs():
    db = get_db()
    rows = db.execute("""
        SELECT j.id, j.title, j.description, j.requirements, j.location,
               c.name as company_name
        FROM jobs j
        JOIN companies c ON j.company_id = c.id
    """).fetchall()
    return jsonify({"jobs": [dict(r) for r in rows]})


@app.route("/api/jobs/<job_id>", methods=["GET"])
def get_job_details(job_id):
    db = get_db()
    job = db.execute("""
        SELECT j.id, j.title, j.description, j.requirements, j.location,
               c.name AS company_name
        FROM jobs j
        JOIN companies c ON j.company_id = c.id
        WHERE j.id = ?
    """, (job_id,)).fetchone()

    if job:
        return jsonify({"job": dict(job)})
    return jsonify({"error": "Job not found"}), 404


# -----------------------------------------------------------------------------
# Resume Routes (Mock)
# -----------------------------------------------------------------------------
@app.route("/api/resume/analyze", methods=["POST"])
def analyze_resume_api():
    job_desc = request.form.get("jobDescription", "")
    resume_text = "Python, React, AWS, SQL experience"

    analysis = analyze_resume(resume_text, job_desc)

    # Add recommendations (simple mockup for demo)
    recommendations = []
    if analysis["skillsMissing"]:
        recommendations.append(
            f"Consider learning {', '.join(analysis['skillsMissing'])} to improve your profile."
        )
    if analysis["score"] < 60:
        recommendations.append("Your match score is low. Tailor your resume to the job description.")
    if analysis["score"] >= 80:
        recommendations.append("Great match! You are well-qualified for this role.")

    analysis["recommendations"] = recommendations

    return jsonify({"analysis": analysis})



#Job Finding

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def teardown_db(error=None):
    db = g.pop("db", None)
    if db:
        db.close()

# -----------------------------------------------------------------------------  
# Resume Parsing
# -----------------------------------------------------------------------------
def parse_resume(file_path):
    ext = file_path.rsplit(".", 1)[1].lower()
    text = ""
    try:
        if ext == "pdf":
            with pdfplumber.open(file_path) as pdf:
                text = "\n".join([page.extract_text() or "" for page in pdf.pages])
        elif ext in {"docx", "doc"}:
            text = docx2txt.process(file_path)
    except Exception as e:
        print("Error parsing resume:", e)
    return text or ""

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
# Job Finding Endpoint
# -----------------------------------------------------------------------------
@app.route("/api/resume/job-finding", methods=["POST"])
def job_finding_api():
    job_desc = request.form.get("jobDescription", "")
    resume_file = request.files.get("resume")

    if not resume_file or not allowed_file(resume_file.filename):
        return jsonify({"error": "Invalid or missing resume file"}), 400

    # Save file temporarily
    filename = secure_filename(resume_file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], f"{uuid.uuid4()}_{filename}")
    resume_file.save(file_path)

    # Extract text
    resume_text = parse_resume(file_path)

    # Optional: remove temp file after parsing
    os.remove(file_path)

    # Analyze resume vs job description
    analysis = analyze_resume(resume_text, job_desc)

    # Fetch jobs
    db = get_db()
    jobs = db.execute("""
        SELECT j.id, j.title, j.description, j.requirements, j.location,
               c.name as company_name, c.industry, c.location as company_location
        FROM jobs j
        JOIN companies c ON j.company_id = c.id
    """).fetchall()

    resume_skills = extract_skills_from_text(resume_text)
    matched_jobs = []

    for job in jobs:
        job_text = f"{job['description']} {job['requirements'] or ''}"
        job_skills = extract_skills_from_text(job_text)
        score = calculate_match_score(resume_skills, job_skills)

        if score > 0:
            matched_jobs.append({
    "jobId": job["id"],
    "title": job["title"],
    "company": job["company_name"],  # <-- this is sent
    "industry": job["industry"],
    "location": job["location"] or job["company_location"],
    "score": score,
    "requirements": job["requirements"]
})

    matched_jobs = sorted(matched_jobs, key=lambda x: x["score"], reverse=True)

    return jsonify({
        "jobFinding": {
            "analysis": analysis,
            "matchedJobs": matched_jobs
        }
    })
# @app.route("/api/resume/job-finding", methods=["POST"])
# def job_finding_api():
#     """
#     Job Finding:
#     Programmer uploads resume (optional job description).
#     Returns:
#       - resume analysis
#       - all matching jobs across companies
#     """
#     # Input
#     job_desc = request.form.get("jobDescription", "")
#     # TODO: replace with actual resume parsing logic
#     resume_text = "Python, React, AWS, SQL experience"

#     # Resume vs. job description (optional analysis)
#     analysis = analyze_resume(resume_text, job_desc)

#     # Fetch jobs + companies
#     db = get_db()
#     jobs = db.execute("""
#         SELECT j.id, j.title, j.description, j.requirements, j.location,
#                c.name as company_name, c.industry, c.location as company_location
#         FROM jobs j
#         JOIN companies c ON j.company_id = c.id
#     """).fetchall()

#     resume_skills = extract_skills_from_text(resume_text)

#     matched_jobs = []
#     for job in jobs:
#         job_text = f"{job['description']} {job['requirements'] or ''}"
#         job_skills = extract_skills_from_text(job_text)
#         score = calculate_match_score(resume_skills, job_skills)

#         if score > 0:  # keep only relevant jobs
#             matched_jobs.append({
#                 "jobId": job["id"],
#                 "title": job["title"],
#                 "company": job["company_name"],
#                 "industry": job["industry"],
#                 "location": job["location"] or job["company_location"],
#                 "score": score,
#                 "requirements": job["requirements"]
#             })

#     # Sort best matches first
#     matched_jobs = sorted(matched_jobs, key=lambda x: x["score"], reverse=True)

#     return jsonify({
#         "jobFinding": {
#             "analysis": analysis,
#             "matchedJobs": matched_jobs
#         }
#     })

# -----------------------------------------------------------------------------
# Q&A Sessions
# -----------------------------------------------------------------------------
@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    db = get_db()
    rows = db.execute("""
        SELECT s.id, s.title, s.description, s.meeting_link as meetingLink,
               s.created_at as createdAt,
               u.name as guideName
        FROM qa_sessions s
        JOIN users u ON s.guide_id = u.id
    """).fetchall()
    return jsonify({"sessions": [dict(r) for r in rows]})


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    with app.app_context():
        init_db()
    app.run(debug=True, port=5000)