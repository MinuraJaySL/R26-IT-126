import { motion } from 'framer-motion';
import { PieChart as PieIcon, Leaf, Package, FileText, Wrench } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AnimatedCard from '../../components/ui/AnimatedCard';
import ProgressBar from '../../components/ui/ProgressBar';
import ChartCard from '../../components/ui/ChartCard';
import { useTheme } from '../../context/ThemeContext';
import { zoneTypeLabels } from '../../utils/predictionEngine';

const COLORS = { organic: '#10b981', plastic: '#f59e0b', paper: '#3b82f6', metal: '#8b5cf6' };
const ICONS = { organic: Leaf, plastic: Package, paper: FileText, metal: Wrench };
const LABELS = { organic: 'Organic', plastic: 'Plastic', paper: 'Paper', metal: 'Metal' };

export default function WasteComposition({ composition, prediction }) {
  const { isDark } = useTheme();

  if (!composition) {
    return (
      <AnimatedCard className="flex flex-col items-center justify-center py-16 text-center">
        <PieIcon size={48} style={{ color: 'var(--text-muted)' }} />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No Composition Data</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Generate a prediction first to see waste composition analysis.</p>
      </AnimatedCard>
    );
  }

  const pieData = Object.entries(composition)
    .filter(([key]) => key !== 'perZone')
    .map(([key, val]) => ({
      name: LABELS[key], value: val.percentage, weight: val.weight, color: COLORS[key],
    }));

  // Per-zone composition data for stacked bar chart
  const perZoneBarData = composition.perZone
    ? Object.entries(composition.perZone).map(([zoneType, comp]) => ({
        name: zoneTypeLabels[zoneType] || zoneType,
        Organic: comp.organic,
        Plastic: comp.plastic,
        Paper: comp.paper,
        Metal: comp.metal,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Donut Chart — Council-wide */}
        <AnimatedCard delay={0.1} hover={false}>
          <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Municipal Council Composition</h3>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Aggregated across all {prediction?.zoneCount || 0} zone types ({prediction?.grandTotal || 0} tons total)</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value"
                animationBegin={200} animationDuration={1000}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '12px', color: isDark ? '#f1f5f9' : '#0f172a' }}
                formatter={(value, name, props) => [`${value}% (${props.payload.weight} tons)`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
              </div>
            ))}
          </div>
        </AnimatedCard>

        {/* Progress Bars */}
        <AnimatedCard delay={0.2} hover={false}>
          <h3 className="mb-6 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Material Distribution</h3>
          <div className="space-y-6">
            {Object.entries(composition)
              .filter(([key]) => key !== 'perZone')
              .map(([key, val], i) => {
                const Icon = ICONS[key];
                return (
                  <div key={key}>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon size={18} style={{ color: COLORS[key] }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{LABELS[key]}</span>
                      <span className="ml-auto text-sm font-bold" style={{ color: COLORS[key] }}>{val.weight} tons</span>
                    </div>
                    <ProgressBar value={val.percentage} color={COLORS[key]} showValue={true} height={10} delay={0.3 + i * 0.15} />
                  </div>
                );
              })}
          </div>
        </AnimatedCard>
      </div>

      {/* Composition per Zone Type — Stacked Bar */}
      {/* {perZoneBarData.length > 0 && (
        <ChartCard title="Composition by Zone Type" subtitle="Material breakdown per zone type (tons)" delay={0.3}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={perZoneBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
              <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '12px', color: isDark ? '#f1f5f9' : '#0f172a' }} />
              <Legend />
              <Bar dataKey="Organic" stackId="a" fill={COLORS.organic} />
              <Bar dataKey="Plastic" stackId="a" fill={COLORS.plastic} />
              <Bar dataKey="Paper" stackId="a" fill={COLORS.paper} />
              <Bar dataKey="Metal" stackId="a" fill={COLORS.metal} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )} */}

      {/* Composition Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Object.entries(composition)
          .filter(([key]) => key !== 'perZone')
          .map(([key, val], i) => {
            const Icon = ICONS[key];
            return (
              <AnimatedCard key={key} delay={0.4 + i * 0.1}>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${COLORS[key]}15` }}>
                    <Icon size={28} style={{ color: COLORS[key] }} />
                  </div>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.1 }}
                    className="text-2xl font-bold" style={{ color: COLORS[key] }}>{val.percentage}%</motion.p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{LABELS[key]}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{val.weight} tons</p>
                </div>
              </AnimatedCard>
            );
          })}
      </div>
    </div>
  );
}
