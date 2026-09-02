import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_APP_URL = 'https://logisorama.ch';

const normalizeDate = (val: string | null | undefined): string | null =>
  val && String(val).trim() !== '' ? String(val).trim() : null;

const normalizeJourneyValue = (value?: string | null) => (value || '')
  .toString()
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

const isBuyerType = (value?: string | null) => {
  const normalized = normalizeJourneyValue(value);
  return ['acheter', 'achat', 'purchase', 'purchase_search'].includes(normalized);
};

const normalizeTypeRecherche = (value?: string | null) => isBuyerType(value) ? 'Acheter' : 'Louer';

const getAppBaseUrl = (req: Request) => {
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore
    }
  }
  return DEFAULT_APP_URL;
};

// Génère un mot de passe temporaire aléatoire (10 caractères, sans caractères ambigus)
function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

// Envoie l'e-mail d'identifiants via l'API e-mail gérée par Lovable
async function sendClientCredentialsEmail(
  supabaseUrl: string,
  serviceKey: string,
  recipient: string,
  tempPassword: string,
  prenom?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const logClient = createClient(supabaseUrl, serviceKey);
  try {
    const result = await sendTemplateEmail('client-credentials', recipient, {
      idempotencyKey: `client-credentials-${recipient}-${Date.now()}`,
      templateData: {
        siteUrl: DEFAULT_APP_URL,
        recipient,
        tempPassword,
        prenom: prenom || '',
      },
    });

    if (!result.sent) {
      await logEmailSend(logClient, {
        templateName: 'client-credentials',
        recipientEmail: recipient,
        status: 'suppressed',
      });
      console.warn('client-credentials email not sent: recipient suppressed');
      return { success: false, error: 'recipient_suppressed' };
    }

    await logEmailSend(logClient, {
      templateName: 'client-credentials',
      recipientEmail: recipient,
      status: 'sent',
    });
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('sendClientCredentialsEmail error:', message);
    await logEmailSend(logClient, {
      templateName: 'client-credentials',
      recipientEmail: recipient,
      status: 'failed',
      errorMessage: message,
    });
    return { success: false, error: message };
  }
}


// Types acceptés par le CHECK CONSTRAINT sur public.documents.type_document
const VALID_DOC_TYPES = new Set([
  'fiche_salaire', 'extrait_poursuites', 'piece_identite', 'attestation_domicile',
  'rc_menage', 'contrat_travail', 'attestation_employeur', 'copie_bail',
  'attestation_garantie_loyer', 'dossier_complet', 'autre',
]);

// Mapping des types du formulaire vers les types de la table documents
const mapDocumentType = (formType: string): string => {
  const typeMapping: Record<string, string> = {
    'poursuites': 'extrait_poursuites',
    'salaire1': 'fiche_salaire',
    'salaire2': 'fiche_salaire',
    'salaire3': 'fiche_salaire',
    'identite': 'piece_identite',
    // Pièces d'identité avec recto/verso (formulaire /nouveau-mandat → MandatFormStep6)
    'piece_identite_recto': 'piece_identite',
    'piece_identite_verso': 'piece_identite',
    // Permis de séjour (B / C / F / N) — rangés sous piece_identite (seul type valide en base)
    'permis_sejour_recto': 'piece_identite',
    'permis_sejour_verso': 'piece_identite',
  };
  const mapped = typeMapping[formType] || formType;
  // Garde-fou : si le type final n'est pas accepté par le CHECK, on bascule sur 'autre'
  // pour éviter une perte silencieuse du document.
  return VALID_DOC_TYPES.has(mapped) ? mapped : 'autre';
};

// Suffixe lisible (recto)/(verso) à insérer dans le nom de fichier affiché
const decorateNameWithFace = (originalName: string, formType: string): string => {
  const isRecto = formType.endsWith('_recto');
  const isVerso = formType.endsWith('_verso');
  if (!isRecto && !isVerso) return originalName;
  const suffix = isRecto ? ' (recto)' : ' (verso)';
  // Insère le suffixe avant l'extension si présente, sinon en fin
  const m = originalName.match(/^(.*?)(\.[^.]+)?$/);
  if (!m) return `${originalName}${suffix}`;
  const base = m[1] ?? originalName;
  const ext = m[2] ?? '';
  return `${base}${suffix}${ext}`;
};

