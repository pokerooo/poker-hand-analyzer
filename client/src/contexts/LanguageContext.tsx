import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, translations, TranslationKey } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem("poker-ai-language");
      if (stored === "en" || stored === "zh" || stored === "es") return stored;
    } catch {}
    return "en";
  });

  // Load language from user profile when authenticated
  const { data: meData } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const serverLang = (meData as any)?.language as Language | undefined;
    if (serverLang && (serverLang === "en" || serverLang === "zh" || serverLang === "es")) {
      setLanguageState(serverLang);
      try {
        localStorage.setItem("poker-ai-language", serverLang);
      } catch {}
    }
  }, [(meData as any)?.language]);

  // Persist language to server when authenticated
  const updateLanguageMutation = trpc.prefs.updateLanguage.useMutation();

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("poker-ai-language", lang);
    } catch {}
    // Persist to server if user is logged in
    if (meData) {
      updateLanguageMutation.mutate({ language: lang });
    }
  };

  const t = (key: TranslationKey): string => {
    const dict = translations[language] as Record<string, string>;
    return dict[key] ?? (translations.en as Record<string, string>)[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
