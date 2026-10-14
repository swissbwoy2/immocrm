import { escapeEmailHtml as escape, EMAIL_RESPONSIVE_CSS } from "../../../supabase/functions/_shared/email-brand.ts";

// Client-space palette: src/index.css --primary (217 91% 60%), slate text and blue tints.
export const RC_CAMPAIGN = {
  id: "rc-dossier-beton",
  name: "RC · Un dossier béton",
  audience: "Clients actifs et candidats",
  subject: "Ajoute ta RC pour un dossier béton 💙",
  preheader: "Demande ton offre RC gratuite et sans engagement. Une étape simple pour préparer la suite.",
  description: "Demande d’offre RC pour les comptes clients actifs et candidats. Campagne indépendante de la série de recherche.",
  image: "/newsletter/rc-2026-10/dossier-beton.jpg",
  href: "https://logisorama.ch/offre-rc?utm_source=newsletter&utm_medium=email&utm_campaign=rc-dossier-beton#demande",
} as const;

const button = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 12px;"><tr><td bgcolor="#2563EB" style="border-radius:12px;mso-padding-alt:17px 26px;"><a href="${escape(RC_CAMPAIGN.href)}" style="display:inline-block;padding:17px 26px;border-radius:12px;color:#ffffff;background:#2563EB;font:bold 17px/23px Arial,Helvetica,sans-serif;text-decoration:none;">Recevoir une offre gratuite&nbsp; →</a></td></tr></table>`;

export const RC_CAMPAIGN_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(RC_CAMPAIGN.subject)}</title><style>${EMAIL_RESPONSIVE_CSS}</style></head>
<body style="margin:0;padding:0;background:#EFF6FF;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escape(RC_CAMPAIGN.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#EFF6FF"><tr><td align="center" class="email-outer" style="padding:28px 12px;">
<!--[if mso]><table role="presentation" width="640"><tr><td><![endif]-->
<table role="presentation" width="640" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="width:100%;max-width:640px;border-top:5px solid #3B82F6;">
<tr><td class="email-pad" style="padding:24px 32px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td><img src="https://logisorama.ch/email/logo-logisorama.png" width="180" height="50" alt="Logisorama · Immo-rama" style="display:block;border:0;margin-top:4px;"></td><td align="right" style="font-size:10px;line-height:17px;letter-spacing:1.2px;color:#2563EB;">TON DOSSIER<br>TA TRANQUILLITÉ</td></tr></table></td></tr>
<tr><td class="email-pad" style="padding:10px 32px 26px;text-align:center;"><p style="margin:0 0 14px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#2563EB;">CLIENTS & CANDIDATS · ASSURANCE RC</p><h1 class="email-heading" style="margin:0;font-size:36px;line-height:41px;letter-spacing:-1.2px;color:#0F172A;">Ajoute ta RC pour<br><span style="color:#2563EB;">un dossier béton.</span></h1><p style="margin:16px 0 0;font-size:17px;line-height:26px;color:#475569;">Ton prochain chez-toi se prépare aussi<br>avec les bons documents.</p>${button}<p style="margin:0;font-size:12px;color:#64748B;">Offre gratuite · Sans engagement</p></td></tr>
<tr><td><img src="https://logisorama.ch${RC_CAMPAIGN.image}" width="640" alt="Une candidate sereine, un dossier bleu et un bouclier protecteur dans un appartement lumineux." style="display:block;width:100%;height:auto;border:0;"></td></tr>
<tr><td class="email-pad" style="padding:30px 32px 8px;font-size:16px;line-height:26px;color:#475569;"><p style="margin:0 0 16px;color:#0F172A;">Bonjour,</p><p style="margin:0 0 18px;">Tu prépares ta candidature ou ton prochain emménagement ? <strong style="color:#0F172A;">Anticipe la question de ta responsabilité civile.</strong> Si une attestation RC t’est demandée, tu sauras où tu en es, sans devoir tout organiser au dernier moment.</p><p style="margin:0 0 22px;">Avec Logisorama, fais le premier pas simplement : <strong style="color:#0F172A;">demande une offre RC gratuite et sans engagement.</strong> Renseigne tes informations, notre équipe prend en charge ta demande et te recontacte pour la suite. Tu peux ensuite examiner l’offre tranquillement et décider.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#EFF6FF" style="border:1px solid #DBEAFE;border-radius:14px;"><tr><td style="padding:22px;"><strong style="font-size:18px;color:#0F172A;">Une démarche simple. Un dossier mieux préparé.</strong><p style="margin:12px 0 0;color:#475569;font-size:15px;line-height:25px;">01 &nbsp; Tu complètes le formulaire.<br>02 &nbsp; Notre équipe traite ta demande d’offre.<br>03 &nbsp; Si tu souscris, tu peux ajouter ton attestation à ton dossier.</p></td></tr></table>
<p style="margin:22px 0 0;">Prends une longueur d’avance sur tes démarches. <strong style="color:#0F172A;">Demande ton offre maintenant : tu restes libre de choisir.</strong></p>${button}
<p style="margin:14px 0 22px;text-align:center;font-size:12px;line-height:19px;color:#64748B;">La demande d’offre est gratuite. L’assurance est payante en cas de souscription.<br>Tu as déjà une RC ? Vérifie ton attestation avant de demander une nouvelle offre.</p></td></tr>
<tr><td class="email-pad" bgcolor="#EFF6FF" style="padding:23px 32px;font-size:14px;line-height:23px;color:#334155;"><strong>L’équipe Logisorama</strong><br>À tes côtés pour préparer ton prochain chez-toi.</td></tr>
<tr><td class="email-pad" style="padding:22px 32px;font-size:12px;line-height:20px;color:#64748B;"><strong>Logisorama · Immo-rama</strong><br><a href="https://logisorama.ch" style="color:#2563EB;">logisorama.ch</a> · <a href="mailto:support@logisorama.ch" style="color:#2563EB;">support@logisorama.ch</a><br>Tu reçois ce message dans le cadre de ton compte client ou candidat.<br><a href="{{unsubscribe_url}}" style="color:#64748B;">Me désinscrire de ces communications</a></td></tr></table>
<!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;

export const RC_NEWSLETTER_TEMPLATE = { ...RC_CAMPAIGN, html: RC_CAMPAIGN_HTML };
