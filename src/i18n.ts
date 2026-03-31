import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          "welcome": "Welcome to SDA Tanzania",
          "theme": "Theme",
          "language": "Language",
          "dark": "Dark",
          "light": "Light",
          "english": "English",
          "swahili": "Swahili"
        }
      },
      sw: {
        translation: {
          "welcome": "Karibu SDA Tanzania",
          "theme": "Mandhari",
          "language": "Lugha",
          "dark": "Giza",
          "light": "Nuru",
          "english": "Kiingereza",
          "swahili": "Kiswahili"
        }
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
