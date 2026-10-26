// Outils de Steeve, lot 2 : lecture seule, plus la transmission à l'agent.
/* eslint-disable @typescript-eslint/no-explicit-any -- réponses JSON des fonctions de la base et de l’API, validées champ par champ */
// L'identifiant du client vient toujours de la conversation, jamais des paramètres du modèle.
// deno-lint-ignore-file no-explicit-any
import type { ToolDefinition } from './anthropic.ts';
import { zurichToUtc } from './dates.ts';
import { applications, documentsStatus, mandate, offers, visits, type Db, type Dossier } from './context.ts';
import { facturesDuClient, type AbaNinjaPort } from './abaninja.ts';

export const STEEVE_TOOLS: ToolDefinition[] = [
  {
    name: 'get_documents',
    description: "Pièces du dossier par personne (client, garant, colocataire…) : attendues, déposées, manquantes, état de vérification, demandes de l'agent en attente, validité de l'extrait des poursuites.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_offers',
    description: "Offres de biens envoyées au client, les plus récentes d'abord, avec leur statut pour ce client.",
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['envoyee', 'vue', 'interesse', 'visite_planifiee', 'visite_confirmee', 'visite_effectuee', 'souhaite_postuler', 'candidature_deposee', 'acceptee', 'refusee'],
          description: 'Filtre facultatif sur le statut.',
        },
        limit: { type: 'integer', minimum: 1, maximum: 15 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_visits',
    description: 'Visites du client (date et heure de Zurich, adresse, statut, décision).',
    input_schema: {
      type: 'object',
      properties: { scope: { type: 'string', enum: ['a_venir', 'passees', 'toutes'] } },
      required: ['scope'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_applications',
    description: 'Candidatures déposées et préparation des dossiers de postulation (prêt, bloqué, éléments manquants).',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_mandate',
    description: "Mandat du client : statut, acompte, jour du cycle, fin du cycle, pause, résiliation, remboursement et ouverture de la fenêtre de demande.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'propose_action',
    description: "Prépare une action que l'équipe validera et fera elle-même (rien n'est exécuté ni envoyé par Steeve). Jamais pour ce que tes outils font directement : critères (modifier_criteres), réponse à une offre (repondre_offre), demande de visite (demander_visite), visite déléguée (deleguer_visite), confirmation de présence (confirmer_visite), inscription à une visite groupée (inscrire_visite). Types : note_agent (demande ou information pour l'agent : visite déjà fixée à replanifier, question particulière pour une régie… ; la conversation reste avec Steeve), relance_regie (brouillon poli de relance de la régie pour une candidature du client ; préciser le bien), preuve_paiement (le client dit avoir payé ou a déposé une preuve de paiement : l'équipe vérifie et active).",
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['note_agent', 'relance_regie', 'preuve_paiement'] },
        titre: { type: 'string', description: 'Titre court pour l’équipe, ex. « Ajouter Morges aux zones ».' },
        texte: { type: 'string', description: "Détail pour l'équipe, ou brouillon de l'e-mail de relance (vouvoiement, factuel, sans promesse)." },
        bien: { type: 'string', description: 'Pour relance_regie : adresse du bien telle qu’elle figure dans les candidatures.' },
      },
      required: ['type', 'titre', 'texte'],
      additionalProperties: false,
    },
  },
  {
    name: 'demander_postulation',
    description: "Demande de postuler pour un bien, au nom du client, après la visite (mêmes règles que le bouton « Postuler » de l'application) : l'équipe prépare le dossier, Steeve le contrôle et l'envoie à la régie. À utiliser seulement si le client dit clairement qu'il veut postuler pour ce bien. Rien n'est envoyé à la régie à ce moment.",
    input_schema: {
      type: 'object',
      properties: {
        bien: { type: 'string', description: "Adresse du bien telle qu'elle figure dans ses offres (ou identifiant de l'offre)." },
      },
      required: ['bien'],
      additionalProperties: false,
    },
  },
  {
    name: 'repondre_offre',
    description: "Enregistre la réponse du client à une offre reçue, comme les boutons « Intéressé » / « Pas intéressé » de l'application : interesse ou refuse. Seulement sur demande claire du client pour un bien précis. Une offre déjà plus loin (visite, candidature) n'est pas modifiée. L'agent est prévenu.",
    input_schema: {
      type: 'object',
      properties: {
        bien: { type: 'string', description: "Adresse du bien telle qu'elle figure dans ses offres (ou identifiant de l'offre)." },
        reponse: { type: 'string', enum: ['interesse', 'refuse'] },
      },
      required: ['bien', 'reponse'],
    },
  },
  {
    name: 'demander_visite',
    description: "Demande une visite d'un bien de ses offres à l'annonceur : e-mail depuis visites@immo-rama.ch à l'adresse vérifiée, ou message dans le chat Flatfox par la routine. C'est une DEMANDE, pas un rendez-vous : la date n'existe que quand l'annonceur la confirme. Une seule demande par bien.",
    input_schema: {
      type: 'object',
      properties: {
        bien: { type: 'string', description: "Adresse du bien telle qu'elle figure dans ses offres (ou identifiant de l'offre)." },
        precision: { type: 'string', description: 'Disponibilités ou précision donnée par le client, facultatif.' },
      },
      required: ['bien'],
    },
  },
  {
    name: 'modifier_criteres',
    description: "Modifie TOI-MÊME ses critères de recherche, tout de suite, sans validation humaine, sur demande claire du client : budget maximum (CHF par mois), nombre MINIMUM de pièces, régions / communes (liste complète), type de bien, souhaits particuliers. Seulement les champs demandés. Ajout « en plus » des critères actuels : pièces = la plus petite des deux tailles (ex. 3 pièces actuelles + « 2,5 pièces en plus » → 2.5, qui couvre 2,5 et 3) ; budget = le plus élevé des deux (1800 actuel + « jusqu'à 1900 » → 1900) ; régions = les actuelles ET les nouvelles. Remplacement : seulement les nouvelles valeurs. Si on ne sait pas s'il veut remplacer ou ajouter, ou si la valeur est floue (« un peu plus de budget »), une seule question précise, puis agis. Après l'appel, dis au client ce qui a changé (avant → après). L'avant/après est tracé et l'agent prévenu.",
    input_schema: {
      type: 'object',
      properties: {
        budget_max: { type: 'number' },
        pieces: { type: 'number', description: 'Par demi-pièce, ex. 2.5.' },
        region_recherche: { type: 'string', description: 'Liste complète des régions ou communes voulues.' },
        type_bien: { type: 'string', enum: ['Appartement', 'Villa & maison', 'Maison', 'Studio', 'Chambre', 'Local commercial', 'Autre'] },
        souhaits_particuliers: { type: 'string' },
      },
    },
  },
  {
    name: 'chercher_offres',
    description: "Lance TOUT DE SUITE une recherche d'offres de location pour ce client, avec ses critères enregistrés et le mode d'emploi des routines d'offres (zone, plafond de loyer, pièces, exigences écrites prouvées, aucun doublon, 6 offres par jour au maximum). Les offres conformes arrivent dans sa messagerie et dans « Offres reçues » en quelques minutes, et tu lui écris le résultat. À utiliser quand il demande des offres, un logement, « envoie-moi … » ; après modifier_criteres la recherche part déjà toute seule. Si sa demande contient de NOUVEAUX critères, appelle d'abord modifier_criteres. Ne promets jamais un nombre d'offres.",
    input_schema: { type: 'object', properties: { precision: { type: 'string', description: 'Ce que le client a demandé, en quelques mots.' } } },
  },
  {
    name: 'deleguer_visite',
    description: "Visite DÉLÉGUÉE : un collaborateur de l'agence visite le bien à la place du client et lui fait un compte rendu. Consomme 1 crédit de visite déléguée (location ; gratuit en achat) : seulement si le client dit clairement qu'il veut déléguer la visite de CE bien (« visitez pour moi », « je ne peux pas y aller, déléguez »). Si une visite à venir existe déjà, elle devient déléguée ; si un créneau est connu, la visite est publiée aux coursiers ; sinon Steeve demande la date à l'annonceur et la visite déléguée est créée dès sa réponse. Une seule délégation par bien (pas de crédit en double).",
    input_schema: {
      type: 'object',
      properties: {
        bien: { type: 'string', description: "Adresse du bien telle qu'elle figure dans ses offres (ou identifiant de l'offre)." },
        date: { type: 'string', description: "Facultatif : créneau DÉJÀ fixé ou proposé par l'annonceur, heure suisse au format AAAA-MM-JJTHH:MM (ex. 2026-10-30T17:30). Ne jamais inventer : sans créneau connu, laisse vide." },
        precision: { type: 'string', description: 'Ce que le client veut que le collaborateur vérifie, facultatif.' },
      },
      required: ['bien'],
      additionalProperties: false,
    },
  },
  {
    name: 'confirmer_visite',
    description: "Le client accepte un créneau de visite PROPOSÉ (statut « créneau proposé » : la visite devient confirmée) ou confirme sa présence à une visite à venir déjà fixée, comme le bouton « Je confirme » de l'application. Seulement sur accord clair du client. Plusieurs créneaux à venir pour le même bien : donne la date choisie.",
    input_schema: {
      type: 'object',
      properties: {
        bien: { type: 'string', description: "Adresse du bien telle qu'elle figure dans ses offres (ou identifiant de l'offre)." },
        date: { type: 'string', description: 'Facultatif : créneau choisi, heure suisse AAAA-MM-JJTHH:MM.' },
      },
      required: ['bien'],
      additionalProperties: false,
    },
  },
  {
    name: 'visite_effectuee',
    description: "Le client dit qu'il a VISITÉ le bien : la visite passée est notée effectuée (comme le bouton « Visite effectuée » de l'application), ce qui permet ensuite la postulation. Sans visite enregistrée (il a visité de son côté), donne la date et l'heure de sa visite, telles qu'il les dit. Refusé si la visite est encore à venir. Après l'outil, s'il veut postuler, appelle demander_postulation.",
    input_schema: {
      type: 'object',
      properties: {
        bien: { type: 'string', description: "Adresse du bien telle qu'elle figure dans ses offres (ou identifiant de l'offre)." },
        date: { type: 'string', description: "Seulement si aucune visite n'est enregistrée : date et heure de sa visite, heure suisse AAAA-MM-JJTHH:MM (jamais inventée)." },
      },
      required: ['bien'],
      additionalProperties: false,
    },
  },
  {
    name: 'inscrire_visite',
    description: "Visite groupée sur inscription (annonce Flatfox « visite sur inscription », créneau publié par l'annonceur) : la routine de l'agence inscrit le client sur Flatfox, puis la visite est enregistrée et le client prévenu ici. Seulement si le client veut y aller (ou la déléguer). Ce n'est confirmé qu'après l'inscription réelle.",
    input_schema: {
      type: 'object',
      properties: {
        bien: { type: 'string', description: "Adresse du bien telle qu'elle figure dans ses offres (ou identifiant de l'offre)." },
        creneau: { type: 'string', description: "Créneau choisi s'il y en a plusieurs (ex. « jeudi 29.10 à 17h30 »), facultatif." },
      },
      required: ['bien'],
      additionalProperties: false,
    },
  },
  {
    name: 'annuler_criteres',
    description: "Revient aux critères de recherche d'avant le dernier changement fait par Steeve (14 jours au plus), sur demande claire du client (« remets comme avant », « annule ce changement »). Dis ensuite ce qui a changé (avant → après).",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'facture',
    description: "Factures du client dans la comptabilité de l'agence (AbaNinja) : etat = numéro, date, montant, montant encore ouvert, payée ou non, et l'état de l'activation du compte ; renvoyer = AbaNinja renvoie par e-mail la facture ouverte la plus récente, à l'adresse enregistrée sur la facture (une fois par jour au plus). Sans facture trouvée, l'équipe est prévenue pour l'émettre. Un paiement Twint ou un virement récent peut ne pas encore apparaître : propose alors d'envoyer la preuve de paiement (trombone).",
    input_schema: {
      type: 'object',
      properties: { action: { type: 'string', enum: ['etat', 'renvoyer'] } },
      required: ['action'],
      additionalProperties: false,
    },
  },
  {
    name: 'demande_mandat',
    description: "Enregistre une demande FORMELLE de résiliation du mandat ou de remboursement de l'acompte, que l'équipe traite (rien n'est résilié ni remboursé par Steeve). L'outil rend le jour du cycle et si la fenêtre de remboursement (jours 80 à 90) est ouverte, selon les règles du mandat. Seulement si le client le demande clairement ; demande-lui d'abord la raison s'il ne l'a pas donnée (a trouvé seul, ne cherche plus, cherche seul).",
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['resiliation', 'remboursement'] },
        raison: { type: 'string', enum: ['found_alone', 'not_searching_anymore', 'searching_alone', 'autre'], description: 'found_alone = a trouvé un logement seul ; not_searching_anymore = ne cherche plus ; searching_alone = cherche seul.' },
        precision: { type: 'string', description: 'Ce que dit le client, en une ou deux phrases.' },
      },
      required: ['type'],
      additionalProperties: false,
    },
  },
  {
    name: 'demander_rappel',
    description: "Le client (ou un proche du dossier : conjoint, garant…) veut être rappelé ou avoir un rendez-vous avec son agent : la demande est posée dans l'agenda de l'agent, qui fixe l'heure avec lui. Ce n'est pas un rendez-vous confirmé.",
    input_schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['rappel', 'rendez_vous'] },
        objet: { type: 'string', description: 'Sujet du rappel ou du rendez-vous.' },
        disponibilites: { type: 'string', description: 'Disponibilités données par le client, telles quelles.' },
        avec: { type: 'string', description: 'Personne qui sera présente si ce n’est pas le client seul (ex. « son mari »).' },
      },
      required: ['mode', 'objet'],
      additionalProperties: false,
    },
  },
  {
    name: 'transfer_to_agent',
    description: "Rend toute la conversation à l'agent du client (Steeve arrête alors de répondre ici). Seulement si le client demande explicitement une personne, est mécontent ou en désaccord, en cas d'urgence, ou pour un sujet sensible (signature, bail, dossier retenu, paiement contesté, litige, poursuites). Une demande de résiliation ou de remboursement s'enregistre d'abord avec demande_mandat ; un rappel ou rendez-vous avec demander_rappel. Pour une simple action que Steeve ne peut pas faire (visite déjà fixée à déplacer, question particulière…), utiliser propose_action de type note_agent : la conversation reste avec Steeve.",
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Motif court, par exemple « ajout de Morges aux zones de recherche ».' },
        summary: { type: 'string', description: "Résumé pour l'agent : ce que veut le client et ce que Steeve a vérifié." },
      },
      required: ['reason', 'summary'],
      additionalProperties: false,
    },
  },
];

