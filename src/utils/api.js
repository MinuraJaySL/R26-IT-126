/**
 * API client for the Waste Prediction Flask backend.
 * Simplified: user only sends weekType, everything else is auto-derived.
 */

const API_BASE = 'http://localhost:5000/api';

/**
 * Send prediction request to backend.
 * User only provides weekType and optionally weekStartDate.
 * Backend auto-fetches rainfall and previous data.
 * @param {{ weekType: string, weekStartDate?: string }} inputs
 * @returns {Promise<{ prediction, composition, truckRequirements, recommendations, weeklyComparison, rainfallForecast, inputsSummary }>}
 */
export async function predictWasteAPI(inputs) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Prediction failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Prediction failed');

  return {
    prediction: data.prediction,
    composition: data.composition,
    truckRequirements: data.truckRequirements,
    recommendations: data.recommendations,
    weeklyComparison: data.weeklyComparison,
    rainfallForecast: data.rainfallForecast,
    inputsSummary: data.inputsSummary,
  };
}

/**
 * Fetch rainfall forecast from backend for a specific week.
 * @param {string} [weekStart] - ISO date string (YYYY-MM-DD) for Monday of target week. Defaults to next week.
 * @returns {Promise<Object>}
 */
export async function fetchRainfallForecast(weekStart = null) {
  const url = weekStart
    ? `${API_BASE}/rainfall-forecast?weekStart=${weekStart}`
    : `${API_BASE}/rainfall-forecast`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch rainfall forecast');
  return res.json();
}

/**
 * Fetch previous week's waste data per zone from CSV.
 * @param {string} [weekStart] - ISO date string (YYYY-MM-DD)
 * @returns {Promise<Object>}
 */
export async function fetchPreviousWeekData(weekStart = null) {
  const url = weekStart
    ? `${API_BASE}/previous-week?weekStart=${weekStart}`
    : `${API_BASE}/previous-week`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch previous week data');
  return res.json();
}

/**
 * Fetch prediction history from MongoDB.
 * @param {number} [limit=20]
 * @returns {Promise<Array>}
 */
export async function fetchPredictionHistory(limit = 20) {
  const res = await fetch(`${API_BASE}/predictions?limit=${limit}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch history (${res.status})`);
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch history');

  return data.history;
}

/**
 * Fetch a single prediction detail by ID.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function fetchPredictionById(id) {
  const res = await fetch(`${API_BASE}/predictions/${id}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch prediction (${res.status})`);
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Not found');

  return data.data;
}

/**
 * Health check.
 * @returns {Promise<Object>}
 */
export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

/**
 * Fetch backtest data — actual vs predicted for the held-out test set.
 * @param {{ zone?: string, limit?: number }} params
 * @returns {Promise<{ rows, zoneMetrics, summary }>}
 */
export async function fetchBacktest(params = {}) {
  const qs = new URLSearchParams();
  if (params.zone) qs.set('zone', params.zone);
  if (params.limit) qs.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/backtest?${qs}`);
  if (!res.ok) throw new Error(`Backtest failed (${res.status})`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Backtest failed');
  return { rows: data.rows, zoneMetrics: data.zoneMetrics, summary: data.summary };
}

