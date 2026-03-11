# Energy Demand Forecasting API Documentation

This API serves predictions for City Energy Demand in MWh. It is powered by a locally trained XGBoost Hybrid ML Model that analyzes macro-growth structure alongside localized weather impacts (Temperature, Humidity, CDD) and cyclic calendar events.

## Starting the Server
Before you can make requests to this API, the server must be initialized on the backend.

```bash
# 1. Ensure dependencies are installed
pip install fastapi uvicorn pandas numpy scikit-learn xgboost joblib

# 2. Run the server
cd backend
python server.py
```
*The server will start locally at: `http://localhost:8000`*


## 🎯 API Endpoint

**Endpoint URL for Predictions:**
`POST /predict`

### JSON Request Format

When making a request from your web application frontend, send an HTTP POST request with a raw JSON body containing exactly 4 variables. 

Do not send variables like `Month_Sin` or `DayOfWeek`; the backend automatically computes those mathematically using your `date` string so the frontend remains lightweight.

| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `city` | String | Must exactly match the registered spelling of the target city. | `"Mumbai"` |
| `date` | String | The target Date for the forecast. Supports `"YYYY-MM-DD"` and `"DD-MM-YYYY"`. | `"2026-06-15"` |

### 📥 Example cURL Request for City Forecast

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

### 2. Forecast State Energy (MU)
**Endpoint:** `POST /predict/state`  
**Description:** Forecasts daily energy consumption in Million Units (MU) for a specific state.

**Request Body (JSON):**
```json
{
  "state": "Delhi",
  "date": "2026-06-15"
}
```

| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `state` | String | Must exactly match the registered spelling of the target state. | `"Delhi"` |
| `date` | String | The target Date for the forecast. Supports `"YYYY-MM-DD"` and `"DD-MM-YYYY"`. | `"2026-06-15"` |

### 📥 Example cURL Request for State Forecast

```bash
curl -X 'POST' \
  'http://localhost:8000/predict/state' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "state": "Delhi",
  "date": "2026-06-15"
}'
```

---

### 📤 JSON Response Format
The API will return a 200 HTTP status along with the cleanly formatted forecast directly inside `predicted_demand_mwh` (for city) or `predicted_demand_mu` (for state).

```json
{
  "status": "success",
  "type": "city",
  "city": "Mumbai",
  "forecast_date": "2026-06-15",
  "weather_used": {
    "temperature_celsius": 32.5,
    "humidity_percent": 85.0
  },
  "predicted_demand_mwh": 128453.2
}
```

### State Output Example
```json
{
  "status": "success",
  "type": "state",
  "state": "Delhi",
  "forecast_date": "2026-06-15",
  "weather_used": {
    "temperature_celsius": 32.0,
    "humidity_percent": 50.0
  },
  "predicted_demand_mu": 125.4,
  "predicted_max_demand_mw": 6540.2
}
```

## Potential Errors

- **`HTTP 404 Not Found`:** If you request a target city (e.g. "Paris") that the ML Model has not been trained on.
- **`HTTP 422 Unprocessable Entity`:** If your frontend sends a malformed request or missing parameters.