export interface ToolContext {
  db: Db;
  dossier: Dossier;
  conversationId: string;
  now: Date;
  /** Comptabilité (factures) ; absente si la clé AbaNinja n'est pas configurée. */
  abaninja?: AbaNinjaPort | null;
}

export interface ToolOutcome {
  content: string;
  isError?: boolean;
  transferred?: boolean;
}

const json = (v: unknown) => JSON.stringify(v);

export async function runTool(name: string, input: Record<string, any>, ctx: ToolContext): Promise<ToolOutcome> {
  const { db, dossier, now } = ctx;
  switch (name) {
    case 'get_documents':
      return { content: json(await documentsStatus(db, dossier)) };
    case 'get_offers': {
      const limit = Number.isInteger(input?.limit) ? input.limit : undefined;
      const status = typeof input?.status === 'string' ? input.status : undefined;
      return { content: json(await offers(db, dossier.clientId, { status, limit })) };
    }
    case 'get_visits': {
      const scope = ['a_venir', 'passees', 'toutes'].includes(input?.scope) ? input.scope : 'a_venir';
      return { content: json(await visits(db, dossier.clientId, scope, now)) };
    }
    case 'get_applications':
      return { content: json(await applications(db, dossier.clientId)) };
    case 'get_mandate':
      return { content: json(mandate(dossier, now)) };
    case 'demander_postulation':
      return await requestPostulation(db, dossier.clientId, String(input?.bien ?? ''));
    case 'repondre_offre':
      return await clientOfferAnswer(ctx, String(input?.bien ?? ''), input?.reponse === 'refuse' ? 'refuse' : input?.reponse === 'interesse' ? 'interesse' : '');
    case 'demander_visite':
      return await clientVisitRequest(ctx, String(input?.bien ?? ''), input?.precision ? String(input.precision).slice(0, 300) : null);
    case 'deleguer_visite':
      return await clientDelegateVisit(ctx, String(input?.bien ?? ''), input?.date ? String(input.date).trim() : '', input?.precision ? String(input.precision).slice(0, 300) : null);
    case 'confirmer_visite':
      return await clientConfirmVisit(ctx, String(input?.bien ?? ''), input?.date ? String(input.date).trim() : '');
    case 'visite_effectuee':
      return await clientVisitDone(ctx, String(input?.bien ?? ''), input?.date ? String(input.date).trim() : '');
    case 'annuler_criteres':
      return await clientUndoCriteria(ctx);
    case 'facture':
      return await clientInvoice(ctx, input?.action === 'renvoyer' ? 'renvoyer' : 'etat');
    case 'demande_mandat':
      return await clientMandateRequest(ctx, input ?? {});
    case 'demander_rappel':
      return await clientCallback(ctx, input ?? {});
    case 'inscrire_visite':
      return await clientRegisterVisit(ctx, String(input?.bien ?? ''), input?.creneau ? String(input.creneau).slice(0, 120) : null);
    case 'modifier_criteres':
      return await clientCriteria(ctx, input ?? {});
    case 'chercher_offres':
      return await clientOfferSearch(ctx, String(input?.precision ?? '').slice(0, 200));
    case 'transfer_to_agent':
      return await transferToAgent(ctx, String(input?.reason || '').slice(0, 200), String(input?.summary || '').slice(0, 1500));
    case 'propose_action':
      return await proposeAction(ctx, input);
    default:
      return { content: `Outil inconnu : ${name}`, isError: true };
  }
}

