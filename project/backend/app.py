import os
import sqlite3
import uuid
import pdfplumber
import docx2txt
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# -------------------------------------------------------------------------
# App Setup
# -------------------------------------------------------------------------
# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Load CORS origins from environment variable
CORS(app, origins=os.environ.get("CORS_ORIGINS", "*").split(','))

DATABASE = "aegis.db"
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf", "docx", "doc"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
# Use a more secure secret key for production
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "a_very_insecure_default_key")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# -------------------------------------------------------------------------
# Database Helpers
# -------------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db
def migrate():
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(session_requests)")
    cols = [c[1] for c in cur.fetchall()]

    if "programmer_id" not in cols:
        print("Adding programmer_id column...")
        cur.execute("ALTER TABLE session_requests ADD COLUMN programmer_id TEXT")
    else:
        print("programmer_id already exists ✅")

    if "status" not in cols:
        print("Adding status column...")
        cur.execute("ALTER TABLE session_requests ADD COLUMN status TEXT DEFAULT 'pending'")
    conn.commit()
    conn.close()
@app.teardown_appcontext
def close_db(error=None):
    db = g.pop("db", None)
    if db:
        db.close()

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# -------------------------------------------------------------------------
# Database Initialization
# -------------------------------------------------------------------------
def init_db():
    db = get_db()
    
    # Create tables if they don't exist
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('programmer','recruiter','guide')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
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
            FOREIGN KEY (company_id) REFERENCES companies(id),
            FOREIGN KEY (recruiter_id) REFERENCES users(id)
        )
    """)
    
    # Modified 'qa_sessions' table to include a 'status'
    db.execute("""
        CREATE TABLE IF NOT EXISTS qa_sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            meeting_link TEXT,
            guide_id TEXT,
            programmer_id TEXT,
            status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guide_id) REFERENCES users(id),
            FOREIGN KEY (programmer_id) REFERENCES users(id)
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS session_requests (
            id TEXT PRIMARY KEY,
            guide_id TEXT NOT NULL,
            programmer_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guide_id) REFERENCES users(id),
            FOREIGN KEY (programmer_id) REFERENCES users(id)
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    db.commit()
    migrate()  # Run database migrations
    insert_sample_data()

def insert_sample_data():
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

# -------------------------------------------------------------------------
# Resume Parsing & Analysis
# -------------------------------------------------------------------------
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
        print(f"Error parsing resume: {e}")
    return text or ""

def extract_skills_from_text(text):
    skills_db = ["Python", "JavaScript", "React", "Node.js", "SQL", "AWS", "Docker", "ML"]
    text = text.lower()
    return [s for s in skills_db if s.lower() in text]

def calculate_match_score(resume_skills, job_skills):
    if not job_skills:
        return 0
    return int((len(set(resume_skills) & set(job_skills)) / len(job_skills)) * 100)

@app.route("/api/analyze-resume", methods=["POST"])
def analyze_resume_api():
    resume_file = request.files.get("resume")
    job_desc = request.form.get("jobDescription", "")

    if not resume_file or not allowed_file(resume_file.filename):
        return jsonify({"error": "Invalid or missing resume file"}), 400

    filename = secure_filename(resume_file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], f"{uuid.uuid4()}_{filename}")
    resume_file.save(file_path)

    resume_text = parse_resume(file_path)
    os.remove(file_path)

    analysis = analyze_resume_logic(resume_text, job_desc)
    
    return jsonify({"analysis": analysis})

def analyze_resume_logic(resume_text, job_desc):
    """
    Analyzes resume text against a job description.
    Returns ATS-style score, matched/missing skills, and recommendations.
    """
    # Define a skills database (can later come from DB)
    skills_db = ["Python", "JavaScript", "React", "Node.js", "SQL", "AWS", "Docker", "ML"]

    # Extract skills from resume and job description
    resume_skills = [s for s in skills_db if s.lower() in resume_text.lower()]
    job_skills = [s for s in skills_db if s.lower() in job_desc.lower()]

    # Compute overlap
    skills_found = list(set(resume_skills) & set(job_skills))
    skills_missing = list(set(job_skills) - set(resume_skills))

    # ATS-style score (percentage of job skills present in resume)
    score = int((len(skills_found) / max(1, len(job_skills))) * 100)

    # Recommendations
    recommendations = []
    if skills_missing:
        recommendations.append("Consider adding: " + ", ".join(skills_missing))
    if score < 70:
        recommendations.append("Tailor your resume to highlight job-relevant skills more clearly.")
    if not recommendations:
        recommendations.append("Excellent! Your resume aligns very well with the job description.")

    return {
        "score": score,
        "skillsFound": skills_found,
        "skillsMissing": skills_missing,
        "recommendations": recommendations
    }

