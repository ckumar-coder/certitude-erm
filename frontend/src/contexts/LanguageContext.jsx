import { createContext, useContext, useState } from 'react';
import T from '../translations';

const LanguageContext = createContext({ lang: 'en', setLang: () => {} });

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(() => {
        try { return localStorage.getItem('grc_lang') || 'en'; } catch { return 'en'; }
    });

    function setLang(l) {
        setLangState(l);
        try { localStorage.setItem('grc_lang', l); } catch {}
    }

    return (
        <LanguageContext.Provider value={{ lang, setLang }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}

// useT() — returns a translation function t(key) for the active language.
// Falls back to English if the key is missing in Arabic, then to the key itself.
export function useT() {
    const { lang } = useContext(LanguageContext);
    return function t(key) {
        const entry = T[key];
        if (!entry) return key;
        return entry[lang] ?? entry.en ?? key;
    };
}
