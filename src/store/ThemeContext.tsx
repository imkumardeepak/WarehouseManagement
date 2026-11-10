import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";

export type ThemeColor = "blue" | "emerald" | "violet" | "rose" | "amber";

interface ThemeDef {
  label: string;
  swatch: string; // display hex for the picker
  primary: string; // "H S% L%"
  sidebarAccent: string;
  accent: string;
  accentForeground: string;
}

export const THEMES: Record<ThemeColor, ThemeDef> = {
  blue: { label: "Blue", swatch: "#2563eb", primary: "221 83% 53%", sidebarAccent: "221 83% 60%", accent: "221 83% 96%", accentForeground: "221 83% 34%" },
  emerald: { label: "Emerald", swatch: "#059669", primary: "158 64% 40%", sidebarAccent: "158 64% 44%", accent: "158 64% 95%", accentForeground: "158 64% 25%" },
  violet: { label: "Violet", swatch: "#7c3aed", primary: "262 83% 58%", sidebarAccent: "262 83% 64%", accent: "262 83% 96%", accentForeground: "262 83% 38%" },
  rose: { label: "Rose", swatch: "#e11d48", primary: "346 77% 50%", sidebarAccent: "346 77% 56%", accent: "346 77% 96%", accentForeground: "346 77% 34%" },
  amber: { label: "Amber", swatch: "#d97706", primary: "32 95% 44%", sidebarAccent: "32 95% 50%", accent: "38 92% 95%", accentForeground: "32 95% 30%" },
};

const STORAGE_KEY = "stockflow_theme_color";

interface ThemeContextValue {
  color: ThemeColor;
  setColor: (c: ThemeColor) => void;
  /** Resolved primary colour as a usable CSS colour string (for charts). */
  primary: string;
  themes: ThemeColor[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(color: ThemeColor) {
  const t = THEMES[color];
  const root = document.documentElement;
  root.style.setProperty("--primary", t.primary);
  root.style.setProperty("--ring", t.primary);
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--accent-foreground", t.accentForeground);
  root.style.setProperty("--sidebar-accent", t.sidebarAccent);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [color, setColorState] = useState<ThemeColor>(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY)) as ThemeColor | null;
    return stored && stored in THEMES ? stored : "blue";
  });

  useLayoutEffect(() => {
    applyTheme(color);
    try {
      localStorage.setItem(STORAGE_KEY, color);
    } catch {
      /* ignore */
    }
  }, [color]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      color,
      setColor: setColorState,
      primary: `hsl(${THEMES[color].primary})`,
      themes: Object.keys(THEMES) as ThemeColor[],
    }),
    [color],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
