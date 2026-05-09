// =========================================
// Mock Prediction Engine
// Rule-based waste prediction & composition estimation
// =========================================

// Zone base waste generation rates (tons/day)
const zoneBaseRates = {
  residential: { wet: 12.0, dry: 8.0 },
  market: { wet: 18.0, dry: 10.5 },
  school: { wet: 5.0, dry: 4.5 },
  office: { wet: 3.5, dry: 6.0 },
  tourist_area: { wet: 14.0, dry: 12.0 },
};

// Week type multipliers
const weekTypeMultipliers = {
  normal: 1.0,
  holiday: 1.25,
  festival: 1.45,
};

// Monthly seasonal factors (index 0 = Jan)
const monthlyFactors = [
  0.92, 0.88, 0.95, 1.0, 1.05, 1.12, 1.15, 1.10, 1.02, 0.98, 1.0, 1.18,
];

// Population density multipliers
const populationDensityMultipliers = {
  low: 0.75,
  medium: 1.0,
  high: 1.3,
  very_high: 1.55,
};

// Composition percentages by zone type
const compositionByZone = {
  residential: { organic: 62, plastic: 18, paper: 12, metal: 8 },
  market: { organic: 72, plastic: 14, paper: 8, metal: 6 },
  school: { organic: 45, plastic: 20, paper: 28, metal: 7 },
  office: { organic: 25, plastic: 15, paper: 48, metal: 12 },
  tourist_area: { organic: 40, plastic: 30, paper: 18, metal: 12 },
};

/**
 * Predict waste generation based on input parameters
 */
export function predictWaste(inputs) {
  const {
    zoneType = 'residential',
    rainfall = 0,
    populationDensity = 'medium',
    weekType = 'normal',
    month = 1,
    specialEvent = false,
    previousWet = 0,
    previousDry = 0,
  } = inputs;

  const baseRate = zoneBaseRates[zoneType] || zoneBaseRates.residential;
  const weekMultiplier = weekTypeMultipliers[weekType] || 1.0;
  const monthFactor = monthlyFactors[month - 1] || 1.0;
  const popMultiplier = populationDensityMultipliers[populationDensity] || 1.0;

  // Rainfall effect: increases wet waste, slightly decreases dry waste collection
  const rainfallWetFactor = 1 + (rainfall / 100) * 0.15;
  const rainfallDryFactor = 1 - (rainfall / 100) * 0.05;

  // Special event adds 15-20% more waste
  const eventMultiplier = specialEvent ? 1.18 : 1.0;

  // Historical autocorrelation (30% weight from previous values)
  const autoWeight = 0.3;
  const baseWeight = 0.7;

  let predictedWet = baseRate.wet * weekMultiplier * monthFactor * popMultiplier * rainfallWetFactor * eventMultiplier;
  let predictedDry = baseRate.dry * weekMultiplier * monthFactor * popMultiplier * rainfallDryFactor * eventMultiplier;

  // Blend with previous values if available
  if (previousWet > 0) {
    predictedWet = predictedWet * baseWeight + previousWet * autoWeight;
  }
  if (previousDry > 0) {
    predictedDry = predictedDry * baseWeight + previousDry * autoWeight;
  }

  // Add slight randomness for realism (±3%)
  const noise = () => 0.97 + Math.random() * 0.06;
  predictedWet *= noise();
  predictedDry *= noise();

  // Confidence score based on input completeness
  let confidence = 85;
  if (previousWet > 0 && previousDry > 0) confidence += 5;
  if (populationDensity !== 'medium') confidence += 2;
  if (rainfall > 0) confidence += 3;
  confidence = Math.min(confidence, 97);

  // Trend compared to previous
  const wetTrend = previousWet > 0 ? ((predictedWet - previousWet) / previousWet * 100) : 0;
  const dryTrend = previousDry > 0 ? ((predictedDry - previousDry) / previousDry * 100) : 0;

  return {
    wetWaste: Math.round(predictedWet * 100) / 100,
    dryWaste: Math.round(predictedDry * 100) / 100,
    totalWaste: Math.round((predictedWet + predictedDry) * 100) / 100,
    confidence: Math.round(confidence * 10) / 10,
    wetTrend: Math.round(wetTrend * 10) / 10,
    dryTrend: Math.round(dryTrend * 10) / 10,
  };
}

/**
 * Estimate waste composition based on zone type and wet/dry ratio
 */
