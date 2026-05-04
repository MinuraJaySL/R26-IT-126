// =========================================
// Mock Data for Smart Waste Management System
// =========================================

// Dashboard summary cards
export const dashboardSummary = {
  totalWastePredicted: 2847,
  wetWaste: 1623,
  dryWaste: 1224,
  activeZones: 24,
  overflowAlerts: 7,
};

// Monthly waste trend (12 months)
export const monthlyWasteTrend = [
  { month: 'Jan', wet: 1200, dry: 890, total: 2090 },
  { month: 'Feb', wet: 1150, dry: 870, total: 2020 },
  { month: 'Mar', wet: 1300, dry: 920, total: 2220 },
  { month: 'Apr', wet: 1450, dry: 980, total: 2430 },
  { month: 'May', wet: 1520, dry: 1050, total: 2570 },
  { month: 'Jun', wet: 1680, dry: 1120, total: 2800 },
  { month: 'Jul', wet: 1750, dry: 1180, total: 2930 },
  { month: 'Aug', wet: 1620, dry: 1100, total: 2720 },
  { month: 'Sep', wet: 1480, dry: 1020, total: 2500 },
  { month: 'Oct', wet: 1560, dry: 1080, total: 2640 },
  { month: 'Nov', wet: 1600, dry: 1150, total: 2750 },
  { month: 'Dec', wet: 1700, dry: 1250, total: 2950 },
];

// Weekly waste trend
export const weeklyWasteTrend = [
  { day: 'Mon', wet: 245, dry: 180 },
  { day: 'Tue', wet: 230, dry: 175 },
  { day: 'Wed', wet: 260, dry: 190 },
  { day: 'Thu', wet: 240, dry: 185 },
  { day: 'Fri', wet: 280, dry: 210 },
  { day: 'Sat', wet: 310, dry: 240 },
  { day: 'Sun', wet: 295, dry: 220 },
];

// Recent activities
export const recentActivities = [
  { id: 1, action: 'Prediction completed', zone: 'Zone A - Residential', time: '2 min ago', status: 'success' },
  { id: 2, action: 'Overflow alert triggered', zone: 'Zone C - Market', time: '15 min ago', status: 'warning' },
  { id: 3, action: 'Collection route optimized', zone: 'Zone B - Commercial', time: '32 min ago', status: 'info' },
  { id: 4, action: 'Sensor data updated', zone: 'Zone D - School', time: '1 hr ago', status: 'success' },
  { id: 5, action: 'Model retrained', zone: 'System', time: '2 hrs ago', status: 'info' },
  { id: 6, action: 'High fill level detected', zone: 'Zone E - Tourist Area', time: '3 hrs ago', status: 'warning' },
];

// System status
export const systemStatus = {
  modelAccuracy: 94.2,
  apiUptime: 99.8,
  sensorsOnline: 47,
  sensorsTotal: 50,
  lastModelUpdate: '2026-05-04',
  processingSpeed: 1.2,
};

// Environmental sensing data (Component 1)
export const sensorData = [
  { id: 1, name: 'Fill Level', value: 72, unit: '%', status: 'normal', icon: 'gauge', color: '#10b981' },
  { id: 2, name: 'Gas Detection', value: 45, unit: 'ppm', status: 'normal', icon: 'wind', color: '#06b6d4' },
  { id: 3, name: 'Temperature', value: 32.5, unit: '°C', status: 'warning', icon: 'thermometer', color: '#f59e0b' },
  { id: 4, name: 'Humidity', value: 68, unit: '%', status: 'normal', icon: 'droplets', color: '#8b5cf6' },
];

export const sensorHistory = [
  { time: '00:00', fill: 20, gas: 30, temp: 28, humidity: 65 },
  { time: '04:00', fill: 25, gas: 32, temp: 26, humidity: 70 },
  { time: '08:00', fill: 40, gas: 38, temp: 30, humidity: 68 },
  { time: '12:00', fill: 55, gas: 42, temp: 34, humidity: 62 },
  { time: '16:00', fill: 65, gas: 45, temp: 33, humidity: 64 },
  { time: '20:00', fill: 72, gas: 43, temp: 30, humidity: 67 },
];

