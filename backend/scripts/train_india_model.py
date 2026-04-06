import pandas as pd
import numpy as np
import os
import joblib
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
from sklearn.metrics import mean_absolute_percentage_error

def train_hybrid_target(train_df, test_df, features, target):

    from sklearn.linear_model import LinearRegression
    
    trend_model = LinearRegression()
    trend_model.fit(train_df[['TimeIndex']], train_df[target])
    
    train_df = train_df.copy()
    test_df = test_df.copy()
    
    train_df['Trend_Pred'] = trend_model.predict(train_df[['TimeIndex']])
    train_df['Residuals'] = train_df[target] - train_df['Trend_Pred']
    test_df['Trend_Pred'] = trend_model.predict(test_df[['TimeIndex']])
    
    weights = np.exp(-(train_df['TimeIndex'].max() - train_df['TimeIndex'])/365)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(train_df[features])
    X_test_scaled = scaler.transform(test_df[features])
    
    xgb_model = xgb.XGBRegressor(
        n_estimators=300, 
        learning_rate=0.05, 
        max_depth=5, 
        subsample=0.8, 
        colsample_bytree=0.8, 
        random_state=42
    )
    xgb_model.fit(X_train_scaled, train_df['Residuals'], sample_weight=weights)
    
    final_predictions = test_df['Trend_Pred'] + xgb_model.predict(X_test_scaled)
    mape = mean_absolute_percentage_error(test_df[target], final_predictions)
    
    return trend_model, scaler, xgb_model, mape

def perform_training():
    file_path = os.path.join(os.path.dirname(__file__), "..", "..", "India_Daily_Energy_Final.csv") 
    if not os.path.exists(file_path):
        print(f"Dataset {os.path.abspath(file_path)} not found.")
        return
        
    df = pd.read_csv(file_path)
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True)
    countries = df['Country'].unique()
    results = []
    
    for country in countries:
        df_country = df[df["Country"] == country].copy().sort_values('Date').dropna(subset=['India_Energy_Required_MU', 'India_Max_Demand_MW']).drop_duplicates(subset=['Date'], keep='last')
        if len(df_country) < 100: continue
            
        print(f"--> Training: {country.upper()} ({len(df_country)} days) <--")
        min_date = df_country['Date'].min()
        df_country['TimeIndex'] = (df_country['Date'] - min_date).dt.days
        
        features = ["Month", "Day", "DayOfWeek", "Is_Weekend", "DayOfYear_Sin", "DayOfYear_Cos", "Month_Sin", "Month_Cos"]
        
        train_df = df_country.iloc[:int(len(df_country)*0.8)].copy()
        test_df = df_country.iloc[int(len(df_country)*0.8):].copy()
        
        mu_trend, mu_scaler, mu_xgb, mu_mape = train_hybrid_target(train_df, test_df, features, 'India_Energy_Required_MU')
        
        mw_trend, mw_scaler, mw_xgb, mw_mape = train_hybrid_target(train_df, test_df, features, 'India_Max_Demand_MW')
        
        models_dir = os.path.join(os.path.dirname(__file__), "..", "models", "india")
        os.makedirs(models_dir, exist_ok=True)
        joblib.dump({
            "min_date": min_date, 
            "features": features,
            "mu_models": {
                "trend_model": mu_trend,
                "scaler": mu_scaler,
                "xgb_model": mu_xgb,
                "target_unit": "MU"
            },
            "mw_models": {
                "trend_model": mw_trend,
                "scaler": mw_scaler,
                "xgb_model": mw_xgb,
                "target_unit": "MW"
            }
        }, os.path.join(models_dir, f"{country}_hybrid_model.pkl"))
        
        print(f"    Energy (MU) MAPE: {mu_mape*100:.2f}% | Peak (MW) MAPE: {mw_mape*100:.2f}%")
        results.append({
            "Country": country, 
            "MU MAPE (%)": round(mu_mape * 100, 2),
            "MW MAPE (%)": round(mw_mape * 100, 2)
        })

    print("\n FINAL COUNTRY XGBOOST DUAL-HYBRID LEADERBOARD")
    print(pd.DataFrame(results).sort_values("MU MAPE (%)").to_string(index=False))

if __name__ == "__main__":
    perform_training()
