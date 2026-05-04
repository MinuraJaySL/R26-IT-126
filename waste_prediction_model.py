# -*- coding: utf-8 -*-
"""
#############################################################################
#  Municipal Wet & Dry Waste Prediction — ML Pipeline
#  Project: R26-IT-126
#  Title: Machine Learning-Based Prediction of Municipal Wet and Dry Waste
#         Generation for Proactive Waste Management
#
#  This script is structured as a Google Colab notebook (.py format).
#  Each "# %%" marks a new cell. Upload to Colab and convert if needed.
#############################################################################
"""

# %% [markdown]
# # Section 1: Install Dependencies & Imports

# %%
# !pip install xgboost scikit-learn pandas numpy matplotlib seaborn -q

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder, OrdinalEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (mean_squared_error, mean_absolute_error,
                             r2_score, mean_absolute_percentage_error)
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR
from xgboost import XGBRegressor

print("[OK] All libraries imported successfully.")

# %% [markdown]
# # Section 2: Load Dataset

# %%
# For Google Colab: upload the CSV or mount Google Drive
# from google.colab import files
# uploaded = files.upload()

df = pd.read_csv("municipal_waste_dataset.csv")
print(f"Dataset Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
df.head(10)

# %% [markdown]
# # Section 3: Exploratory Data Analysis (EDA)

# %%
# --- 3.1 Basic Info ---
print("=" * 60)
print("DATA TYPES & NULL CHECK")
print("=" * 60)
print(df.dtypes)
print(f"\nMissing values:\n{df.isnull().sum()}")
print(f"\nDuplicates: {df.duplicated().sum()}")

# %%
# --- 3.2 Statistical Summary ---
print("=" * 60)
print("STATISTICAL SUMMARY")
print("=" * 60)
print(df.describe().round(3).to_string())

# %%
# --- 3.3 Categorical Distributions ---
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle("Categorical Feature Distributions", fontsize=16, fontweight='bold')

for ax, col in zip(axes.flatten(),
                   ['zone_type', 'week_type', 'population_density', 'special_event']):
    counts = df[col].value_counts()
    bars = ax.bar(counts.index, counts.values, color=sns.color_palette("viridis", len(counts)))
    ax.set_title(col, fontsize=13)
    ax.set_ylabel("Count")
    for bar, val in zip(bars, counts.values):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 15,
                str(val), ha='center', fontsize=10)
plt.tight_layout()
plt.show()

# %%
# --- 3.4 Target Distribution ---
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
for ax, col, color in zip(axes, ['wet_waste_tons', 'dry_waste_tons'], ['#2196F3', '#FF9800']):
    ax.hist(df[col], bins=40, color=color, edgecolor='white', alpha=0.85)
    ax.axvline(df[col].mean(), color='red', linestyle='--', label=f'Mean: {df[col].mean():.2f}')
    ax.set_title(f'Distribution of {col}', fontsize=13)
    ax.set_xlabel('Tons')
    ax.set_ylabel('Frequency')
    ax.legend()
plt.tight_layout()
plt.show()

# %%
# --- 3.5 Waste by Zone Type ---
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
zone_order = df.groupby('zone_type')['wet_waste_tons'].mean().sort_values(ascending=False).index

sns.boxplot(data=df, x='zone_type', y='wet_waste_tons', order=zone_order,
            palette='Blues_d', ax=axes[0])
axes[0].set_title('Wet Waste by Zone Type', fontsize=13)

sns.boxplot(data=df, x='zone_type', y='dry_waste_tons', order=zone_order,
            palette='Oranges_d', ax=axes[1])
axes[1].set_title('Dry Waste by Zone Type', fontsize=13)
plt.tight_layout()
plt.show()

# %%
# --- 3.6 Waste by Week Type ---
fig, axes = plt.subplots(1, 2, figsize=(12, 5))
sns.barplot(data=df, x='week_type', y='wet_waste_tons',
            order=['normal','holiday','festival'], palette='coolwarm', ax=axes[0], ci=None)
axes[0].set_title('Mean Wet Waste by Week Type', fontsize=13)

sns.barplot(data=df, x='week_type', y='dry_waste_tons',
            order=['normal','holiday','festival'], palette='coolwarm', ax=axes[1], ci=None)
axes[1].set_title('Mean Dry Waste by Week Type', fontsize=13)
plt.tight_layout()
plt.show()

# %%
# --- 3.7 Correlation Heatmap ---
numeric_df = df.select_dtypes(include=[np.number])
plt.figure(figsize=(10, 7))
mask = np.triu(np.ones_like(numeric_df.corr(), dtype=bool))
sns.heatmap(numeric_df.corr(), annot=True, fmt='.3f', cmap='RdBu_r',
            center=0, mask=mask, square=True, linewidths=0.5)