// Détecter le MIME type à partir du nom du fichier
const getMimeType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
};

interface DemandeMandat {
  id?: string;
  adresse?: string;
  date_naissance?: string;
  nationalite?: string;
  type_permis?: string;
  etat_civil?: string;
  gerance_actuelle?: string;
  contact_gerance?: string;
  loyer_actuel?: number;
  depuis_le?: string;
  pieces_actuel?: number;
  charges_extraordinaires?: boolean;
  montant_charges_extra?: number;
  poursuites?: boolean;
  curatelle?: boolean;
  motif_changement?: string;
  profession?: string;
  employeur?: string;
  revenus_mensuels?: number;
  date_engagement?: string;
  utilisation_logement?: string;
  animaux?: boolean;
  instrument_musique?: boolean;
  vehicules?: boolean;
  numero_plaques?: string;
  decouverte_agence?: string;
  type_recherche?: string;
  nombre_occupants?: number;
  type_bien?: string;
  pieces_recherche?: string;
  region_recherche?: string;
  budget_max?: number;
  apport_personnel?: number;
  souhaits_particuliers?: string;
  candidats?: any[];
  documents_uploades?: any[];
  // Contract signature data
  signature_data?: string;
  cgv_acceptees_at?: string;
}

interface PurchaseProfilePayload {
  prix_cible?: number;
  region?: string;
  type_bien?: string;
  surface_min?: number;
  horizon_mois?: number;
  usage?: string;
  etat_civil?: string;
  nombre_enfants?: number;
  nationalite?: string;
  type_permis?: string;
  date_naissance?: string;
  financing?: Record<string, any>;
}