// Fill level monitoring data (Component 2)
export const binOccupancy = [
  { id: 'BIN-001', location: 'Zone A - Main Street', fillLevel: 85, status: 'critical', lastCollected: '6 hrs ago', type: 'wet' },
  { id: 'BIN-002', location: 'Zone A - Park Avenue', fillLevel: 45, status: 'normal', lastCollected: '2 hrs ago', type: 'dry' },
  { id: 'BIN-003', location: 'Zone B - Market Road', fillLevel: 92, status: 'overflow', lastCollected: '8 hrs ago', type: 'wet' },
  { id: 'BIN-004', location: 'Zone B - Temple Street', fillLevel: 30, status: 'normal', lastCollected: '1 hr ago', type: 'dry' },
  { id: 'BIN-005', location: 'Zone C - School Lane', fillLevel: 67, status: 'warning', lastCollected: '4 hrs ago', type: 'wet' },
  { id: 'BIN-006', location: 'Zone C - Hospital Road', fillLevel: 78, status: 'warning', lastCollected: '5 hrs ago', type: 'dry' },
  { id: 'BIN-007', location: 'Zone D - Beach Road', fillLevel: 55, status: 'normal', lastCollected: '3 hrs ago', type: 'wet' },
  { id: 'BIN-008', location: 'Zone D - Hotel Lane', fillLevel: 88, status: 'critical', lastCollected: '7 hrs ago', type: 'dry' },
];

export const overflowAlerts = [
  { id: 1, bin: 'BIN-003', location: 'Zone B - Market Road', time: '15 min ago', severity: 'high' },
  { id: 2, bin: 'BIN-001', location: 'Zone A - Main Street', time: '45 min ago', severity: 'medium' },
  { id: 3, bin: 'BIN-008', location: 'Zone D - Hotel Lane', time: '1 hr ago', severity: 'high' },
];

// Prediction history (Component 3)
export const predictionHistory = [
  { id: 1, date: '2026-05-04', zone: 'residential', wetWaste: 12.4, dryWaste: 8.6, confidence: 94, status: 'verified' },
  { id: 2, date: '2026-05-03', zone: 'market', wetWaste: 18.7, dryWaste: 11.2, confidence: 91, status: 'verified' },
  { id: 3, date: '2026-05-03', zone: 'school', wetWaste: 5.2, dryWaste: 4.8, confidence: 88, status: 'pending' },
  { id: 4, date: '2026-05-02', zone: 'office', wetWaste: 3.8, dryWaste: 6.1, confidence: 92, status: 'verified' },
  { id: 5, date: '2026-05-02', zone: 'tourist_area', wetWaste: 15.3, dryWaste: 13.7, confidence: 87, status: 'verified' },
  { id: 6, date: '2026-05-01', zone: 'residential', wetWaste: 11.8, dryWaste: 8.2, confidence: 93, status: 'verified' },
  { id: 7, date: '2026-05-01', zone: 'market', wetWaste: 19.1, dryWaste: 12.0, confidence: 90, status: 'verified' },
  { id: 8, date: '2026-04-30', zone: 'school', wetWaste: 4.9, dryWaste: 4.5, confidence: 89, status: 'verified' },
  { id: 9, date: '2026-04-30', zone: 'tourist_area', wetWaste: 16.1, dryWaste: 14.2, confidence: 86, status: 'pending' },
  { id: 10, date: '2026-04-29', zone: 'office', wetWaste: 4.0, dryWaste: 6.4, confidence: 91, status: 'verified' },
];

// Zone-based analytics
export const zoneAnalytics = [
  { zone: 'Residential', wet: 12.4, dry: 8.6, total: 21.0 },
  { zone: 'Market', wet: 18.7, dry: 11.2, total: 29.9 },
  { zone: 'School', wet: 5.2, dry: 4.8, total: 10.0 },
  { zone: 'Office', wet: 3.8, dry: 6.1, total: 9.9 },
  { zone: 'Tourist', wet: 15.3, dry: 13.7, total: 29.0 },
];

