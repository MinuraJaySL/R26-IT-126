import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ChartCard from '../../components/ui/ChartCard';
import { weeklyWasteTrend, zoneAnalytics, seasonalData, monthlyWasteTrend } from '../../data/mockData';
import { useTheme } from '../../context/ThemeContext';

const PIE_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function Analytics() {
  const { isDark } = useTheme();
  const ts = { backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '12px', color: isDark ? '#f1f5f9' : '#0f172a' };
  const grid = isDark ? '#334155' : '#e2e8f0';
  const axis = isDark ? '#94a3b8' : '#64748b';

  const distData = [
    { name: 'Residential', value: 21 }, { name: 'Market', value: 29.9 },
    { name: 'School', value: 10 }, { name: 'Office', value: 9.9 }, { name: 'Tourist', value: 29 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Waste Trend */}
        <ChartCard title="Weekly Waste Trend" subtitle="Daily wet vs dry waste (tons)" delay={0.1}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeklyWasteTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="day" stroke={axis} fontSize={12} />
              <YAxis stroke={axis} fontSize={12} />
              <Tooltip contentStyle={ts} />
              <Legend />
              <Line type="monotone" dataKey="wet" stroke="#06b6d4" strokeWidth={3} dot={{ r: 5 }} name="Wet Waste" />
              <Line type="monotone" dataKey="dry" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} name="Dry Waste" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Wet vs Dry Comparison */}
        <ChartCard title="Wet vs Dry Comparison" subtitle="Zone-based analysis (tons)" delay={0.2}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={zoneAnalytics}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="zone" stroke={axis} fontSize={12} />
              <YAxis stroke={axis} fontSize={12} />
              <Tooltip contentStyle={ts} />
              <Legend />
              <Bar dataKey="wet" fill="#06b6d4" radius={[4,4,0,0]} name="Wet Waste" />
              <Bar dataKey="dry" fill="#8b5cf6" radius={[4,4,0,0]} name="Dry Waste" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Seasonal Variation */}
        <ChartCard title="Seasonal Variation" subtitle="Monthly waste by zone type (tons)" delay={0.3}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={seasonalData}>
              <defs>
                <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                <linearGradient id="gMkt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                <linearGradient id="gTour" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="month" stroke={axis} fontSize={12} />
              <YAxis stroke={axis} fontSize={12} />
              <Tooltip contentStyle={ts} />
              <Legend />
              <Area type="monotone" dataKey="residential" stroke="#10b981" fill="url(#gRes)" strokeWidth={2} name="Residential" />
              <Area type="monotone" dataKey="market" stroke="#06b6d4" fill="url(#gMkt)" strokeWidth={2} name="Market" />
              <Area type="monotone" dataKey="tourist" stroke="#f59e0b" fill="url(#gTour)" strokeWidth={2} name="Tourist" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Waste Distribution Pie */}
        <ChartCard title="Waste Distribution" subtitle="Zone contribution (%)" delay={0.4}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={distData} cx="50%" cy="50%" outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                animationBegin={300} animationDuration={1000}>
                {distData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={ts} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Monthly Trend Full Width */}
      <ChartCard title="12-Month Waste Trend" subtitle="Monthly total waste generation overview" delay={0.5}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyWasteTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="month" stroke={axis} fontSize={12} />
            <YAxis stroke={axis} fontSize={12} />
            <Tooltip contentStyle={ts} />
            <Legend />
            <Bar dataKey="wet" stackId="a" fill="#06b6d4" name="Wet Waste" />
            <Bar dataKey="dry" stackId="a" fill="#8b5cf6" radius={[4,4,0,0]} name="Dry Waste" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