export function estimateComposition(zoneType, wetWaste, dryWaste) {
  const baseComposition = compositionByZone[zoneType] || compositionByZone.residential;
  const total = wetWaste + dryWaste;
  const wetRatio = wetWaste / total;

  // Adjust composition based on wet/dry ratio
  const organicAdjust = wetRatio > 0.6 ? 1.1 : wetRatio > 0.4 ? 1.0 : 0.85;
  const plasticAdjust = wetRatio < 0.4 ? 1.15 : 1.0;
  const paperAdjust = wetRatio < 0.4 ? 1.1 : 0.95;
  const metalAdjust = 1.0;

  let organic = baseComposition.organic * organicAdjust;
  let plastic = baseComposition.plastic * plasticAdjust;
  let paper = baseComposition.paper * paperAdjust;
  let metal = baseComposition.metal * metalAdjust;

  // Normalize to 100%
  const sum = organic + plastic + paper + metal;
  organic = Math.round((organic / sum) * 1000) / 10;
  plastic = Math.round((plastic / sum) * 1000) / 10;
  paper = Math.round((paper / sum) * 1000) / 10;
  metal = Math.round((100 - organic - plastic - paper) * 10) / 10;

  return {
    organic: { percentage: organic, weight: Math.round(total * organic / 100 * 100) / 100 },
    plastic: { percentage: plastic, weight: Math.round(total * plastic / 100 * 100) / 100 },
    paper: { percentage: paper, weight: Math.round(total * paper / 100 * 100) / 100 },
    metal: { percentage: metal, weight: Math.round(total * metal / 100 * 100) / 100 },
  };
}

/**
 * Generate AI recommendations based on prediction results
 */
export function generateRecommendations(prediction, zoneType) {
  const recommendations = [];
  const { wetWaste, dryWaste, totalWaste, wetTrend, dryTrend } = prediction;

  // High total waste
  if (totalWaste > 25) {
    recommendations.push({
      id: 'high-waste',
      title: 'High Waste Generation Warning',
      description: `Predicted total waste of ${totalWaste} tons exceeds normal threshold. Consider deploying additional collection vehicles.`,
      severity: 'critical',
      icon: 'alert-triangle',
      action: 'Deploy extra vehicles',
    });
  }

  // High wet waste
  if (wetWaste > 15) {
    recommendations.push({
      id: 'compost',
      title: 'Increase Compost Processing',
      description: `High wet waste prediction (${wetWaste} tons). Increase composting facility capacity to handle the organic load.`,
      severity: 'warning',
      icon: 'leaf',
      action: 'Scale composting',
    });
  }

  // High dry waste
  if (dryWaste > 10) {
    recommendations.push({
      id: 'sorting',
      title: 'Allocate More Sorting Workers',
      description: `Dry waste predicted at ${dryWaste} tons. Additional sorting workers needed at the recycling facility.`,
      severity: 'warning',
      icon: 'users',
      action: 'Add sorting staff',
    });
  }

  // Increasing trend
  if (wetTrend > 10 || dryTrend > 10) {
    recommendations.push({
      id: 'trend-up',
      title: 'Upward Waste Trend Detected',
      description: `Waste generation is trending upward (${Math.max(wetTrend, dryTrend).toFixed(1)}%). Monitor closely and prepare for increased collection frequency.`,
      severity: 'info',
      icon: 'trending-up',
      action: 'Increase monitoring',
    });
  }

  // Transport recommendation
  if (totalWaste > 20) {
    recommendations.push({
      id: 'transport',
      title: 'Prepare Extra Transport Vehicles',
      description: `High predicted waste volume requires additional transport capacity. Schedule ${Math.ceil(totalWaste / 8)} vehicles for this zone.`,
      severity: 'warning',
      icon: 'truck',
      action: 'Schedule vehicles',
    });
  }

  // Zone-specific recommendations
  if (zoneType === 'market') {
    recommendations.push({
      id: 'market-organic',
      title: 'Market Zone Organic Management',
      description: 'Market zones generate high organic waste. Ensure bio-waste bins are available at all vendor locations.',
      severity: 'info',
      icon: 'store',
      action: 'Check bio-bins',
    });
  }

  if (zoneType === 'tourist_area') {
    recommendations.push({
      id: 'tourist-recycling',
      title: 'Tourist Area Recycling Initiative',
      description: 'Tourist zones produce significant packaging waste. Deploy clearly labeled recycling stations.',
      severity: 'info',
      icon: 'recycle',
      action: 'Deploy recycling bins',
    });
  }

  // Always add a positive recommendation
  if (totalWaste < 15) {
    recommendations.push({
      id: 'low-waste',
      title: 'Optimal Waste Levels',
      description: 'Predicted waste levels are within optimal range. Standard collection schedule is sufficient.',
      severity: 'success',
      icon: 'check-circle',
      action: 'No action needed',
    });
  }

  return recommendations;
}

/**
 * Generate weekly comparison data for charts
 */
export function generateWeeklyComparison(prediction) {
  const { wetWaste, dryWaste } = prediction;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Daily distribution factors (weekends higher)
  const factors = [0.13, 0.12, 0.14, 0.13, 0.15, 0.17, 0.16];

  return days.map((day, i) => ({
    day,
    wet: Math.round(wetWaste * factors[i] * 100) / 100,
    dry: Math.round(dryWaste * factors[i] * 100) / 100,
    previousWet: Math.round(wetWaste * factors[i] * 0.92 * 100) / 100,
    previousDry: Math.round(dryWaste * factors[i] * 0.95 * 100) / 100,
  }));
}
