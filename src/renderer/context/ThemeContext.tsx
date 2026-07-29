import React, { createContext, useContext, useEffect, useState } from 'react';
import logoBannerDark from '../assets/logo_banner_dark.png';
import logoBannerLight from '../assets/logo_banner.png';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setThemeMode: (mode: ThemeMode) => void;
  bannerImage: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  const updateTheme = (mode: ThemeMode) => {
    let resolved: 'dark' | 'light' = 'dark';
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    } else {
      resolved = mode;
    }

    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    updateTheme(mode);
  };

  useEffect(() => {
    updateTheme(themeMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        const resolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(resolved);
        document.documentElement.setAttribute('data-theme', resolved);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themeMode]);

  const bannerImage = resolvedTheme === 'dark' ? logoBannerDark : logoBannerLight;

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode, bannerImage }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};
