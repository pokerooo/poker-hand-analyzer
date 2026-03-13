import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  // Fetch the authenticated user's saved theme from the server
  const { data: user } = trpc.auth.me.useQuery(undefined, {
    enabled: switchable,
    staleTime: Infinity,
  });

  // When user logs in and their server theme differs from local, adopt the server value
  useEffect(() => {
    if (!switchable) return;
    const serverTheme = (user as any)?.theme as Theme | undefined;
    if (serverTheme && serverTheme !== theme) {
      setTheme(serverTheme);
      localStorage.setItem("theme", serverTheme);
    }
    // Only run when user data arrives — intentionally omit `theme` to avoid loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, switchable]);

  // Apply the theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  // Mutation to persist theme to the server
  const updateThemeMutation = trpc.prefs.updateTheme.useMutation();

  const toggleTheme = useCallback(() => {
    if (!switchable) return;
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      // Persist to server if user is authenticated (fire-and-forget)
      if (user) {
        updateThemeMutation.mutate({ theme: next });
      }
      return next;
    });
  }, [switchable, user, updateThemeMutation]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: switchable ? toggleTheme : undefined, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
