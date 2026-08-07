import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      welcome: "Welcome to TheraVox AI",
      tagline: "Multimodal AI-Powered Mental Health & Emotional Wellness",
      dashboard: "Dashboard",
      analysis: "Emotion Analysis",
      chat: "Mindful AI Companion",
      wellness: "Wellness Journal",
      therapy_hub: "Therapy Hub",
      therapist_portal: "Therapist Portal",
      settings: "Settings",
      logout: "Log Out",
    },
  },
  hi: {
    translation: {
      welcome: "थेरावॉक्स एआई में आपका स्वागत है",
      tagline: "एआई-संचालित मानसिक स्वास्थ्य और भावनात्मक कल्याण",
      dashboard: "डैशबोर्ड",
      analysis: "भावना विश्लेषण",
      chat: "सचेत एआई साथी",
      wellness: "वेलनेस जर्नल",
      therapy_hub: "थेरेपी हब",
      therapist_portal: "थेरेपिस्ट पोर्टल",
      settings: "सेटिंग्स",
      logout: "लॉग आउट",
    },
  },
  es: {
    translation: {
      welcome: "Bienvenido a TheraVox AI",
      tagline: "Salud Mental y Bienestar Emocional Impulsado por IA Multimodal",
      dashboard: "Panel Control",
      analysis: "Análisis de Emociones",
      chat: "Compañero IA",
      wellness: "Diario de Bienestar",
      therapy_hub: "Centro Terapéutico",
      therapist_portal: "Portal del Terapeuta",
      settings: "Configuración",
      logout: "Cerrar Sesión",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('theravox_lang') || 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
