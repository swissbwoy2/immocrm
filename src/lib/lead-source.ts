/**
 * Derives a friendly acquisition source label + badge styling from a lead's
 * tracking metadata (source + UTM parameters).
 *
 * Priority order:
 *  1. utm_source = facebook  OR utm_medium contains 'meta'  → Facebook Ads
 *  2. utm_source = instagram                                 → Instagram Ads
 *  3. utm_source = tiktok                                    → TikTok Ads
 *  4. utm_source = google    OR utm_medium = 'cpc'           → Google Ads
 *  5. source     = 'meta_lead_ads'                           → Meta Lead Ads
 *  6. source     = 'formulaire_vendeur_complet'              → Formulaire Vendeur
 *  7. source contains 'landing'                              → Landing directe
 *  8. utm_source defined but unmatched                       → utm_source verbatim
 *  9. fallback                                               → Direct
 */

export type LeadSourceInput = {
  source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
};

export type LeadSourceKey =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "google"
  | "meta_lead_ads"
  | "vendeur"
  | "landing"
  | "other"
  | "direct";

export interface LeadSourceInfo {
  key: LeadSourceKey;
  label: string;
  /** Tailwind classes built from semantic tokens for the badge */
  badgeClass: string;
}

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

export function getLeadSource(lead: LeadSourceInput): LeadSourceInfo {
  const utmSource = norm(lead.utm_source);
  const utmMedium = norm(lead.utm_medium);
  const source = norm(lead.source);

  if (utmSource === "facebook" || utmSource === "fb" || utmMedium.includes("meta")) {
    return {
      key: "facebook",
      label: "Facebook Ads",
      badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400",
    };
  }

  if (utmSource === "instagram" || utmSource === "ig") {
    return {
      key: "instagram",
      label: "Instagram Ads",
      badgeClass:
        "bg-pink-500/15 text-pink-600 border-pink-500/30 dark:text-pink-400",
    };
  }

  if (utmSource === "tiktok" || utmSource === "tt") {
    return {
      key: "tiktok",
      label: "TikTok Ads",
      badgeClass:
        "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30 dark:text-fuchsia-400",
    };
  }

  if (utmSource === "google" || utmSource === "googleads" || utmMedium === "cpc") {
    return {
      key: "google",
      label: "Google Ads",
      badgeClass:
        "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
    };
  }

  if (source === "meta_lead_ads") {
    return {
      key: "meta_lead_ads",
      label: "Meta Lead Ads",
      badgeClass:
        "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
    };
  }

  if (source === "formulaire_vendeur_complet" || source.includes("vendeur")) {
    return {
      key: "vendeur",
      label: "Formulaire Vendeur",
      badgeClass:
        "bg-indigo-500/15 text-indigo-600 border-indigo-500/30 dark:text-indigo-400",
    };
  }

  if (source.includes("landing")) {
    return {
      key: "landing",
      label: "Landing directe",
      badgeClass:
        "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
    };
  }

  if (utmSource) {
    return {
      key: "other",
      label: utmSource.charAt(0).toUpperCase() + utmSource.slice(1),
      badgeClass:
        "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400",
    };
  }

  return {
    key: "direct",
    label: "Direct",
    badgeClass: "bg-muted text-muted-foreground border-border",
  };
}

export const LEAD_SOURCE_FILTER_OPTIONS: { value: LeadSourceKey | "all"; label: string }[] = [
  { value: "all", label: "Toutes les sources" },
  { value: "facebook", label: "Facebook Ads" },
  { value: "instagram", label: "Instagram Ads" },
  { value: "tiktok", label: "TikTok Ads" },
  { value: "google", label: "Google Ads" },
  { value: "meta_lead_ads", label: "Meta Lead Ads" },
  { value: "vendeur", label: "Formulaire Vendeur" },
  { value: "landing", label: "Landing directe" },
  { value: "other", label: "Autre" },
  { value: "direct", label: "Direct" },
];
