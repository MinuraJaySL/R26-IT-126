import { motion } from 'framer-motion';
import { DollarSign, Leaf, Package, FileText, Wrench, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import AnimatedCard from '../../components/ui/AnimatedCard';
import ChartCard from '../../components/ui/ChartCard';
import ProgressBar from '../../components/ui/ProgressBar';
import { useTheme } from '../../context/ThemeContext';

// Revenue rates per ton (LKR) — based on Sri Lankan recycling market rates
const REVENUE_RATES = {
  organic: { rate: 10000, label: 'Compost Production', process: 'Composting', unit: 'LKR' },
  plastic: { rate: 35000, label: 'Plastic Recycling', process: 'Recycling', unit: 'LKR' },
  paper: { rate: 18000, label: 'Paper Recycling', process: 'Recycling', unit: 'LKR' },
  metal: { rate: 65000, label: 'Metal Recycling', process: 'Smelting & Recycling', unit: 'LKR' },
};

const COLORS = {
  organic: '#10b981',
  plastic: '#f59e0b',
  paper: '#3b82f6',
  metal: '#8b5cf6',
};

const LABELS = { organic: 'Organic', plastic: 'Plastic', paper: 'Paper', metal: 'Metal' };
const ICONS = { organic: Leaf, plastic: Package, paper: FileText, metal: Wrench };

function formatCurrency(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

export default function RevenueEstimation({ composition, prediction }) {
  const { isDark } = useTheme();

  if (!composition || !prediction) {
    return (
      <AnimatedCard className="flex flex-col items-center justify-center py-16 text-center">
        <DollarSign size={48} style={{ color: 'var(--text-muted)' }} />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No Revenue Data</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Generate a prediction first to see revenue estimation from recycling.</p>
      </AnimatedCard>
    );
  }

  // Calculate revenue for each waste category
  const revenueData = Object.entries(composition)
    .filter(([key]) => key !== 'perZone')
    .map(([key, val]) => {
      const rateInfo = REVENUE_RATES[key];
      const revenue = val.weight * rateInfo.rate;
      return {
        category: key,
        label: LABELS[key],
        weight: val.weight,
        percentage: val.percentage,
        ratePerTon: rateInfo.rate,
        revenue,
        process: rateInfo.process,
        processLabel: rateInfo.label,
        color: COLORS[key],
      };
    });

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalWeight = revenueData.reduce((sum, d) => sum + d.weight, 0);

  // Bar chart data
  const barData = revenueData.map((d) => ({
    name: d.label,
    Revenue: Math.round(d.revenue),
    Weight: d.weight,
    color: d.color,
  }));

  // Pie chart data for revenue share
  const pieData = revenueData.map((d) => ({
    name: d.label,
    value: Math.round((d.revenue / totalRevenue) * 1000) / 10,
    revenue: d.revenue,
    color: d.color,
  }));

  // Rate comparison data
  const rateData = revenueData.map((d) => ({
    name: d.label,
    'Rate (LKR/ton)': d.ratePerTon,
    color: d.color,
  }));

  const ts = {
    backgroundColor: isDark ? '#1e293b' : '#fff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: isDark ? '#f1f5f9' : '#0f172a',
  };
  const grid = isDark ? '#334155' : '#e2e8f0';
  const axis = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <AnimatedCard delay={0.1} hover={false} className="overflow-hidden" style={{ background: 'linear-gradient(135deg, #065f46, #047857, #059669)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <DollarSign size={24} />
            <div>
              <h3 className="text-lg font-bold">Revenue Estimation from Recycling</h3>
              <p className="text-sm text-white/80">Potential earnings from processing {prediction.grandTotal} tons of municipal waste</p>
            </div>
          </div>
          <div className="text-right">
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold"
            >
              LKR {formatCurrency(totalRevenue)}
            </motion.p>
            <p className="text-sm text-white/70">Total Estimated Revenue</p>
          </div>
        </div>
      </AnimatedCard>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {revenueData.map((d, i) => {
          const Icon = ICONS[d.category];
          const revPercent = totalRevenue > 0 ? Math.round((d.revenue / totalRevenue) * 1000) / 10 : 0;
          return (
            <AnimatedCard key={d.category} delay={0.15 + i * 0.08} className="relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${d.color}15` }}>
                  <Icon size={24} style={{ color: d.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{d.processLabel}</p>
                  <motion.p
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="text-xl font-bold"
                    style={{ color: d.color }}
                  >
                    LKR {formatCurrency(d.revenue)}
                  </motion.p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{d.weight} tons × LKR {d.ratePerTon.toLocaleString()}/ton</span>
                  <span className="font-bold" style={{ color: d.color }}>{revPercent}%</span>
                </div>
                <ProgressBar value={revPercent} color={d.color} height={6} delay={0.4 + i * 0.1} />
              </div>
              <div className="absolute bottom-0 left-0 h-1 w-full" style={{ background: `linear-gradient(90deg, ${d.color}, ${d.color}40)` }} />
            </AnimatedCard>
          );
        })}
      </div>

      {/* Charts Row
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"> */}
        {/* Revenue by Category Bar Chart */}
        {/* <ChartCard title="Revenue by Waste Category" subtitle="Estimated earnings from recycling each category (LKR)" delay={0.3}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="name" stroke={axis} fontSize={12} />
              <YAxis stroke={axis} fontSize={12} tickFormatter={(v) => `${formatCurrency(v)}`} />
              <Tooltip
                contentStyle={ts}
                formatter={(value) => [`LKR ${Number(value).toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="Revenue" radius={[8, 8, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard> */}

        {/* Revenue Share Pie Chart */}
        {/* <ChartCard title="Revenue Share Distribution" subtitle="Percentage contribution to total revenue" delay={0.4}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={4}
                dataKey="value"
                animationBegin={300}
                animationDuration={1000}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={ts}
                formatter={(value, name, props) => [`${value}% (LKR ${formatCurrency(props.payload.revenue)})`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div> */}

      {/* Rate Comparison & Breakdown Table */}
      <AnimatedCard delay={0.5} hover={false} className="overflow-x-auto">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Detailed Revenue Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {['Waste Category', 'Process', 'Weight (tons)', 'Rate (LKR/ton)', 'Estimated Revenue (LKR)', 'Share'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {revenueData.map((d, i) => {
              const Icon = ICONS[d.category];
              const revPercent = totalRevenue > 0 ? Math.round((d.revenue / totalRevenue) * 1000) / 10 : 0;
              return (
                <motion.tr
                  key={d.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                    <div className="flex items-center gap-2">
                      <Icon size={16} style={{ color: d.color }} />
                      {d.label}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{d.process}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: d.color }}>{d.weight}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>LKR {d.ratePerTon.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: d.color }}>LKR {Math.round(d.revenue).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
                        <div className="h-full rounded-full" style={{ width: `${revPercent}%`, backgroundColor: d.color }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: d.color }}>{revPercent}%</span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {/* Total Row */}
            <tr className="font-bold" style={{ borderTop: '2px solid var(--border-color)' }}>
              <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>Total</td>
              <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>—</td>
              <td className="px-4 py-3 text-emerald-500">{totalWeight.toFixed(2)}</td>
              <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>—</td>
              <td className="px-4 py-3 text-emerald-500">LKR {Math.round(totalRevenue).toLocaleString()}</td>
              <td className="px-4 py-3 text-emerald-500">100%</td>
            </tr>
          </tbody>
        </table>
      </AnimatedCard>
    </div>
  );
}
