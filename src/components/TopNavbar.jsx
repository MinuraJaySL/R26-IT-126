import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Bell, Search } from 'lucide-react';

export default function TopNavbar() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b px-6 backdrop-blur-md"
      style={{
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(240, 253, 244, 0.8)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Left - Page info */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Smart Waste Management
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            IoT • Machine Learning • Predictive Analytics
          </p>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="hidden items-center gap-2 rounded-xl border px-3 py-2 md:flex"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search..."
            className="w-40 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Notifications */}
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-surface-100 dark:hover:bg-surface-700/50"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 status-dot" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-surface-100 dark:hover:bg-surface-700/50"
          style={{ color: 'var(--text-secondary)' }}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-sm font-bold text-white">
            R
          </div>
        </div>
      </div>
    </header>
  );
}
