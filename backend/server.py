from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn
import os

from scripts.predict_model import predict_energy
from scripts.predict_state_model import predict_state_energy
from weather_api import fetch_weather_for_location, LOCATION_COORDS

app = FastAPI(
    title="Energy Demand Forecasting API",
    description="A Machine Learning API that predicts City (MWh) and State (MU) Energy Demand using XGBoost Hybrid Models.",
    version="1.1"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ForecastRequest(BaseModel):
    city: str = Field(..., example="Mumbai", description="The registered name of the city.")
    date: str = Field(..., example="2026-06-15", description="The future target date in 'YYYY-MM-DD' format.")

@app.post("/predict/city")
def get_city_prediction(req: ForecastRequest):
    try:
        t_avg, h_pct = fetch_weather_for_location(req.city, req.date)
        
        mwh_prediction = predict_energy(
            city=req.city, 
            forecast_date=req.date, 
            t_avg_c=t_avg, 
            humidity_pct=h_pct
        )
        return {
            "status": "success",
            "type": "city",
            "city": req.city,
            "forecast_date": req.date,
            "weather_used": {
                "temperature_celsius": round(t_avg, 2),
                "humidity_percent": round(h_pct, 2)
            },
            "predicted_demand_mwh": round(mwh_prediction, 2)
        }
    except FileNotFoundError as fnf_error:
        raise HTTPException(status_code=404, detail=str(fnf_error))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

#State Forecasting
class ForecastStateRequest(BaseModel):
    state: str = Field(..., example="Delhi", description="The registered name of the state.")
    date: str = Field(..., example="2026-06-15", description="The future target date in 'YYYY-MM-DD' format.")

@app.post("/predict/state")
def get_state_prediction(req: ForecastStateRequest):
    try:
        t_avg, h_pct = fetch_weather_for_location(req.state, req.date)
        
        mu_prediction, mw_prediction = predict_state_energy(
            state=req.state,
            forecast_date=req.date,
            t_avg_c=t_avg,
            humidity_pct=h_pct
        )
        return {
            "status": "success",
            "type": "state",
            "state": req.state,
            "forecast_date": req.date,
            "weather_used": {
                "temperature_celsius": round(t_avg, 2),
                "humidity_percent": round(h_pct, 2)
            },
            "predicted_demand_mu": round(mu_prediction, 2),
            "predicted_max_demand_mw": round(mw_prediction, 2)
        }
    except FileNotFoundError as fnf_error:
        raise HTTPException(status_code=404, detail=str(fnf_error))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/locations")
def get_locations():
    """Returns available states and cities based on actual model files."""
    states_dir = os.path.join(os.path.dirname(__file__), "models", "state")
    cities_dir = os.path.join(os.path.dirname(__file__), "models", "city")
    cities = []
    if os.path.exists(cities_dir):
        for f in os.listdir(cities_dir):
            if f.endswith("_hybrid_model.pkl"):
                city_name = f.replace("_hybrid_model.pkl", "")
                if city_name in LOCATION_COORDS:
                    lat, lon = LOCATION_COORDS[city_name]
                    cities.append({ "name": city_name, "lat": lat, "lng": lon })
                
    states = []
    if os.path.exists(states_dir):
        for f in os.listdir(states_dir):
            if f.endswith("_hybrid_model.pkl"):
                state_name = f.replace("_hybrid_model.pkl", "")
                if state_name in LOCATION_COORDS:
                    lat, lon = LOCATION_COORDS[state_name]
                    states.append({ "name": state_name, "lat": lat, "lng": lon })
                    
    return {"status": "success", "cities": cities, "states": states}

if __name__ == "__main__":
    print("\n[+] Starting Energy Demand Forecasting API on port 8000...")
    print("[+] API Documentation available at: http://localhost:8000/docs\n")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
