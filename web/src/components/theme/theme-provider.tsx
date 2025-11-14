"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "evm-theme";

export const themeOptions = ["dark", "holiday"] as const;

export type Theme = (typeof themeOptions)[number];

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isTheme(value: string): value is Theme {
  return themeOptions.includes(value as Theme);
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && isTheme(stored)) {
    return stored;
  }

  const dataTheme = document.documentElement.dataset.theme;
  if (dataTheme && isTheme(dataTheme)) {
    return dataTheme;
  }

  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue && isTheme(event.newValue)) {
        setThemeState(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    document.documentElement.dataset.theme = theme;
    if (document.body) {
      document.body.dataset.theme = theme;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: Theme) => setThemeState(next),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}