# -------------------------------------------------------------------------
# Auth Routes
# -------------------------------------------------------------------------
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

# -------------------------------------------------------------------------
# Companies & Jobs
# -------------------------------------------------------------------------
@app.route("/api/companies", methods=["GET"])
def get_companies():
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
        cid = row["company_id"]
        if cid not in companies:
            companies[cid] = {"id": cid, "name": row["company_name"], "jobRoles": []}
        if row["job_id"]:
            companies[cid]["jobRoles"].append({"id": row["job_id"], "title": row["job_title"]})

    return jsonify({"companies": list(companies.values())})
@app.route("/api/jobs", methods=["POST"])
def add_or_update_job():
    data = request.get_json()
    title = data.get("title")
    description = data.get("description")
    company_name = data.get("companyName")  # from frontend form
    requirements = data.get("requirements")
    location = data.get("location")

    if not all([title, description, company_name]):
        return jsonify({"error": "Missing required fields"}), 400

    db = get_db()

    # 🔹 find or create company
    company = db.execute("SELECT id FROM companies WHERE name=?", (company_name,)).fetchone()
    if company:
        company_id = company["id"]
    else:
        company_id = str(uuid.uuid4())
        db.execute("INSERT INTO companies (id, name) VALUES (?, ?)", (company_id, company_name))

    # 🔹 check if job already exists for this company + title
    existing = db.execute(
        "SELECT id FROM jobs WHERE title=? AND company_id=?",
        (title, company_id)
    ).fetchone()

    if existing:
        db.execute(
            "UPDATE jobs SET description=?, requirements=?, location=? WHERE id=?",
            (description, requirements, location, existing["id"])
        )
        db.commit()
        return jsonify({"message": "Job description updated", "jobId": existing["id"]}), 200
    else:
        job_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO jobs (id, title, description, requirements, location, company_id) VALUES (?,?,?,?,?,?)",
            (job_id, title, description, requirements, location, company_id)
        )
        db.commit()
        return jsonify({"message": "Job added successfully", "jobId": job_id}), 201
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

# -------------------------------------------------------------------------
# Resume Screening (Multiple Resumes)
# -------------------------------------------------------------------------
@app.route("/api/resume/screen", methods=["POST"])
def screen_resumes():
    """
    Screen multiple resumes against a job description.
    Returns candidates with ATS scores and shortlisting status.
    """
    print("DEBUG: Resume screening endpoint called")
    job_desc = request.form.get("jobDescription", "")
    resume_files = request.files.getlist("resumes")
    print(f"DEBUG: Job description: {job_desc}")
    print(f"DEBUG: Resume files count: {len(resume_files)}")
    
    if not resume_files or not job_desc:
        return jsonify({"error": "Missing job description or resume files"}), 400
    
    candidates = []
    
    for resume_file in resume_files:
        if not allowed_file(resume_file.filename):
            continue
            
        filename = secure_filename(resume_file.filename)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], f"{uuid.uuid4()}_{filename}")
        resume_file.save(file_path)
        
        try:
            # Parse resume text
            resume_text = parse_resume(file_path)
            
            # Analyze resume against job description
            analysis = analyze_resume_logic(resume_text, job_desc)
            
            # Extract candidate name from filename (remove extension)
            candidate_name = filename.rsplit('.', 1)[0].replace('_', ' ').title()
            
            # Create candidate object
            candidate = {
                "name": candidate_name,
                "email": f"{candidate_name.lower().replace(' ', '.')}@email.com",  # Placeholder email
                "score": analysis["score"],
                "matchedSkills": analysis["skillsFound"],
                "missingSkills": analysis["skillsMissing"],
                "fileName": filename,
                "isShortlisted": analysis["score"] >= 70
            }
            
            candidates.append(candidate)
            
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            continue
        finally:
            # Clean up uploaded file
            if os.path.exists(file_path):
                os.remove(file_path)
    
    # Sort candidates by score (highest first)
    candidates.sort(key=lambda x: x["score"], reverse=True)
    
    # Separate shortlisted and rejected candidates
    shortlisted = [c for c in candidates if c["isShortlisted"]]
    rejected = [c for c in candidates if not c["isShortlisted"]]
    
    return jsonify({
        "candidates": candidates,
        "shortlisted": shortlisted,
        "rejected": rejected,
        "summary": {
            "total": len(candidates),
            "shortlisted": len(shortlisted),
            "rejected": len(rejected),
            "shortlistRate": round((len(shortlisted) / len(candidates)) * 100, 1) if candidates else 0
        }
    })