/** Passe la conversation en mode agent et prévient l'agent (ou les admins à défaut). */
export async function transferToAgent(ctx: ToolContext, reason: string, summary: string): Promise<ToolOutcome> {
  const { db, conversationId, dossier } = ctx;
  // Déjà transmise (ou reprise par un agent) : pas de seconde notification.
  const { data: current } = await db.from('conversations').select('handled_by').eq('id', conversationId).single();
  if (current && current.handled_by !== 'steeve') {
    return { content: json({ transfere: true, deja_transmise: true }), transferred: true };
  }
  const { error: convError } = await db
    .from('conversations')
    .update({ handled_by: 'agent', handled_by_user: null, handled_since: ctx.now.toISOString() })
    .eq('id', conversationId)
    .eq('handled_by', 'steeve');
  if (convError) return { content: `Transfert impossible : ${convError.message}`, isError: true };

  const { data: links } = await db.from('conversation_agents').select('agent_id').eq('conversation_id', conversationId);
  const agentIds = [...new Set((links || []).map((l: any) => String(l.agent_id)))];
  let recipients: string[] = [];
  let toAdmins = false;
  if (agentIds.length) {
    const { data: agents } = await db.from('agents').select('user_id').in('id', agentIds);
    recipients = (agents || []).map((a: any) => a.user_id).filter(Boolean);
  }
  if (!recipients.length) {
    const { data: admins } = await db.from('user_roles').select('user_id').eq('role', 'admin');
    recipients = (admins || []).map((a: any) => a.user_id).filter(Boolean);
    toAdmins = true;
  }

  const who = dossier.prenom || 'Un client';
  for (const userId of [...new Set(recipients)]) {
    await db.rpc('create_notification', {
      p_user_id: userId,
      p_type: 'new_message',
      p_title: `Steeve vous transmet : ${reason || 'demande du client'}`,
      p_message: `${who} — ${summary}`.slice(0, 500),
      p_link: `/${toAdmins ? 'admin' : 'agent'}/messagerie?conversationId=${conversationId}`,
      p_metadata: { conversation_id: conversationId, source: 'steeve_transfer', reason },
    });
  }
  return { content: json({ transfere: true, agents_prevenus: recipients.length }), transferred: true };
}

