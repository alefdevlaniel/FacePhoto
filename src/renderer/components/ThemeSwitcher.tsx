import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const ThemeSwitcher: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div className="theme-switcher-box">
      <span className="theme-switcher-label">Tema:</span>
      <button
        className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`}
        onClick={() => setThemeMode('dark')}
      >
        🌙 Escuro
      </button>
      <button
        className={`theme-option ${themeMode === 'light' ? 'active' : ''}`}
        onClick={() => setThemeMode('light')}
      >
        ☀️ Claro
      </button>
      <button
        className={`theme-option ${themeMode === 'system' ? 'active' : ''}`}
        onClick={() => setThemeMode('system')}
      >
        💻 Auto
      </button>
    </div>
  );
};
