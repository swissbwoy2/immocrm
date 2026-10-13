import {
  emailButton,
  escapeEmailHtml as escape,
  renderCorporateEmail,
} from "../../../supabase/functions/_shared/email-brand.ts";

/** Copy and artwork for the renter sequence. Scheduling and conversion stay server-side. */
export const CANDIDATE_SEQUENCE_VERSION = "candidats-2026-10-13";
export const CANDIDATE_SEQUENCE_CTA = "Activer ma recherche maintenant";
export const CANDIDATE_SEQUENCE_DAYS = [0, 1, 3, 7, 10, 14] as const;

const messages = [
  {
    name: "Pas le temps de visiter ?",
    subject: "Pas le temps de visiter ? Nous prenons le relais.",
    preheader: "Recherche, visites, candidatures : avancez sans bouleverser votre agenda.",
    title: "Votre prochain logement mérite une place dans votre agenda. Pas toute la place.",
    image: "01-visites-deleguees.jpg",
    alt: "Une agente réalise une visite à distance dans un appartement lumineux.",
    intro: "Entre le travail, les déplacements et les rendez-vous, trouver un appartement peut vite devenir un deuxième emploi. Et lorsqu’un logement vous plaît, vous n’êtes pas toujours disponible pour le visiter. Avec Logisorama, vous pouvez avancer sans porter seul toutes ces démarches.",
    heading: "Vous choisissez les logements. Nous organisons la suite.",
    paragraphs: [
      "Confiez votre recherche à un agent immobilier : nous sélectionnons des appartements selon vos critères, organisons les visites des biens qui vous intéressent et préparons vos postulations avec votre dossier. Vous gardez la main sur votre projet, avec un professionnel pour le faire avancer.",
      "Moins d’allers-retours à gérer, plus de disponibilité pour prendre vos décisions. Une visite incompatible avec votre emploi du temps ne doit plus être le seul frein à votre candidature.",
    ],
    highlight: "Recherche · Visites · Postulations : un accompagnement de A à Z.",
    closing: "Votre prochaine étape est simple : vérifiez vos critères, signez votre mandat et finalisez l’activation. Nous pourrons alors prendre le relais sur votre recherche.",
  },
  {
    name: "Un agent de votre région",
    subject: "Et si un agent de votre région cherchait pour vous ?",
    preheader: "Des critères précis, une sélection ciblée et un interlocuteur pour avancer.",
    title: "Vous avez un projet. Donnez-lui un agent immobilier.",
    image: "02-agent-regional.jpg",
    alt: "Un agent étudie les quartiers et les logements d’une région de Suisse romande.",
    intro: "Ouvrir les annonces matin et soir ne suffit pas toujours à trouver le bon appartement. Il faut aussi comparer, vérifier les conditions et réagir lorsque le bien correspond à votre situation. Vous pouvez confier ce travail à un professionnel de votre région.",
    heading: "Une recherche guidée par ce qui compte pour vous.",
    paragraphs: [
      "Votre budget, les communes qui vous intéressent, le nombre de pièces et votre date d’emménagement deviennent les repères de notre recherche. Notre équipe sélectionne les possibilités pertinentes et vous accompagne pour passer de l’annonce à une candidature préparée.",
      "Vous n’avez plus à tout suivre seul. Votre espace Logisorama reste accessible à toute heure pour consulter votre recherche, et votre agent vous accompagne dans les démarches et les choix à faire.",
    ],
    highlight: "Un interlocuteur, vos critères et une recherche qui garde le cap.",
    closing: "Vous connaissez déjà vos priorités ? Faites-en le point de départ d’un accompagnement concret. Activez votre recherche pour confier votre projet à notre équipe.",
  },
  {
    name: "Candidature sans réponse",
    subject: "Toujours sans réponse pour votre candidature ?",
    preheader: "Ne laissez pas une seule réponse en attente immobiliser toute votre recherche.",
    title: "Vous avez postulé. Et maintenant, vous attendez ?",
    image: "03-candidature.jpg",
    alt: "Une agente transmet un dossier de candidature à un interlocuteur immobilier.",
    intro: "Vous avez visité un appartement, envoyé votre dossier, puis attendu un appel qui ne vient pas. Cette incertitude est fatigante, surtout lorsque votre date de déménagement approche. Vous n’êtes pas obligé de continuer seul ni de miser toute votre recherche sur une seule candidature.",
    heading: "Laissez-nous prendre le relais.",
    paragraphs: [
      "Nous vous aidons à réunir les pièces utiles, à préparer un dossier clair et à le transmettre à l’interlocuteur chargé du logement. En parallèle, nous poursuivons la recherche d’appartements adaptés à vos critères et organisons les prochaines démarches avec vous.",
      "L’objectif est de faire avancer votre projet avec méthode : des logements sélectionnés, des visites organisées et des postulations préparées. La décision reste celle du bailleur ou de la gérance ; notre rôle est de vous accompagner sérieusement à chaque étape.",
    ],
    highlight: "Votre dossier mérite une démarche suivie, pas seulement un email envoyé.",
    closing: "Transformez cette attente en prochaine étape. Activez votre recherche et donnez à notre équipe les moyens de travailler à vos côtés.",
  },
  {
    name: "Tout votre parcours accompagné",
    subject: "Recherche, visites, dossier : on s’occupe de la suite avec vous.",
    preheader: "Un seul accompagnement pour les démarches qui prennent le plus de temps.",
    title: "Gardez votre énergie pour choisir votre futur chez-vous.",
    image: "04-accompagnement.jpg",
    alt: "Un dossier, un stylo et un logement illustrent les étapes d’un projet accompagné.",
    intro: "Chercher un logement, ce n’est pas seulement trouver une annonce. C’est aussi planifier les visites, rassembler les documents et suivre plusieurs candidatures à la fois. Avec Logisorama, ces étapes s’inscrivent dans un même accompagnement, avec un agent pour vous guider.",
    heading: "De la première sélection à la postulation.",
    paragraphs: [
      "Nous recherchons des appartements selon vos critères, vous aidons à sélectionner ceux qui vous plaisent, organisons les visites et préparons le dépôt de votre dossier. Vous connaissez la prochaine étape et pouvez vous concentrer sur les décisions qui vous concernent.",
      "Vous restez au centre du projet : vos besoins, votre budget et vos choix orientent notre travail. Nous prenons en charge les démarches prévues au mandat pour vous apporter du temps, de la clarté et un suivi professionnel.",
    ],
    highlight: "Vous décidez où vous souhaitez vivre. Nous vous aidons à y parvenir.",
    closing: "Votre espace est déjà le point de départ. Vérifiez vos informations et finalisez votre mandat pour passer de la recherche en solo à un accompagnement actif.",
  },
  {
    name: "Une recherche urgente",
    subject: "Votre déménagement approche ? Faisons avancer votre recherche.",
    preheader: "Une date à respecter mérite une recherche organisée dès maintenant.",
    title: "Quand le temps compte, chaque démarche doit être utile.",
    image: "05-recherche-urgente.jpg",
    alt: "Une horloge, un carnet et des clés évoquent le calendrier d’une recherche de logement.",
    intro: "Une fin de bail, un nouvel emploi ou un changement de situation : lorsque votre recherche devient urgente, vous avez besoin de savoir quoi faire ensuite. Multiplier les annonces consultées ne suffit pas. Nous vous aidons à concentrer vos efforts sur les démarches qui font avancer votre projet.",
    heading: "Un objectif de 15 à 45 jours, une méthode dès le départ.",
    paragraphs: [
      "Nous construisons la recherche autour de votre date cible, de votre budget et des secteurs où vous pouvez vous installer. Une sélection ciblée, des visites organisées et un dossier préparé permettent de vous positionner lorsque des logements correspondent à vos critères.",
      "Notre objectif est de vous aider à trouver en 15 à 45 jours. Il s’agit d’un objectif, pas d’un délai garanti : le résultat dépend notamment des biens disponibles, de vos critères et de la décision des bailleurs. Votre agent fait le point avec vous sur les priorités de votre recherche.",
    ],
    highlight: "Plus tôt votre mandat est activé, plus tôt votre accompagnement peut commencer.",
    closing: "Indiquez votre échéance et finalisez votre activation maintenant. Vous donnerez à votre recherche un cadre concret, avec une équipe pour vous accompagner.",
  },
  {
    name: "Une commission au succès",
    subject: "Pas de bail conclu grâce à nous, pas de commission.",
    preheader: "CHF 300 à l’activation, déduits en cas de succès. Remboursement sous conditions.",
    title: "Votre commission, uniquement au succès.",
    image: "06-succes.jpg",
    alt: "Une agente remet les clés d’un logement à un locataire.",
    intro: "Confier votre recherche est une décision importante. Vous devez savoir ce que vous payez et quand. Chez Logisorama, la commission est due uniquement lorsqu’un bail valable est conclu grâce à notre intervention. Un acompte de CHF 300 reste dû à l’activation, déduit en cas de succès et remboursable sous les conditions détaillées ci-dessous.",
    heading: "Un acompte pour démarrer. Des conditions claires.",
    paragraphs: [
      "Un acompte de CHF 300 est dû pour activer votre recherche. Il est déduit de la commission en cas de succès. Cette commission correspond à un mois de loyer brut, avec un minimum de CHF 500 et la TVA uniquement si elle est due, conformément au mandat.",
      "Sans bail conclu, vous pouvez demander le remboursement de l’acompte à l’échéance des 90 jours : la fin du mandat et la demande de remboursement doivent être notifiées entre le 75e et le 90e jour. Le remboursement intervient alors sous 30 jours après l’échéance. Sans cette démarche, le mandat se renouvelle ; en cas de résiliation anticipée de votre part, l’acompte reste acquis selon le contrat.",
    ],
    highlight: "Les conditions complètes sont présentées avant votre signature.",
    closing: "Vous souhaitez avancer avec un professionnel et un cadre transparent ? Consultez votre mandat, posez-nous vos questions si nécessaire, puis activez votre recherche lorsque vous êtes prêt.",
  },
] as const;