# -------------------------------------------------------------------------
# Resume Job Finding
# -------------------------------------------------------------------------
@app.route("/api/resume/job-finding", methods=["POST"])
def job_finding_api():
    job_desc = request.form.get("jobDescription", "")
    resume_file = request.files.get("resume")

    if not resume_file or not allowed_file(resume_file.filename):
        return jsonify({"error": "Invalid or missing resume file"}), 400

    filename = secure_filename(resume_file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], f"{uuid.uuid4()}_{filename}")
    resume_file.save(file_path)

    resume_text = parse_resume(file_path)
    os.remove(file_path)

    analysis = analyze_resume_logic(resume_text, job_desc)

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
                "company": job["company_name"],
                "industry": job["industry"],
                "location": job["location"] or job["company_location"],
                "score": score,
                "requirements": job["requirements"]
            })

    matched_jobs = sorted(matched_jobs, key=lambda x: x["score"], reverse=True)

    return jsonify({"jobFinding": {"analysis": analysis, "matchedJobs": matched_jobs}})

# -------------------------------------------------------------------------
# Guides & Session Requests
# -------------------------------------------------------------------------
@app.route("/api/guides", methods=["GET"])
def get_guides():
    db = get_db()
    rows = db.execute("SELECT id, name, email FROM users WHERE role='guide'").fetchall()
    return jsonify([{"id": r["id"], "name": r["name"], "expertise":"General Guidance","email":r["email"]} for r in rows])

@app.route("/api/request-session", methods=["POST"])
def request_session():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        guide_id = data.get("guideId")
        programmer_id = data.get("programmerId")

        if not guide_id or not programmer_id:
            return jsonify({"error": "Missing fields"}), 400

        db = get_db()

        # ✅ check if guide exists
        guide = db.execute(
            "SELECT * FROM users WHERE id=? AND role='guide'", (guide_id,)
        ).fetchone()
        if not guide:
            return jsonify({"error": "Guide not found"}), 404

        # ✅ check if programmer exists
        programmer = db.execute(
            "SELECT * FROM users WHERE id=? AND role='programmer'", (programmer_id,)
        ).fetchone()
        if not programmer:
            return jsonify({"error": "Programmer not found"}), 404

        # ✅ insert session request (NOW with name + email)
        request_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO session_requests (id, guide_id, programmer_id, programmer_name, programmer_email) VALUES (?,?,?,?,?)",
            (request_id, guide_id, programmer_id, programmer["name"], programmer["email"]),
        )
        db.commit()

        # ✅ notify the guide
        message = f"You have a new session request from {programmer['name']}."
        db.execute(
            "INSERT INTO notifications (id, user_id, message) VALUES (?,?,?)",
            (str(uuid.uuid4()), guide_id, message),
        )
        db.commit()

        return jsonify({"success": True, "message": f"Session requested with {guide['name']}!"}), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route("/api/session-requests/<guide_id>", methods=["GET"])
def get_session_requests(guide_id):
    try:
        db = get_db()
        rows = db.execute("""
            SELECT sr.id, sr.status, sr.created_at, u.name as programmer_name, u.email as programmer_email
            FROM session_requests sr
            JOIN users u ON sr.programmer_id = u.id
            WHERE sr.guide_id=? AND sr.status='pending'
        """, (guide_id,)).fetchall()
        return jsonify({"requests": [dict(r) for r in rows]})
    except Exception as e:
        print(f"Error in get_session_requests: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/session-requests/<request_id>/update", methods=["POST"])
