// =========================================
// Municipal Council Waste Prediction Engine
// Fallback logic and zone mappings for Kalutara Municipal Council
// =========================================

// Zone metadata and base rates
export const ZONE_METADATA = {
  'Kalutara North': {
    areaType: 'town',
    areaLabel: 'Town Area',
    color: '#10b981',
    populationDensity: 'medium',
    baseRate: { wet: 18.5, dry: 8.5 },
  },
  'Kalutara South': {
    areaType: 'beach',
    areaLabel: 'Beach & Coastal',
    color: '#06b6d4',
    populationDensity: 'low',
    baseRate: { wet: 14.0, dry: 6.5 },
  },
  'Katukurunda 1': {
    areaType: 'muslim_area',
    areaLabel: 'Muslim Area',
    color: '#f59e0b',
    populationDensity: 'high',
    baseRate: { wet: 35.0, dry: 15.0 },
  },
  'Katukurunda 2': {
    areaType: 'town',
    areaLabel: 'Town Area',
    color: '#8b5cf6',
    populationDensity: 'medium',
    baseRate: { wet: 22.0, dry: 10.0 },
  },
};

// Zone labels for display
export const zoneTypeLabels = {
  'Kalutara North': 'Kalutara North',
  'Kalutara South': 'Kalutara South',
  'Katukurunda 1': 'Katukurunda 1',
  'Katukurunda 2': 'Katukurunda 2',
  // Backward compatibility
  residential: 'Residential',
  market: 'Market',
  school: 'School',
  office: 'Office',
  tourist_area: 'Tourist Area',
};

// Zone colors
export const ZONE_COLORS = {
  'Kalutara North': '#10b981',
  'Kalutara South': '#06b6d4',
  'Katukurunda 1': '#f59e0b',
  'Katukurunda 2': '#8b5cf6',
  // Backward compatibility
  residential: '#10b981',
  market: '#06b6d4',
  school: '#f59e0b',
  office: '#8b5cf6',
  tourist_area: '#ef4444',
};

// Area composition ratios
export const COMPOSITION_BY_AREA = {
  town: { organic: 55, plastic: 20, paper: 15, metal: 10 },
  beach: { organic: 40, plastic: 30, paper: 18, metal: 12 },
  muslim_area: { organic: 62, plastic: 18, paper: 12, metal: 8 },
};

/**
 * Generate weekly comparison data for charts (council-wide)
 */
export function generateWeeklyComparison(prediction) {
  if (!prediction) return [];
  const { totalWet = 0, totalDry = 0 } = prediction;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Daily distribution factors (weekends slightly higher)
  const factors = [0.13, 0.12, 0.14, 0.13, 0.15, 0.17, 0.16];

  return days.map((day, i) => ({
    day,
    wet: Math.round(totalWet * factors[i] * 100) / 100,
    dry: Math.round(totalDry * factors[i] * 100) / 100,
    previousWet: Math.round(totalWet * factors[i] * 0.92 * 100) / 100,
    previousDry: Math.round(totalDry * factors[i] * 0.95 * 100) / 100,
  }));
}
