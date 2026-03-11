import pandas as pd
import numpy as np
import os
import joblib

def predict_energy(city, forecast_date, t_avg_c, humidity_pct):
    # Models are in backend/models/city/
    models_dir = os.path.join(os.path.dirname(__file__), "..", "models", "city")
    model_path = os.path.join(models_dir, f"{city}_hybrid_model.pkl")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model for {city} not found. Path: {model_path}")
        
    artifacts = joblib.load(model_path)
    min_date = artifacts["min_date"]
    trend_model = artifacts["trend_model"]
    scaler = artifacts["scaler"]
    xgb_model = artifacts["xgb_model"]
    features = artifacts["features"]
    
    dt = pd.to_datetime(forecast_date)
    time_index = (dt - min_date).days
    X_time = pd.DataFrame({'TimeIndex': [time_index]})
    
    input_data = {
        "TAvg_C": t_avg_c, "Avg_Humidity_pct": humidity_pct, "CDD": max(0.0, t_avg_c - 18.33),
        "Month": dt.month, "Day": dt.day, "DayOfWeek": dt.dayofweek, "Is_Weekend": 1 if dt.dayofweek >= 5 else 0,
        "DayOfYear_Sin": np.sin(2 * np.pi * dt.dayofyear / 365.25), "DayOfYear_Cos": np.cos(2 * np.pi * dt.dayofyear / 365.25),
        "Month_Sin": np.sin(2 * np.pi * dt.month / 12.0), "Month_Cos": np.cos(2 * np.pi * dt.month / 12.0)
    }
    
    baseline = trend_model.predict(X_time)[0]
    X_exog = pd.DataFrame([input_data])[features]
    X_exog_scaled = scaler.transform(X_exog)
    adjustment = xgb_model.predict(X_exog_scaled)[0]
    
    return float(baseline + adjustment)
