import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, LogOut } from 'lucide-react';

export default function TopNavbar() {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header
      className="sticky top-0 z-[9999] flex h-16 items-center justify-between border-b px-6 backdrop-blur-md"
      style={{
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(240, 253, 244, 0.8)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Left - Page info */}
      <div className="flex items-center gap-4">
        <div>
          {/* <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Smart Waste Management
          </h2> */}
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-surface-100 dark:hover:bg-surface-700/50"
          style={{ color: 'var(--text-secondary)' }}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Profile & User details */}
        {user && (
          <div className="flex items-center gap-3 pl-2">
            <div className="hidden flex-col text-right sm:flex">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {user.name}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {user.email}
              </span>
            </div>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
              style={{ background: '#10b981' }}
            >
              {initial}
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              title="Log out"
              aria-label="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-500 transition-colors hover:bg-rose-500/10"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

