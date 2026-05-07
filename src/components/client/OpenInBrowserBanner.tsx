import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ExternalLink, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const DISMISS_KEY = "open_in_browser_dismissed";

export function OpenInBrowserBanner() {
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (!location.pathname.startsWith("/client")) {
      setShow(false);
      return;
    }
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const ua = navigator.userAgent || "";
    const isWA = /WhatsApp/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);
    setIsIOS(ios);
    setShow(isWA);
  }, [location.pathname]);

  if (!show) return null;

  const currentUrl = window.location.href;

  const handleOpen = () => {
    if (isIOS) {
      // x-safari-https opens Safari on iOS
      const safariUrl = currentUrl.replace(/^https?:\/\//, "x-safari-https://");
      window.location.href = safariUrl;
      // Fallback after delay
      setTimeout(() => {
        navigator.clipboard?.writeText(currentUrl);
        toast({
          title: "Lien copié",
          description: "Ouvrez Safari et collez le lien, ou utilisez le menu ⋮ → Ouvrir dans le navigateur.",
        });
      }, 800);
    } else {
      // Android: intent to Chrome
      const url = currentUrl.replace(/^https?:\/\//, "");
      const intent = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intent;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast({ title: "Lien copié", description: "Collez-le dans votre navigateur." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier le lien.", variant: "destructive" });
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-primary text-primary-foreground border-b border-primary/20 shadow-sm">
      <div className="container mx-auto px-3 py-2 flex items-center gap-2 text-sm">
        <ExternalLink className="h-4 w-4 shrink-0" />
        <span className="flex-1 min-w-0">
          Pour une meilleure expérience, ouvrez dans {isIOS ? "Safari" : "Chrome"}.
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleOpen}
          className="h-8 shrink-0"
        >
          Ouvrir
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-8 w-8 p-0 shrink-0 text-primary-foreground hover:bg-primary-foreground/10"
          aria-label="Copier le lien"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="h-8 w-8 p-0 shrink-0 text-primary-foreground hover:bg-primary-foreground/10"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
