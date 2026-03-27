import joblib

vectorizer = joblib.load("models/vectorizer.pkl")
nlp_model = joblib.load("models/nlp_model.pkl")
text_encoder = joblib.load("models/text_encoder.pkl")

def detect_calamity(text: str) -> str:
    vector = vectorizer.transform([text])
    proba = nlp_model.predict_proba(vector)[0]
    confidence = max(proba)

    prediction = nlp_model.predict(vector)

    if confidence < 0.4:
        return "unknown"

    return text_encoder.inverse_transform(prediction)[0]