plt.title('Correlation Matrix', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.show()

# %%
# --- 3.8 Monthly Trend ---
monthly = df.groupby('month')[['wet_waste_tons','dry_waste_tons']].mean()
fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(monthly.index, monthly['wet_waste_tons'], 'o-', color='#2196F3',
        linewidth=2, markersize=8, label='Wet Waste')
ax.plot(monthly.index, monthly['dry_waste_tons'], 's-', color='#FF9800',
        linewidth=2, markersize=8, label='Dry Waste')
ax.set_xlabel('Month')
ax.set_ylabel('Mean Waste (tons)')
ax.set_title('Monthly Waste Generation Trend', fontsize=14)
ax.set_xticks(range(1, 13))
ax.legend()
ax.grid(alpha=0.3)
plt.tight_layout()
plt.show()

# %%
# --- 3.9 Rainfall vs Waste Scatter ---
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
axes[0].scatter(df['rainfall_mm'], df['wet_waste_tons'], alpha=0.2, s=10, c='#2196F3')
axes[0].set_xlabel('Rainfall (mm)')
axes[0].set_ylabel('Wet Waste (tons)')
axes[0].set_title('Rainfall vs Wet Waste')

axes[1].scatter(df['rainfall_mm'], df['dry_waste_tons'], alpha=0.2, s=10, c='#FF9800')
axes[1].set_xlabel('Rainfall (mm)')
axes[1].set_ylabel('Dry Waste (tons)')
axes[1].set_title('Rainfall vs Dry Waste')
plt.tight_layout()
plt.show()

# %% [markdown]
# # Section 4: Feature Engineering

# %%
df_model = df.copy()

# 4.1 Create derived features
df_model['is_monsoon'] = df_model['month'].isin([6, 7, 8, 9]).astype(int)
df_model['heavy_rain'] = (df_model['rainfall_mm'] > 100).astype(int)
df_model['waste_ratio'] = (df_model['previous_wet_tons'] /
                           df_model['previous_dry_tons'].clip(lower=0.01)).round(3)
df_model['is_peak_event'] = ((df_model['week_type'] == 'festival') |
                             (df_model['special_event'] == 'yes')).astype(int)

print(f"Shape after feature engineering: {df_model.shape}")
print(f"New columns: is_monsoon, heavy_rain, waste_ratio, is_peak_event")
df_model.head()

# %% [markdown]
# # Section 5: Preprocessing

# %%
# --- 5.1 Define Feature Groups ---
TARGETS_WET = 'wet_waste_tons'
TARGETS_DRY = 'dry_waste_tons'

cat_features = ['zone_type', 'week_type', 'population_density', 'special_event']
num_features = ['rainfall_mm', 'month', 'previous_wet_tons', 'previous_dry_tons',
                'is_monsoon', 'heavy_rain', 'waste_ratio', 'is_peak_event']

# --- 5.2 Separate Features and Targets ---
X = df_model[cat_features + num_features]
y_wet = df_model[TARGETS_WET]
y_dry = df_model[TARGETS_DRY]

print(f"Features: {X.shape[1]} columns")
print(f"  Categorical: {cat_features}")
print(f"  Numerical:   {num_features}")

# %%
# --- 5.3 Build Preprocessing Pipeline ---
preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), num_features),
        ('cat', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'),
         cat_features),
    ],
    remainder='drop'
)

# --- 5.4 Train-Test Split (80/20) ---
X_train, X_test, y_wet_train, y_wet_test = train_test_split(
    X, y_wet, test_size=0.2, random_state=42
)
_, _, y_dry_train, y_dry_test = train_test_split(
    X, y_dry, test_size=0.2, random_state=42
)

print(f"Training set: {X_train.shape[0]} samples")
print(f"Test set:     {X_test.shape[0]} samples")

# %% [markdown]
# # Section 6: Model Definition

