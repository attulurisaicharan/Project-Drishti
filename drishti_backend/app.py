from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext

from database import init_db, get_connection
init_db()
from services.nlp_service import detect_calamity
from services.risk_service import predict_risk
from services.decision_service import route_status
from services.weather_service import get_weather



# ======================
# APP INIT
# ======================
app = FastAPI(title="DRISHTI AI Backend")
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ======================
# UTILS
# ======================
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

# ======================
# CONFIDENCE (EMAIL + TRUST BASED)
# ======================
def calculate_confidence(lat, lon, calamity):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            u.trust_score,
            (strftime('%s','now') - strftime('%s', c.timestamp)) / 60 AS minutes_ago
        FROM crowd_reports c
        JOIN users u ON c.user_email = u.email
        WHERE c.calamity_type = ?
        AND ABS(c.latitude - ?) < 0.005
        AND ABS(c.longitude - ?) < 0.005
    """, (calamity, lat, lon))

    rows = cursor.fetchall()
    conn.close()

    effective_trust = 0

    for trust, minutes in rows:
        if minutes <= 10:
            weight = 1.0
        elif minutes <= 20:
            weight = 0.6
        elif minutes <= 40:
            weight = 0.3
        else:
            weight = 0.0

        effective_trust += trust * weight

    if effective_trust >= 120:
        return "HIGH"
    elif effective_trust >= 60:
        return "MEDIUM"
    else:
        return "LOW"


def calculate_dynamic_radius(lat, lon, calamity):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            (strftime('%s','now') - strftime('%s', timestamp)) / 60 AS minutes_ago
        FROM crowd_reports
        WHERE calamity_type = ?
        AND ABS(latitude - ?) < 0.005
        AND ABS(longitude - ?) < 0.005
        ORDER BY timestamp DESC
        LIMIT 1
    """, (calamity, lat, lon))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return 150  # default minimal radius

    minutes = row[0]

    # 🔮 PREDICTIVE SPREAD RULES
    if minutes <= 10:
        return 200
    elif minutes <= 25:
        return 400
    elif minutes <= 45:
        return 700
    elif minutes <= 90:
        return 500
    else:
        return 200



def update_trust(user_email, confidence):
    conn = get_connection()
    cursor = conn.cursor()

    if confidence == "HIGH":
        delta = 3
    elif confidence == "MEDIUM":
        delta = 1
    else:
        delta = 0  # ❌ do NOT penalize immediately

    cursor.execute("""
        UPDATE users
        SET trust_score = MIN(100, trust_score + ?)
        WHERE email = ?
    """, (delta, user_email))

    conn.commit()
    conn.close()


# ======================
# REQUEST MODELS
# ======================
class AnalyzeRequest(BaseModel):
    text: str
    lat: float
    lon: float
    distance: float
    time_min: float
    user_email: str

class SignupRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# ======================
# ROUTES
# ======================
@app.get("/")
def root():
    return {"message": "DRISHTI backend is running 🚀"}

# ---------- AUTH ----------
@app.post("/signup")
def signup(data: SignupRequest):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO users (email, password_hash)
            VALUES (?, ?)
        """, (data.email, hash_password(data.password)))
        conn.commit()
    except:
        raise HTTPException(status_code=400, detail="User already exists")

    conn.close()
    return {"status": "signup successful"}

@app.post("/login")
def login(data: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT password_hash FROM users WHERE email = ?",
        (data.email,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row or not verify_password(data.password, row[0]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"status": "login successful", "email": data.email}

# ---------- ANALYZE ----------
@app.post("/analyze")
def analyze(data: AnalyzeRequest):
    conn = get_connection()
    cursor = conn.cursor()

    # 🔐 Ensure user exists
    cursor.execute(
        "SELECT trust_score FROM users WHERE email = ?",
        (data.user_email,)
    )
    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=401, detail="User not registered")

    # 🧠 AI LOGIC
    calamity = detect_calamity(data.text).lower()
    rainfall, wind_speed = get_weather(data.lat, data.lon)

    # Weighted scoring system (replaces ML model)
    try:
        risk_result = predict_risk(
            rainfall,
            data.distance,
            data.time_min,
            calamity,
            wind_speed
        )
        risk = risk_result["risk"]
        risk_score = risk_result["score"]
        risk_breakdown = risk_result["breakdown"]
    except Exception as e:
        print(f"CRITICAL: Risk Scoring Failed for {calamity}. Error: {e}")
        risk = "LOW"
        risk_score = 0
        risk_breakdown = {}


    status = route_status(risk)

    # 💾 SAVE REPORT (EMAIL BASED)
    try:
        cursor.execute("""
            INSERT INTO crowd_reports
            (calamity_type, description, latitude, longitude, risk, user_email)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            calamity,
            data.text,
            data.lat,
            data.lon,
            risk,
            data.user_email
        ))
        conn.commit()
    except Exception as e:
        print("❌ DB ERROR:", e)

    # 🔍 CALCULATE CONFIDENCE
    confidence = calculate_confidence(
        data.lat,
        data.lon,
        calamity
    )
    radius = calculate_dynamic_radius(
        data.lat,
        data.lon,
        calamity
    )



    # 📈 UPDATE TRUST SCORE
    update_trust(data.user_email, confidence)

    conn.close()

    return {
        "calamity": calamity,
        "risk": risk,
        "risk_score": risk_score,
        "risk_breakdown": risk_breakdown,
        "status": status,
        "confidence": confidence,
        "radius": radius
    }



# ---------- CROWD REPORTS ----------
@app.get("/crowd-reports")
def get_crowd_reports():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT calamity_type, latitude, longitude, risk, user_email, timestamp
        FROM crowd_reports
        ORDER BY timestamp DESC
        LIMIT 100
    """)


    rows = cursor.fetchall()

    reports = []

    for r in rows:
        cursor.execute("""
            SELECT (strftime('%s','now') - strftime('%s', ?)) / 60
        """, (r[5],))

        minutes_ago = cursor.fetchone()[0]

        reports.append({
            "calamity": r[0],
            "lat": r[1],
            "lon": r[2],
            "risk": r[3],
            "user_email": r[4],
            "confidence": calculate_confidence(r[1], r[2], r[0]),
            "radius": calculate_dynamic_radius(r[1], r[2], r[0]),
            "minutes_ago": minutes_ago
        })
    conn.close()
    return reports
