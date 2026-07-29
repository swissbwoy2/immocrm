import { useEffect, useState } from "react";
import logoImmoRama from "@/assets/logo-immo-rama-new.png";

const DISMISS_KEY = "ios_app_interstitial_dismissed";
const APP_STORE_URL = "https://apps.apple.com/app/id6756940233";

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return false;
  const isIPhone = /iPhone|iPod/i.test(ua);
  // iPad on iPadOS 13+ reports as Mac
  const isIPad =
    /iPad/i.test(ua) ||
    (/Macintosh/i.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1);
  return isIPhone || isIPad;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  try {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
  } catch {
    /* noop */
  }
  // Capacitor native shell
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  return false;
}

export function IOSAppInterstitial() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* noop */
    }
    if (!detectIOS()) return;
    if (isStandalone()) return;
    setShow(true);
  }, []);

  if (!show) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Télécharger l'application Logisorama"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          "linear-gradient(160deg, hsl(158 55% 38%) 0%, hsl(158 55% 30%) 60%, hsl(200 70% 32%) 100%)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="max-w-sm w-full flex flex-col items-center gap-6 text-white">
        <img
          src={logoImmoRama}
          alt="Logisorama"
          className="h-24 w-24 rounded-3xl bg-white p-3 shadow-2xl object-contain"
        />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold leading-tight">
            Disponible sur l'app iOS Logisorama
          </h1>
          <p className="text-sm text-white/85">
            Profitez d'une expérience plus rapide et fluide directement depuis votre iPhone ou iPad.
          </p>
        </div>
        <a
          href={APP_STORE_URL}
          className="w-full inline-flex items-center justify-center rounded-full bg-white text-[hsl(158_55%_30%)] font-semibold py-4 px-6 shadow-lg active:scale-[0.98] transition"
        >
          Télécharger sur l'App Store
        </a>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-white/80 underline underline-offset-4"
        >
          Continuer sur le navigateur
        </button>
      </div>
    </div>
  );
}

export default IOSAppInterstitial;
