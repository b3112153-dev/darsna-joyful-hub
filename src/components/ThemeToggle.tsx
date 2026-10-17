import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_KEY = "darsna-theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let dark = false;
    try {
      dark = window.localStorage.getItem(THEME_KEY) === "dark";
    } catch {
      // Keep the default theme if the browser blocks local storage.
    }
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, []);

  function toggleTheme() {
    setIsDark((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {
        // The selected theme still applies for this page view.
      }
      document.documentElement.classList.toggle("dark", next);
      document.documentElement.style.colorScheme = next ? "dark" : "light";
      return next;
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      className="shrink-0"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
