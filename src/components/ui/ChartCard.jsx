import AnimatedCard from './AnimatedCard';

export default function ChartCard({ title, subtitle, children, delay = 0, className = '', action }) {
  return (
    <AnimatedCard delay={delay} hover={false} className={`${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}
        </div>
        {action && action}
      </div>
      <div className="w-full">{children}</div>
    </AnimatedCard>
  );
}