# %%
def get_models():
    """Return dictionary of model pipelines."""
    return {
        'Linear Regression': Pipeline([
            ('prep', preprocessor),
            ('model', LinearRegression())
        ]),
        'Ridge Regression': Pipeline([
            ('prep', preprocessor),
            ('model', Ridge(alpha=1.0))
        ]),
        'Lasso Regression': Pipeline([
            ('prep', preprocessor),
            ('model', Lasso(alpha=0.01))
        ]),
        'Random Forest': Pipeline([
            ('prep', preprocessor),
            ('model', RandomForestRegressor(
                n_estimators=200, max_depth=15,
                min_samples_split=5, random_state=42, n_jobs=-1))
        ]),
        'Gradient Boosting': Pipeline([
            ('prep', preprocessor),
            ('model', GradientBoostingRegressor(
                n_estimators=200, max_depth=5,
                learning_rate=0.1, random_state=42))
        ]),
        'XGBoost': Pipeline([
            ('prep', preprocessor),
            ('model', XGBRegressor(
                n_estimators=300, max_depth=6,
                learning_rate=0.08, subsample=0.8,
                colsample_bytree=0.8, random_state=42,
                verbosity=0))
        ]),
    }

print("[OK] 6 models defined.")

# %% [markdown]
# # Section 7: Train & Evaluate All Models

# %%
def evaluate_model(model, X_tr, X_te, y_tr, y_te):
    """Train model and return metrics + predictions."""
    model.fit(X_tr, y_tr)
    y_pred = model.predict(X_te)
    return {
        'RMSE': np.sqrt(mean_squared_error(y_te, y_pred)),
        'MAE': mean_absolute_error(y_te, y_pred),
        'R2': r2_score(y_te, y_pred),
        'MAPE': mean_absolute_percentage_error(y_te, y_pred) * 100,
    }, y_pred

# --- 7.1 Wet Waste Models ---
print("=" * 60)
print("WET WASTE PREDICTION RESULTS")
print("=" * 60)

wet_results = {}
wet_preds = {}
for name, model in get_models().items():
    metrics, pred = evaluate_model(model, X_train, X_test, y_wet_train, y_wet_test)
    wet_results[name] = metrics
    wet_preds[name] = pred
    print(f"{name:25s} | RMSE: {metrics['RMSE']:.4f} | MAE: {metrics['MAE']:.4f} | "
          f"R2: {metrics['R2']:.4f} | MAPE: {metrics['MAPE']:.2f}%")

# --- 7.2 Dry Waste Models ---
print("\n" + "=" * 60)
print("DRY WASTE PREDICTION RESULTS")
print("=" * 60)

dry_results = {}
dry_preds = {}
for name, model in get_models().items():
    metrics, pred = evaluate_model(model, X_train, X_test, y_dry_train, y_dry_test)
    dry_results[name] = metrics
    dry_preds[name] = pred
    print(f"{name:25s} | RMSE: {metrics['RMSE']:.4f} | MAE: {metrics['MAE']:.4f} | "
          f"R2: {metrics['R2']:.4f} | MAPE: {metrics['MAPE']:.2f}%")

# %% [markdown]
# # Section 8: Results Comparison

# %%
# --- 8.1 Results Tables ---
wet_df = pd.DataFrame(wet_results).T.round(4)
dry_df = pd.DataFrame(dry_results).T.round(4)

print("WET WASTE — Model Comparison:")
print(wet_df.to_string())
print(f"\nBest Wet Model (by R2): {wet_df['R2'].idxmax()} (R2={wet_df['R2'].max():.4f})")

print("\n\nDRY WASTE — Model Comparison:")
print(dry_df.to_string())
print(f"\nBest Dry Model (by R2): {dry_df['R2'].idxmax()} (R2={dry_df['R2'].max():.4f})")

# %%
# --- 8.2 Bar Chart Comparison ---
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle('Model Performance Comparison', fontsize=16, fontweight='bold')

