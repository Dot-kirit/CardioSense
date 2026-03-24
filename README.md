# CardioSense
# 🫀 CardioSense — AI Heart Risk Intelligence

> Built for **HackHustle 2.0** by **Syntax Survey Cops** 

## 📌 Problem Statement
Cardiovascular disease kills 17.9 million people yearly — 80% of which are preventable with early detection. Most people don't get screened until symptoms appear. CardioSense makes cardiac risk screening instant, accessible and free.

## 💡 Solution
CardioSense is an AI-powered web application that predicts cardiovascular disease risk using 13 clinical parameters. Results are delivered in under 2 minutes with a confidence score.

## 🚀 Features
- Multi-step clinical assessment form
- Real-time AI risk prediction (High/Low)
- Confidence score with every prediction
- Input validation on both frontend and backend
- Emergency contacts and warning signs section
- Fully responsive dark UI

## 🧠 Model Performance
- **Algorithm:** Logistic Regression
- **Dataset:** Cleveland Heart Disease Dataset (UCI)
- **Accuracy:** 89%
- **AUC-ROC Score:** 92.7%
- **Cross-validation Recall (5-fold):** 89%

## 🛠️ Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Python, Flask
- **ML:** scikit-learn, pandas, numpy
- **Model:** Logistic Regression trained on Cleveland Heart Disease Dataset

## ⚙️ How to Run Locally
```bash
# Clone the repository
git clone https://github.com/Dot-kirit/CardioSense.git

# Navigate to project folder
cd CardioSense

# Install dependencies
pip install flask scikit-learn pandas numpy

# Run the app
python app.py
```
Then open `http://localhost:5000` in your browser.

## ⚠️ Disclaimer
This tool is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional for cardiac concerns.