interface InviteClientRequest {
  email: string;
  clientId?: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
  demandeMandat?: DemandeMandat;
  invitationLegere?: boolean;
  typeRecherche?: string;
  journeyType?: string;
  createPurchaseProject?: boolean;
  /** Optional: id of the agents row to auto-assign as primary agent */
  agentId?: string;
  /** 🆕 Bloc achat — déclenche création purchase_project + financing + steps */
  purchaseProfile?: PurchaseProfilePayload;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, clientId, prenom, nom, telephone, demandeMandat, invitationLegere, typeRecherche, journeyType, createPurchaseProject, agentId, purchaseProfile }: InviteClientRequest = await req.json();
    const wantsPurchaseJourney = isBuyerType(typeRecherche) || isBuyerType(journeyType) || createPurchaseProject === true || !!purchaseProfile;
    const normalizedTypeRecherche = wantsPurchaseJourney ? 'Acheter' : normalizeTypeRecherche(typeRecherche || demandeMandat?.type_recherche || 'Louer');
    const redirectTo = `${getAppBaseUrl(req)}/first-login`;
    console.log('Redirect URL:', redirectTo);

    console.log('Inviting client:', { email, clientId, prenom, nom, hasDemandeMandat: !!demandeMandat, invitationLegere, agentId, normalizedTypeRecherche, wantsPurchaseJourney });

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // --- AuthZ: allow if caller is admin, OR if invocation is tied to a
    // pre-existing demandes_mandat row matching this email (public mandate flow).
    // Otherwise reject — prevents anonymous email spam / account-creation abuse.
    let isAuthorized = false;
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const { data: u } = await userClient.auth.getUser(token);
      if (u?.user) {
        const { data: roles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', u.user.id);
        const role = (roles ?? []).map((r: { role: string }) => r.role);
        if (role.includes('admin') || role.includes('agent')) {
          isAuthorized = true;
        }
      }
    }
    if (!isAuthorized && demandeMandat?.id && email) {
      const { data: dm } = await supabaseAdmin
        .from('demandes_mandat')
        .select('id,email')
        .eq('id', demandeMandat.id)
        .maybeSingle();
      if (dm && (dm.email || '').toLowerCase() === email.trim().toLowerCase()) {
        isAuthorized = true;
      }
    }
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Check if user already exists in auth.users (case-insensitive)
    const normalizedEmail = (email || '').trim().toLowerCase();
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10000 });
    const existingUser = existingUsers?.users?.find(u => (u.email || '').toLowerCase() === normalizedEmail);

    console.log('Existing user:', existingUser ? { id: existingUser.id, email: existingUser.email } : null);

    // VALIDATION: Si c'est un nouvel utilisateur ET pas de demandeMandat ET pas de clientId existant
    // → Refuser la création pour éviter les profils incomplets (sauf invitation légère)
    if (!existingUser && !demandeMandat && !clientId && !invitationLegere) {
      console.log('Rejecting: New user without demandeMandat data');
      throw new Error('Données insuffisantes pour créer un nouveau client. Veuillez passer par le formulaire de mandat sur /nouveau-mandat.');
    }

    let userId: string;
    let message: string;
    let isNewUser = false;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const tempPassword = generateTempPassword();

    if (existingUser) {
      // User exists - set a new temporary password and mark as must-change
      console.log('User exists, setting temporary password and sending credentials');

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            ...(existingUser.user_metadata || {}),
            must_change_password: true,
          },
        }
      );

      if (updateError) {
        console.error('Error updating existing user password:', updateError);
        throw updateError;
      }

      const emailRes = await sendClientCredentialsEmail(supabaseUrl, serviceKey, email, tempPassword, prenom);
      if (!emailRes.success) {
        console.error('Failed to send credentials email for existing user:', emailRes.error);
      }

      userId = existingUser.id;
      message = 'Identifiants de connexion envoyés avec succès';
      isNewUser = false;
    } else {
      // New user - create with a temporary password and mark as must-change
      console.log('New user with complete data, creating user with temporary password');

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          must_change_password: true,
        },
      });

      if (createError || !newUser?.user) {
        console.error('Error creating user:', createError);
        throw createError || new Error('Échec de la création utilisateur');
      }

      const emailRes = await sendClientCredentialsEmail(supabaseUrl, serviceKey, email, tempPassword, prenom);
      if (!emailRes.success) {
        console.error('Failed to send credentials email for new user:', emailRes.error);
      }

      userId = newUser.user.id;
      message = 'Compte créé et identifiants envoyés avec succès';
      isNewUser = true;
    }

    // redirectTo is no longer used for password links; keep the helper available for other flows.
    void redirectTo;

    // Check if profile exists, if not create it
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      console.log('Creating profile for user:', userId);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          prenom: prenom || email.split('@')[0],
          nom: nom || '',
          telephone: telephone || null,
          actif: false // Account not activated yet
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    } else {
      // Update existing profile with new data if provided
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          prenom: prenom || undefined,
          nom: nom || undefined,
          telephone: telephone || undefined,
          actif: true // Activate on invite
        })
        .eq('id', userId);

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
      }
    }

    // Check if user_role exists, if not create it
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingRole) {
      console.log('Creating user_role for user:', userId);
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'client'
        });

      if (roleError) {
        console.error('Error creating user_role:', roleError);
      }
    }

    // Check if client record exists, if not create it with all data from demande
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id, agent_id')
      .eq('user_id', userId)
      .maybeSingle();

    let clientRecordId: string | null = null;

    if (!existingClient) {
      console.log('Creating client record for user:', userId);
      
      // Build client data — light invitation vs full mandate
      const clientData: any = {
        user_id: userId,
      };

      if (invitationLegere) {
        // Invitation légère: statut en_attente, pas de date_ajout (barre à 0%)
        clientData.statut = 'en_attente';
        clientData.priorite = wantsPurchaseJourney ? 'haute' : 'moyenne';
        clientData.type_recherche = normalizedTypeRecherche;
        clientData.journey_type = wantsPurchaseJourney ? 'purchase_search' : 'housing_search';
        if (agentId) clientData.agent_id = agentId;
      } else {
        // Full mandate: activation immédiate
        clientData.date_ajout = new Date().toISOString();
        clientData.statut = 'actif';
        clientData.priorite = 'haute';
        if (agentId) clientData.agent_id = agentId;
      }

      // Transfer all data from demandeMandat if available
      if (demandeMandat) {
        Object.assign(clientData, {
          adresse: demandeMandat.adresse,
          date_naissance: normalizeDate(demandeMandat.date_naissance),
          nationalite: demandeMandat.nationalite,
          type_permis: demandeMandat.type_permis,
          etat_civil: demandeMandat.etat_civil,
          gerance_actuelle: demandeMandat.gerance_actuelle,
          contact_gerance: demandeMandat.contact_gerance,
          loyer_actuel: demandeMandat.loyer_actuel,
          depuis_le: normalizeDate(demandeMandat.depuis_le),
          pieces_actuel: demandeMandat.pieces_actuel,
          charges_extraordinaires: demandeMandat.charges_extraordinaires,
          montant_charges_extra: demandeMandat.montant_charges_extra,
          poursuites: demandeMandat.poursuites,
          curatelle: demandeMandat.curatelle,
          motif_changement: demandeMandat.motif_changement,
          profession: demandeMandat.profession,
          employeur: demandeMandat.employeur,
          revenus_mensuels: demandeMandat.revenus_mensuels,
          date_engagement: normalizeDate(demandeMandat.date_engagement),
          utilisation_logement: demandeMandat.utilisation_logement,
          animaux: demandeMandat.animaux,
          instrument_musique: demandeMandat.instrument_musique,
          vehicules: demandeMandat.vehicules,
          numero_plaques: demandeMandat.numero_plaques,
          decouverte_agence: demandeMandat.decouverte_agence,
          // Type de recherche: Louer ou Acheter
          type_recherche: wantsPurchaseJourney ? 'Acheter' : (demandeMandat.type_recherche || 'Louer'),
          // 🆕 journey_type : déterminé par le parcours achat explicite
          journey_type: wantsPurchaseJourney ? 'purchase_search' : 'housing_search',
          type_bien: demandeMandat.type_bien,
          pieces: demandeMandat.pieces_recherche ? parseFloat(demandeMandat.pieces_recherche.replace('+', '')) : null,
          region_recherche: demandeMandat.region_recherche,
          budget_max: demandeMandat.budget_max,
          apport_personnel: demandeMandat.apport_personnel,
          souhaits_particuliers: demandeMandat.souhaits_particuliers,
          nombre_occupants: demandeMandat.nombre_occupants,
          // Contract signature data
          demande_mandat_id: demandeMandat.id || null,
          mandat_signature_data: demandeMandat.signature_data || null,
          mandat_date_signature: demandeMandat.cgv_acceptees_at || new Date().toISOString(),
          // Note: mandat_pdf_url is now set by send-mandat-pdf when generating PDF
        });

        // Set residence based on type_permis
        if (demandeMandat.type_permis) {
          if (demandeMandat.type_permis.includes('Suisse')) {
            clientData.residence = 'Citoyen Suisse';
          } else {
            clientData.residence = `Permis ${demandeMandat.type_permis}`;
          }
        }
      }

      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert(clientData)
        .select('id')
        .single();

      if (clientError) {
        console.error('Error creating client:', clientError);
      } else {
        clientRecordId = newClient.id;
        console.log('Client created with ID:', clientRecordId);
      }
    } else {
      clientRecordId = existingClient.id;

      // Si un agentId est fourni et que le client n'a pas d'agent assigné, l'assigner
      if (agentId) {
        const { data: cur } = await supabaseAdmin.from('clients').select('agent_id').eq('id', existingClient.id).maybeSingle();
        if (!cur?.agent_id) {
          await supabaseAdmin.from('clients').update({ agent_id: agentId }).eq('id', existingClient.id);
        }
      }

      if (invitationLegere || wantsPurchaseJourney) {
        const patch: any = {};
        if (invitationLegere) {
          patch.statut = 'en_attente';
          patch.priorite = wantsPurchaseJourney ? 'haute' : 'moyenne';
          patch.type_recherche = normalizedTypeRecherche;
          patch.journey_type = wantsPurchaseJourney ? 'purchase_search' : 'housing_search';
        }
        if (wantsPurchaseJourney) {
          patch.type_recherche = 'Acheter';
          patch.journey_type = 'purchase_search';
          patch.priorite = 'haute';
        }
        if (agentId) patch.agent_id = agentId;
        if (Object.keys(patch).length > 0) {
          const { error: lightUpdateError } = await supabaseAdmin.from('clients').update(patch).eq('id', existingClient.id);
          if (lightUpdateError) console.error('Error updating light/purchase client:', lightUpdateError);
        }
      }

      // Update existing client with demande data
      if (demandeMandat) {
        const updateData: any = {
          adresse: demandeMandat.adresse,
          date_naissance: normalizeDate(demandeMandat.date_naissance),
          nationalite: demandeMandat.nationalite,
          type_permis: demandeMandat.type_permis,
          etat_civil: demandeMandat.etat_civil,
          gerance_actuelle: demandeMandat.gerance_actuelle,
          contact_gerance: demandeMandat.contact_gerance,
          loyer_actuel: demandeMandat.loyer_actuel,
          depuis_le: normalizeDate(demandeMandat.depuis_le),
          pieces_actuel: demandeMandat.pieces_actuel,
          charges_extraordinaires: demandeMandat.charges_extraordinaires,
          montant_charges_extra: demandeMandat.montant_charges_extra,
          poursuites: demandeMandat.poursuites,
          curatelle: demandeMandat.curatelle,
          motif_changement: demandeMandat.motif_changement,
          profession: demandeMandat.profession,
          employeur: demandeMandat.employeur,
          revenus_mensuels: demandeMandat.revenus_mensuels,
          date_engagement: normalizeDate(demandeMandat.date_engagement),
          utilisation_logement: demandeMandat.utilisation_logement,
          animaux: demandeMandat.animaux,
          instrument_musique: demandeMandat.instrument_musique,
          vehicules: demandeMandat.vehicules,
          numero_plaques: demandeMandat.numero_plaques,
          decouverte_agence: demandeMandat.decouverte_agence,
          // Type de recherche: Louer ou Acheter
          type_recherche: wantsPurchaseJourney ? 'Acheter' : (demandeMandat.type_recherche || 'Louer'),
          // 🆕 journey_type : recalibré si l'utilisateur passe maintenant par le parcours achat
          ...(wantsPurchaseJourney ? { journey_type: 'purchase_search' } : {}),
          type_bien: demandeMandat.type_bien,
          pieces: demandeMandat.pieces_recherche ? parseFloat(demandeMandat.pieces_recherche.replace('+', '')) : null,
          region_recherche: demandeMandat.region_recherche,
          budget_max: demandeMandat.budget_max,
          apport_personnel: demandeMandat.apport_personnel,
          souhaits_particuliers: demandeMandat.souhaits_particuliers,
          nombre_occupants: demandeMandat.nombre_occupants,
          statut: 'actif',
          // Contract signature data
          demande_mandat_id: demandeMandat.id || null,
          mandat_signature_data: demandeMandat.signature_data || null,
          mandat_date_signature: demandeMandat.cgv_acceptees_at || new Date().toISOString(),
        };

        if (demandeMandat.type_permis) {
          if (demandeMandat.type_permis.includes('Suisse')) {
            updateData.residence = 'Citoyen Suisse';
          } else {
            updateData.residence = `Permis ${demandeMandat.type_permis}`;
          }
        }

        const { error: updateClientError } = await supabaseAdmin
          .from('clients')
          .update(updateData)
          .eq('id', existingClient.id);

        if (updateClientError) {
          console.error('Error updating client:', updateClientError);
        }
      }
    }

    // Create candidates from demandeMandat
    if (demandeMandat?.candidats && demandeMandat.candidats.length > 0 && clientRecordId) {
      console.log('Creating candidates:', demandeMandat.candidats.length);
      
      for (const candidat of demandeMandat.candidats) {
        const { error: candidateError } = await supabaseAdmin
          .from('client_candidates')
          .insert({
            client_id: clientRecordId,
            prenom: candidat.prenom,
            nom: candidat.nom,
            date_naissance: normalizeDate(candidat.date_naissance),
            nationalite: candidat.nationalite,
            type_permis: candidat.type_permis,
            profession: candidat.profession,
            employeur: candidat.employeur,
            revenus_mensuels: candidat.revenus_mensuels,
            lien_avec_client: candidat.lien_avec_client,
            type: candidat.lien_avec_client === 'Garant' ? 'garant' : 
                  candidat.lien_avec_client === 'Conjoint(e)' ? 'co_debiteur' : 
                  candidat.lien_avec_client === 'Colocataire' ? 'colocataire' : 'occupant',
          });

        if (candidateError) {
          console.error('Error creating candidate:', candidateError);
        }
      }
    }

    // Transfer documents from demandeMandat (with deduplication check)
    if (demandeMandat?.documents_uploades && demandeMandat.documents_uploades.length > 0 && clientRecordId) {
      console.log('Transferring documents:', demandeMandat.documents_uploades.length);
      
      // Check for existing documents to avoid duplicates
      const { data: existingDocs } = await supabaseAdmin
        .from('documents')
        .select('nom, type_document')
        .eq('user_id', userId);

      const existingDocKeys = new Set(
        (existingDocs || []).map((d: any) => `${d.nom}_${d.type_document}`)
      );

      let transferredCount = 0;
      let transferFailures = 0;
      for (const doc of demandeMandat.documents_uploades) {
        const mappedType = mapDocumentType(doc.type);
        const mimeType = getMimeType(doc.name);
        const displayName = decorateNameWithFace(doc.name, doc.type);
        const docKey = `${displayName}_${mappedType}`;

        if (existingDocKeys.has(docKey)) {
          console.log('Document already exists, skipping:', displayName);
          continue;
        }

        console.log('Inserting document:', {
          name: displayName,
          originalType: doc.type,
          mappedType,
          mimeType,
          url: doc.url?.substring(0, 50) + '...'
        });

        const { error: docError } = await supabaseAdmin
          .from('documents')
          .insert({
            user_id: userId,
            client_id: clientRecordId,
            nom: displayName,
            url: doc.url,
            type: mimeType,
            type_document: mappedType,
            taille: doc.size ?? doc.file_size ?? null,
            statut: 'validé',
          });

        if (docError) {
          transferFailures++;
          console.error('Error transferring document:', docError, { doc: displayName, originalType: doc.type, mappedType, mimeType });
        } else {
          transferredCount++;
          existingDocKeys.add(docKey);
          console.log('Document transferred successfully:', displayName);
        }
      }
      console.log(`Documents transfer summary: ${transferredCount} ok / ${transferFailures} failed / total ${demandeMandat.documents_uploades.length}`);
    }

    console.log('Email sent successfully to user:', userId);

    // === 🆕 Création du parcours ACHAT (purchase_project) si parcours achat détecté ===
    // Statut initial : 'en_attente_activation' — admin doit ensuite valider et démarrer la barre 60 jours.
    if (wantsPurchaseJourney && clientRecordId) {
      try {
        const { data: currentClientForPurchase } = await supabaseAdmin
          .from('clients')
          .select('agent_id')
          .eq('id', clientRecordId)
          .maybeSingle();
        const assignedAgentId = agentId || currentClientForPurchase?.agent_id || null;
        const purchaseMandateStatus = invitationLegere ? 'a_signer' : ((demandeMandat?.signature_data || demandeMandat?.cgv_acceptees_at) ? 'signe' : 'a_signer');

        const purchaseClientPatch: Record<string, unknown> = {
          type_recherche: 'Acheter',
          journey_type: 'purchase_search',
          priorite: 'haute',
        };
        if (invitationLegere) purchaseClientPatch.statut = 'en_attente';
        await supabaseAdmin
          .from('clients')
          .update(purchaseClientPatch)
          .eq('id', clientRecordId);

        // Idempotence : ne pas recréer si déjà existant pour ce client.
        const { data: existingProject } = await supabaseAdmin
          .from('purchase_projects')
          .select('id, user_id, assigned_agent_id')
          .or(`client_id.eq.${clientRecordId},user_id.eq.${userId}`)
          .limit(1)
          .maybeSingle();

        let projectId = existingProject?.id as string | undefined;

        if (!projectId) {
          const { data: createdProject, error: projectErr } = await supabaseAdmin
            .from('purchase_projects')
            .insert({
              client_id: clientRecordId,
              user_id: userId,
              assigned_agent_id: assignedAgentId,
              statut: 'en_attente_activation',
              statut_mandat: purchaseMandateStatus,
              statut_acompte: 'a_payer',
              montant_acompte: 2500,
              montant_mandat: 0,
              duree_progression_jours: 180,
              date_debut_progression: null,
              // date_debut_progression: NULL — démarre seulement à l'activation admin
            })
            .select('id')
            .single();

          if (projectErr || !createdProject) {
            console.error('Failed to create purchase_project:', projectErr);
          } else {
            projectId = createdProject.id;
            console.log('Purchase project created:', projectId);
          }
        } else {
          console.log('Purchase project already exists for client/user, ensuring linked fields.');
          await supabaseAdmin
            .from('purchase_projects')
            .update({
              client_id: clientRecordId,
              user_id: userId,
              assigned_agent_id: existingProject.assigned_agent_id || assignedAgentId,
              statut_acompte: 'a_payer',
              statut_mandat: purchaseMandateStatus,
              montant_acompte: 2500,
              montant_mandat: 0,
              duree_progression_jours: 180,
            })
            .eq('id', projectId);
        }

        if (projectId) {
            // Financing profile
            const { data: existingFin } = await supabaseAdmin
              .from('purchase_financing_profiles')
              .select('id')
              .eq('project_id', projectId)
              .maybeSingle();
            if (!existingFin) {
              const fin = purchaseProfile?.financing || {};
              const { error: finErr } = await supabaseAdmin
                .from('purchase_financing_profiles')
                .insert({
                  project_id: projectId,
                  revenu_annuel_retenu: fin.revenu_annuel_retenu ?? 0,
                  bonus_3ans_moyenne: fin.bonus_3ans_moyenne ?? 0,
                  autres_revenus: fin.autres_revenus ?? 0,
                  fonds_propres_cash: fin.fonds_propres_cash ?? 0,
                  fonds_propres_3a: fin.fonds_propres_3a ?? 0,
                  fonds_propres_lpp: fin.fonds_propres_lpp ?? 0,
                  montant_epl_disponible: fin.montant_epl_disponible ?? 0,
                  credit_prive_mensuel: fin.credit_prive_mensuel ?? 0,
                  leasing_mensuel: fin.leasing_mensuel ?? 0,
                  cartes_credit_mensuel: fin.cartes_credit_mensuel ?? 0,
                  pensions_versees: fin.pensions_versees ?? 0,
                  poursuites: fin.poursuites ?? false,
                  etat_civil: fin.etat_civil ?? null,
                  nombre_enfants: fin.nombre_enfants ?? 0,
                  nationalite: fin.nationalite ?? null,
                  type_permis: fin.type_permis ?? null,
                  prix_cible: fin.prix_cible ?? 0,
                  statut_bancaire: 'a_evaluer',
                });
              if (finErr) console.error('Failed to create financing profile:', finErr);
            }

            // 17 étapes (a_faire)
            const ACHAT_STEPS_DEF = [
              { key: 'acompte_paye',          label: "Activation payée (CHF 2'500)",                ordre: 1 },
              { key: 'mandat_signe',          label: "Mandat d'accompagnement signé",             ordre: 2 },
              { key: 'kickoff',               label: 'Rendez-vous de cadrage avec votre conseiller', ordre: 3 },
              { key: 'documents_financement', label: 'Documents financiers transmis',             ordre: 4 },
              { key: 'analyse_capacite',      label: "Capacité d'achat calculée",                 ordre: 5 },
              { key: 'envoi_banque',          label: 'Dossier envoyé au partenaire bancaire',     ordre: 6 },
              { key: 'validation_bancaire',   label: 'Validation bancaire reçue (24-48 h)',       ordre: 7 },
              { key: 'criteres_definis',      label: 'Critères de recherche définis',             ordre: 8 },
              { key: 'biens_selectionnes',    label: 'Biens sélectionnés analysés',               ordre: 9 },
              { key: 'visite_courtier',       label: 'Visite par notre courtier',                 ordre: 10 },
              { key: 'rapport_visite',        label: 'Rapport de visite remis',                   ordre: 11 },
              { key: 'contre_visite',         label: 'Contre-visite avec vous',                   ordre: 12 },
              { key: 'offre_envoyee',         label: "Offre d'achat envoyée",                     ordre: 13 },
              { key: 'negociation',           label: 'Négociation aboutie',                       ordre: 14 },
              { key: 'rdv_notaire',           label: 'Rendez-vous notaire planifié',              ordre: 15 },
              { key: 'signature_notariee',    label: "Signature de l'acte authentique",           ordre: 16 },
              { key: 'remise_cles',           label: 'Remise des clés',                           ordre: 17 },
            ];
            const stepsPayload = ACHAT_STEPS_DEF.map((s) => ({
              project_id: projectId,
              step_key: s.key,
              label: s.label,
              ordre: s.ordre,
              statut: 'a_faire',
            }));
            const { error: stepsErr } = await supabaseAdmin
              .from('purchase_project_steps')
              .upsert(stepsPayload, { onConflict: 'project_id,step_key', ignoreDuplicates: true });
            if (stepsErr) console.error('Failed to seed purchase steps:', stepsErr);

            // Rattacher les documents achat existants si uploadés avant la création du projet.
            await supabaseAdmin
              .from('documents')
              .update({ purchase_project_id: projectId, purchase_category: 'autre' })
              .eq('user_id', userId)
              .is('purchase_project_id', null);
        }
      } catch (pErr) {
        console.error('Purchase project provisioning failed:', pErr);
      }
    }



    // === Invitation légère locative : créer automatiquement la facture AbaNinja 300 CHF ===
    let invoiceCreated = false;
    let invoiceError: string | null = null;
    if (invitationLegere && clientRecordId) {
      const normalizedType = normalizedTypeRecherche.toLowerCase();
      const isLouer = normalizedType === 'louer' || normalizedType === 'location';
      // Création facture pour location uniquement (achat suit un autre flux acompte)
      if (isLouer) {
        try {
          console.log('Creating AbaNinja client + invoice for light invitation (location)');
          const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
          const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

          const clientRes = await fetch(`${supabaseUrl}/functions/v1/create-abaninja-client`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey,
            },
            body: JSON.stringify({
              prenom: prenom || email.split('@')[0],
              nom: nom || '',
              email,
              telephone: telephone || '',
              adresse: '',
            }),
          });
          const clientJson = await clientRes.json();
          if (!clientRes.ok || !clientJson.success) {
            throw new Error(clientJson.error || `create-abaninja-client failed (${clientRes.status})`);
          }

          const invoiceRes = await fetch(`${supabaseUrl}/functions/v1/create-abaninja-invoice`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey,
            },
            body: JSON.stringify({
              client_uuid: clientJson.client_uuid,
              address_uuid: clientJson.address_uuid,
              type_recherche: 'Louer',
              prenom: prenom || email.split('@')[0],
              nom: nom || '',
              email,
              demande_id: clientRecordId, // pas de demande_mandat → on référence le client
            }),
          });
          const invoiceJson = await invoiceRes.json();
          if (!invoiceRes.ok || !invoiceJson.success) {
            throw new Error(invoiceJson.error || `create-abaninja-invoice failed (${invoiceRes.status})`);
          }

          // Enregistrer un acompte 300 CHF lié au client (statut 'paye' = en attente règlement)
          await supabaseAdmin.from('acomptes').insert({
            client_id: clientRecordId,
            agent_id: agentId || null,
            montant: 300,
            statut: 'paye',
            notes: `Facture AbaNinja ${invoiceJson.invoice_number || invoiceJson.invoice_id || ''} (invitation légère locative) - en attente paiement client`,
          });

          invoiceCreated = true;
          console.log('AbaNinja invoice created for light invitation:', invoiceJson.invoice_id);
        } catch (e: any) {
          invoiceError = (e instanceof Error ? e.message : String(e)) || String(e);
          console.error('Failed to create AbaNinja invoice for light invitation:', invoiceError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: message,
        userId: userId,
        isNewUser: isNewUser,
        clientId: clientRecordId,
        invoiceCreated,
        invoiceError,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in invite-client function:', error);
    return new Response(
      JSON.stringify({ 
        error: (error instanceof Error ? error.message : String(error)) || 'Une erreur est survenue lors de l\'envoi de l\'invitation' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
