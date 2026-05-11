import { motion } from 'framer-motion';
import { Route, Truck, Fuel, Clock, MapPin, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import StatCard from '../../components/ui/StatCard';
import AnimatedCard from '../../components/ui/AnimatedCard';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';
import { truckData, routeStats } from '../../data/mockData';
import { useTheme } from '../../context/ThemeContext';

const statusColors = { active: '#10b981', idle: '#94a3b8', maintenance: '#f59e0b' };

// Fix default marker icon issue in webpack/vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom colored marker creator
function createColoredIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 14px; height: 14px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px ${color}80;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

// Bin collection points (municipal council area — Moratuwa, Sri Lanka)
const binLocations = [
  { id: 'BIN-001', lat: 6.7736, lng: 79.8824, zone: 'Zone A - Residential', fill: 85, status: 'critical' },
  { id: 'BIN-002', lat: 6.7785, lng: 79.8810, zone: 'Zone A - Market', fill: 62, status: 'normal' },
  { id: 'BIN-003', lat: 6.7810, lng: 79.8860, zone: 'Zone B - School', fill: 45, status: 'normal' },
  { id: 'BIN-004', lat: 6.7695, lng: 79.8785, zone: 'Zone B - Residential', fill: 91, status: 'critical' },
  { id: 'BIN-005', lat: 6.7760, lng: 79.8905, zone: 'Zone C - Office', fill: 30, status: 'normal' },
  { id: 'BIN-006', lat: 6.7840, lng: 79.8780, zone: 'Zone C - Tourist', fill: 72, status: 'warning' },
  { id: 'BIN-007', lat: 6.7720, lng: 79.8850, zone: 'Zone D - Residential', fill: 55, status: 'normal' },
  { id: 'BIN-008', lat: 6.7870, lng: 79.8835, zone: 'Zone D - Market', fill: 88, status: 'critical' },
];

// Truck current positions
const truckPositions = [
  { id: 'TRK-001', lat: 6.7750, lng: 79.8830, driver: 'Kamal S.', status: 'active' },
  { id: 'TRK-002', lat: 6.7800, lng: 79.8800, driver: 'Nimal R.', status: 'active' },
  { id: 'TRK-003', lat: 6.7680, lng: 79.8770, driver: 'Saman P.', status: 'idle' },
];

// Optimized route paths
const routePaths = [
  {
    name: 'Route A',
    color: '#8b5cf6',
    path: [
      [6.7736, 79.8824], [6.7785, 79.8810], [6.7810, 79.8860], [6.7840, 79.8780],
    ],
  },
  {
    name: 'Route B',
    color: '#10b981',
    path: [
      [6.7695, 79.8785], [6.7720, 79.8850], [6.7760, 79.8905], [6.7870, 79.8835],
    ],
  },
];

const truckIcon = createColoredIcon('#3b82f6');

function getBinColor(status) {
  if (status === 'critical') return '#ef4444';
  if (status === 'warning') return '#f59e0b';
  return '#10b981';
}

export default function RouteOptimization() {
  const { isDark } = useTheme();

  // Map center (Moratuwa area)
  const center = [6.7770, 79.8825];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10"><Route size={22} className="text-violet-500" /></div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Predictive Analytics & Dynamic Routing</h1>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Routes" value={routeStats.totalRoutes} icon={Route} color="#8b5cf6" delay={0.1} />
        <StatCard title="Active Routes" value={routeStats.activeRoutes} icon={Navigation} color="#10b981" trend="up" trendValue="2 more today" delay={0.2} />
        <StatCard title="Fuel Saved" value={routeStats.fuelSaved} unit="%" icon={Fuel} color="#06b6d4" trend="up" trendValue="+5% efficiency" delay={0.3} />
        <StatCard title="Time Saved" value={routeStats.timeSaved} unit="%" icon={Clock} color="#f59e0b" trend="up" trendValue="+12 min avg" delay={0.4} />
      </div>

      {/* Live Route Map */}
      <AnimatedCard delay={0.5} hover={false} className="overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Route Map</h3>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Warning
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Normal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" /> Truck
            </span>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl" style={{ height: '420px' }}>
          <MapContainer
            center={center}
            zoom={15}
            scrollWheelZoom={true}
            attributionControl={false}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
          >
            <TileLayer
              url={isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
            />

            {/* Route polylines */}
            {routePaths.map((route) => (
              <Polyline
                key={route.name}
                positions={route.path}
                pathOptions={{ color: route.color, weight: 4, opacity: 0.8, dashArray: '8, 6' }}
              />
            ))}

            {/* Bin markers */}
            {binLocations.map((bin) => (
              <Marker key={bin.id} position={[bin.lat, bin.lng]} icon={createColoredIcon(getBinColor(bin.status))}>
                <Popup>
                  <div style={{ minWidth: '160px', fontFamily: 'system-ui' }}>
                    <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>{bin.id}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px' }}>{bin.zone}</p>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '4px 8px', borderRadius: '6px',
                      backgroundColor: getBinColor(bin.status) + '15',
                    }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: getBinColor(bin.status) }}>{bin.fill}% full</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Truck markers */}
            {truckPositions.map((truck) => (
              <Marker key={truck.id} position={[truck.lat, truck.lng]} icon={truckIcon}>
                <Popup>
                  <div style={{ minWidth: '140px', fontFamily: 'system-ui' }}>
                    <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>🚛 {truck.id}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0' }}>Driver: {truck.driver}</p>
                    <p style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, margin: '4px 0 0' }}>
                      {truck.status === 'active' ? '● Active' : '○ Idle'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{routeStats.distanceOptimized} km optimized today</span>
          <span>{binLocations.length} bins • {truckPositions.length} trucks • {routePaths.length} routes</span>
        </div>
      </AnimatedCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {truckData.map((truck, i) => (
          <AnimatedCard key={truck.id} delay={0.6 + i * 0.1}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${statusColors[truck.status]}20` }}>
                  <Truck size={20} style={{ color: statusColors[truck.status] }} />
                </div>
                <div>
                  <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{truck.id}</h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{truck.driver} • {truck.route}</p>
                </div>
              </div>
              <Badge variant={truck.status === 'active' ? 'success' : 'default'}>{truck.status}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <ProgressBar value={truck.progress} color="#8b5cf6" label="Route Progress" delay={0.7 + i * 0.1} />
              <ProgressBar value={truck.fuelLevel} color={truck.fuelLevel < 50 ? '#f59e0b' : '#10b981'} label="Fuel Level" delay={0.8 + i * 0.1} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Bins collected: {truck.bins}</span>
              <span>ETA: {truck.progress > 0 ? `${Math.round((100 - truck.progress) * 0.5)} min` : '—'}</span>
            </div>
          </AnimatedCard>
        ))}
      </div>
    </div>
  );
}
