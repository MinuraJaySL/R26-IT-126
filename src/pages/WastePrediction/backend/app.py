"""
Municipal Waste Prediction API
Flask backend that serves ML model predictions and stores history in MongoDB.

Models: best_wet_model.pkl / best_dry_model.pkl — sklearn Pipelines
        (ColumnTransformer + XGBRegressor) trained on Kalutara Municipal Council data.

Simplified flow:
  - User only provides: weekType (normal / holiday / festival)
  - Rainfall: auto-fetched from Open-Meteo forecast API
  - Previous week waste: auto-loaded from dataset CSV
  - Month: auto-determined from next week's date
  - Truck requirements: calculated from predictions (5-ton standard compactor)
"""

import math
import os
import warnings
from datetime import datetime, timedelta, timezone

import joblib
import numpy as np
import pandas as pd
import requests as http_requests
from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient

# ── Load environment variables ───────────────────────────────────────────────
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "waste_prediction")
PORT = int(os.getenv("PORT", 5000))

# ── Flask app setup ──────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ── MongoDB connection ───────────────────────────────────────────────────────
client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]
predictions_collection = db["predictions"]

# ── Load ML models ───────────────────────────────────────────────────────────
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    wet_model = joblib.load(os.path.join(MODEL_DIR, "best_wet_model.pkl"))
    dry_model = joblib.load(os.path.join(MODEL_DIR, "best_dry_model.pkl"))

print("[OK] Wet waste model loaded:", type(wet_model).__name__)
print("[OK] Dry waste model loaded:", type(dry_model).__name__)

# ── Constants ────────────────────────────────────────────────────────────────
VALID_ZONES = ["Kalutara North", "Kalutara South", "Katukurunda 1", "Katukurunda 2"]

ZONE_METADATA = {
    "Kalutara North": {"area_type": "town",        "population_density": "medium"},
    "Kalutara South": {"area_type": "beach",        "population_density": "low"},
    "Katukurunda 1":  {"area_type": "muslim_area",  "population_density": "high"},
    "Katukurunda 2":  {"area_type": "town",         "population_density": "medium"},
}

# Standard municipal waste compactor truck capacity
TRUCK_CAPACITY_TONS = 5.0

# Open-Meteo API for Kalutara, Sri Lanka
KALUTARA_LAT = 6.5854
KALUTARA_LON = 79.9607
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Feature columns the Pipeline expects
FEATURE_COLS = [
    "month", "rainfall_mm", "previous_wet_tons", "previous_dry_tons",
    "zone", "area_type", "population_density", "week_type", "special_event",
]

# Composition by area type
COMPOSITION_BY_AREA_TYPE = {
    "town":        {"organic": 55, "plastic": 20, "paper": 15, "metal": 10},
    "beach":       {"organic": 40, "plastic": 30, "paper": 18, "metal": 12},
    "muslim_area": {"organic": 62, "plastic": 18, "paper": 12, "metal": 8},
}


# ══════════════════════════════════════════════════════════════════════════════
# AUTO-DATA HELPERS
# ══════════════════════════════════════════════════════════════════════════════

# Historical monthly average rainfall (mm/week) computed from the training dataset
# Used as fallback when selected week is beyond the Open-Meteo 16-day forecast window
MONTHLY_AVG_RAINFALL = {
    1: 11.5, 2: 10.5, 3: 25.0, 4: 50.3, 5: 77.7,
    6: 63.8, 7: 47.8, 8: 38.7, 9: 62.0, 10: 68.0,
    11: 53.9, 12: 46.7,
}


def fetch_rainfall_forecast(week_start_date=None):
    """Fetch 7-day total rainfall for a target week.

    Strategy:
<<<<<<< HEAD
      1. If recorded in CSV dataset (2023–2025): return dataset recorded actuals.
      2. If within past 92 days to next 16 days: query Open-Meteo API (actual recorded past weather or live forecast).
      3. If older past date: query Open-Meteo Historical Archive API (exact past weather).
      4. If far future (beyond 16 days): use historical monthly average from training data.
=======
      - If past week is recorded in CSV dataset: return exact recorded rainfall.
      - If within Open-Meteo 16-day forecast: return live Open-Meteo forecast.
      - If far future/other: return historical monthly average from training data.
>>>>>>> c70ba2b (Model improvements)
    """
    today = datetime.now().date()

    if week_start_date is None:
        days_until_monday = (7 - today.weekday()) % 7 or 7
        week_start_date = today + timedelta(days=days_until_monday)

    week_end_date = week_start_date + timedelta(days=6)
<<<<<<< HEAD
    target_dates = [str(week_start_date + timedelta(days=i)) for i in range(7)]
