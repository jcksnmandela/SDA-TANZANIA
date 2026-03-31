import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "sw" : "en");
  };

  return (
    <button 
      onClick={toggleLanguage} 
      className="text-xs font-bold px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 transition-colors"
    >
      {i18n.language === "en" ? "SW" : "EN"}
    </button>
  );
}
