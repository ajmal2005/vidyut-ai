# Energy Demand Forecasting Backend

A FastAPI-based Machine Learning service that predicts daily energy consumption (MWh/MU) for Indian Cities and States using a hybrid **XGBoost + Linear Regression** algorithm.

## Features
- **City Level**: Forecasts City Energy Demand in MWh.
- **State Level**: Forecasts State Energy Demand in MU.
- **Automated Weather**: Automatically fetches the required Temperature and Humidity for a location/date using the Open-Meteo Geocoding and Weather APIs.

---

## 🚀 Local Deployment Guide

### 1. Prerequisites
Ensure you have Python 3.9+ installed and clone/navigate to this repository.

### 2. Install Dependencies
Open your terminal and install the required Python packages:

```bash
pip install fastapi uvicorn pandas numpy scikit-learn xgboost joblib requests
```

### 3. Start the Server
Navigate exactly into the `backend/` directory and start the FastAPI server using Uvicorn.

```bash
cd backend
python server.py
```

*You should see output indicating the server is running on `http://0.0.0.0:8000`.*

---

## 🧪 Testing the API Locally

Once the server is running, you can test it using `curl` from another terminal window, or by visiting the auto-generated Swagger UI in your browser at:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

### Test 1: City Forecast
```bash
curl -X 'POST' \
  'http://localhost:8000/predict/city' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "city": "Mumbai",
  "date": "2026-06-15"
}'
```

### Test 2: State Forecast
```bash
curl -X 'POST' \
  'http://localhost:8000/predict/state' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "state": "WR Maharashtra",
  "date": "2026-06-15"
}'
```

## Need more details?
Check out the `API_DOCUMENTATION.md` file located right here in the `backend/` folder for deeper insights into the JSON responses and structure.
