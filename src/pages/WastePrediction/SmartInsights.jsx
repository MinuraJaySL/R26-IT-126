import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, MapPin, Leaf, BarChart3, Recycle, AlertTriangle, ThumbsUp } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import Badge from '../../components/ui/Badge';
import { smartInsights } from '../../data/mockData';

const TYPE_CONFIG = {
  trend: { icon: TrendingUp, color: '#f59e0b', bg: 'bg-amber-500/10' },
  zone: { icon: MapPin, color: '#06b6d4', bg: 'bg-cyan-500/10' },
  composition: { icon: Leaf, color: '#10b981', bg: 'bg-emerald-500/10' },
  prediction: { icon: BarChart3, color: '#ef4444', bg: 'bg-red-500/10' },
  efficiency: { icon: Recycle, color: '#8b5cf6', bg: 'bg-violet-500/10' },
  positive: { icon: ThumbsUp, color: '#10b981', bg: 'bg-emerald-500/10' },
};

export default function SmartInsights() {
  return (
    <div className="space-y-6">
      <AnimatedCard delay={0.1} hover={false} className="gradient-cool text-white">
        <div className="flex items-center gap-3">
          <Sparkles size={24} />
          <div>
            <h3 className="text-lg font-bold">Smart AI Insights</h3>
            <p className="text-sm text-white/80">AI-generated analysis from waste prediction models</p>
          </div>
        </div>
      </AnimatedCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {smartInsights.map((insight, i) => {
          const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.trend;
          const Icon = config.icon;
          return (
            <motion.div key={insight.id} initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 100 }} className="card overflow-hidden border p-5" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                  <Icon size={22} style={{ color: config.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{insight.title}</h4>
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }}
                      className="shrink-0 rounded-lg px-2 py-1 text-lg font-bold" style={{ color: config.color, backgroundColor: `${config.color}15` }}>
                      {insight.metric}
                    </motion.span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{insight.description}</p>
                  <div className="mt-3">
                    <Badge variant={insight.severity}>{insight.severity}</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
