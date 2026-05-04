"""
Municipal Wet & Dry Waste Generation - Synthetic Dataset Generator
===================================================================
Research Project: R26-IT-126
Title: Machine Learning-Based Prediction of Municipal Wet and Dry Waste
       Generation for Proactive Waste Management

This script generates a realistic synthetic dataset (3000 rows) suitable for
training ML regression models (Random Forest, XGBoost, Linear Regression).

Generation Logic:
-----------------
1. Base waste rates are assigned per zone_type (market > residential > tourist > office > school for wet;
   school > office > tourist > market > residential for dry).
2. Multipliers are applied for week_type, population_density, special_event, rainfall, and month
   (seasonal pattern).
3. Previous-week waste values are generated first, then used as strong predictors
   for current-week waste via autoregressive coupling (coefficient ~0.55-0.70).
4. Gaussian noise (σ proportional to the base) is added to avoid perfectly linear patterns.
5. All values are clipped to realistic positive ranges.

Author : Auto-generated for R26-IT-126
Date   : 2026-05-04
"""

import numpy as np
import pandas as pd
import os

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
SEED = 42
N_ROWS = 3000
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "municipal_waste_dataset.csv")

np.random.seed(SEED)

# ──────────────────────────────────────────────
# 1. Categorical Feature Generation
# ──────────────────────────────────────────────

zone_types = np.random.choice(
    ["residential", "market", "school", "office", "tourist_area"],
    size=N_ROWS,
    p=[0.35, 0.20, 0.15, 0.18, 0.12],  # residential dominant
)

week_types = np.random.choice(
    ["normal", "holiday", "festival"],
    size=N_ROWS,
    p=[0.70, 0.18, 0.12],
)

pop_density = np.random.choice(
    ["low", "medium", "high"],
    size=N_ROWS,
    p=[0.25, 0.45, 0.30],
)

months = np.random.randint(1, 13, size=N_ROWS)

special_events = np.random.choice(
    ["yes", "no"],
    size=N_ROWS,
    p=[0.15, 0.85],
)

# ──────────────────────────────────────────────
# 2. Rainfall (continuous, skewed distribution)
#    - Most weeks are dry/light; heavy rain is rare
# ──────────────────────────────────────────────
rainfall_mm = np.round(
    np.clip(np.random.exponential(scale=30, size=N_ROWS), 0, 300), 1
)
# Increase rainfall in monsoon months (Jun-Sep → months 6-9)
monsoon_mask = np.isin(months, [6, 7, 8, 9])
rainfall_mm[monsoon_mask] = np.round(
    np.clip(rainfall_mm[monsoon_mask] * 2.5 + np.random.normal(40, 20, monsoon_mask.sum()), 0, 300), 1
)

# ──────────────────────────────────────────────
# 3. Base Waste Rates by Zone Type (tons)
# ──────────────────────────────────────────────
#   zone_type       wet_base   dry_base
#   residential       5.0        2.5
#   market            8.5        3.0
#   school            2.5        4.0
#   office            3.0        3.5
#   tourist_area      4.5        5.0

WET_BASE = {"residential": 5.0, "market": 8.5, "school": 2.5,
            "office": 3.0, "tourist_area": 4.5}
DRY_BASE = {"residential": 2.5, "market": 3.0, "school": 4.0,
            "office": 3.5, "tourist_area": 5.0}

wet_base = np.array([WET_BASE[z] for z in zone_types])
dry_base = np.array([DRY_BASE[z] for z in zone_types])

# ──────────────────────────────────────────────
# 4. Multiplier: Week Type
# ──────────────────────────────────────────────
WEEK_WET_MULT = {"normal": 1.0, "holiday": 1.20, "festival": 1.55}
WEEK_DRY_MULT = {"normal": 1.0, "holiday": 1.15, "festival": 1.30}

wet_week_mult = np.array([WEEK_WET_MULT[w] for w in week_types])
dry_week_mult = np.array([WEEK_DRY_MULT[w] for w in week_types])

# ──────────────────────────────────────────────
# 5. Multiplier: Population Density
# ──────────────────────────────────────────────
POP_WET_MULT = {"low": 0.75, "medium": 1.0, "high": 1.35}
POP_DRY_MULT = {"low": 0.70, "medium": 1.0, "high": 1.30}

wet_pop_mult = np.array([POP_WET_MULT[p] for p in pop_density])
dry_pop_mult = np.array([POP_DRY_MULT[p] for p in pop_density])

# ──────────────────────────────────────────────
# 6. Multiplier: Seasonal (Month)
#    - Wet waste peaks in summer/monsoon (organic decay)
#    - Dry waste peaks in winter/festive season
# ──────────────────────────────────────────────
MONTH_WET_MULT = {
    1: 0.92, 2: 0.90, 3: 0.95, 4: 1.05,
    5: 1.10, 6: 1.15, 7: 1.18, 8: 1.15,
    9: 1.08, 10: 1.02, 11: 1.00, 12: 0.95,
}
MONTH_DRY_MULT = {
    1: 1.05, 2: 1.02, 3: 0.98, 4: 0.95,
    5: 0.92, 6: 0.88, 7: 0.85, 8: 0.87,
    9: 0.92, 10: 1.00, 11: 1.08, 12: 1.15,
}

wet_month_mult = np.array([MONTH_WET_MULT[m] for m in months])
dry_month_mult = np.array([MONTH_DRY_MULT[m] for m in months])

