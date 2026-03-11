import pandas as pd
import numpy as np
import os
import joblib
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
from sklearn.metrics import mean_absolute_percentage_error, r2_score

def perform_training():
    print(f"--- Training Hybrid Model for All Cities ---")
    # Dataset is in root, script is in backend/scripts/
    file_path = os.path.join(os.path.dirname(__file__), "..", "..", "City_Daily_Energy_Final.csv") 
    if not os.path.exists(file_path):
        print(f"Dataset {os.path.abspath(file_path)} not found.")
        return
        
    df = pd.read_csv(file_path)
    df['Date'] = pd.to_datetime(df['Date'])
    
    cities = df['City'].unique()
    results = []
    
    for city in cities:
        df_city = df[df["City"] == city].copy().sort_values('Date').dropna().drop_duplicates(subset=['Date'], keep='last')
        if len(df_city) < 100: continue
            
        print(f"--> Training: {city.upper()} ({len(df_city)} days) <--")
        min_date = df_city['Date'].min()
        df_city['TimeIndex'] = (df_city['Date'] - min_date).dt.days
        
        features = ["TAvg_C", "Avg_Humidity_pct", "CDD", "Month", "Day", "DayOfWeek", "Is_Weekend", "DayOfYear_Sin", "DayOfYear_Cos", "Month_Sin", "Month_Cos"]
        target = 'City_Energy_Required_MWh'
        
        train_size = int(len(df_city) * 0.8)
        train_df = df_city.iloc[:train_size].copy()
        test_df = df_city.iloc[train_size:].copy()
        
        from sklearn.linear_model import LinearRegression
        trend_model = LinearRegression()
        trend_model.fit(train_df[['TimeIndex']], train_df[target])
        
        train_df['Trend_Pred'] = trend_model.predict(train_df[['TimeIndex']])
        train_df['Residuals'] = train_df[target] - train_df['Trend_Pred']
        test_df['Trend_Pred'] = trend_model.predict(test_df[['TimeIndex']])
        
        weights = np.exp(-(train_df['TimeIndex'].max() - train_df['TimeIndex']) / 365)
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(train_df[features])
        X_test_scaled = scaler.transform(test_df[features])
        
        xgb_model = xgb.XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=5, subsample=0.8, colsample_bytree=0.8, random_state=42)
        xgb_model.fit(X_train_scaled, train_df['Residuals'], sample_weight=weights)
        
        final_predictions = test_df['Trend_Pred'] + xgb_model.predict(X_test_scaled)
        mape = mean_absolute_percentage_error(test_df[target], final_predictions)
        
        # Export Model into backend/models/city/
        models_dir = os.path.join(os.path.dirname(__file__), "..", "models", "city")
        os.makedirs(models_dir, exist_ok=True)
        joblib.dump({
            "min_date": min_date, "trend_model": trend_model, "scaler": scaler, "xgb_model": xgb_model, "features": features, "target_unit": "MWh"
        }, os.path.join(models_dir, f"{city}_hybrid_model.pkl"))
        
        print(f"    MAPE: {mape*100:.2f}%")
        results.append({"City": city, "MAPE (%)": round(mape * 100, 2)})

    print("\n FINAL CITY XGBOOST HYBRID LEADERBOARD")
    print(pd.DataFrame(results).sort_values("MAPE (%)").to_string(index=False))

if __name__ == "__main__":
    perform_training()
