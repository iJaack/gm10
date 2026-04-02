import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    toggle: () => {},
});

export function useTheme() {
    return useContext(ThemeContext);
}

export function useThemeProvider(): ThemeContextValue {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const stored = localStorage.getItem('gm10-theme') as Theme | null;
            if (stored === 'light' || stored === 'dark') return stored;
            return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        } catch {
            return 'dark';
        }
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('gm10-theme', theme); } catch { /* test env */ }
    }, [theme]);

    const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    return { theme, toggle };
}