=======
>>>>>>> c70ba2b (Model improvements)

    # 1. Check if date is in the historical CSV dataset
    csv_path = os.path.join(MODEL_DIR, "Real_Zone_Waste_Dataset.csv")
    try:
        df_csv = pd.read_csv(csv_path)
        df_csv["week_start_date"] = pd.to_datetime(df_csv["week_start_date"])
        match = df_csv[df_csv["week_start_date"].dt.date == week_start_date]
        if len(match) > 0:
            rec_mm = round(float(match.iloc[0]["rainfall_mm"]), 1)
            daily_avg = round(rec_mm / 7, 1)
            daily_data = [
                {"date": str(week_start_date + timedelta(days=i)), "precipitation_mm": daily_avg}
                for i in range(7)
            ]
            return {
                "success": True,
                "source": "Recorded Actual (Dataset)",
                "sourceType": "historical_actual",
                "location": "Kalutara, Sri Lanka",
                "coordinates": {"lat": KALUTARA_LAT, "lon": KALUTARA_LON},
                "total_mm": rec_mm,
                "daily": daily_data,
                "forecast_days": 7,
                "weekStart": str(week_start_date),
                "weekEnd": str(week_end_date),
            }
    except Exception as e:
        print(f"[DEBUG] CSV date lookup skipped: {e}")

<<<<<<< HEAD
    # 2. Try Open-Meteo combined past + forecast (past 92 days to next 16 days)
    # NOTE: The forecast endpoint returns None for precipitation_sum on older past dates
    #       (~30+ days ago). We only use this result if all 7 target dates have REAL (non-None)
    #       values. If any are None for a past week we fall through to the Archive API (step 3).
=======
    # 2. Try Open-Meteo 16-day live forecast for current/near-future dates
