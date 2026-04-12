import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = localStorage.getItem("theme") === "dark" || 
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      toast.success(t("theme_changed", { theme: t("dark") }));
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      toast.success(t("theme_changed", { theme: t("light") }));
    }
  };

  return (
    <button 
      onClick={toggleTheme} 
      className="p-2 rounded-full hover:bg-emerald-600 transition-colors text-white"
      title={t("theme")}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
