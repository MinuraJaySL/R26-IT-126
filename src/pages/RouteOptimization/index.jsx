import { motion } from 'framer-motion';
import { Route, Truck, Fuel, Clock, MapPin, Navigation } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import AnimatedCard from '../../components/ui/AnimatedCard';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';
import { truckData, routeStats } from '../../data/mockData';
import { useTheme } from '../../context/ThemeContext';

const statusColors = { active: '#10b981', idle: '#94a3b8', maintenance: '#f59e0b' };

export default function RouteOptimization() {
  const { isDark } = useTheme();

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

      <AnimatedCard delay={0.5} hover={false} className="relative overflow-hidden">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Route Map</h3>
        <div className="flex h-64 items-center justify-center rounded-xl" style={{ background: isDark ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)' : 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 50%, #c4b5fd 100%)' }}>
          <div className="text-center">
            <MapPin size={48} className="mx-auto mb-3" style={{ color: isDark ? '#a78bfa' : '#7c3aed' }} />
            <p className="text-lg font-semibold" style={{ color: isDark ? '#c4b5fd' : '#5b21b6' }}>Dynamic Route Visualization</p>
            <p className="text-sm" style={{ color: isDark ? '#a78bfa' : '#7c3aed' }}>{routeStats.distanceOptimized} km optimized today</p>
          </div>
        </div>
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className="absolute h-3 w-3 rounded-full" style={{ backgroundColor: '#8b5cf6', top: `${25 + Math.random() * 50}%`, left: `${10 + Math.random() * 80}%` }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }} />
        ))}
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
