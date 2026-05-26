import { useEffect, useState } from "react";
import i18n, { applyDirection } from "@/lib/i18n";

const STORAGE_KEY = "mykutub_lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const lng = saved && ["fr", "en", "ar", "es", "it"].includes(saved) ? saved : "fr";
    if (i18n.language !== lng) {
      i18n.changeLanguage(lng).finally(() => {
        applyDirection(lng);
        setReady(true);
      });
    } else {
      applyDirection(lng);
      setReady(true);
    }

    const handler = (lng: string) => {
      applyDirection(lng);
      try { localStorage.setItem(STORAGE_KEY, lng); } catch {}
    };
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, []);

  // Render children immediately to avoid blocking; SSR uses fr by default and client matches.
  void ready;
  return <>{children}</>;
}