export const CANDIDATE_NEWSLETTER_TEMPLATES = messages.map((message, index) => {
  const url = `https://logisorama.ch/nouveau-mandat?utm_source=newsletter&utm_medium=email&utm_campaign=${CANDIDATE_SEQUENCE_VERSION}&utm_content=etape-${index + 1}`;
  const image = `/newsletter/candidats-2026-10/${message.image}`;
  const p = (text: string) => `<p style="margin:0 0 18px;">${escape(text)}</p>`;
  return {
    id: `candidat-conversion-${index + 1}`,
    name: `${index + 1}. ${message.name}`,
    audience: "Candidats · recherche non activée",
    subject: message.subject,
    preheader: message.preheader,
    description: `J${CANDIDATE_SEQUENCE_DAYS[index] === 0 ? "0" : `+${CANDIDATE_SEQUENCE_DAYS[index]}`} · ${message.highlight}`,
    image,
    html: renderCorporateEmail({
      title: message.title,
      preview: message.preheader,
      category: "VOTRE RECHERCHE DE LOCATION",
      bodyHtml: `<a href="${escape(url)}"><img src="https://logisorama.ch${image}" width="568" alt="${escape(message.alt)}" style="display:block;border:0;width:100%;height:auto;margin:0 0 26px;"></a>
${p("Bonjour,")}${p(message.intro)}
${emailButton(CANDIDATE_SEQUENCE_CTA, url)}
<h2 style="margin:28px 0 16px;font:700 24px/30px Arial,Helvetica,sans-serif;color:#193d2c;letter-spacing:-.4px;">${escape(message.heading)}</h2>
${message.paragraphs.map(p).join("\n")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="padding:20px 22px;background:#f3f4ed;border-left:3px solid #205a43;font:700 17px/26px Arial,Helvetica,sans-serif;color:#205a43;">${escape(message.highlight)}</td></tr></table>
${p(message.closing)}${emailButton(CANDIDATE_SEQUENCE_CTA, url)}
<p style="margin:0;font-size:14px;line-height:22px;color:#5c665e;">Vous avez déjà un compte ? Utilisez la même adresse email et connectez-vous si nécessaire pour poursuivre votre démarche.</p>`,
      signatureHtml: "<strong>Au plaisir de vous accompagner,</strong><br>L’équipe Logisorama · Immo-rama<br>Recherche · Visites · Postulations",
      footerHtml: "Immo-rama.ch · Chemin de l’Esparcette 5, 1023 Crissier<br>Visuels d’illustration.<br><a href=\"{{unsubscribe_url}}\" style=\"color:#5c665e;text-decoration:underline;\">Se désinscrire</a>",
    }),
  };
});
