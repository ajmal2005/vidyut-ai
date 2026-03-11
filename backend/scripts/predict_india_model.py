import pandas as pd
import numpy as np
import os
import joblib

def predict_single_target(input_data_scaled, time_index, model_dict):
    """
    Helper to run inference on a specific target (MU or MW) using its dedicated models.
    """
    trend_model = model_dict["trend_model"]
    xgb_model = model_dict["xgb_model"]
    
    baseline = trend_model.predict(pd.DataFrame({'TimeIndex': [time_index]}))[0]
    adjustment = xgb_model.predict(input_data_scaled)[0]
    
    return float(baseline + adjustment)

def predict_india_energy(forecast_date):
    """
    Predict dual energy demands (Total MU and Peak MW) for India on a specific date.
    NO weather inputs required for the national model.
    Returns: (predicted_demand_mu, predicted_max_demand_mw)
    """
    models_dir = os.path.join(os.path.dirname(__file__), "..","models", "india")
    model_path = os.path.join(models_dir, "India_hybrid_model.pkl")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"National model not found at {model_path}")
        
    artifacts = joblib.load(model_path)
    min_date = artifacts["min_date"]
    features = artifacts["features"]
    
    dt = pd.to_datetime(forecast_date, errors='coerce')
    if pd.isna(dt): dt = pd.to_datetime(forecast_date, dayfirst=True)
    
    time_index = (dt - min_date).days
    
    # Generate Calendar Features
    input_data = {
        "Month": dt.month, "Day": dt.day, "DayOfWeek": dt.dayofweek, 
        "Is_Weekend": 1 if dt.dayofweek >= 5 else 0,
        "DayOfYear_Sin": np.sin(2 * np.pi * dt.dayofyear / 365.25), 
        "DayOfYear_Cos": np.cos(2 * np.pi * dt.dayofyear / 365.25),
        "Month_Sin": np.sin(2 * np.pi * dt.month / 12.0), 
        "Month_Cos": np.cos(2 * np.pi * dt.month / 12.0)
    }
    
    X_exog = pd.DataFrame([input_data])[features]
    
    # 1. Predict Energy Required (MU)
    mu_scaler = artifacts["mu_models"]["scaler"]
    X_exog_scaled_mu = mu_scaler.transform(X_exog)
    pred_mu = predict_single_target(X_exog_scaled_mu, time_index, artifacts["mu_models"])
    
    # 2. Predict Peak Demand (MW)
    mw_scaler = artifacts["mw_models"]["scaler"]
    X_exog_scaled_mw = mw_scaler.transform(X_exog)
    pred_mw = predict_single_target(X_exog_scaled_mw, time_index, artifacts["mw_models"])
    
    return pred_mu, pred_mw