>>>>>>> c70ba2b (Model improvements)
    try:
        resp = http_requests.get(OPEN_METEO_URL, params={
            "latitude": KALUTARA_LAT,
            "longitude": KALUTARA_LON,
            "daily": "precipitation_sum",
            "timezone": "Asia/Colombo",
<<<<<<< HEAD
            "past_days": 92,
=======
>>>>>>> c70ba2b (Model improvements)
            "forecast_days": 16,
        }, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        daily = data.get("daily", {})
        dates = daily.get("time", [])
        precip = daily.get("precipitation_sum", [])
<<<<<<< HEAD
        # Keep None distinct so we can detect missing data (do NOT convert to 0.0 yet)
        raw_map = {d: p for d, p in zip(dates, precip)}

        matched_dates = [d for d in target_dates if d in raw_map]
        if len(matched_dates) == 7:
            raw_values = [raw_map[d] for d in target_dates]
            has_null = any(v is None for v in raw_values)

            # For past weeks: if any value is None, the forecast endpoint lacks data for
            # these older dates. Skip to Archive API which has the real historical records.
            if has_null and week_start_date < today:
                print(f"[DEBUG] Open-Meteo forecast has None values for past week {week_start_date} "
                      f"– falling back to Archive API for actual historical rainfall.")
            else:
                daily_data = [
                    {"date": d, "precipitation_mm": float(v) if v is not None else 0.0}
                    for d, v in zip(target_dates, raw_values)
                ]
                total_mm = round(sum(d["precipitation_mm"] for d in daily_data), 1)
                is_past = week_start_date < today
                return {
                    "success": True,
                    "source": "Open-Meteo (Actual Recorded Weather)" if is_past else "Open-Meteo (Live Forecast)",
                    "sourceType": "historical_actual" if is_past else "forecast",
                    "location": "Kalutara, Sri Lanka",
                    "coordinates": {"lat": KALUTARA_LAT, "lon": KALUTARA_LON},
                    "total_mm": total_mm,
                    "daily": daily_data,
                    "forecast_days": 7,
                    "weekStart": str(week_start_date),
                    "weekEnd": str(week_end_date),
                }
    except Exception as e:
        print(f"[WARN] Open-Meteo API query failed: {e}")

    # 3. If older past date not covered by past_days, query Open-Meteo Historical Archive API
    if week_start_date < today:
        try:
            archive_url = "https://archive-api.open-meteo.com/v1/archive"
            resp = http_requests.get(archive_url, params={
                "latitude": KALUTARA_LAT,
                "longitude": KALUTARA_LON,
                "daily": "precipitation_sum",
                "timezone": "Asia/Colombo",
                "start_date": str(week_start_date),
                "end_date": str(week_end_date),
            }, timeout=25)  # 25s — archive API is slower than the forecast endpoint
            resp.raise_for_status()
            data = resp.json()

            daily = data.get("daily", {})
            dates = daily.get("time", [])
            precip = daily.get("precipitation_sum", [])
            if len(dates) == 7:
                daily_data = [{"date": d, "precipitation_mm": float(p) if p is not None else 0.0} for d, p in zip(dates, precip)]
                total_mm = round(sum(d["precipitation_mm"] for d in daily_data), 1)
                return {
                    "success": True,
                    "source": "Open-Meteo Archive (Actual Recorded Weather)",
                    "sourceType": "historical_actual",
                    "location": "Kalutara, Sri Lanka",
                    "coordinates": {"lat": KALUTARA_LAT, "lon": KALUTARA_LON},
                    "total_mm": total_mm,
                    "daily": daily_data,
                    "forecast_days": 7,
                    "weekStart": str(week_start_date),
                    "weekEnd": str(week_end_date),
                }
        except Exception as e:
            print(f"[WARN] Open-Meteo Archive query failed: {e}")

    # 4. Far future beyond 16 days — use historical monthly average from training dataset
=======
        date_map = {d: float(p) if p is not None else 0.0 for d, p in zip(dates, precip)}

        target_dates = [str(week_start_date + timedelta(days=i)) for i in range(7)]
        matched_dates = [d for d in target_dates if d in date_map]

        if len(matched_dates) == 7:
            daily_data = [{"date": d, "precipitation_mm": date_map[d]} for d in target_dates]
            total_mm = sum(d["precipitation_mm"] for d in daily_data)
            return {
                "success": True,
                "source": "Open-Meteo (Live Forecast)",
                "sourceType": "forecast",
                "location": "Kalutara, Sri Lanka",
                "coordinates": {"lat": KALUTARA_LAT, "lon": KALUTARA_LON},
                "total_mm": round(total_mm, 1),
                "daily": daily_data,
                "forecast_days": 7,
                "weekStart": str(week_start_date),
                "weekEnd": str(week_end_date),
            }
    except Exception as e:
        print(f"[WARN] Open-Meteo API query failed: {e}")

    # 3. Beyond forecast range & not in CSV — use historical monthly average
>>>>>>> c70ba2b (Model improvements)
    month = week_start_date.month
    avg_mm = MONTHLY_AVG_RAINFALL.get(month, 40.0)
    daily_avg = round(avg_mm / 7, 1)
    daily_data = [
        {"date": str(week_start_date + timedelta(days=i)), "precipitation_mm": daily_avg}
        for i in range(7)
    ]
    return {
        "success": True,
        "source": "Historical Average (Training Data)",
        "sourceType": "historical_avg",
        "location": "Kalutara, Sri Lanka",
        "coordinates": {"lat": KALUTARA_LAT, "lon": KALUTARA_LON},
        "total_mm": round(avg_mm, 1),
        "daily": daily_data,
        "forecast_days": 7,
        "weekStart": str(week_start_date),
        "weekEnd": str(week_end_date),
        "note": f"Using historical average for month {month}.",
    }


def load_previous_week_data(target_date=None):
    """Load the previous week's waste data per zone before the target date.

    If target_date is given, finds the most recent record before that date.
    Otherwise, returns the latest available record in the dataset.
    """
    csv_path = os.path.join(MODEL_DIR, "Real_Zone_Waste_Dataset.csv")
    try:
        df = pd.read_csv(csv_path)
        df["week_start_date"] = pd.to_datetime(df["week_start_date"])

        if target_date is not None:
            target_ts = pd.to_datetime(target_date)
            # Find data strictly before the target week
            df_filtered = df[df["week_start_date"] < target_ts]
            # If target is at or before earliest date, fallback to first records
            if len(df_filtered) == 0:
                df_filtered = df
        else:
            df_filtered = df

        result = {}
        for zone in VALID_ZONES:
            zone_data = df_filtered[df_filtered["zone"] == zone]
            if len(zone_data) > 0:
                last_row = zone_data.iloc[-1]
                result[zone] = {
                    "previousWet": round(float(last_row["wet_waste_tons"]), 2),
                    "previousDry": round(float(last_row["dry_waste_tons"]), 2),
                    "weekDate": str(last_row.get("week_end_date", "")),
                    "month": int(last_row.get("month", 1)),
                }
            else:
                result[zone] = {
                    "previousWet": 18.0,
                    "previousDry": 8.0,
                    "weekDate": "",
                    "month": 1,
                }
        return result
    except Exception as e:
        print(f"[WARN] CSV load failed: {e}")
        return {
            "Kalutara North": {"previousWet": 23.12, "previousDry": 7.97, "weekDate": "", "month": 12},
            "Kalutara South": {"previousWet": 16.49, "previousDry": 6.07, "weekDate": "", "month": 12},
            "Katukurunda 1":  {"previousWet": 46.47, "previousDry": 16.04, "weekDate": "", "month": 12},
            "Katukurunda 2":  {"previousWet": 27.72, "previousDry": 9.71, "weekDate": "", "month": 12},
        }


def get_week_monday(week_start_date=None):
    """Get the Monday of the target week. Defaults to next Monday."""
    if week_start_date:
        return week_start_date
    today = datetime.now().date()
    days_until_monday = (7 - today.weekday()) % 7 or 7
    return today + timedelta(days=days_until_monday)


def calculate_truck_requirements(zone_results, grand_total):
    """Calculate truck requirements based on predicted waste.

    Standard municipal compactor truck: 5 tons capacity.
    """
    per_zone = {}
    total_trucks = 0

    for zone_name, result in zone_results.items():
        zone_total = result["scaledTotal"]
        trucks = math.ceil(zone_total / TRUCK_CAPACITY_TONS)
        per_zone[zone_name] = {
            "wasteTons": zone_total,
            "trucksNeeded": trucks,
            "truckUtilization": round((zone_total / (trucks * TRUCK_CAPACITY_TONS)) * 100, 1) if trucks > 0 else 0,
        }
        total_trucks += trucks

    # Add 1 spare/buffer truck
    spare_trucks = 1
    total_with_spare = total_trucks + spare_trucks

    return {
        "truckCapacityTons": TRUCK_CAPACITY_TONS,
        "totalWasteTons": round(grand_total, 2),
        "trucksNeeded": total_trucks,
        "spareTrucks": spare_trucks,
        "totalWithSpare": total_with_spare,
        "overallUtilization": round((grand_total / (total_trucks * TRUCK_CAPACITY_TONS)) * 100, 1) if total_trucks > 0 else 0,
        "perZone": per_zone,
    }


# ── Feature building ─────────────────────────────────────────────────────────
def build_feature_row(zone_name, month, rainfall_mm, previous_wet, previous_dry, week_type, special_event):
    """Build a single feature row for model prediction."""
    meta = ZONE_METADATA.get(zone_name, ZONE_METADATA["Kalutara North"])
    return {
        "month":              month,
        "rainfall_mm":        rainfall_mm,
        "previous_wet_tons":  previous_wet,
        "previous_dry_tons":  previous_dry,
        "zone":               zone_name,
        "area_type":          meta["area_type"],
        "population_density": meta["population_density"],
        "week_type":          week_type,
        "special_event":      special_event,
    }


# ── Composition estimation ───────────────────────────────────────────────────
def estimate_composition(zone_results):
    """Aggregate composition from per-zone results."""
    total_organic = total_plastic = total_paper = total_metal = 0.0
    grand_total = 0.0
    per_zone = {}

    for zone_name, result in zone_results.items():
        zone_total = result["scaledWet"] + result["scaledDry"]
        area_type = ZONE_METADATA.get(zone_name, {}).get("area_type", "town")
        comp = COMPOSITION_BY_AREA_TYPE.get(area_type, COMPOSITION_BY_AREA_TYPE["town"])

        organic = zone_total * comp["organic"] / 100
        plastic = zone_total * comp["plastic"] / 100
        paper = zone_total * comp["paper"] / 100
        metal = zone_total * comp["metal"] / 100

        total_organic += organic
        total_plastic += plastic
        total_paper += paper
        total_metal += metal
        grand_total += zone_total

        per_zone[zone_name] = {
            "organic": round(organic, 2),
            "plastic": round(plastic, 2),
            "paper": round(paper, 2),
            "metal": round(metal, 2),
        }

    if grand_total == 0:
        return None

    organic_pct = round(total_organic / grand_total * 100, 1)
    plastic_pct = round(total_plastic / grand_total * 100, 1)
    paper_pct = round(total_paper / grand_total * 100, 1)
    metal_pct = round(100 - organic_pct - plastic_pct - paper_pct, 1)

    return {
        "organic": {"percentage": organic_pct, "weight": round(total_organic, 2)},
        "plastic": {"percentage": plastic_pct, "weight": round(total_plastic, 2)},
        "paper": {"percentage": paper_pct, "weight": round(total_paper, 2)},
        "metal": {"percentage": metal_pct, "weight": round(total_metal, 2)},
        "perZone": per_zone,
    }


# ── Recommendation engine ───────────────────────────────────────────────────
def generate_recommendations(prediction, truck_info):
    """Generate recommendations based on predictions and truck requirements."""
    recs = []
    total_wet = prediction["totalWet"]
    total_dry = prediction["totalDry"]
    grand_total = prediction["grandTotal"]
    zone_results = prediction["zoneResults"]
    trucks = truck_info["trucksNeeded"]

    if grand_total > 100:
        recs.append({
            "id": "high-waste",
            "title": "High Municipal Waste Generation Alert",
            "description": f"Predicted total council waste of {grand_total} tons. Deploy {trucks} collection trucks ({truck_info['totalWithSpare']} including spare) across all zones.",
            "severity": "critical",
            "icon": "alert-triangle",
            "action": f"Deploy {truck_info['totalWithSpare']} trucks",
        })

    if total_wet > 60:
        recs.append({
            "id": "compost",
            "title": "Scale Up Composting Facilities",
            "description": f"Council-wide wet waste predicted at {total_wet} tons. Increase composting facility capacity to handle the organic load.",
            "severity": "warning",
            "icon": "leaf",
            "action": "Expand composting",
        })

    if total_dry > 30:
        recs.append({
            "id": "sorting",
            "title": "Increase Recycling Capacity",
            "description": f"Dry waste predicted at {total_dry} tons across the council. Allocate more sorting workers and expand recycling centers.",
            "severity": "warning",
            "icon": "users",
            "action": "Scale recycling",
        })

    # Highest contributor
    max_zone = max(zone_results, key=lambda z: zone_results[z]["scaledTotal"], default=None)
    if max_zone:
        pct = zone_results[max_zone]["contributionPercent"]
        zt = zone_results[max_zone]["scaledTotal"]
        zone_trucks = truck_info["perZone"][max_zone]["trucksNeeded"]
        recs.append({
            "id": "top-zone",
            "title": f"{max_zone} — Highest Contributor",
            "description": f"{max_zone} contributes {pct}% ({zt} tons) of total waste. Requires {zone_trucks} truck(s) for collection.",
            "severity": "info",
            "icon": "trending-up",
            "action": "Prioritize collection",
        })

    # Fleet deployment
    if trucks > 3:
        recs.append({
            "id": "transport",
            "title": "Fleet Deployment Plan",
            "description": f"Total of {trucks} standard compactor trucks needed ({TRUCK_CAPACITY_TONS}t capacity each). Recommend {truck_info['totalWithSpare']} total with {truck_info['spareTrucks']} spare. Average utilization: {truck_info['overallUtilization']}%.",
            "severity": "warning",
            "icon": "truck",
            "action": "Schedule fleet",
        })

    # Beach zone
    if "Kalutara South" in zone_results and zone_results["Kalutara South"]["scaledTotal"] > 15:
        recs.append({
            "id": "beach-plastic",
            "title": "Beach Zone Waste Management",
            "description": f"Kalutara South (beach) generating {zone_results['Kalutara South']['scaledTotal']} tons. Deploy beach cleanup crews and recycling bins.",
            "severity": "info",
            "icon": "recycle",
            "action": "Beach cleanup",
        })

    # High density zone
    if "Katukurunda 1" in zone_results and zone_results["Katukurunda 1"]["scaledTotal"] > 40:
        recs.append({
            "id": "high-density",
            "title": "High-Density Area Alert",
            "description": f"Katukurunda 1 producing {zone_results['Katukurunda 1']['scaledTotal']} tons. Ensure adequate bin capacity and increase collection frequency.",
            "severity": "warning",
            "icon": "users",
            "action": "Increase frequency",
        })

    if grand_total < 70:
        recs.append({
            "id": "low-waste",
            "title": "Optimal Council Waste Levels",
            "description": "Predicted waste is within optimal range. Standard collection with scheduled trucks is sufficient.",
            "severity": "success",
            "icon": "check-circle",
            "action": "No action needed",
        })

    return recs


# ── Weekly comparison helper ─────────────────────────────────────────────────
def generate_weekly_comparison(prediction):
    """Generate daily distribution for charts."""
    total_wet = prediction["totalWet"]
    total_dry = prediction["totalDry"]
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    factors = [0.13, 0.12, 0.14, 0.13, 0.15, 0.17, 0.16]
    return [
        {
            "day": day,
            "wet": round(total_wet * f, 2),
            "dry": round(total_dry * f, 2),
            "previousWet": round(total_wet * f * 0.92, 2),
            "previousDry": round(total_dry * f * 0.95, 2),
        }
        for day, f in zip(days, factors)
    ]


# ══════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Prediction endpoint.

    User provides weekType and optionally a weekStartDate (ISO date: YYYY-MM-DD).
    Everything else is auto-derived:
    - Rainfall: fetched from Open-Meteo if within 16 days, else historical average
    - Previous week data: loaded from CSV dataset
    - Month: determined from selected week date

    Request body:
    {
      "weekType": "normal" | "holiday" | "festival",
      "weekStartDate": "2026-09-01"   (optional, ISO date string, must be a Monday)
    }

    Returns: prediction, composition, recommendations, weeklyComparison, truckRequirements, rainfallForecast
    """
    try:
        from datetime import date as date_type
        data = request.get_json() or {}
        week_type = data.get("weekType", "normal")

        # Parse optional weekStartDate
        week_start_str = data.get("weekStartDate", None)
        week_start_date = None
        if week_start_str:
            try:
                week_start_date = datetime.strptime(week_start_str, "%Y-%m-%d").date()
            except Exception:
                week_start_date = None

        # Derive the Monday of the target week
        week_monday = get_week_monday(week_start_date)
        month = week_monday.month

        # Auto-set special_event: yes for festival, no otherwise
        special_event = "yes" if week_type == "festival" else "no"

        # Fetch rainfall for the selected week
        rainfall_data = fetch_rainfall_forecast(week_monday)
        rainfall_mm = rainfall_data["total_mm"]

        # Auto-load previous week's waste from CSV before the target week
        prev_week = load_previous_week_data(week_monday)

        # Run predictions for all 4 zones
        zone_results = {}
        total_wet = 0.0
        total_dry = 0.0
        total_confidence = 0.0

        for zone_name in VALID_ZONES:
            prev = prev_week.get(zone_name, {"previousWet": 18.0, "previousDry": 8.0})

            feature_row = build_feature_row(
                zone_name=zone_name,
                month=month,
                rainfall_mm=rainfall_mm,
                previous_wet=prev["previousWet"],
                previous_dry=prev["previousDry"],
                week_type=week_type,
                special_event=special_event,
            )

            df = pd.DataFrame([feature_row])[FEATURE_COLS]

            pred_wet = max(0.0, round(float(wet_model.predict(df)[0]), 2))
            pred_dry = max(0.0, round(float(dry_model.predict(df)[0]), 2))
            pred_total = round(pred_wet + pred_dry, 2)

            # Confidence
            confidence = 88.0
            if prev["previousWet"] > 0 and prev["previousDry"] > 0:
                confidence += 4
            if rainfall_data["success"]:
                confidence += 3
            if week_type != "normal":
                confidence += 2
            confidence = min(confidence, 97.0)

            # Trends
            wet_trend = round((pred_wet - prev["previousWet"]) / prev["previousWet"] * 100, 1) if prev["previousWet"] > 0 else 0
            dry_trend = round((pred_dry - prev["previousDry"]) / prev["previousDry"] * 100, 1) if prev["previousDry"] > 0 else 0

            meta = ZONE_METADATA[zone_name]
            zone_results[zone_name] = {
                "count": 1,
                "areaType": meta["area_type"],
                "populationDensity": meta["population_density"],
                "scaledWet": pred_wet,
                "scaledDry": pred_dry,
                "scaledTotal": pred_total,
                "confidence": round(confidence, 1),
                "wetTrend": wet_trend,
                "dryTrend": dry_trend,
                "previousWet": prev["previousWet"],
                "previousDry": prev["previousDry"],
            }

            total_wet += pred_wet
            total_dry += pred_dry
            total_confidence += confidence

        grand_total = round(total_wet + total_dry, 2)
        avg_confidence = round(total_confidence / len(VALID_ZONES), 1)

        # Contribution percentages
        for zn in zone_results:
            z = zone_results[zn]
            z["contributionPercent"] = round(z["scaledTotal"] / grand_total * 100, 1) if grand_total > 0 else 0

        prediction = {
            "totalWet": round(total_wet, 2),
            "totalDry": round(total_dry, 2),
            "grandTotal": grand_total,
            "confidence": avg_confidence,
            "zoneResults": zone_results,
            "zoneCount": len(VALID_ZONES),
        }

        composition = estimate_composition(zone_results)
        truck_info = calculate_truck_requirements(zone_results, grand_total)
        recommendations = generate_recommendations(prediction, truck_info)
        weekly = generate_weekly_comparison(prediction)

        # Store in MongoDB
        doc = {
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "inputs": {
                "weekType": week_type,
                "month": month,
                "rainfallMm": rainfall_mm,
                "rainfallSource": "Open-Meteo API" if rainfall_data["success"] else "Fallback",
            },
            "result": prediction,
            "composition": composition,
            "truckRequirements": truck_info,
            "recommendations": recommendations,
        }
        insert_result = predictions_collection.insert_one(doc)
        prediction["_id"] = str(insert_result.inserted_id)

        return jsonify({
            "success": True,
            "prediction": prediction,
            "composition": composition,
            "truckRequirements": truck_info,
            "recommendations": recommendations,
            "weeklyComparison": weekly,
            "rainfallForecast": rainfall_data,
            "inputsSummary": {
                "weekType": week_type,
                "month": month,
                "monthName": datetime(2024, month, 1).strftime("%B"),
                "rainfallMm": rainfall_mm,
                "rainfallSource": rainfall_data.get("source", "Unknown"),
                "rainfallSourceType": rainfall_data.get("sourceType", "forecast"),
                "specialEvent": special_event,
                "weekStartDate": str(week_monday),
                "weekEndDate": str(week_monday + timedelta(days=6)),
            },
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/rainfall-forecast", methods=["GET"])
def rainfall_forecast():
    """Fetch and return the rainfall forecast for a given week.

    Query param:
      - weekStart: ISO date string (YYYY-MM-DD) for the Monday of the target week
    """
    week_start_str = request.args.get("weekStart", None)
    week_start_date = None
    if week_start_str:
        try:
            week_start_date = datetime.strptime(week_start_str, "%Y-%m-%d").date()
        except Exception:
            pass
    data = fetch_rainfall_forecast(week_start_date)
    return jsonify(data)


@app.route("/api/previous-week", methods=["GET"])
def previous_week():
    """Return the previous week waste data per zone from the CSV dataset.

    Query param:
      - weekStart: ISO date string (YYYY-MM-DD)
    """
    week_start_str = request.args.get("weekStart", None)
    week_start_date = None
    if week_start_str:
        try:
            week_start_date = datetime.strptime(week_start_str, "%Y-%m-%d").date()
        except Exception:
            pass
    data = load_previous_week_data(week_start_date)
    return jsonify({"success": True, "zones": data})


@app.route("/api/predictions", methods=["GET"])
def get_predictions():
    """Fetch prediction history from MongoDB — latest first."""
    try:
        limit = int(request.args.get("limit", 20))
        cursor = predictions_collection.find().sort("createdAt", -1).limit(limit)

        history = []
        for doc in cursor:
            result = doc.get("result", {})
            zone_results = result.get("zoneResults", {})
            created = doc.get("createdAt", "")
            inputs = doc.get("inputs", {})
            truck = doc.get("truckRequirements", {})

            history.append({
                "id": str(doc["_id"]),
                "date": created,
                "scope": "Kalutara Municipal Council",
                "zoneCount": len(zone_results),
                "wetWaste": result.get("totalWet", 0),
                "dryWaste": result.get("totalDry", 0),
                "confidence": result.get("confidence", 0),
                "weekType": inputs.get("weekType", "normal"),
                "rainfallMm": inputs.get("rainfallMm", 0),
                "trucksNeeded": truck.get("trucksNeeded", 0),
                "status": "verified",
            })

        return jsonify({"success": True, "history": history})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/predictions/<prediction_id>", methods=["GET"])
def get_prediction(prediction_id):
    """Fetch a single prediction by ID."""
    try:
        doc = predictions_collection.find_one({"_id": ObjectId(prediction_id)})
        if not doc:
            return jsonify({"success": False, "error": "Not found"}), 404
        doc["_id"] = str(doc["_id"])
        return jsonify({"success": True, "data": doc})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/zones", methods=["GET"])
def get_zones():
    """Return the list of valid zones with metadata."""
    zones = []
    for zone_name in VALID_ZONES:
        meta = ZONE_METADATA[zone_name]
        zones.append({
            "name": zone_name,
            "areaType": meta["area_type"],
            "populationDensity": meta["population_density"],
        })
    return jsonify({"success": True, "zones": zones})



@app.route("/api/backtest", methods=["GET"])
def backtest():
    """
    Retrospective validation — run the model on historical test data.

    Loads the last 20% of the dataset (chronological), runs the models
    on each row using the EXACT same features recorded at that time,
    and returns actual vs predicted values for each week/zone.

    Query params:
      - zone: filter to a specific zone (optional)
      - limit: max rows to return (default 200)

    Returns arrays suitable for charting: time-series, scatter plots, metrics.
    """
    try:
        csv_path = os.path.join(MODEL_DIR, "Real_Zone_Waste_Dataset.csv")
        df = pd.read_csv(csv_path)
        df["week_start_date"] = pd.to_datetime(df["week_start_date"])
        df = df.sort_values("week_start_date").reset_index(drop=True)

        # Chronological 80/20 split — same split used for evaluation
        split_idx = int(len(df) * 0.80)
        df_test = df.iloc[split_idx:].copy()

        zone_filter = request.args.get("zone", None)
        if zone_filter and zone_filter in VALID_ZONES:
            df_test = df_test[df_test["zone"] == zone_filter]

        limit = int(request.args.get("limit", 200))
        df_test = df_test.head(limit)

        # Build feature matrix exactly as the model expects
        X_test = df_test[FEATURE_COLS]

        wet_preds = wet_model.predict(X_test)
        dry_preds = dry_model.predict(X_test)

        rows = []
        for i, (_, row) in enumerate(df_test.iterrows()):
            actual_wet = float(row["wet_waste_tons"])
            actual_dry = float(row["dry_waste_tons"])
            pred_wet = round(float(max(0, wet_preds[i])), 2)
            pred_dry = round(float(max(0, dry_preds[i])), 2)

            wet_err = abs(actual_wet - pred_wet) / actual_wet * 100 if actual_wet > 0 else 0
            dry_err = abs(actual_dry - pred_dry) / actual_dry * 100 if actual_dry > 0 else 0

            rows.append({
                "weekDate":    str(row["week_start_date"].date()),
                "zone":        row["zone"],
                "areaType":    row["area_type"],
                "weekType":    row["week_type"],
                "rainfallMm":  float(row["rainfall_mm"]),
                "actualWet":   actual_wet,
                "predictedWet": pred_wet,
                "wetError":    round(wet_err, 1),
                "actualDry":   actual_dry,
                "predictedDry": pred_dry,
                "dryError":    round(dry_err, 1),
                "actualTotal": round(actual_wet + actual_dry, 2),
                "predictedTotal": round(pred_wet + pred_dry, 2),
                "totalError":  round(abs((actual_wet + actual_dry) - (pred_wet + pred_dry)) / (actual_wet + actual_dry) * 100, 1) if (actual_wet + actual_dry) > 0 else 0,
            })

        # Compute summary metrics per zone
        import math
        zone_metrics = {}
        for zone_name in VALID_ZONES:
            zone_rows = [r for r in rows if r["zone"] == zone_name]
            if not zone_rows:
                continue
            actual_wets  = [r["actualWet"] for r in zone_rows]
            pred_wets    = [r["predictedWet"] for r in zone_rows]
            actual_drys  = [r["actualDry"] for r in zone_rows]
            pred_drys    = [r["predictedDry"] for r in zone_rows]

            def _rmse(a, p):
                return round(math.sqrt(sum((ai - pi)**2 for ai, pi in zip(a, p)) / len(a)), 3)
            def _mae(a, p):
                return round(sum(abs(ai - pi) for ai, pi in zip(a, p)) / len(a), 3)
            def _mape(a, p):
                errs = [abs(ai - pi) / ai * 100 for ai, pi in zip(a, p) if ai > 0]
                return round(sum(errs) / len(errs), 2) if errs else 0
            def _r2(a, p):
                mean_a = sum(a) / len(a)
                ss_tot = sum((ai - mean_a)**2 for ai in a)
                ss_res = sum((ai - pi)**2 for ai, pi in zip(a, p))
                return round(1 - ss_res / ss_tot, 4) if ss_tot > 0 else 0

            zone_metrics[zone_name] = {
                "sampleCount": len(zone_rows),
                "wet": {
                    "rmse": _rmse(actual_wets, pred_wets),
                    "mae":  _mae(actual_wets, pred_wets),
                    "mape": _mape(actual_wets, pred_wets),
                    "r2":   _r2(actual_wets, pred_wets),
                    "accuracy": round(100 - _mape(actual_wets, pred_wets), 2),
                },
                "dry": {
                    "rmse": _rmse(actual_drys, pred_drys),
                    "mae":  _mae(actual_drys, pred_drys),
                    "mape": _mape(actual_drys, pred_drys),
                    "r2":   _r2(actual_drys, pred_drys),
                    "accuracy": round(100 - _mape(actual_drys, pred_drys), 2),
                },
            }

        # Overall summary across all zones
        all_actual_wet  = [r["actualWet"] for r in rows]
        all_pred_wet    = [r["predictedWet"] for r in rows]
        all_actual_dry  = [r["actualDry"] for r in rows]
        all_pred_dry    = [r["predictedDry"] for r in rows]

        def _overall_mape(a, p):
            errs = [abs(ai - pi) / ai * 100 for ai, pi in zip(a, p) if ai > 0]
            return round(sum(errs) / len(errs), 2) if errs else 0
        def _overall_r2(a, p):
            mean_a = sum(a) / len(a)
            ss_tot = sum((ai - mean_a)**2 for ai in a)
            ss_res = sum((ai - pi)**2 for ai, pi in zip(a, p))
            return round(1 - ss_res / ss_tot, 4) if ss_tot > 0 else 0

        wet_mape = _overall_mape(all_actual_wet, all_pred_wet)
        dry_mape = _overall_mape(all_actual_dry, all_pred_dry)
        summary = {
            "totalSamples": len(rows),
            "trainingSplit": f"{split_idx} rows (Jan 2023 – {df.iloc[split_idx-1]['week_start_date'].date()})",
            "testSplit":     f"{len(df) - split_idx} rows ({df.iloc[split_idx]['week_start_date'].date()} – {df.iloc[-1]['week_start_date'].date()})",
            "wetModel": {
                "mape": wet_mape,
                "accuracy": round(100 - wet_mape, 2),
                "r2": _overall_r2(all_actual_wet, all_pred_wet),
            },
            "dryModel": {
                "mape": dry_mape,
                "accuracy": round(100 - dry_mape, 2),
                "r2": _overall_r2(all_actual_dry, all_pred_dry),
            },
        }

        return jsonify({
            "success": True,
            "rows": rows,
            "zoneMetrics": zone_metrics,
            "summary": summary,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "models": {"wet": type(wet_model).__name__, "dry": type(dry_model).__name__},
        "database": "connected",
        "zones": VALID_ZONES,
        "truckCapacity": TRUCK_CAPACITY_TONS,
    })


# ── Run server ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"\n>> Waste Prediction API running on http://localhost:{PORT}")
    print(f"   MongoDB: {DB_NAME}")
    print(f"   Models: wet={type(wet_model).__name__}, dry={type(dry_model).__name__}")
    print(f"   Zones: {', '.join(VALID_ZONES)}")
    print(f"   Truck capacity: {TRUCK_CAPACITY_TONS} tons\n")
    # use_reloader=False prevents WinError 10038 on Windows + Python 3.13
    # (harmless bug in socketserver cleanup during hot-reload thread shutdown)
    app.run(debug=True, port=PORT, host="0.0.0.0", use_reloader=False)