def update_session_request(request_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        new_status = data.get("status")
        if new_status not in ["approved","rejected"]:
            return jsonify({"error":"Invalid status"}), 400

        db = get_db()
        req = db.execute("SELECT programmer_id FROM session_requests WHERE id=?", (request_id,)).fetchone()
        if not req:
            return jsonify({"error":"Session request not found"}), 404
        
        programmer_id = req["programmer_id"]

        db.execute("UPDATE session_requests SET status=? WHERE id=?", (new_status, request_id))
        message = f"Your session request has been {new_status}."
        db.execute("INSERT INTO notifications (id, user_id, message) VALUES (?,?,?)", (str(uuid.uuid4()), programmer_id, message))
        db.commit()
        return jsonify({"success": True, "status": new_status})
    except Exception as e:
        print(f"Error in update_session_request: {e}")
        return jsonify({"error": "Internal server error"}), 500

# -------------------------------------------------------------------------
# Notifications
# -------------------------------------------------------------------------
@app.route("/api/notifications/<user_id>", methods=["GET"])
def get_notifications(user_id):
    db = get_db()
    rows = db.execute("SELECT id, message, is_read, created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC", (user_id,)).fetchall()
    return jsonify({"notifications": [dict(r) for r in rows]})

@app.route("/api/notifications/<notification_id>/read", methods=["POST"])
def mark_notification_read(notification_id):
    db = get_db()
    notif = db.execute("SELECT * FROM notifications WHERE id=?", (notification_id,)).fetchone()
    if not notif:
        return jsonify({"error": "Notification not found"}), 404
    db.execute("UPDATE notifications SET is_read=1 WHERE id=?", (notification_id,))
    db.commit()
    return jsonify({"success": True})

# -------------------------------------------------------------------------
# QA Sessions Routes
# -------------------------------------------------------------------------
@app.route("/api/sessions", methods=["POST"])
def create_session():
    data = request.get_json()
    title = data.get("title")
    description = data.get("description")
    meeting_link = data.get("meeting_link")
    guide_id = data.get("guide_id")
    programmer_id = data.get("programmer_id") # Get programmer_id from request

    if not all([title, description, meeting_link, guide_id, programmer_id]):
        return jsonify({"error": "Missing fields"}), 400

    db = get_db()

    # Insert new session
    session_id = str(uuid.uuid4())
    db.execute("""
        INSERT INTO qa_sessions (id, title, description, meeting_link, guide_id, programmer_id)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (session_id, title, description, meeting_link, guide_id, programmer_id))
    
    # Update the related session request to 'approved'
    db.execute("UPDATE session_requests SET status='approved' WHERE guide_id=? AND programmer_id=?", (guide_id, programmer_id))

    # Notify programmer
    message = f"A new 1:1 session has been created for you: {title}"
    db.execute("INSERT INTO notifications (id, user_id, message) VALUES (?, ?, ?)",
                (str(uuid.uuid4()), programmer_id, message))

    db.commit()
    return jsonify({"success": True, "sessionId": session_id})

# GET all Q&A sessions (for programmers)
@app.route("/api/sessions", methods=["GET"])
def get_all_sessions():
    db = get_db()
    rows = db.execute("""
        SELECT s.id, s.title, s.description, s.meeting_link as meetingLink,
               s.created_at as createdAt, u.name as guideName
        FROM qa_sessions s
        JOIN users u ON s.guide_id = u.id
        ORDER BY s.created_at DESC
    """).fetchall()
    return jsonify({"sessions": [dict(r) for r in rows]})


@app.route("/api/sessions/guide/<guide_id>", methods=["GET"])
def get_sessions_for_guide(guide_id):
    db = get_db()
    rows = db.execute("""
        SELECT s.id, s.title, s.description, s.meeting_link as meetingLink, s.created_at as createdAt, u.name as programmerName
        FROM qa_sessions s
        JOIN users u ON s.programmer_id = u.id
        WHERE s.guide_id=?
        ORDER BY s.created_at DESC
    """, (guide_id,)).fetchall()
    return jsonify({"sessions": [dict(r) for r in rows]})

@app.route("/api/sessions/programmer/<programmer_id>", methods=["GET"])
def get_sessions_for_programmer(programmer_id):
    db = get_db()
    rows = db.execute("""
        SELECT s.id, s.title, s.description, s.meeting_link as meetingLink,
               s.created_at as createdAt, u.name as guideName
        FROM qa_sessions s
        JOIN users u ON s.guide_id=u.id
        WHERE s.programmer_id=?
        ORDER BY s.created_at DESC
    """, (programmer_id,)).fetchall()
    return jsonify({"sessions": [dict(r) for r in rows]})


# -------------------------------------------------------------------------
# Main
# -------------------------------------------------------------------------
if __name__ == "__main__":
    with app.app_context():
        init_db()
        migrate()
    app.run(debug=True, port=5000)

