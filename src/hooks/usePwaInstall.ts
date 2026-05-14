import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "campusx_pwa_install_dismissed_at";
const INSTALLED_KEY = "campusx_pwa_installed";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone() || localStorage.getItem(INSTALLED_KEY) === "true");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "true");
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismissedRecently = () => {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    if (!dismissedAt) return false;

    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < sevenDays;
  };

  const canPrompt = Boolean(deferredPrompt && !installed && !dismissedRecently());

  const install = async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "true");
      setInstalled(true);
      setDeferredPrompt(null);
      return true;
    }

    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    return false;
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  return {
    canPrompt,
    installed,
    install,
    dismiss,
  };
}