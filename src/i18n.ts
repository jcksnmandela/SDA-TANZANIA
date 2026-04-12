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
          "swahili": "Swahili",
          "Home": "Home",
          "Nearby": "Nearby",
          "News": "News",
          "Live": "Live",
          "Profile": "Profile",
          "Manage": "Manage",
          "theme_changed": "Theme changed to {{theme}}",
          "language_changed": "Language changed to {{language}}",
          "login_required": "Please login to access this feature"
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
          "swahili": "Kiswahili",
          "Home": "Nyumbani",
          "Nearby": "Karibu",
          "News": "Habari",
          "Live": "Mubashara",
          "Profile": "Wasifu",
          "Manage": "Simamia",
          "theme_changed": "Mandhari yamebadilishwa kuwa {{theme}}",
          "language_changed": "Lugha imebadilishwa kuwa {{language}}",
          "login_required": "Tafadhali ingia ili kupata huduma hii"
        }
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
