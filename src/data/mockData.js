// =========================================
// Mock Data for Smart Waste Management System
// =========================================

// Dashboard summary cards
export const dashboardSummary = {
  totalWastePredicted: 274,
  wetWaste: 158,
  dryWaste: 116,
  activeZones: 12,
  overflowAlerts: 3,
};

// Monthly waste trend (12 months)
export const monthlyWasteTrend = [
  { month: 'Jan', wet: 142, dry: 105, total: 247 },
  { month: 'Feb', wet: 136, dry: 100, total: 236 },
  { month: 'Mar', wet: 150, dry: 108, total: 258 },
  { month: 'Apr', wet: 162, dry: 114, total: 276 },
  { month: 'May', wet: 168, dry: 120, total: 288 },
  { month: 'Jun', wet: 178, dry: 126, total: 304 },
  { month: 'Jul', wet: 185, dry: 130, total: 315 },
  { month: 'Aug', wet: 175, dry: 125, total: 300 },
  { month: 'Sep', wet: 165, dry: 118, total: 283 },
  { month: 'Oct', wet: 170, dry: 122, total: 292 },
  { month: 'Nov', wet: 174, dry: 128, total: 302 },
  { month: 'Dec', wet: 182, dry: 135, total: 317 },
];

// Weekly waste trend
export const weeklyWasteTrend = [
  { day: 'Mon', wet: 5.2, dry: 3.6 },
  { day: 'Tue', wet: 4.8, dry: 3.4 },
  { day: 'Wed', wet: 5.5, dry: 3.8 },
  { day: 'Thu', wet: 5.0, dry: 3.5 },
  { day: 'Fri', wet: 5.8, dry: 4.0 },
  { day: 'Sat', wet: 6.2, dry: 4.5 },
  { day: 'Sun', wet: 5.9, dry: 4.2 },
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

// Prediction history (Component 3) — Municipal Council level
export const predictionHistory = [
  { id: 1, date: '2026-05-04', scope: 'Municipal Council', zoneTypes: 5, totalZones: 12, wetWaste: 5.6, dryWaste: 3.8, confidence: 92, status: 'verified' },
  { id: 2, date: '2026-05-03', scope: 'Municipal Council', zoneTypes: 5, totalZones: 12, wetWaste: 5.3, dryWaste: 3.5, confidence: 91, status: 'verified' },
  { id: 3, date: '2026-05-02', scope: 'Municipal Council', zoneTypes: 5, totalZones: 12, wetWaste: 5.8, dryWaste: 4.0, confidence: 90, status: 'verified' },
  { id: 4, date: '2026-05-01', scope: 'Municipal Council', zoneTypes: 5, totalZones: 12, wetWaste: 5.1, dryWaste: 3.4, confidence: 93, status: 'verified' },
  { id: 5, date: '2026-04-30', scope: 'Municipal Council', zoneTypes: 5, totalZones: 12, wetWaste: 6.0, dryWaste: 4.2, confidence: 88, status: 'pending' },
  { id: 6, date: '2026-04-29', scope: 'Municipal Council', zoneTypes: 5, totalZones: 12, wetWaste: 5.4, dryWaste: 3.7, confidence: 91, status: 'verified' },
  { id: 7, date: '2026-04-28', scope: 'Municipal Council', zoneTypes: 5, totalZones: 12, wetWaste: 5.7, dryWaste: 3.9, confidence: 90, status: 'verified' },
  { id: 8, date: '2026-04-27', scope: 'Municipal Council', zoneTypes: 4, totalZones: 10, wetWaste: 4.8, dryWaste: 3.2, confidence: 89, status: 'verified' },
  { id: 9, date: '2026-04-26', scope: 'Municipal Council', zoneTypes: 5, totalZones: 12, wetWaste: 5.5, dryWaste: 3.8, confidence: 87, status: 'pending' },
  { id: 10, date: '2026-04-25', scope: 'Municipal Council', zoneTypes: 5, totalZones: 12, wetWaste: 5.2, dryWaste: 3.6, confidence: 92, status: 'verified' },
];

// Zone-based analytics
export const zoneAnalytics = [
  { zone: 'Residential', wet: 2.35, dry: 1.65, total: 4.00 },
  { zone: 'Market', wet: 1.57, dry: 0.83, total: 2.40 },
  { zone: 'School', wet: 0.52, dry: 0.43, total: 0.95 },
  { zone: 'Office', wet: 0.39, dry: 0.57, total: 0.96 },
  { zone: 'Tourist', wet: 0.75, dry: 0.63, total: 1.38 },
];

// Seasonal variation
export const seasonalData = [
  { month: 'Jan', residential: 3.6, market: 2.1, school: 0.85, office: 0.88, tourist: 0.95 },
  { month: 'Feb', residential: 3.5, market: 2.0, school: 0.80, office: 0.85, tourist: 0.88 },
  { month: 'Mar', residential: 3.7, market: 2.2, school: 0.88, office: 0.90, tourist: 1.05 },
  { month: 'Apr', residential: 3.9, market: 2.3, school: 0.92, office: 0.95, tourist: 1.20 },
  { month: 'May', residential: 4.0, market: 2.4, school: 0.95, office: 0.98, tourist: 1.35 },
  { month: 'Jun', residential: 4.2, market: 2.5, school: 0.55, office: 0.96, tourist: 1.55 },
  { month: 'Jul', residential: 4.3, market: 2.6, school: 0.48, office: 0.92, tourist: 1.65 },
  { month: 'Aug', residential: 4.2, market: 2.5, school: 0.52, office: 0.94, tourist: 1.60 },
  { month: 'Sep', residential: 3.9, market: 2.3, school: 0.88, office: 0.96, tourist: 1.30 },
  { month: 'Oct', residential: 3.8, market: 2.2, school: 0.90, office: 0.98, tourist: 1.15 },
  { month: 'Nov', residential: 3.8, market: 2.3, school: 0.92, office: 1.00, tourist: 1.05 },
  { month: 'Dec', residential: 4.0, market: 2.6, school: 0.70, office: 0.88, tourist: 1.45 },
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

