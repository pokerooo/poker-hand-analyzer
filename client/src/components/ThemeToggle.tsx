import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  /** When true, renders as a compact inline button for use inside headers.
   *  When false/omitted, renders as a fixed floating button (legacy — no longer used globally). */
  inline?: boolean;
}

/**
 * Day/night toggle button.
 * Use `inline` prop inside page headers so it sits next to other nav items.
 */
export function ThemeToggle({ inline = false }: ThemeToggleProps) {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable || !toggleTheme) return null;

  const isDark = theme === "dark";

  if (inline) {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
        title={isDark ? "Day mode" : "Night mode"}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 border border-border"
        style={{
          background: isDark ? "var(--poker-green)" : "oklch(0.15 0.02 240)",
          color: isDark ? "#000" : "#fff",
        }}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    );
  }

  // Floating fallback (kept for any page that still uses it without inline prop)
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
      title={isDark ? "Day mode" : "Night mode"}
      className="fixed bottom-20 sm:bottom-6 right-5 z-50 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
      style={{
        background: isDark ? "var(--poker-green)" : "oklch(0.15 0.02 240)",
        color: isDark ? "#000" : "#fff",
        boxShadow: isDark
          ? "0 0 20px rgba(16,185,129,0.35)"
          : "0 4px 16px rgba(0,0,0,0.25)",
      }}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
