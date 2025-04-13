'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon, EyeIcon } from '@heroicons/react/24/outline';

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const themes = [
    { name: 'light', icon: SunIcon, label: 'Light Mode' },
    { name: 'dark', icon: MoonIcon, label: 'Dark Mode' },
    { name: 'high-contrast', icon: EyeIcon, label: 'High Contrast' },
  ];

  const currentTheme = theme || 'light';
  const nextTheme = themes[(themes.findIndex(t => t.name === currentTheme) + 1) % themes.length];

  return (
    <button
      aria-label={`Switch to ${nextTheme.label}`}
      type="button"
      className="bg-gray-200 dark:bg-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
      onClick={() => setTheme(nextTheme.name)}
    >
      {React.createElement(nextTheme.icon, {
        className: `h-5 w-5 ${
          nextTheme.name === 'dark' 
            ? 'text-yellow-500' 
            : nextTheme.name === 'high-contrast'
            ? 'text-primary-500'
            : 'text-gray-800'
        }`
      })}
    </button>
  );
} 