# ──────────────────────────────────────────────
# 7. Special Event Boost
# ──────────────────────────────────────────────
EVENT_WET_BOOST = {"yes": 1.18, "no": 1.0}
EVENT_DRY_BOOST = {"yes": 1.22, "no": 1.0}

wet_event = np.array([EVENT_WET_BOOST[e] for e in special_events])
dry_event = np.array([EVENT_DRY_BOOST[e] for e in special_events])

# ──────────────────────────────────────────────
# 8. Rainfall Effect
#    - Heavy rain slightly reduces dry waste collection
#    - Heavy rain can slightly increase wet waste (organic/moisture)
# ──────────────────────────────────────────────
rain_wet_effect = 1.0 + (rainfall_mm / 300) * 0.08   # up to +8%
rain_dry_effect = 1.0 - (rainfall_mm / 300) * 0.12   # up to -12%

# ──────────────────────────────────────────────
# 9. Compute Deterministic Target Values
# ──────────────────────────────────────────────
wet_deterministic = (wet_base
                     * wet_week_mult
                     * wet_pop_mult
                     * wet_month_mult
                     * wet_event
                     * rain_wet_effect)

dry_deterministic = (dry_base
                     * dry_week_mult
                     * dry_pop_mult
                     * dry_month_mult
                     * dry_event
                     * rain_dry_effect)

# ──────────────────────────────────────────────
# 10. Generate Previous-Week Waste
#     (correlated with current week via autoregression)
# ──────────────────────────────────────────────
AR_COEFF_WET = 0.60  # autoregressive strength
AR_COEFF_DRY = 0.55

# Previous waste = current deterministic + noise (simulates lag correlation)
prev_wet_noise = np.random.normal(0, 0.8, N_ROWS)
prev_dry_noise = np.random.normal(0, 0.6, N_ROWS)

previous_wet_tons = np.round(
    np.clip(wet_deterministic + prev_wet_noise + np.random.uniform(-1.0, 1.0, N_ROWS),
            0.5, 15.0), 2
)
previous_dry_tons = np.round(
    np.clip(dry_deterministic + prev_dry_noise + np.random.uniform(-0.5, 0.5, N_ROWS),
            0.2, 10.0), 2
)

# ──────────────────────────────────────────────
# 11. Final Target = f(deterministic, previous_week, noise)
# ──────────────────────────────────────────────
innovation_wet = np.random.normal(0, 0.6, N_ROWS)
innovation_dry = np.random.normal(0, 0.45, N_ROWS)

wet_waste_tons = np.round(np.clip(
    (1 - AR_COEFF_WET) * wet_deterministic
    + AR_COEFF_WET * previous_wet_tons
    + innovation_wet,
    0.3, 18.0
), 2)

dry_waste_tons = np.round(np.clip(
    (1 - AR_COEFF_DRY) * dry_deterministic
    + AR_COEFF_DRY * previous_dry_tons
    + innovation_dry,
    0.1, 12.0
), 2)

# ──────────────────────────────────────────────
# 12. Assemble DataFrame
# ──────────────────────────────────────────────
df = pd.DataFrame({
    "zone_type": zone_types,
    "rainfall_mm": rainfall_mm,
    "week_type": week_types,
    "population_density": pop_density,
    "month": months,
    "special_event": special_events,
    "previous_wet_tons": previous_wet_tons,
    "previous_dry_tons": previous_dry_tons,
    "wet_waste_tons": wet_waste_tons,
    "dry_waste_tons": dry_waste_tons,
})

# ──────────────────────────────────────────────
# 13. Sanity Checks
# ──────────────────────────────────────────────
assert (df["wet_waste_tons"] > 0).all(), "Negative wet waste detected!"
assert (df["dry_waste_tons"] > 0).all(), "Negative dry waste detected!"
assert len(df) == N_ROWS, f"Expected {N_ROWS} rows, got {len(df)}"

# ──────────────────────────────────────────────
# 14. Save CSV
# ──────────────────────────────────────────────
df.to_csv(OUTPUT_FILE, index=False)
print(f"[OK] Dataset saved to: {OUTPUT_FILE}")
print(f"   Shape: {df.shape}")

# ──────────────────────────────────────────────
# 15. Print Summary Statistics
# ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("SUMMARY STATISTICS")
print("=" * 60)
print(df.describe().round(3).to_string())

print("\n" + "=" * 60)
print("CATEGORICAL VALUE COUNTS")
print("=" * 60)
for col in ["zone_type", "week_type", "population_density", "special_event"]:
    print(f"\n--- {col} ---")
    print(df[col].value_counts().to_string())

# ──────────────────────────────────────────────
# 16. Correlation Overview
# ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("CORRELATION MATRIX (numeric columns)")
print("=" * 60)
numeric_cols = ["rainfall_mm", "month", "previous_wet_tons", "previous_dry_tons",
                "wet_waste_tons", "dry_waste_tons"]
corr = df[numeric_cols].corr().round(3)
print(corr.to_string())

# ──────────────────────────────────────────────
# 17. Zone-Level Averages
# ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("MEAN WASTE BY ZONE TYPE")
print("=" * 60)
zone_means = df.groupby("zone_type")[["wet_waste_tons", "dry_waste_tons"]].mean().round(3)
print(zone_means.to_string())

print("\n" + "=" * 60)
print("MEAN WASTE BY WEEK TYPE")
print("=" * 60)
week_means = df.groupby("week_type")[["wet_waste_tons", "dry_waste_tons"]].mean().round(3)
print(week_means.to_string())

print("\nDone. Dataset is ready for ML modelling.")
