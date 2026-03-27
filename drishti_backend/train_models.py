import random
import joblib
import pandas as pd

from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# NOTE: Risk prediction is now handled by the weighted scoring
# system in services/risk_service.py — no ML model needed.


# -----------------------------
# PART 2: TRAIN NLP MODEL
# -----------------------------

texts = [
    # ACCIDENT
    "road accident happened",
    "traffic accident reported",
    "vehicle collision on highway",
    "सड़क दुर्घटना हुई",
    "दुर्घटना के कारण सड़क बंद है",

    # FLOOD
    "road flooded",
    "flood water on road",
    "heavy rain caused flooding",
    "सड़क पर बाढ़",
    "बारिश से सड़क भर गई",

    # COLLAPSE
    "building collapse reported",
    "bridge collapse",
    "structure fell down",
    "इमारत गिर गई",
    "पुल ढह गया"
]

labels = [
    "accident", "accident", "accident", "accident", "accident",
    "flood", "flood", "flood", "flood", "flood",
    "collapse", "collapse", "collapse", "collapse", "collapse"
]


vectorizer = TfidfVectorizer()
X_text = vectorizer.fit_transform(texts)

text_encoder = LabelEncoder()
y_text = text_encoder.fit_transform(labels)

nlp_model = LogisticRegression()
nlp_model.fit(X_text, y_text)

# -----------------------------
# SAVE NLP MODELS
# -----------------------------

joblib.dump(nlp_model, "models/nlp_model.pkl")
joblib.dump(vectorizer, "models/vectorizer.pkl")
joblib.dump(text_encoder, "models/text_encoder.pkl")

print("✅ All models trained and saved successfully")
