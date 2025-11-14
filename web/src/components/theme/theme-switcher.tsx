"use client";

import type { JSX } from "react";

import { Moon, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

import { themeOptions, useTheme, type Theme } from "./theme-provider";

const icons: Record<Theme, JSX.Element> = {
  dark: <Moon className="h-3.5 w-3.5" />,
  holiday: <Sparkles className="h-3.5 w-3.5" />,
};

const labels: Record<Theme, string> = {
  dark: "База",
  holiday: "Новый год",
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher flex items-center gap-1 rounded-full border border-evm-steel/40 bg-black/30 p-1">
      {themeOptions.map((option) => {
        const isActive = option === theme;

        return (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 text-[0.6rem] uppercase tracking-[0.24em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evm-accent",
              isActive
                ? "bg-evm-accent text-black shadow-[0_0_12px_rgba(255,134,64,0.45)]"
                : "text-evm-muted hover:text-foreground",
            )}
            aria-pressed={isActive}
            aria-label={`Переключить тему на ${labels[option]}`}
          >
            {icons[option]}
            <span>{labels[option]}</span>
          </button>
        );
      })}
    </div>
  );
}