for idx, metric in enumerate(['RMSE', 'MAE', 'R2', 'MAPE']):
    ax = axes[idx // 2][idx % 2]
    x = np.arange(len(wet_df))
    width = 0.35
    ax.bar(x - width/2, wet_df[metric], width, label='Wet Waste', color='#2196F3', alpha=0.85)
    ax.bar(x + width/2, dry_df[metric], width, label='Dry Waste', color='#FF9800', alpha=0.85)
    ax.set_xticks(x)
    ax.set_xticklabels(wet_df.index, rotation=30, ha='right', fontsize=9)
    ax.set_title(metric, fontsize=13)
    ax.legend()
    ax.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.show()

# %% [markdown]
# # Section 9: Best Model — Hyperparameter Tuning

# %%
# --- 9.1 XGBoost Hyperparameter Tuning (Wet Waste) ---
print("=" * 60)
print("HYPERPARAMETER TUNING — XGBoost (Wet Waste)")
print("=" * 60)

xgb_pipe = Pipeline([
    ('prep', preprocessor),
    ('model', XGBRegressor(random_state=42, verbosity=0))
])

param_grid = {
    'model__n_estimators': [200, 300, 500],
    'model__max_depth': [4, 6, 8],
    'model__learning_rate': [0.05, 0.08, 0.1],
    'model__subsample': [0.8, 0.9],
}

grid_wet = GridSearchCV(
    xgb_pipe, param_grid, cv=5,
    scoring='r2', n_jobs=-1, verbose=0
)
grid_wet.fit(X_train, y_wet_train)

print(f"Best Params: {grid_wet.best_params_}")
print(f"Best CV R2:  {grid_wet.best_score_:.4f}")

# --- 9.2 XGBoost Tuning (Dry Waste) ---
print("\n" + "=" * 60)
print("HYPERPARAMETER TUNING — XGBoost (Dry Waste)")
print("=" * 60)

grid_dry = GridSearchCV(
    xgb_pipe, param_grid, cv=5,
    scoring='r2', n_jobs=-1, verbose=0
)
grid_dry.fit(X_train, y_dry_train)

print(f"Best Params: {grid_dry.best_params_}")
print(f"Best CV R2:  {grid_dry.best_score_:.4f}")

# %% [markdown]
# # Section 10: Final Evaluation with Tuned Models

# %%
# --- 10.1 Evaluate Tuned Models on Test Set ---
best_wet_model = grid_wet.best_estimator_
best_dry_model = grid_dry.best_estimator_

y_wet_pred_final = best_wet_model.predict(X_test)
y_dry_pred_final = best_dry_model.predict(X_test)

print("=" * 60)
print("FINAL TUNED MODEL — TEST SET RESULTS")
print("=" * 60)
for label, y_true, y_pred in [("Wet Waste", y_wet_test, y_wet_pred_final),
                               ("Dry Waste", y_dry_test, y_dry_pred_final)]:
    print(f"\n--- {label} ---")
    print(f"  RMSE:  {np.sqrt(mean_squared_error(y_true, y_pred)):.4f}")
    print(f"  MAE:   {mean_absolute_error(y_true, y_pred):.4f}")
    print(f"  R2:    {r2_score(y_true, y_pred):.4f}")
    print(f"  MAPE:  {mean_absolute_percentage_error(y_true, y_pred)*100:.2f}%")

# %% [markdown]
# # Section 11: Prediction vs Actual Plots

# %%
fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# Wet Waste
axes[0].scatter(y_wet_test, y_wet_pred_final, alpha=0.4, s=15, c='#2196F3')
lims = [min(y_wet_test.min(), y_wet_pred_final.min()),
        max(y_wet_test.max(), y_wet_pred_final.max())]
axes[0].plot(lims, lims, 'r--', linewidth=2, label='Perfect Prediction')
axes[0].set_xlabel('Actual Wet Waste (tons)', fontsize=12)
axes[0].set_ylabel('Predicted Wet Waste (tons)', fontsize=12)
axes[0].set_title(f'Wet Waste: Actual vs Predicted (R2={r2_score(y_wet_test, y_wet_pred_final):.4f})',
                  fontsize=13)
axes[0].legend()
axes[0].grid(alpha=0.3)

# Dry Waste
axes[1].scatter(y_dry_test, y_dry_pred_final, alpha=0.4, s=15, c='#FF9800')
lims = [min(y_dry_test.min(), y_dry_pred_final.min()),
        max(y_dry_test.max(), y_dry_pred_final.max())]
axes[1].plot(lims, lims, 'r--', linewidth=2, label='Perfect Prediction')
axes[1].set_xlabel('Actual Dry Waste (tons)', fontsize=12)
axes[1].set_ylabel('Predicted Dry Waste (tons)', fontsize=12)
axes[1].set_title(f'Dry Waste: Actual vs Predicted (R2={r2_score(y_dry_test, y_dry_pred_final):.4f})',
                  fontsize=13)
axes[1].legend()
axes[1].grid(alpha=0.3)
plt.tight_layout()
plt.show()

# %% [markdown]
# # Section 12: Residual Analysis

# %%
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

residuals_wet = y_wet_test.values - y_wet_pred_final
residuals_dry = y_dry_test.values - y_dry_pred_final

axes[0].hist(residuals_wet, bins=40, color='#2196F3', edgecolor='white', alpha=0.85)
axes[0].axvline(0, color='red', linestyle='--')
axes[0].set_title('Wet Waste Residuals', fontsize=13)
axes[0].set_xlabel('Residual (tons)')

axes[1].hist(residuals_dry, bins=40, color='#FF9800', edgecolor='white', alpha=0.85)
axes[1].axvline(0, color='red', linestyle='--')
axes[1].set_title('Dry Waste Residuals', fontsize=13)
axes[1].set_xlabel('Residual (tons)')
plt.tight_layout()
plt.show()

print(f"Wet Residuals — Mean: {residuals_wet.mean():.4f}, Std: {residuals_wet.std():.4f}")
print(f"Dry Residuals — Mean: {residuals_dry.mean():.4f}, Std: {residuals_dry.std():.4f}")

# %% [markdown]
# # Section 13: Feature Importance

# %%
# Get feature names after preprocessing
feature_names = (num_features +
                 list(best_wet_model.named_steps['prep']
                      .named_transformers_['cat']
                      .get_feature_names_out(cat_features)))

# Wet Waste Feature Importance
wet_importance = best_wet_model.named_steps['model'].feature_importances_
wet_imp_df = pd.DataFrame({'Feature': feature_names, 'Importance': wet_importance})
wet_imp_df = wet_imp_df.sort_values('Importance', ascending=True).tail(12)

# Dry Waste Feature Importance
dry_importance = best_dry_model.named_steps['model'].feature_importances_
dry_imp_df = pd.DataFrame({'Feature': feature_names, 'Importance': dry_importance})
dry_imp_df = dry_imp_df.sort_values('Importance', ascending=True).tail(12)

fig, axes = plt.subplots(1, 2, figsize=(16, 6))
axes[0].barh(wet_imp_df['Feature'], wet_imp_df['Importance'], color='#2196F3')
axes[0].set_title('Top 12 Features — Wet Waste', fontsize=13)
axes[0].set_xlabel('Importance')

axes[1].barh(dry_imp_df['Feature'], dry_imp_df['Importance'], color='#FF9800')
axes[1].set_title('Top 12 Features — Dry Waste', fontsize=13)
axes[1].set_xlabel('Importance')
plt.tight_layout()
plt.show()

# %% [markdown]
# # Section 14: Cross-Validation of Best Model

# %%
print("=" * 60)
print("5-FOLD CROSS-VALIDATION — Tuned XGBoost")
print("=" * 60)

cv_wet = cross_val_score(best_wet_model, X, y_wet, cv=5, scoring='r2', n_jobs=-1)
cv_dry = cross_val_score(best_dry_model, X, y_dry, cv=5, scoring='r2', n_jobs=-1)

print(f"\nWet Waste CV R2 scores: {cv_wet.round(4)}")
print(f"  Mean: {cv_wet.mean():.4f} (+/- {cv_wet.std():.4f})")

print(f"\nDry Waste CV R2 scores: {cv_dry.round(4)}")
print(f"  Mean: {cv_dry.mean():.4f} (+/- {cv_dry.std():.4f})")

# %% [markdown]
# # Section 15: Save Best Models

# %%
import joblib

joblib.dump(best_wet_model, 'best_wet_waste_model.pkl')
joblib.dump(best_dry_model, 'best_dry_waste_model.pkl')
print("[OK] Models saved:")
print("  - best_wet_waste_model.pkl")
print("  - best_dry_waste_model.pkl")

# %% [markdown]
# # Section 16: Sample Prediction Demo

# %%
sample = pd.DataFrame([{
    'zone_type': 'market',
    'week_type': 'festival',
    'population_density': 'high',
    'special_event': 'yes',
    'rainfall_mm': 45.0,
    'month': 7,
    'previous_wet_tons': 12.5,
    'previous_dry_tons': 4.2,
    'is_monsoon': 1,
    'heavy_rain': 0,
    'waste_ratio': 12.5 / 4.2,
    'is_peak_event': 1,
}])

wet_pred = best_wet_model.predict(sample)[0]
dry_pred = best_dry_model.predict(sample)[0]

print("=" * 60)
print("SAMPLE PREDICTION")
print("=" * 60)
print(f"Zone: market | Week: festival | Density: high | Event: yes")
print(f"Rainfall: 45mm | Month: July | Prev Wet: 12.5t | Prev Dry: 4.2t")
print(f"\n  Predicted Wet Waste: {wet_pred:.2f} tons")
print(f"  Predicted Dry Waste: {dry_pred:.2f} tons")

# %% [markdown]
# # Section 17: Summary
#
# | Aspect | Details |
# |--------|---------|
# | Dataset | 3000 rows, 10 original + 4 engineered features |
# | Best Model | XGBoost (tuned via GridSearchCV) |
# | Preprocessing | StandardScaler (numeric) + OneHotEncoder (categorical) |
# | Evaluation | RMSE, MAE, R2, MAPE + 5-fold CV |
# | Models Compared | Linear, Ridge, Lasso, Random Forest, Gradient Boosting, XGBoost |

print("\n[DONE] Pipeline complete.")
