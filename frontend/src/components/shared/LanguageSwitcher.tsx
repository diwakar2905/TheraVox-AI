import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('theravox_lang', lng);
  };

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-stone-200 border border-white/10">
      <Globe className="w-3.5 h-3.5 text-amber-400" />
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
      >
        <option value="en" className="bg-stone-900 text-white">English (EN)</option>
        <option value="hi" className="bg-stone-900 text-white">हिंदी (HI)</option>
        <option value="es" className="bg-stone-900 text-white">Español (ES)</option>
      </select>
    </div>
  );
}
