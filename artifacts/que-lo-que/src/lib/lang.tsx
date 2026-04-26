import { createContext, useContext, useState, ReactNode } from "react";
import { type Lang, translations, type Translations } from "./i18n";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem("qlq_lang");
    return stored === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = (l: Lang) => {
    localStorage.setItem("qlq_lang", l);
    setLangState(l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

/** Admin area is always Spanish. Use this instead of useLang() in admin pages. */
export function useAdminLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useAdminLang must be used within LangProvider");
  return { lang: "es" as const, setLang: ctx.setLang, t: translations["es"] };
}
