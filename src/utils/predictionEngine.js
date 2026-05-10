// =========================================
// Municipal Council Waste Prediction Engine
// Aggregates predictions across all zone types
// to forecast total council-wide waste generation
// =========================================

// Zone base waste generation rates (tons/day per zone)
const zoneBaseRates = {
  residential: { wet: 0.70, dry: 0.50 },
  market: { wet: 0.75, dry: 0.40 },
  school: { wet: 0.16, dry: 0.14 },
  office: { wet: 0.18, dry: 0.27 },
  tourist_area: { wet: 0.38, dry: 0.32 },
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

// Zone type labels for display
export const zoneTypeLabels = {
  residential: 'Residential',
  market: 'Market',
  school: 'School',
  office: 'Office',
  tourist_area: 'Tourist Area',
};

/**
 * Predict waste generation for a single zone type (internal helper)
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
 * Predict total municipal council waste by aggregating across all zone types
 * Each zone type contains an array of individual zones with their own parameters
 * @param {Object} inputs - Contains globalParams and zoneConfigs (arrays per zone type)
 * @returns {Object} - Municipal-level prediction with per-zone breakdown
 */
export function predictMunicipalWaste(inputs) {
  const { globalParams, zoneConfigs } = inputs;

  const zoneResults = {};
  let totalWet = 0;
  let totalDry = 0;
  let totalConfidence = 0;
  let zoneTypeCount = 0;

  // Run prediction for each zone type
  Object.entries(zoneConfigs).forEach(([zoneType, zones]) => {
    // zones is an array of individual zone objects
    if (!Array.isArray(zones) || zones.length === 0) return;

    let typeWet = 0;
    let typeWry = 0;
    let typeConfidence = 0;
    const individualResults = [];

    // Predict for each individual zone
    zones.forEach((zone) => {
      const zonePrediction = predictWaste({
        zoneType,
        rainfall: globalParams.rainfall,
        weekType: globalParams.weekType,
        month: globalParams.month,
        specialEvent: globalParams.specialEvent,
        populationDensity: zone.populationDensity,
        previousWet: zone.previousWet,
        previousDry: zone.previousDry,
      });

      typeWet += zonePrediction.wetWaste;
      typeWry += zonePrediction.dryWaste;
      typeConfidence += zonePrediction.confidence;

      individualResults.push({
        name: zone.name,
        ...zonePrediction,
      });
    });

    const avgTypeConfidence = typeConfidence / zones.length;

    zoneResults[zoneType] = {
      count: zones.length,
      scaledWet: Math.round(typeWet * 100) / 100,
      scaledDry: Math.round(typeWry * 100) / 100,
      scaledTotal: Math.round((typeWet + typeWry) * 100) / 100,
      confidence: Math.round(avgTypeConfidence * 10) / 10,
      zones: individualResults,
    };

    totalWet += typeWet;
    totalDry += typeWry;
    totalConfidence += avgTypeConfidence;
    zoneTypeCount++;
  });

  const avgConfidence = zoneTypeCount > 0 ? totalConfidence / zoneTypeCount : 0;
  const grandTotal = totalWet + totalDry;

  // Calculate zone contribution percentages
  Object.keys(zoneResults).forEach((zoneType) => {
    const z = zoneResults[zoneType];
    z.contributionPercent = grandTotal > 0 ? Math.round((z.scaledTotal / grandTotal) * 1000) / 10 : 0;
  });

  return {
    totalWet: Math.round(totalWet * 100) / 100,
    totalDry: Math.round(totalDry * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    confidence: Math.round(avgConfidence * 10) / 10,
    zoneResults,
    zoneCount: zoneTypeCount,
  };
}

/**
 * Estimate aggregated municipal composition from per-zone results
 */
export function estimateMunicipalComposition(zoneResults) {
  let totalOrganic = 0, totalPlastic = 0, totalPaper = 0, totalMetal = 0;
  let grandTotal = 0;

  Object.entries(zoneResults).forEach(([zoneType, result]) => {
    const zoneTotal = result.scaledWet + result.scaledDry;
    const comp = compositionByZone[zoneType] || compositionByZone.residential;

    totalOrganic += zoneTotal * (comp.organic / 100);
    totalPlastic += zoneTotal * (comp.plastic / 100);
    totalPaper += zoneTotal * (comp.paper / 100);
    totalMetal += zoneTotal * (comp.metal / 100);
    grandTotal += zoneTotal;
  });

  if (grandTotal === 0) return null;

  // Normalize to percentages
  const organicPct = Math.round((totalOrganic / grandTotal) * 1000) / 10;
  const plasticPct = Math.round((totalPlastic / grandTotal) * 1000) / 10;
  const paperPct = Math.round((totalPaper / grandTotal) * 1000) / 10;
  const metalPct = Math.round((100 - organicPct - plasticPct - paperPct) * 10) / 10;

  return {
    organic: { percentage: organicPct, weight: Math.round(totalOrganic * 100) / 100 },
    plastic: { percentage: plasticPct, weight: Math.round(totalPlastic * 100) / 100 },
    paper: { percentage: paperPct, weight: Math.round(totalPaper * 100) / 100 },
    metal: { percentage: metalPct, weight: Math.round(totalMetal * 100) / 100 },
    perZone: Object.fromEntries(
      Object.entries(zoneResults).map(([zoneType, result]) => {
        const zoneTotal = result.scaledWet + result.scaledDry;
        const comp = compositionByZone[zoneType] || compositionByZone.residential;
        return [zoneType, {
          organic: Math.round(zoneTotal * comp.organic / 100 * 100) / 100,
          plastic: Math.round(zoneTotal * comp.plastic / 100 * 100) / 100,
          paper: Math.round(zoneTotal * comp.paper / 100 * 100) / 100,
          metal: Math.round(zoneTotal * comp.metal / 100 * 100) / 100,
        }];
      })
    ),
  };
}

/**
 * Estimate waste composition based on zone type and wet/dry ratio (kept for compatibility)
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
 * Generate AI recommendations based on municipal council prediction results
 */
export function generateRecommendations(prediction) {
  const recommendations = [];
  const { totalWet, totalDry, grandTotal, zoneResults } = prediction;

  // High total waste — council level
  if (grandTotal > 10) {
    recommendations.push({
      id: 'high-waste',
      title: 'High Municipal Waste Generation Alert',
      description: `Predicted total council waste of ${grandTotal} tons exceeds normal threshold. Deploy additional collection vehicles across all zones.`,
      severity: 'critical',
      icon: 'alert-triangle',
      action: 'Deploy extra fleet',
    });
  }

  // High wet waste — council level
  if (totalWet > 5.5) {
    recommendations.push({
      id: 'compost',
      title: 'Scale Up Composting Facilities',
      description: `Council-wide wet waste predicted at ${totalWet} tons. Increase composting facility capacity to handle the organic load.`,
      severity: 'warning',
      icon: 'leaf',
      action: 'Expand composting',
    });
  }

  // High dry waste — council level
  if (totalDry > 4) {
    recommendations.push({
      id: 'sorting',
      title: 'Increase Recycling Capacity',
      description: `Dry waste predicted at ${totalDry} tons across the council. Allocate more sorting workers and expand recycling centers.`,
      severity: 'warning',
      icon: 'users',
      action: 'Scale recycling',
    });
  }

  // Find highest contributing zone
  if (zoneResults) {
    let maxZone = null;
    let maxTotal = 0;
    Object.entries(zoneResults).forEach(([zoneType, result]) => {
      if (result.scaledTotal > maxTotal) {
        maxTotal = result.scaledTotal;
        maxZone = zoneType;
      }
    });

    if (maxZone) {
      const label = zoneTypeLabels[maxZone] || maxZone;
      const pct = zoneResults[maxZone].contributionPercent;
      recommendations.push({
        id: 'top-zone',
        title: `${label} Zones — Highest Contributor`,
        description: `${label} zones contribute ${pct}% (${maxTotal} tons) of total municipal waste. Prioritize collection and processing resources for these areas.`,
        severity: 'info',
        icon: 'trending-up',
        action: 'Prioritize resources',
      });
    }
  }

  // Transport recommendation
  if (grandTotal > 7) {
    const vehiclesNeeded = Math.ceil(grandTotal / 3);
    recommendations.push({
      id: 'transport',
      title: 'Fleet Deployment Plan',
      description: `High predicted waste volume requires approximately ${vehiclesNeeded} collection vehicles across the council. Schedule routes accordingly.`,
      severity: 'warning',
      icon: 'truck',
      action: 'Schedule fleet',
    });
  }

  // Market zone specific
  if (zoneResults?.market && zoneResults.market.scaledTotal > 2) {
    recommendations.push({
      id: 'market-organic',
      title: 'Market Zone Organic Management',
      description: `Market zones generating ${zoneResults.market.scaledTotal} tons. Ensure bio-waste bins are available at all vendor locations across all market areas.`,
      severity: 'info',
      icon: 'store',
      action: 'Deploy bio-bins',
    });
  }

  // Tourist zone specific
  if (zoneResults?.tourist_area && zoneResults.tourist_area.scaledTotal > 1.2) {
    recommendations.push({
      id: 'tourist-recycling',
      title: 'Tourist Area Recycling Initiative',
      description: `Tourist zones producing ${zoneResults.tourist_area.scaledTotal} tons of waste. Deploy clearly labeled recycling stations in high-traffic tourist areas.`,
      severity: 'info',
      icon: 'recycle',
      action: 'Deploy recycling bins',
    });
  }

  // Positive — low waste
  if (grandTotal < 7) {
    recommendations.push({
      id: 'low-waste',
      title: 'Optimal Council Waste Levels',
      description: 'Predicted municipal waste levels are within optimal range. Standard collection schedule is sufficient across all zones.',
      severity: 'success',
      icon: 'check-circle',
      action: 'No action needed',
    });
  }

  return recommendations;
}

/**
 * Generate weekly comparison data for charts (council-wide)
 */
export function generateWeeklyComparison(prediction) {
  const { totalWet, totalDry } = prediction;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Daily distribution factors (weekends higher)
  const factors = [0.13, 0.12, 0.14, 0.13, 0.15, 0.17, 0.16];

  return days.map((day, i) => ({
    day,
    wet: Math.round(totalWet * factors[i] * 100) / 100,
    dry: Math.round(totalDry * factors[i] * 100) / 100,
    previousWet: Math.round(totalWet * factors[i] * 0.92 * 100) / 100,
    previousDry: Math.round(totalDry * factors[i] * 0.95 * 100) / 100,
  }));
}
