import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const currentLang = i18n.language.split('-')[0];
    const newLang = currentLang === "en" ? "sw" : "en";
    i18n.changeLanguage(newLang);
    toast.success(t("language_changed", { language: newLang === "en" ? t("english") : t("swahili") }));
  };

  const currentLang = i18n.language.split('-')[0];

  return (
    <button 
      onClick={toggleLanguage} 
      className="text-xs font-bold px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 transition-colors text-white min-w-[32px]"
      title={t("language")}
    >
      {currentLang === "en" ? "SW" : "EN"}
    </button>
  );
}
