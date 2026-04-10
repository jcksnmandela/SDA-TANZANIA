import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "sw" : "en";
    i18n.changeLanguage(newLang);
    toast.success(`Language changed to ${newLang === "en" ? "English" : "Swahili"}`);
  };

  return (
    <button 
      onClick={toggleLanguage} 
      className="text-xs font-bold px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 transition-colors text-white"
    >
      {i18n.language === "en" ? "SW" : "EN"}
    </button>
  );
}
