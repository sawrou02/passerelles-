import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "mykutub_pwa_install_dismissed";

export function InstallPWAButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Hide if already installed / running standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    // Hide if previously dismissed (within 7 days)
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setInstalled(true);
        return;
      }
    } catch {}

    // iOS detection (no beforeinstallprompt support)
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    setIsIOS(iOS);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferred && !isIOS) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "dismissed") {
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {}
      }
      setDeferred(null);
    } else if (isIOS) {
      setShowIOSHint((v) => !v);
    }
  };

  const label = t("common.installApp", { defaultValue: "Installer l'app" });

  return (
    <div className={className}>
      <Button
        onClick={handleClick}
        size="sm"
        variant="outline"
        className="gap-2 border-primary text-primary hover:bg-primary/10 hover:text-primary font-bold"
      >
        <Download size={16} />
        <span>{label}</span>
      </Button>
      {showIOSHint && (
        <div className="absolute right-4 mt-2 max-w-xs rounded-lg border bg-card p-3 text-xs shadow-lg z-50">
          {t("common.iosInstallHint", {
            defaultValue:
              "Sur iPhone : appuyez sur Partager puis « Sur l'écran d'accueil ».",
          })}
        </div>
      )}
    </div>
  );
}
