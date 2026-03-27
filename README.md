# 🛰️ DRISHTI: Calamity-Aware Route Safety System

**DRISHTI** (Vision) is an intelligent, crowd-sourced navigation engine designed to solve the "last-mile" safety problem during environmental calamities. Unlike standard GPS tools, DRISHTI validates real-time disaster reports using AI and provides mathematically safe detours around high-risk zones.

## 🌟 Key Features

  * **Bilingual Calamity Detection:** A Natural Language Processing (NLP) pipeline that classifies reports in both **English and Hindi**.
  * **Weighted Trust Engine:** A sophisticated validation layer that uses **Temporal Decay** (weighting reports from 1.0 to 0.0 over 40 minutes) to ensure data freshness.
  * **Predictive Risk Zones:** Dynamic radius logic that models the expansion and contraction of disaster zones (peaking at a 700m spread).
  * **Safety-First Routing:** An OSRM-integrated routing algorithm that scores candidate paths based on risk levels, prioritizing "Safe" over "Fast."
  * **Interactive Heatmaps:** Real-time spatial visualization of disaster density using Leaflet.js.
  * **User Reputation System:** An automated trust-loop where users earn higher credibility scores for accurate, validated reporting.

-----

## 🚀 How It Works

DRISHTI operates on a three-tier validation logic:

1.  **NLP & Risk Assessment:** When a user reports an incident, the system uses **Logistic Regression** to identify the calamity and a **Random Forest Classifier** to determine severity based on rainfall and distance.
2.  **Crowd Validation:** The system calculates a **Confidence Score** by aggregating nearby reports. It applies a time-decay weight so that older reports have less influence on current navigation.
3.  **Dynamic Detouring:** If a route is flagged as "Blocked," the system generates detour waypoints around the epicentre and finds the shortest "Safe" alternative.

-----

## 🛠️ Installation & Setup

### Prerequisites

  * Python 3.8+
  * OpenWeatherMap API Key (for real-time rainfall data)

### 1\. Clone the Repository

```bash
git clone https://github.com/your-username/project-drishti.git
cd project-drishti
```

### 2\. Set Up Virtual Environment

```bash
python -m venv venv
source venv/bin/scripts/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3\. Initialize Models & Database

```bash
python train_models.py
# This generates the .pkl files in the /models directory and initializes the SQLite DB.
```

### 4\. Run the Backend

```bash
uvicorn app:app --reload
```

### 5\. Launch the Frontend

Open `frontend/index.html` in your preferred web browser.

-----

## 🖥️ Usage

1.  **Authentication:** Sign up or Login to activate the trust-tracking system.
2.  **Reporting:** Switch to **Calamity Mode**, click the location on the map, and describe the situation (e.g., "Heavy waterlogging near the bridge").
3.  **Navigation:** Switch to **Route Mode**, select your Start and End points.
4.  **Analysis:** Click **Analyze Route**. The system will highlight the safest path in green or warn you if no safe detour exists.

-----

## 📊 Technologies Used

| Category | Tools |
| :--- | :--- |
| **Backend** | FastAPI, Pydantic, Python |
| **Machine Learning** | Scikit-learn, Pandas, Joblib |
| **Database** | SQLite3 |
| **Mapping & UI** | Leaflet.js, OSRM API, OpenWeatherMap API |
| **Styling** | Modern CSS (Glassmorphism, Dark Mode Support) |

-----

## 👤 Contact

**Devesh** - [deveshmunagala23@gmail.com/ https://www.linkedin.com/in/deveshmunagala/]  
