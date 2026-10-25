import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { EN } from "./i18n-en";
import { latinDigits } from "./identity";

export type Lang = "ar" | "en";

let current: Lang = "ar";
function translate(text: string, lang: Lang) {
  const key = latinDigits(text);
  const shared: Record<string, string> = {
    "رومات الدراسة": "Rooms", "روم جديد": "New Room", "روم دراسة جديد": "New Room",
    "روم دراسة": "Study Room", "الروم": "Study Room", "مغادرة الروم": "Leave Room", "إغلاق الروم": "Close Room",
    "المستوى": "Level", "مستوى": "Level", "وضع التركيز": "Focus", "تفعيل وضع التركيز": "Focus",
  };
  if (shared[key]) return shared[key];
  return latinDigits(lang === "en" ? (EN[key] ?? text) : text);
}

/** Non-hook translator for module code (toasts, lib helpers). */
export function t(ar: string | null | undefined): string {
  if (!ar) return "";
  return translate(ar, current);
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "ar",
  setLang: () => {},
});

function readStored(): Lang {
  try {
    return localStorage.getItem("lang") === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    setLangState(readStored());
  }, []);

  useEffect(() => {
    current = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    current = l;
    try {
      localStorage.setItem("lang", l);
    } catch {
      /* ignore */
    }
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {/* Remount on language change so plain t() calls re-render */}
      <div key={lang} className="contents">{children}</div>
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** Hook translator: t("نص عربي") → English when the active language is en. */
export function useT() {
  const { lang } = useLang();
  return (ar: string | null | undefined) => (ar ? translate(ar, lang) : "");
}
