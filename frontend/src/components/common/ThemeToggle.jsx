import { useTheme } from '../../context/useTheme';

export function ThemeToggle({ className = '', style = {} }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        transition: 'all var(--duration-normal) var(--ease-smooth)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Sun Icon for Light Mode transition */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: 'absolute',
          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isDark ? 'rotate(90deg) scale(0)' : 'rotate(0deg) scale(1)',
          opacity: isDark ? 0 : 1,
          color: '#f59e0b', // warm golden sun
        }}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>

      {/* Moon Icon for Dark Mode transition */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: 'absolute',
          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0)',
          opacity: isDark ? 1 : 0,
          color: '#38bdf8', // crisp sky moon
        }}
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}

export default ThemeToggle;
