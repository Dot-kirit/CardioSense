import os
import logging
from flask import Flask, request, render_template, jsonify, redirect, url_for, session
import pickle
import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Optional

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# ── App & model setup ─────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")

MODEL_PATH = os.environ.get("MODEL_PATH", "model.pkl")

def load_model(path: str):
    try:
        with open(path, "rb") as f:
            model = pickle.load(f)
        logger.info(f"Model loaded successfully from '{path}'")
        return model
    except FileNotFoundError:
        logger.error(f"Model file not found at '{path}'")
        raise
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

model = load_model(MODEL_PATH)

# ── Input schema & validation ─────────────────────────────────────────────────
FEATURE_SCHEMA = {
    "age":      {"min": 1,   "max": 120,  "label": "Age"},
    "sex":      {"min": 0,   "max": 1,    "label": "Sex (0=Female, 1=Male)"},
    "cp":       {"min": 0,   "max": 3,    "label": "Chest Pain Type (0–3)"},
    "trestbps": {"min": 50,  "max": 250,  "label": "Resting Blood Pressure"},
    "chol":     {"min": 100, "max": 600,  "label": "Serum Cholesterol"},
    "fbs":      {"min": 0,   "max": 1,    "label": "Fasting Blood Sugar > 120 mg/dl (0/1)"},
    "restecg":  {"min": 0,   "max": 2,    "label": "Resting ECG Results (0–2)"},
    "thalach":  {"min": 50,  "max": 250,  "label": "Max Heart Rate Achieved"},
    "exang":    {"min": 0,   "max": 1,    "label": "Exercise Induced Angina (0/1)"},
    "oldpeak":  {"min": 0.0, "max": 10.0, "label": "ST Depression (Oldpeak)"},
    "slope":    {"min": 0,   "max": 2,    "label": "Slope of Peak Exercise ST (0–2)"},
    "ca":       {"min": 0,   "max": 4,    "label": "Major Vessels Colored by Fluoroscopy (0–4)"},
    "thal":     {"min": 0,   "max": 3,    "label": "Thalassemia (0–3)"},
}

@dataclass
class ValidationError:
    field: str
    message: str

def validate_and_parse(form_data) -> tuple[Optional[np.ndarray], list[ValidationError]]:
    """Parse and validate all form fields. Returns (features, errors)."""
    values = []
    errors = []

    for field, rules in FEATURE_SCHEMA.items():
        raw = form_data.get(field, "").strip()

        if not raw:
            errors.append(ValidationError(field, f"{rules['label']} is required."))
            continue

        try:
            value = float(raw)
        except ValueError:
            errors.append(ValidationError(field, f"{rules['label']} must be a number."))
            continue

        if not (rules["min"] <= value <= rules["max"]):
            errors.append(ValidationError(
                field,
                f"{rules['label']} must be between {rules['min']} and {rules['max']}."
            ))
            continue

        values.append(value)

    if errors:
        return None, errors

    return np.array(values, dtype=float).reshape(1, -1), []

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    print("FORM DATA:", request.form)  # Debugging line
    features, errors = validate_and_parse(request.form)
    print("PARSED FEATURES:",features)
    print("ERRORS:", [{"field": e.field, "message": e.message} for e in errors])

    if errors:
        error_messages = [{"field": e.field, "message": e.message} for e in errors]
        if request.headers.get("Accept") == "application/json":
            return jsonify({"success": False, "errors": error_messages}), 422
        # Send back to index.html with errors + preserve filled-in form data
        return render_template("index.html", errors=error_messages, form_data=request.form)

    try:
        feature_names = list(FEATURE_SCHEMA.keys())
        features_df = pd.DataFrame(features, columns=feature_names)
        prediction = model.predict(features_df)[0]
        confidence = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(features_df)[0]
            confidence = round(float(max(proba)) * 100, 1)

        risk = "high" if prediction == 1 else "low"
        result_text = (
            "The patient is likely to have a HIGH risk of heart disease."
            if risk == "high"
            else "The patient is likely to have a LOW risk of heart disease."
        )

        logger.info(f"Prediction made | risk={risk} | confidence={confidence}%")

        if request.headers.get("Accept") == "application/json":
            return jsonify({
                "success": True,
                "risk": risk,
                "result": result_text,
                "confidence": confidence,
            })

        # Store result in session and redirect to result page
        session["result"] = {
            "prediction_text": result_text,
            "risk": risk,
            "confidence": confidence,
        }
        return redirect(url_for("result"))

    except Exception as e:
        import traceback
        logger.error(f"Prediction failed: {e}")
        logger.error(traceback.format_exc())
        error_msg = "An unexpected error occurred during prediction. Please try again."
        if request.headers.get("Accept") == "application/json":
            return jsonify({"success": False, "error": error_msg}), 500
        return render_template("index.html", server_error=error_msg, form_data=request.form)


@app.route("/result")
def result():
    # If someone visits /result directly without a prediction, send them back
    result_data = session.pop("result", None)
    if not result_data:
        return redirect(url_for("home"))

    return render_template(
        "result.html",
        prediction_text=result_data["prediction_text"],
        risk=result_data["risk"],
        confidence=result_data["confidence"],
    )


@app.route("/health")
def health():
    """Simple health-check endpoint for deployment environments."""
    return jsonify({"status": "ok", "model_loaded": model is not None})



# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug)