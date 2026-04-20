import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping des types du formulaire vers les types de la table documents
const mapDocumentType = (formType: string): string => {
  const typeMapping: Record<string, string> = {
    'poursuites': 'extrait_poursuites',
    'salaire1': 'fiche_salaire',
    'salaire2': 'fiche_salaire',
    'salaire3': 'fiche_salaire',
    'identite': 'piece_identite',
  };
  return typeMapping[formType] || formType;
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

interface InviteClientRequest {
  email: string;
  clientId?: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
  demandeMandat?: DemandeMandat;
  invitationLegere?: boolean;
  typeRecherche?: string;
  /** Optional: id of the agents row to auto-assign as primary agent */
  agentId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, clientId, prenom, nom, telephone, demandeMandat, invitationLegere, typeRecherche, agentId }: InviteClientRequest = await req.json();

    console.log('Inviting client:', { email, clientId, prenom, nom, hasDemandeMandat: !!demandeMandat, invitationLegere, agentId });

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

    if (existingUser) {
      // User exists - send password reset email instead
      console.log('User exists, sending password reset email');
      
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: 'https://immocrm.lovable.app/first-login',
        }
      );

      if (resetError) {
        console.error('Error sending reset email:', resetError);
        throw resetError;
      }

      userId = existingUser.id;
      message = 'Email de réinitialisation envoyé avec succès';
    } else {
      // New user - invite them (only if demandeMandat is present, validated above)
      console.log('New user with complete data, sending invitation');
      
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: 'https://immocrm.lovable.app/first-login',
        }
      );

      if (inviteError) {
        console.error('Error inviting user:', inviteError);
        throw inviteError;
      }

      userId = inviteData.user.id;
      message = 'Invitation envoyée avec succès';
      isNewUser = true;
    }

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
      .select('id')
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
        clientData.priorite = 'moyenne';
        clientData.type_recherche = typeRecherche || 'Acheter';
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
          date_naissance: demandeMandat.date_naissance,
          nationalite: demandeMandat.nationalite,
          type_permis: demandeMandat.type_permis,
          etat_civil: demandeMandat.etat_civil,
          gerance_actuelle: demandeMandat.gerance_actuelle,
          contact_gerance: demandeMandat.contact_gerance,
          loyer_actuel: demandeMandat.loyer_actuel,
          depuis_le: demandeMandat.depuis_le,
          pieces_actuel: demandeMandat.pieces_actuel,
          charges_extraordinaires: demandeMandat.charges_extraordinaires,
          montant_charges_extra: demandeMandat.montant_charges_extra,
          poursuites: demandeMandat.poursuites,
          curatelle: demandeMandat.curatelle,
          motif_changement: demandeMandat.motif_changement,
          profession: demandeMandat.profession,
          employeur: demandeMandat.employeur,
          revenus_mensuels: demandeMandat.revenus_mensuels,
          date_engagement: demandeMandat.date_engagement,
          utilisation_logement: demandeMandat.utilisation_logement,
          animaux: demandeMandat.animaux,
          instrument_musique: demandeMandat.instrument_musique,
          vehicules: demandeMandat.vehicules,
          numero_plaques: demandeMandat.numero_plaques,
          decouverte_agence: demandeMandat.decouverte_agence,
          // Type de recherche: Louer ou Acheter
          type_recherche: demandeMandat.type_recherche || 'Louer',
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

      // Update existing client with demande data
      if (demandeMandat) {
        const updateData: any = {
          adresse: demandeMandat.adresse,
          date_naissance: demandeMandat.date_naissance,
          nationalite: demandeMandat.nationalite,
          type_permis: demandeMandat.type_permis,
          etat_civil: demandeMandat.etat_civil,
          gerance_actuelle: demandeMandat.gerance_actuelle,
          contact_gerance: demandeMandat.contact_gerance,
          loyer_actuel: demandeMandat.loyer_actuel,
          depuis_le: demandeMandat.depuis_le,
          pieces_actuel: demandeMandat.pieces_actuel,
          charges_extraordinaires: demandeMandat.charges_extraordinaires,
          montant_charges_extra: demandeMandat.montant_charges_extra,
          poursuites: demandeMandat.poursuites,
          curatelle: demandeMandat.curatelle,
          motif_changement: demandeMandat.motif_changement,
          profession: demandeMandat.profession,
          employeur: demandeMandat.employeur,
          revenus_mensuels: demandeMandat.revenus_mensuels,
          date_engagement: demandeMandat.date_engagement,
          utilisation_logement: demandeMandat.utilisation_logement,
          animaux: demandeMandat.animaux,
          instrument_musique: demandeMandat.instrument_musique,
          vehicules: demandeMandat.vehicules,
          numero_plaques: demandeMandat.numero_plaques,
          decouverte_agence: demandeMandat.decouverte_agence,
          // Type de recherche: Louer ou Acheter
          type_recherche: demandeMandat.type_recherche || 'Louer',
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
            date_naissance: candidat.date_naissance,
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

      for (const doc of demandeMandat.documents_uploades) {
        const mappedType = mapDocumentType(doc.type);
        const mimeType = getMimeType(doc.name);
        const docKey = `${doc.name}_${mappedType}`;

        if (existingDocKeys.has(docKey)) {
          console.log('Document already exists, skipping:', doc.name);
          continue;
        }
        
        console.log('Inserting document:', { 
          name: doc.name, 
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
            nom: doc.name,
            url: doc.url,
            type: mimeType,
            type_document: mappedType,
            taille: doc.size ?? doc.file_size ?? null,
            statut: 'validé',
          });

        if (docError) {
          console.error('Error transferring document:', docError, { doc: doc.name, mappedType, mimeType });
        } else {
          console.log('Document transferred successfully:', doc.name);
        }
      }
    }

    console.log('Email sent successfully to user:', userId);

    // === Invitation légère locative : créer automatiquement la facture AbaNinja 300 CHF ===
    let invoiceCreated = false;
    let invoiceError: string | null = null;
    if (invitationLegere && clientRecordId) {
      const normalizedType = (typeRecherche || 'Acheter').toLowerCase();
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
          invoiceError = e.message || String(e);
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
        error: error.message || 'Une erreur est survenue lors de l\'envoi de l\'invitation' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
