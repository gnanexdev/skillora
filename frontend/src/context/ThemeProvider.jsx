import { useState, useEffect, useCallback } from 'react';
import { ThemeContext } from './ThemeContext';

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    const savedTheme = localStorage.getItem('skillora_theme');
    return ['light', 'dark', 'system'].includes(savedTheme) ? savedTheme : 'system';
  });
  const [systemTheme, setSystemTheme] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('skillora_theme', preference);

    // Update meta theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = theme === 'dark' ? '#070B14' : '#F8FAFC';
  }, [theme, preference]);

  // Listen to system preference changes if user hasn't manually set
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => setPreference((current) => {
    const resolved = current === 'system' ? systemTheme : current
    return resolved === 'dark' ? 'light' : 'dark'
  }), [systemTheme]);

  const setTheme = useCallback((newTheme) => {
    if (['light', 'dark', 'system'].includes(newTheme)) {
      setPreference(newTheme);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, preference, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