const PROPOSAL_KINDS = ['note_agent', 'changement_criteres', 'relance_regie', 'preuve_paiement'] as const;
const PROPOSAL_LABEL: Record<string, string> = {
  note_agent: 'Note de Steeve',
  changement_criteres: 'Changement de critères demandé',
  relance_regie: 'Relance de régie à valider',
  preuve_paiement: 'Preuve de paiement à vérifier',
};

/** Enregistre une proposition que l'équipe validera ; aucune action n'est exécutée. */
export async function proposeAction(ctx: ToolContext, input: Record<string, any>): Promise<ToolOutcome> {
  const { db, dossier, conversationId } = ctx;
  const kind = String(input?.type || '');
  // Les critères se modifient directement (modifier_criteres) : jamais de demande de validation pour ça.
  if (kind === 'changement_criteres') return { content: json({ erreur: 'Les critères se modifient directement avec modifier_criteres, sans validation humaine : appelle modifier_criteres avec les nouvelles valeurs.' }), isError: true };
  if (!(PROPOSAL_KINDS as readonly string[]).includes(kind)) return { content: 'Type de proposition inconnu.', isError: true };
  const title = String(input?.titre || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const body = String(input?.texte || '').trim().slice(0, 1500);
  if (!title || !body) return { content: 'Titre et texte requis.', isError: true };

  let candidatureId: string | null = null;
  let offreId: string | null = null;
  if (kind === 'relance_regie') {
    const bien = String(input?.bien || '').trim().toLowerCase();
    const { data: cands } = await db.from('candidatures').select('id, offre_id').eq('client_id', dossier.clientId).limit(20);
    const ids = (cands || []).map((c: any) => c.offre_id).filter(Boolean);
    const { data: offs } = ids.length ? await db.from('offres').select('id, adresse').in('id', ids) : { data: [] };
    const match = (offs || []).find((o: any) => bien && String(o.adresse || '').toLowerCase().includes(bien.slice(0, 40)))
      || ((offs || []).length === 1 ? (offs as any[])[0] : null);
    if (!match) return { content: json({ erreur: "Candidature introuvable pour ce bien : demande au client de préciser l'adresse, ou vérifie avec get_applications." }), isError: true };
    offreId = match.id;
    candidatureId = (cands || []).find((c: any) => c.offre_id === match.id)?.id ?? null;
  }

  // Pas de doublon : même demande encore en attente depuis moins de 24 h.
  const since = new Date(ctx.now.getTime() - 24 * 3600 * 1000).toISOString();
  const { data: existing } = await db.from('steeve_proposals').select('id')
    .eq('client_id', dossier.clientId).eq('kind', kind).eq('status', 'a_valider').eq('title', title).gte('created_at', since).limit(1);
  if (existing && existing.length) return { content: json({ proposition_enregistree: true, deja_en_attente: true }) };

  const { error } = await db.from('steeve_proposals').insert({
    kind, client_id: dossier.clientId, conversation_id: conversationId, candidature_id: candidatureId, offre_id: offreId, title, body,
    status: 'a_valider',
  });
  if (error) return { content: `Proposition impossible : ${error.message}`, isError: true };

  // Prévenir l'agent du client (et l'équipe admin pour une preuve de paiement, ou à défaut d'agent).
  const { data: links } = await db.from('conversation_agents').select('agent_id').eq('conversation_id', conversationId);
  const agentIds = [...new Set((links || []).map((l: any) => String(l.agent_id)))];
  const agentUsers: string[] = [];
  if (agentIds.length) {
    const { data: agents } = await db.from('agents').select('user_id').in('id', agentIds);
    for (const a of agents || []) if (a.user_id) agentUsers.push(a.user_id);
  }
  const adminUsers: string[] = [];
  if (kind === 'preuve_paiement' || !agentUsers.length) {
    const { data: admins } = await db.from('user_roles').select('user_id').eq('role', 'admin');
    for (const a of admins || []) if (a.user_id) adminUsers.push(a.user_id);
  }
  const who = dossier.prenom || 'Un client';
  for (const [userId, link] of [...agentUsers.map((u) => [u, '/agent'] as const), ...adminUsers.map((u) => [u, '/admin/steeve'] as const)]) {
    await db.rpc('create_notification', {
      p_user_id: userId,
      p_type: 'new_message',
      p_title: `${PROPOSAL_LABEL[kind]} : ${title}`.slice(0, 200),
      p_message: `${who} — ${body}`.slice(0, 500),
      p_link: link,
      p_metadata: { conversation_id: conversationId, source: 'steeve_proposal', kind },
    });
  }
  return {
    content: json({
      proposition_enregistree: true,
      a_valider_par: kind === 'preuve_paiement' ? "l'équipe" : 'son agent',
      rappel: "Rien n'est encore fait : l'équipe valide puis s'en occupe. Ne promets aucun délai ni résultat.",
    }),
  };
}


const norm = (v: string | null | undefined) => (v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Postulation demandée par Steeve pour le client : une seule offre du client doit correspondre. */
export async function requestPostulation(db: Db, clientId: string, bien: string): Promise<ToolOutcome> {
  const wanted = norm(bien);
  if (wanted.length < 3) return { content: "Précise le bien (adresse) pour lequel le client veut postuler.", isError: true };
  const { data: list } = await db.from('offres').select('id, adresse, statut').eq('client_id', clientId).limit(200);
  const found = (list ?? []).filter((o: any) => o.id === bien.trim() || (norm(o.adresse) && (norm(o.adresse).includes(wanted) || wanted.includes(norm(o.adresse).split(' ').slice(0, 4).join(' ')))));
  if (found.length === 0) return { content: "Aucune offre de ce client ne correspond à ce bien : demande-lui de préciser l'adresse.", isError: true };
  if (found.length > 1) return { content: `Plusieurs offres correspondent (${found.map((o: any) => o.adresse).slice(0, 4).join(' ; ')}) : demande au client laquelle.`, isError: true };
  const { data, error } = await db.rpc('steeve_request_postulation', { p_client_id: clientId, p_offre_id: found[0].id });
  if (error) {
    // Message de la base lisible (ex. visite pas encore effectuée) ; sinon message neutre.
    const msg = /visite/i.test(error.message ?? '') ? error.message : "La demande de postulation n'a pas pu être enregistrée.";
    return { content: msg, isError: true };
  }
  return {
    content: json({
      demande_enregistree: true,
      bien: found[0].adresse,
      deja_demandee: Boolean((data as any)?.already_requested),
      suite: "L'équipe prépare le dossier ; Steeve le contrôle puis l'envoie à la régie. Rien n'est encore envoyé : ne dis pas que la candidature est déposée.",
    }),
  };
}


// ---------- actions demandées par le client (exécutées pour CE client uniquement, côté serveur) ----------

/** Une seule offre du client doit correspondre au texte ; sinon la liste pour demander laquelle. */
async function matchOffer(ctx: ToolContext, bien: string): Promise<{ id: string; adresse: string } | ToolOutcome> {
  if (bien.trim().length < 2) return { content: 'Précise le bien (adresse).', isError: true };
  const { data, error } = await ctx.db.rpc('steeve_client_offres_match', { p_client_id: ctx.dossier.clientId, p_ref: bien.slice(0, 120) });
  if (error) return { content: 'Offres indisponibles pour le moment.', isError: true };
  const list: any[] = data ?? [];
  if (!list.length) return { content: "Aucune offre de ce client ne correspond : demande-lui de préciser l'adresse.", isError: true };
  if (list.length > 1) return { content: `Plusieurs offres correspondent (${list.map((o) => o.adresse).join(' ; ')}) : demande au client laquelle, sans rien faire.`, isError: true };
  return { id: list[0].offre_id, adresse: list[0].adresse };
}

/** Information de l'agent (ou des admins) sans lui rendre la conversation. */
async function notifyTeam(ctx: ToolContext, title: string, message: string): Promise<void> {
  const { db, conversationId, dossier } = ctx;
  const { data: links } = await db.from('conversation_agents').select('agent_id').eq('conversation_id', conversationId);
  const agentIds = [...new Set((links || []).map((l: any) => String(l.agent_id)))];
  let recipients: string[] = [];
  let toAdmins = false;
  if (agentIds.length) {
    const { data: agents } = await db.from('agents').select('user_id').in('id', agentIds);
    recipients = (agents || []).map((a: any) => a.user_id).filter(Boolean);
  }
  if (!recipients.length) {
    const { data: admins } = await db.from('user_roles').select('user_id').eq('role', 'admin');
    recipients = (admins || []).map((a: any) => a.user_id).filter(Boolean);
    toAdmins = true;
  }
  for (const userId of [...new Set(recipients)]) {
    await db.rpc('create_notification', {
      p_user_id: userId, p_type: 'new_message', p_title: title.slice(0, 120),
      p_message: `${dossier.prenom || 'Un client'} — ${message}`.slice(0, 500),
      p_link: `/${toAdmins ? 'admin' : 'agent'}/messagerie?conversationId=${conversationId}`,
      p_metadata: { conversation_id: conversationId, source: 'steeve_action' },
    });
  }
}

async function clientOfferAnswer(ctx: ToolContext, bien: string, reponse: string): Promise<ToolOutcome> {
  if (!reponse) return { content: 'Réponse invalide : interesse ou refuse.', isError: true };
  const m = await matchOffer(ctx, bien);
  if ('content' in m) return m;
  const { data, error } = await ctx.db.rpc('steeve_client_reponse_offre', { p_client_id: ctx.dossier.clientId, p_offre_id: m.id, p_reponse: reponse });
  if (error) return { content: "La réponse n'a pas pu être enregistrée.", isError: true };
  if (!data?.ok) return { content: json({ enregistre: false, motif: data?.motif }) };
  if (!data.deja) await notifyTeam(ctx, reponse === 'interesse' ? 'Client intéressé (via Steeve)' : 'Offre refusée (via Steeve)', `${m.adresse} : ${reponse === 'interesse' ? 'intéressé' : 'pas intéressé'}.`);
  return { content: json({ enregistre: true, bien: m.adresse, statut: data.statut, deja: Boolean(data.deja), suite: reponse === 'interesse' ? "Son agent est prévenu. Tu peux proposer de demander une visite." : "Son agent est prévenu." }) };
}

async function clientVisitRequest(ctx: ToolContext, bien: string, precision: string | null): Promise<ToolOutcome> {
  const m = await matchOffer(ctx, bien);
  if ('content' in m) return m;
  const { data, error } = await ctx.db.rpc('steeve_client_demande_visite', { p_client_id: ctx.dossier.clientId, p_offre_id: m.id, p_note: precision });
  if (error) return { content: "La demande de visite n'a pas pu être enregistrée.", isError: true };
  if (!data?.ok) return { content: json({ demandee: false, motif: data?.motif }) };
  if (!data.existante) await notifyTeam(ctx, 'Demande de visite (via Steeve)', `${m.adresse}${precision ? ` — ${precision}` : ''}. Demande envoyée à l'annonceur par Steeve.`);
  return {
    content: json({
      demandee: true, bien: m.adresse, deja_en_cours: Boolean(data.existante),
      canal: data.canal === 'flatfox' ? 'chat Flatfox (routine de l’agence)' : 'e-mail depuis visites@immo-rama.ch',
      suite: "Demande partie (ou part au prochain passage entre 7 h et 20 h). Ce n'est PAS un rendez-vous : la date est confirmée seulement quand l'annonceur répond, et le client est prévenu ici.",
    }),
  };
}

async function clientDelegateVisit(ctx: ToolContext, bien: string, date: string, precision: string | null): Promise<ToolOutcome> {
  let when: Date | null = null;
  if (date) {
    when = zurichToUtc(date.slice(0, 16));
    if (!when) return { content: "Date illisible : donne-la au format AAAA-MM-JJTHH:MM (heure suisse), ou laisse-la vide si aucun créneau n'est fixé.", isError: true };
  }
  const m = await matchOffer(ctx, bien);
  if ('content' in m) return m;
  const { data, error } = await ctx.db.rpc('steeve_client_deleguer_visite', {
    p_client_id: ctx.dossier.clientId, p_offre_id: m.id, p_date: when ? when.toISOString() : null, p_note: precision,
  });
  if (error) {
    console.error('[steeve] deleguer_visite', error.message);
    return { content: "La visite déléguée n'a pas pu être enregistrée.", isError: true };
  }
  if (!data?.ok) return { content: json({ deleguee: false, motif: data?.motif }) };
  if (data.deja) return { content: json({ deleguee: true, deja: true, bien: m.adresse, suite: 'Cette visite est déjà déléguée : aucun crédit de plus.' }) };
  const datee = Boolean(data.date) || Boolean(data.visite_id);
  await notifyTeam(ctx, 'Visite déléguée (via Steeve)', `${m.adresse}${when ? ` — ${fmtZurich(when)}` : datee ? ' — visite déjà fixée' : ' — date demandée à l’annonceur'}${precision ? ` — ${precision}` : ''}.`);
  return {
    content: json({
      deleguee: true, bien: m.adresse,
      quand: when ? fmtZurich(when) : null,
      credits_restants: data.achat ? null : data.credits_restants ?? null,
      suite: datee
        ? "Visite déléguée enregistrée et proposée aux collaborateurs de l'agence ; le client reçoit le compte rendu après la visite. Ne promets pas le nom du collaborateur."
        : "Date demandée à l'annonceur (demande partie ou au prochain passage entre 7 h et 20 h). Dès qu'il confirme, la visite déléguée est créée et le client prévenu ici. Ce n'est PAS encore un rendez-vous.",
    }),
  };
}

async function clientConfirmVisit(ctx: ToolContext, bien: string, date: string): Promise<ToolOutcome> {
  let when: Date | null = null;
  if (date) {
    when = zurichToUtc(date.slice(0, 16));
    if (!when) return { content: 'Date illisible : AAAA-MM-JJTHH:MM (heure suisse).', isError: true };
  }
  const m = await matchOffer(ctx, bien);
  if ('content' in m) return m;
  const { data, error } = await ctx.db.rpc('steeve_client_confirmer_visite', { p_client_id: ctx.dossier.clientId, p_offre_id: m.id, p_date: when ? when.toISOString() : null });
  if (error) return { content: "La confirmation n'a pas pu être enregistrée.", isError: true };
  if (!data?.ok) return { content: json({ confirmee: false, motif: data?.motif, creneaux: data?.creneaux ?? undefined }) };
  if (!data.deja) await notifyTeam(ctx, data.etait_proposee ? 'Créneau accepté par le client (via Steeve)' : 'Présence confirmée (via Steeve)', `${m.adresse} — visite du ${data.le ?? '?'}.`);
  return { content: json({ confirmee: true, bien: m.adresse, le: data.le, deja: Boolean(data.deja), creneau_propose_accepte: Boolean(data.etait_proposee), deleguee: Boolean(data.deleguee) }) };
}

async function clientVisitDone(ctx: ToolContext, bien: string, date: string): Promise<ToolOutcome> {
  let when: Date | null = null;
  if (date) {
    when = zurichToUtc(date.slice(0, 16));
    if (!when) return { content: 'Date illisible : AAAA-MM-JJTHH:MM (heure suisse).', isError: true };
  }
  const m = await matchOffer(ctx, bien);
  if ('content' in m) return m;
  const { data, error } = await ctx.db.rpc('steeve_client_visite_effectuee', { p_client_id: ctx.dossier.clientId, p_offre_id: m.id, p_date: when ? when.toISOString() : null });
  if (error) {
    console.error('[steeve] visite_effectuee', error.message);
    return { content: "La visite n'a pas pu être notée effectuée.", isError: true };
  }
  if (!data?.ok) return { content: json({ notee: false, motif: data?.motif, date_requise: Boolean(data?.date_requise) }) };
  if (!data.deja) await notifyTeam(ctx, 'Visite effectuée (via Steeve)', `${m.adresse} : visite déclarée effectuée par le client.`);
  return {
    content: json({
      notee: true, bien: m.adresse, deja: Boolean(data.deja), postulation_possible: data.postulation_possible !== false,
      suite: 'Visite notée effectuée. Demande-lui ce qu’il en a pensé ; s’il veut postuler, appelle demander_postulation.',
    }),
  };
}

async function clientUndoCriteria(ctx: ToolContext): Promise<ToolOutcome> {
  const { data, error } = await ctx.db.rpc('steeve_client_annuler_criteres', { p_client_id: ctx.dossier.clientId });
  if (error) return { content: "Les critères n'ont pas pu être rétablis.", isError: true };
  if (!data?.ok) return { content: json({ retabli: false, motif: data?.motif }) };
  await notifyTeam(ctx, 'Critères rétablis (via Steeve)', `Retour aux critères d'avant le changement du ${data.change_du}.`);
  return { content: json({ retabli: true, avant: data.avant, apres: data.apres }) };
}

/** Proposition à l'équipe (une seule identique en attente sur 24 h) ; publiée dans la conversation « Steeve » de l'admin. */
async function insertProposal(ctx: ToolContext, kind: string, title: string, body: string, offreId: string | null = null): Promise<boolean> {
  const since = new Date(ctx.now.getTime() - 24 * 3600 * 1000).toISOString();
  const { data: existing } = await ctx.db.from('steeve_proposals').select('id')
    .eq('client_id', ctx.dossier.clientId).eq('kind', kind).eq('status', 'a_valider').eq('title', title).gte('created_at', since).limit(1);
  if (existing && existing.length) return false;
  const { error } = await ctx.db.from('steeve_proposals').insert({
    kind, client_id: ctx.dossier.clientId, conversation_id: ctx.conversationId, offre_id: offreId, title: title.slice(0, 120), body: body.slice(0, 1500), status: 'a_valider',
  });
  if (error) throw new Error(error.message);
  return true;
}

async function clientInvoice(ctx: ToolContext, action: 'etat' | 'renvoyer'): Promise<ToolOutcome> {
  const { data: ident, error } = await ctx.db.rpc('steeve_client_facturation', { p_client_id: ctx.dossier.clientId });
  if (error || !ident) return { content: 'Facturation indisponible pour le moment.', isError: true };
  const activation = ident.activation ?? null;
  if (!ctx.abaninja) {
    return { content: json({ factures: null, activation, avertissement: "La comptabilité n'est pas joignable pour le moment : donne seulement l'état de l'activation, et propose de transmettre à l'équipe." }) };
  }
  let factures;
  try {
    factures = facturesDuClient(await ctx.abaninja.listInvoices(), { emails: ident.emails ?? [], nom: ident.nom ?? null, factures_connues: ident.factures_connues ?? [] });
  } catch (err) {
    console.error('[steeve] facture', (err as Error).message);
    return { content: json({ factures: null, activation, avertissement: 'La comptabilité ne répond pas pour le moment : réessaie plus tard ou propose de transmettre à l’équipe.' }) };
  }
  const visible = factures.map(({ uuid: _u, destinataire_email: _e, ...f }) => f);
  // Payée dans la comptabilité mais compte pas encore activé : l'équipe est prévenue (une fois par jour).
  const payee = factures.find((f) => f.payee);
  if (payee && activation?.demande === 'en_attente') {
    await insertProposal(ctx, 'facture', `Facture ${payee.numero ?? ''} payée : compte à activer`.trim(),
      `AbaNinja montre la facture ${payee.numero ?? ''} du ${payee.date ?? '?'} (${payee.montant_chf ?? '?'} CHF) payée, mais la demande de mandat est encore « en attente ». À vérifier puis activer le compte.`);
  }
  if (action === 'etat') return { content: json({ factures: visible, activation }) };

  const ouverte = factures.find((f) => !f.payee && (f.ouvert_chf ?? 0) > 0);
  if (!ouverte) {
    if (!factures.length) {
      const created = await insertProposal(ctx, 'facture', "Facture d'activation à émettre",
        `Le client demande sa facture d'activation (acompte ${activation?.acompte_chf ?? '?'} CHF) : aucune facture à son nom ou à l'adresse de son compte dans AbaNinja. À émettre depuis « Factures AbaNinja ».`);
      if (created) await notifyTeam(ctx, "Facture d'activation à émettre (via Steeve)", "Aucune facture trouvée dans AbaNinja pour ce client : à émettre.");
      return { content: json({ renvoyee: false, motif: "Aucune facture trouvée à son nom : l'équipe est prévenue pour l'émettre. Ne promets aucun délai." }) };
    }
    return { content: json({ renvoyee: false, motif: 'Aucune facture ouverte : tout est réglé.', factures: visible }) };
  }
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(ctx.now);
  const key = `facture_renvoi:${ouverte.uuid}:${day}`;
  const { data: dup } = await ctx.db.from('steeve_actions').select('id').eq('idempotency_key', key).limit(1);
  if (dup && dup.length) return { content: json({ renvoyee: false, deja_aujourdhui: true, numero: ouverte.numero, motif: 'Déjà renvoyée aujourd’hui : demande-lui de vérifier ses courriers indésirables.' }) };
  const sent = await ctx.abaninja.sendInvoice(ouverte.uuid);
  if (!sent.ok) {
    await insertProposal(ctx, 'facture', `Renvoi de la facture ${ouverte.numero ?? ''} impossible`.trim(), `Le client demande sa facture ; AbaNinja a refusé le renvoi (${sent.detail}). À renvoyer depuis « Factures AbaNinja ».`);
    return { content: json({ renvoyee: false, motif: "Le renvoi n'a pas fonctionné : l'équipe est prévenue et la renvoie." }) };
  }
  await ctx.db.rpc('steeve_journal_client', { p_client_id: ctx.dossier.clientId, p_offre_id: null, p_cle: key, p_note: `Facture ${ouverte.numero ?? ''} renvoyée par AbaNinja`, p_controles: { numero: ouverte.numero, ouvert_chf: ouverte.ouvert_chf } });
  return {
    content: json({
      renvoyee: true, numero: ouverte.numero, montant_chf: ouverte.montant_chf, ouvert_chf: ouverte.ouvert_chf, echeance: ouverte.echeance,
      suite: "Facture renvoyée par e-mail à l'adresse enregistrée sur la facture (vérifier aussi les courriers indésirables). Le compte est activé dès réception du paiement.",
    }),
  };
}

const RAISONS: Record<string, string> = {
  found_alone: 'a trouvé un logement par lui-même', not_searching_anymore: 'ne cherche plus', searching_alone: 'cherche seul', autre: 'autre raison',
};

async function clientMandateRequest(ctx: ToolContext, input: Record<string, any>): Promise<ToolOutcome> {
  const type = input?.type === 'remboursement' ? 'remboursement' : input?.type === 'resiliation' ? 'resiliation' : '';
  if (!type) return { content: 'Type invalide : resiliation ou remboursement.', isError: true };
  const m: any = mandate(ctx.dossier, ctx.now);
  const fenetre = Boolean(m?.remboursement?.fenetre_de_demande_ouverte);
  const raison = RAISONS[String(input?.raison ?? '')] ? String(input.raison) : null;
  const precision = String(input?.precision ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
  const recevable = type === 'resiliation' || fenetre;
  const lignes = [
    `Demande de ${type === 'resiliation' ? 'résiliation du mandat' : "remboursement de l'acompte"} faite à Steeve.`,
    raison ? `Raison : ${RAISONS[raison]} (${raison}).` : 'Raison : non précisée.',
    precision ? `Le client : « ${precision} »` : '',
    m?.parcours === 'achat'
      ? `Mandat d'achat : conditions de résiliation « ${m?.conditions_de_resiliation ?? 'non renseignées'} », de remboursement « ${m?.conditions_de_remboursement ?? 'non renseignées'} ».`
      : `Cycle : jour ${m?.jour_du_cycle_en_cours ?? '?'} (fin le ${m?.fin_du_cycle ?? '?'}) ; fenêtre de remboursement (jours 80 à 90) ${fenetre ? 'OUVERTE' : 'fermée'}${raison === 'found_alone' ? ' ; a trouvé seul : pas de remboursement selon le mandat' : ''}.`,
    m?.remboursement?.statut && m.remboursement.statut !== 'aucune demande' ? `Remboursement : ${m.remboursement.statut}.` : '',
  ].filter(Boolean).join('\n');
  let created = false;
  try {
    created = await insertProposal(ctx, type, type === 'resiliation' ? 'Résiliation du mandat demandée' : 'Remboursement de l’acompte demandé', lignes);
  } catch (err) {
    console.error('[steeve] demande_mandat', (err as Error).message);
    return { content: "La demande n'a pas pu être enregistrée.", isError: true };
  }
  return {
    content: json({
      enregistree: true, deja_en_attente: !created, type,
      jour_du_cycle: m?.jour_du_cycle_en_cours ?? null, fenetre_remboursement_ouverte: fenetre, recevable_selon_le_mandat: recevable && raison !== 'found_alone',
      suite: "Demande enregistrée et transmise à l'équipe, qui la traite et lui répond ici. Rien n'est encore résilié ni remboursé : ne promets ni résultat ni délai. Si la fenêtre de remboursement est fermée, explique la règle (jours 80 à 90 du cycle) sans promettre d'exception.",
    }),
  };
}

async function clientCallback(ctx: ToolContext, input: Record<string, any>): Promise<ToolOutcome> {
  const mode = input?.mode === 'rendez_vous' ? 'rendez_vous' : 'rappel';
  const objet = String(input?.objet ?? '').slice(0, 300);
  const { data, error } = await ctx.db.rpc('steeve_client_demande_rappel', {
    p_client_id: ctx.dossier.clientId, p_objet: objet, p_disponibilites: String(input?.disponibilites ?? '').slice(0, 300),
    p_avec: String(input?.avec ?? '').slice(0, 120), p_mode: mode,
  });
  if (error || !data?.ok) return { content: "La demande n'a pas pu être enregistrée.", isError: true };
  if (!data.deja) await notifyTeam(ctx, mode === 'rendez_vous' ? 'Rendez-vous demandé (via Steeve)' : 'Rappel demandé (via Steeve)', `${objet}${input?.disponibilites ? ` — disponibilités : ${String(input.disponibilites).slice(0, 200)}` : ''}${input?.avec ? ` — avec ${String(input.avec).slice(0, 80)}` : ''}. Posé dans l'agenda, heure à fixer avec le client.`);
  return {
    content: json({
      demande_enregistree: true, deja: Boolean(data.deja),
      suite: "Demande posée dans l'agenda de son agent, qui le contacte pour fixer l'heure. Ce n'est pas encore un rendez-vous confirmé : ne donne ni heure ni délai.",
    }),
  };
}

async function clientRegisterVisit(ctx: ToolContext, bien: string, creneau: string | null): Promise<ToolOutcome> {
  const m = await matchOffer(ctx, bien);
  if ('content' in m) return m;
  const { data, error } = await ctx.db.rpc('steeve_client_inscrire_visite', { p_client_id: ctx.dossier.clientId, p_offre_id: m.id, p_creneau: creneau });
  if (error) return { content: "L'inscription n'a pas pu être demandée.", isError: true };
  if (!data?.ok) return { content: json({ inscription_demandee: false, motif: data?.motif }) };
  if (!data.tache?.existante) await notifyTeam(ctx, 'Inscription à une visite groupée (via Steeve)', `${m.adresse}${creneau ? ` — ${creneau}` : ''}.`);
  return {
    content: json({
      inscription_demandee: true, bien: m.adresse, deja_en_cours: Boolean(data.tache?.existante),
      suite: "La routine de l'agence l'inscrit sur Flatfox (entre 7 h et 20 h). Le client est prévenu ici dès que l'inscription est faite et la visite enregistrée : ce n'est pas encore confirmé.",
    }),
  };
}

const fmtZurich = (d: Date) => new Intl.DateTimeFormat('fr-CH', {
  timeZone: 'Europe/Zurich', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(d);

async function clientCriteria(ctx: ToolContext, input: Record<string, any>): Promise<ToolOutcome> {
  const changes: Record<string, unknown> = {};
  for (const k of ['budget_max', 'pieces', 'region_recherche', 'type_bien', 'souhaits_particuliers']) {
    if (input[k] !== undefined && input[k] !== null && input[k] !== '') changes[k] = input[k];
  }
  if (!Object.keys(changes).length) return { content: 'Aucun changement précisé : demande au client la valeur exacte.', isError: true };
  const { data, error } = await ctx.db.rpc('steeve_client_criteres', { p_client_id: ctx.dossier.clientId, p_changes: changes });
  if (error) return { content: "Les critères n'ont pas pu être modifiés.", isError: true };
  if (!data?.ok) return { content: json({ modifie: false, motif: data?.motif }) };
  await notifyTeam(ctx, 'Critères modifiés (via Steeve)', Object.keys(changes).map((k) => `${k} : ${data.avant?.[k] ?? '—'} → ${data.apres?.[k] ?? '—'}`).join(' ; '));
  // Nouveaux critères de recherche : Steeve cherche aussitôt des offres qui y correspondent.
  const searchFields = ['budget_max', 'pieces', 'region_recherche', 'type_bien'].some((k) => k in changes);
  const search = searchFields ? await ctx.db.rpc('steeve_demande_recherche_offres', { p_client_id: ctx.dossier.clientId, p_source: 'client', p_note: 'Après modification des critères' }) : null;
  return { content: json({ modifie: true, avant: data.avant, apres: data.apres,
    recherche_lancee: Boolean(search?.data?.ok),
    suite: search?.data?.ok
      ? 'Son agent est prévenu. Une recherche d’offres avec ces critères est lancée : les offres conformes arrivent dans sa messagerie dans quelques minutes, et tu lui écris le résultat.'
      : 'Son agent est prévenu ; les prochaines offres suivront ces critères.' }) };
}

/** Recherche d'offres immédiate pour CE client (exécutée par Steeve opérateur, réveillé tout de suite). */
async function clientOfferSearch(ctx: ToolContext, precision: string): Promise<ToolOutcome> {
  const { data, error } = await ctx.db.rpc('steeve_demande_recherche_offres', { p_client_id: ctx.dossier.clientId, p_source: 'client', p_note: precision || 'Demande du client à Steeve' });
  if (error || !data?.ok) return { content: "La recherche n'a pas pu être lancée.", isError: true };
  return { content: json({ recherche_lancee: true, deja_en_cours: Boolean(data.existante),
    suite: "Recherche en cours avec ses critères enregistrés : les offres conformes arrivent dans sa messagerie et dans « Offres reçues » dans quelques minutes, et Steeve lui écrit le résultat. Ne promets aucun nombre." }) };
}
