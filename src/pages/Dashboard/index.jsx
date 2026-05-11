import { motion } from 'framer-motion';
import {
  BarChart3, Droplets, Package, MapPin, AlertTriangle,
  Activity, Cpu, Database, Wifi, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import StatCard from '../../components/ui/StatCard';
import ChartCard from '../../components/ui/ChartCard';
import AnimatedCard from '../../components/ui/AnimatedCard';
import Badge from '../../components/ui/Badge';
import {
  dashboardSummary, monthlyWasteTrend, recentActivities, systemStatus,
} from '../../data/mockData';
import { useTheme } from '../../context/ThemeContext';

export default function Dashboard() {
  const { isDark } = useTheme();

  const summaryCards = [
    { title: 'Total Waste Predicted', value: dashboardSummary.totalWastePredicted, unit: 'tons', icon: BarChart3, color: '#10b981', trend: 'up', trendValue: '+5.2% this week' },
    { title: 'Wet Waste', value: dashboardSummary.wetWaste, unit: 'tons', icon: Droplets, color: '#06b6d4', trend: 'up', trendValue: '+3.8%' },
    { title: 'Dry Waste', value: dashboardSummary.dryWaste, unit: 'tons', icon: Package, color: '#8b5cf6', trend: 'down', trendValue: '-1.2%' },
    { title: 'Active Zones', value: dashboardSummary.activeZones, icon: MapPin, color: '#f59e0b', trend: 'up', trendValue: '+2 zones' },
    { title: 'Overflow Alerts', value: dashboardSummary.overflowAlerts, icon: AlertTriangle, color: '#ef4444', trend: 'down', trendValue: '-3 today' },
  ];

  const statusColor = (val, threshold) => val > threshold ? '#10b981' : '#f59e0b';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
      >
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Dashboard Overview
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Real-time smart waste management analytics and monitoring
        </p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card, i) => (
          <StatCard key={card.title} {...card} delay={i * 0.1} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Waste Trend Chart */}
        <ChartCard
          title="Waste Generation Trend"
          subtitle="Monthly overview (tons)"
          delay={0.3}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyWasteTrend}>
              <defs>
                <linearGradient id="wetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey="month" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
              <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
              />
              <Area type="monotone" dataKey="wet" stroke="#06b6d4" fill="url(#wetGradient)" strokeWidth={2} name="Wet Waste" />
              <Area type="monotone" dataKey="dry" stroke="#8b5cf6" fill="url(#dryGradient)" strokeWidth={2} name="Dry Waste" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Recent Activity */}
        <AnimatedCard delay={0.4} hover={false}>
          <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recentActivities.map((activity, i) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-start gap-3 rounded-xl p-3"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  activity.status === 'success' ? 'bg-emerald-500' :
                  activity.status === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {activity.action}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {activity.zone} • {activity.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* System Status */}
        <AnimatedCard delay={0.5} hover={false}>
          <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            System Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} style={{ color: '#10b981' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Model Accuracy</span>
              </div>
              <span className="text-sm font-bold" style={{ color: statusColor(systemStatus.modelAccuracy, 90) }}>
                {systemStatus.modelAccuracy}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} style={{ color: '#06b6d4' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>API Uptime</span>
              </div>
              <span className="text-sm font-bold" style={{ color: statusColor(systemStatus.apiUptime, 99) }}>
                {systemStatus.apiUptime}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi size={16} style={{ color: '#8b5cf6' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sensors Online</span>
              </div>
              <span className="text-sm font-bold" style={{ color: statusColor(systemStatus.sensorsOnline / systemStatus.sensorsTotal * 100, 90) }}>
                {systemStatus.sensorsOnline}/{systemStatus.sensorsTotal}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={16} style={{ color: '#f59e0b' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Processing Speed</span>
              </div>
              <span className="text-sm font-bold" style={{ color: '#10b981' }}>
                {systemStatus.processingSpeed}s
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} style={{ color: '#10b981' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Last Model Update</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {systemStatus.lastModelUpdate}
              </span>
            </div>
          </div>
        </AnimatedCard>

        {/* Map placeholder */}
        {/* <AnimatedCard delay={0.6} hover={false} className="relative overflow-hidden">
          <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Zone Map
          </h3>
          <div
            className="flex h-48 items-center justify-center rounded-xl"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #1e3a5f 0%, #0f2b46 50%, #1a3352 100%)'
                : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)',
            }}
          >
            <div className="text-center">
              <MapPin size={36} className="mx-auto mb-2" style={{ color: isDark ? '#34d399' : '#059669' }} />
              <p className="text-sm font-medium" style={{ color: isDark ? '#a7f3d0' : '#065f46' }}>
                {dashboardSummary.activeZones} Active Zones
              </p>
              <p className="text-xs" style={{ color: isDark ? '#6ee7b7' : '#047857' }}>
                Municipal Area Coverage
              </p>
            </div>
          </div> */}
          {/* Decorative dots for map effect */}
          {/* {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-2 w-2 rounded-full bg-primary-500"
              style={{
                top: `${30 + Math.random() * 50}%`,
                left: `${10 + Math.random() * 80}%`,
                opacity: 0.6,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </AnimatedCard> */}

        {/* Smart Analytics */}
        <ChartCard
          title="Weekly Distribution"
          subtitle="Waste by day of week"
          delay={0.7}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { day: 'Mon', wet: 245, dry: 180 },
              { day: 'Tue', wet: 230, dry: 175 },
              { day: 'Wed', wet: 260, dry: 190 },
              { day: 'Thu', wet: 240, dry: 185 },
              { day: 'Fri', wet: 280, dry: 210 },
              { day: 'Sat', wet: 310, dry: 240 },
              { day: 'Sun', wet: 295, dry: 220 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey="day" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
              <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
              />
              <Bar dataKey="wet" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Wet Waste" />
              <Bar dataKey="dry" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Dry Waste" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
