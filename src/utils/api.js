/**
 * API client for the Waste Prediction Flask backend.
 * Simplified: user only sends weekType, everything else is auto-derived.
 */

const API_BASE = 'http://localhost:5000/api';

/**
 * Send prediction request to backend.
 * User only provides weekType — backend auto-fetches rainfall and previous data.
 * @param {{ weekType: string }} inputs
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
 * Fetch rainfall forecast from backend (which calls Open-Meteo API).
 * @returns {Promise<Object>}
 */
export async function fetchRainfallForecast() {
  const res = await fetch(`${API_BASE}/rainfall-forecast`);
  if (!res.ok) throw new Error('Failed to fetch rainfall forecast');
  return res.json();
}

/**
 * Fetch previous week's waste data per zone from CSV.
 * @returns {Promise<Object>}
 */
export async function fetchPreviousWeekData() {
  const res = await fetch(`${API_BASE}/previous-week`);
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
