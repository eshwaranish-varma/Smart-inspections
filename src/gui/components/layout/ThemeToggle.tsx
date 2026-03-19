"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const THEME_KEY = "smart-inspections-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
}

export default function ThemeToggle({
  className,
}: {
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    const resolvedTheme: Theme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : document.documentElement.classList.contains("dark")
          ? "dark"
          : "light";

    setTheme(resolvedTheme);
    applyTheme(resolvedTheme);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-700 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-md dark:border-white/10 dark:bg-slate-800 dark:text-slate-100",
        className
      )}
      aria-label={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={mounted && theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
