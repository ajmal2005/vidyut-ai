import requests
import pandas as pd
import datetime
import os
import json
import time

# PRE-SET COORDINATES FOR ALL SUPPORTED LOCATIONS (Lat, Lon)
# This eliminates the Geocoding API overhead (~7 seconds)
LOCATION_COORDS = {
    "Agartala": (23.836, 91.279), "Ahmedabad": (23.026, 72.587), "Aizawl": (23.729, 92.718),
    "Andhra Pradesh": (16.514, 80.516), "Arunachal Pradesh": (27.087, 93.610), "Assam": (26.184, 91.746),
    "Bengaluru": (12.972, 77.594), "Bhubaneswar": (20.272, 85.834), "Bihar": (25.594, 85.136),
    "Chandigarh": (30.736, 76.788), "Chennai": (13.088, 80.278), "Chhattisgarh": (21.233, 81.633),
    "DD": (20.414, 72.832), "DNH": (20.274, 72.997), "DVC": (23.798, 86.430),
    "Dehradun": (30.324, 78.034), "Delhi": (28.652, 77.231), "ER Odisha": (20.272, 85.834),
    "Faridabad": (28.411, 77.313), "Gangtok": (27.326, 88.612), "Goa": (15.491, 73.828),
    "Gujarat": (23.026, 72.587), "Guwahati": (26.184, 91.746), "HP": (31.104, 77.167),
    "Haryana": (28.411, 77.313), "Hyderabad": (17.384, 78.456), "Imphal": (24.808, 93.944),
    "Indore": (22.718, 75.833), "Itanagar": (27.087, 93.610), "J&K(UT) & Ladakh(UT)": (34.086, 74.806),
    "Jaipur": (26.920, 75.788), "Jharkhand": (23.343, 85.309), "Kerala": (9.940, 76.260),
    "Kochi": (9.940, 76.260), "Kohima": (25.675, 94.111), "Kolkata": (22.563, 88.363),
    "Lucknow": (26.839, 80.923), "Ludhiana": (30.912, 75.854), "MP": (23.255, 77.403),
    "Manipur": (24.808, 93.944), "Mizoram": (23.729, 92.718), "Mumbai": (19.073, 72.883),
    "Nagaland": (25.675, 94.111), "NER Meghalaya": (25.569, 91.883), "NR UP": (26.839, 80.923),
    "New Delhi": (28.621, 77.215), "Panaji": (15.491, 73.828), "Patna": (25.594, 85.136),
    "Puducherry": (11.934, 79.830), "Punjab": (30.733, 76.779), "Raipur": (21.233, 81.633),
    "Rajasthan": (26.912, 75.787), "Ranchi": (23.343, 85.309), "SR Karnataka": (12.972, 77.594),
    "Shillong": (25.569, 91.883), "Shimla": (31.104, 77.167), "Sikkim": (27.331, 88.614),
    "Srinagar": (34.086, 74.806), "Tamil Nadu": (13.083, 80.271), "Telangana": (17.385, 78.487),
    "Tripura": (23.831, 91.287), "Uttarakhand": (30.316, 78.032), "Visakhapatnam": (17.687, 83.218),
    "West Bengal": (22.573, 88.364), "WR Maharashtra": (19.076, 72.878)
}

CACHE_FILE = "weather_cache.json"
CACHE_EXPIRY_HOURS = 12

def get_cached_weather(location, date_str):
    if not os.path.exists(CACHE_FILE):
        return None
    try:
        with open(CACHE_FILE, 'r') as f:
            cache = json.load(f)
        key = f"{location}_{date_str}"
        if key in cache:
            entry = cache[key]
            # Check expiry
            if time.time() - entry['timestamp'] < CACHE_EXPIRY_HOURS * 3600:
                print(f"[CACHE HIT] Serving {location} for {date_str}")
                return entry['t_avg'], entry['hum']
    except: pass
    return None

def save_to_cache(location, date_str, t_avg, hum):
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                cache = json.load(f)
        except: pass
    
    cache[f"{location}_{date_str}"] = {
        "t_avg": t_avg,
        "hum": hum,
        "timestamp": time.time()
    }
    
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f)
    except: pass

def fetch_weather_for_location(location_name: str, target_date: str):
    # 1. Check local cache
    cached = get_cached_weather(location_name, target_date)
    if cached: return cached

    # 2. Get Coordinates (Instant Lookup)
    coords = LOCATION_COORDS.get(location_name)
    if not coords:
        # Fallback to geocoding if location is unknown (rare)
        print(f"[WARN] {location_name} not in preset coordinates. Falling back to Geocoding API...")
        url_geo = f"https://geocoding-api.open-meteo.com/v1/search?name={location_name}&count=1&language=en&format=json"
        res_geo = requests.get(url_geo).json()
        if 'results' not in res_geo:
            raise ValueError(f"Could not find coordinates for: {location_name}")
        lat, lon = res_geo['results'][0]['latitude'], res_geo['results'][0]['longitude']
    else:
        lat, lon = coords

    # 3. Fetch Weather from Open-Meteo
    today = datetime.date.today()
    target_dt = datetime.datetime.strptime(target_date, "%Y-%m-%d").date()
    
    if target_dt > today + datetime.timedelta(days=14):
        # Open-Meteo forecast API has limited range (14 days max)
        # Fallback to historical data from the same day in 2024
        fallback_year = 2024
        try:
            fallback_dt = target_dt.replace(year=fallback_year)
        except ValueError:
            # Handle Feb 29 on non-leap years
            fallback_dt = target_dt.replace(year=fallback_year, day=28)
            
        fallback_date_str = fallback_dt.strftime("%Y-%m-%d")
        url = (
            f"https://archive-api.open-meteo.com/v1/archive"
            f"?latitude={lat}&longitude={lon}"
            f"&daily=temperature_2m_mean,relative_humidity_2m_mean"
            f"&start_date={fallback_date_str}&end_date={fallback_date_str}"
            f"&timezone=auto"
        )
    elif target_dt >= today:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&daily=temperature_2m_mean,relative_humidity_2m_mean"
            f"&start_date={target_date}&end_date={target_date}"
            f"&timezone=auto"
        )
    else:
        url = (
            f"https://archive-api.open-meteo.com/v1/archive"
            f"?latitude={lat}&longitude={lon}"
            f"&daily=temperature_2m_mean,relative_humidity_2m_mean"
            f"&start_date={target_date}&end_date={target_date}"
            f"&timezone=auto"
        )

    res = requests.get(url).json()
    if 'daily' not in res or not res['daily']['temperature_2m_mean']:
        raise ValueError("Weather data missing for location/date")

    t_avg = res['daily']['temperature_2m_mean'][0]
    hum = res['daily']['relative_humidity_2m_mean'][0]

    if t_avg is None or hum is None:
        raise ValueError("Received Null values from Weather API")

    # 4. Save to cache
    save_to_cache(location_name, target_date, t_avg, hum)
    
    return float(t_avg), float(hum)