// Seasonal variation
export const seasonalData = [
  { month: 'Jan', residential: 11.2, market: 17.5, school: 4.8, office: 3.5, tourist: 8.2 },
  { month: 'Feb', residential: 10.8, market: 16.8, school: 4.5, office: 3.4, tourist: 7.5 },
  { month: 'Mar', residential: 11.5, market: 18.2, school: 5.0, office: 3.6, tourist: 9.8 },
  { month: 'Apr', residential: 12.0, market: 19.5, school: 5.2, office: 3.8, tourist: 12.5 },
  { month: 'May', residential: 12.8, market: 20.1, school: 5.5, office: 4.0, tourist: 15.2 },
  { month: 'Jun', residential: 13.5, market: 21.0, school: 3.2, office: 3.9, tourist: 18.5 },
  { month: 'Jul', residential: 14.0, market: 22.5, school: 2.8, office: 3.7, tourist: 20.1 },
  { month: 'Aug', residential: 13.8, market: 21.8, school: 3.0, office: 3.8, tourist: 19.5 },
  { month: 'Sep', residential: 12.5, market: 19.0, school: 5.0, office: 3.9, tourist: 14.8 },
  { month: 'Oct', residential: 12.0, market: 18.5, school: 5.2, office: 4.0, tourist: 12.0 },
  { month: 'Nov', residential: 12.3, market: 19.2, school: 5.3, office: 4.1, tourist: 10.5 },
  { month: 'Dec', residential: 13.0, market: 22.0, school: 4.0, office: 3.5, tourist: 16.8 },
];

// Route optimization data (Component 4)
export const truckData = [
  { id: 'TRK-001', driver: 'Driver A', status: 'active', route: 'Route 1', progress: 65, fuelLevel: 72, bins: 12 },
  { id: 'TRK-002', driver: 'Driver B', status: 'active', route: 'Route 2', progress: 40, fuelLevel: 85, bins: 8 },
  { id: 'TRK-003', driver: 'Driver C', status: 'idle', route: 'Route 3', progress: 0, fuelLevel: 95, bins: 0 },
  { id: 'TRK-004', driver: 'Driver D', status: 'active', route: 'Route 4', progress: 88, fuelLevel: 45, bins: 15 },
];

export const routeStats = {
  totalRoutes: 8,
  activeRoutes: 5,
  fuelSaved: 23,
  timeSaved: 18,
  distanceOptimized: 156,
};

// Smart insights
export const smartInsights = [
  {
    id: 1,
    title: 'Waste Generation Trend Increasing',
    description: 'Overall waste generation has increased by 12% compared to last month. Market zones are the primary contributor.',
    type: 'trend',
    severity: 'warning',
    metric: '+12%',
  },
  {
    id: 2,
    title: 'Market Zones Produce Highest Wet Waste',
    description: 'Market areas consistently generate 35% more wet waste than other zones due to food waste and organic materials.',
    type: 'zone',
    severity: 'info',
    metric: '35%',
  },
  {
    id: 3,
    title: 'Tourist Areas Generate More Dry Waste',
    description: 'Tourist zones show a 28% higher dry waste ratio compared to residential areas, primarily from packaging materials.',
    type: 'composition',
    severity: 'info',
    metric: '28%',
  },
  {
    id: 4,
    title: 'Holiday Season Impact Detected',
    description: 'Upcoming holiday period is expected to increase waste generation by 25-30% across all zones.',
    type: 'prediction',
    severity: 'critical',
    metric: '+30%',
  },
  {
    id: 5,
    title: 'Composting Efficiency Below Target',
    description: 'Current organic waste composting rate is at 62%, below the 75% target. Recommend increasing processing capacity.',
    type: 'efficiency',
    severity: 'warning',
    metric: '62%',
  },
  {
    id: 6,
    title: 'Recycling Rate Improving',
    description: 'Dry waste recycling rate has improved by 8% this quarter due to better sorting at source.',
    type: 'positive',
    severity: 'success',
    metric: '+8%',
  },
];
