import { useAuth } from '../contexts/AuthContext';
import { translations } from '../translations';
import type { Language, TranslationKeys } from '../translations';

export const useTranslation = () => {
    const { user } = useAuth();
    
    // On récupère la langue de l'utilisateur, par défaut français
    const lang: Language = (user?.language as Language) || 'fr';
    
    // On s'assure que la langue existe dans le dictionnaire, sinon fallback fr
    const t: TranslationKeys = translations[lang] || translations.fr;
    
    return { t, lang };
};
