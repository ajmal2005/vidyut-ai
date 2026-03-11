# VidyutAI- An AI-Based Energy Demand Forecasting for Smart Cities in India

> A machine learning project built for Energy Conservation Hackathon 2026
---

## Overview

India's urban energy grid operates reactively, i.e. utilities respond to demand spikes rather than anticipating them. This causes blackouts, wasteful emergency power purchases, and inefficient renewable integration across smart cities.

This project aims to build an AI-based forecasting system that predicts **daily energy demand (in MWh) for Indian smart cities** using weather and calendar signals. In turn enabling grid operators to plan capacity ahead of time.

---

## Problem Statement

- Grid operators have no reliable short-term demand forecast at the city level
- Existing tools are national aggregates; they miss city-specific climate and industrial patterns
- Most forecasting approaches require real-time consumption data, which isn't always accessible

**Our goal:** Given a city, and a date, Fetch the weather for that city for that date and predict energy demand in MW.

---

## Proposed Approach

- **Model:** XGBOOST + Linear Regression Hybrid
- **Input features:** City, temperature, humidity, cooling degree days, calendar features (day, month, weekday, cyclic encodings)
- **Target:** Daily energy consumption in MW
- **Training data:** 30 Indian smart cities, 2020–2025
- **Validation strategy:** Strict time-based split — train on 2021–2023, validate on Jan–Jun 2024, test on Jul–Dec 2024


---

## Dataset

| Property | Details |
|---|---|
| Cities | 30 Indian smart cities |
| Date range | Jan 2020 – Dec 2025 |
| Granularity | Daily |
| Key features | Temperature, humidity, cooling degree days, calendar features |
| Target | `City_Energy_Required_MWh` |

---

## Project Structure (work in progress)

```
├── README.md
```



---

## Setup

```bash
1. fork the GitHub repo 
#clone the repository 
git clone https://github.com/<YOUR_USERNAME>/vidyut-ai.git
 
# Create virtual environment
python -m venv energy_forecast_env

# Activate — Windows
energy_forecast_env\Scripts\activate

# Activate — Mac/Linux
source energy_forecast_env/bin/activate

# Install dependencies
pip install -r requirements.txt
```
---
## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white) **Next.js** | React framework for the web dashboard — routing, SSR, and UI |
| ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white) **Tailwind CSS** | For UI Components and Utility-first styling |
| ![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white) **Chart.js** | Interactive demand forecast visualisations |

### Backend
| Technology | Purpose |
|---|---|
| ![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white) **Python** | Core language for the ML pipeline and API |
| ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white) **FastAPI** | REST API serving model predictions |
| ![Uvicorn](https://img.shields.io/badge/Uvicorn-4051B5?style=flat&logo=gunicorn&logoColor=white) **Uvicorn** | For running the FastAPI web server application |

### Machine Learning
| Technology | Purpose |
|---|---|
| ![XGBoost](https://img.shields.io/badge/XGBoost-FF6600?style=flat&logo=python&logoColor=white) **XGBoost** | Gradient boosted regression model for energy demand forecasting |
| ![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat&logo=scikitlearn&logoColor=white) **Scikit-learn** | Label encoding, evaluation metrics, and preprocessing utilities |
| ![Joblib](https://img.shields.io/badge/Joblib-3776AB?style=flat&logo=python&logoColor=white) **Joblib** | Model and encoder serialisation to save and reload without retraining |
| ![NumPy](https://img.shields.io/badge/NumPy-013243?style=flat&logo=numpy&logoColor=white) **NumPy** | Numerical operations and cyclic feature computation |
| ![Pandas](https://img.shields.io/badge/Pandas-150458?style=flat&logo=pandas&logoColor=white) **Pandas** | Data loading, cleaning, and feature engineering |
---

## Progress

- [x] Problem definition and approach finalised
- [x] Dataset acquired and explored
- [ ] Feature engineering designed
- [ ] Interactive frontend for visualization and user interaction
- [ ] Notebook structure set up
- [ ] Model training and evaluation
- [ ] Prediction function
- [ ] Results and documentation

---

## Team

1. Aditya Shukla [(GitHub)](https://github.com/AdityaShukla06)

2. Ajmal Rafi [(GitHub)](https://github.com/ajmal2005)

3. Mayank Mahavir Chand Bothra [(GitHub)](https://github.com/mayankWHO)

4. Ravi Shankar Singh [(GitHub)](https://github.com/Ravi92680)
 

Built for the **Energy Conservation Week Hackathon 2026**
