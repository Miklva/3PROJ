import { useAuth } from '../contexts/AuthContext';
import { translations } from '../translations';
import type { Language, TranslationKeys } from '../translations';

export const useTranslation = () => {
    const { user } = useAuth();
    
    const lang: Language = (user?.language as Language) || 'fr';
    
    const t: TranslationKeys = translations[lang] || translations.fr;
    
    return { t, lang };
};
