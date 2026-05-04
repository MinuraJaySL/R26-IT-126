import { motion } from 'framer-motion';
import AnimatedCard from './AnimatedCard';

export default function StatCard({ title, value, unit = '', icon: Icon, trend, trendValue, color = '#10b981', delay = 0 }) {
  return (
    <AnimatedCard delay={delay} className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
            className="mt-2 flex items-baseline gap-1"
          >
            <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
          </motion.div>
          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${
              trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-amber-500'
            }`}>
              <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon size={24} />
          </div>
        )}
      </div>
      {/* Decorative gradient accent */}
      <div
        className="absolute bottom-0 left-0 h-1 w-full rounded-b-2xl"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}40)` }}
      />
    </AnimatedCard>
  );
}
