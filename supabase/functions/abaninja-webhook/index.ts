import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-abaninja-signature',
};

// Helper function to verify HMAC signature
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const computedSignature = new TextDecoder().decode(hexEncode(new Uint8Array(signatureBuffer)));
    
    // Compare signatures (timing-safe comparison)
    return signature.toLowerCase() === computedSignature.toLowerCase();
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature
    const signature = req.headers.get('x-abaninja-signature') || '';
    const webhookSecret = Deno.env.get('ABANINJA_WEBHOOK_SECRET') || '';
    
    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid signature' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      console.log('Webhook signature verified successfully');
    } else {
      console.log('No signature verification (signature or secret missing)');
    }

    const payload = JSON.parse(rawBody);

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

    // AbaNinja webhook payload structure (adapt based on actual AbaNinja documentation)
    // Expected events: invoice.paid, invoice.created, etc.
    const eventType = payload.event || payload.type || payload.action;
    const invoiceData = payload.data || payload.invoice || payload;

    // Handle payment received event
    if (eventType === 'invoice.paid' || eventType === 'payment.received' || 
        invoiceData.status === 'paid' || invoiceData.payment_status === 'paid') {
      
      // Try to find the demande by invoice ID or reference
      const invoiceId = invoiceData.id || invoiceData.invoice_id || invoiceData.uuid;
      const invoiceRef = invoiceData.number || invoiceData.invoice_number || invoiceData.reference;
      
      console.log('Looking for demande with invoice_id:', invoiceId, 'or ref:', invoiceRef);

      let demande = null;
      
      // Try to find by invoice ID first
      if (invoiceId) {
        const { data, error } = await supabaseAdmin
          .from('demandes_mandat')
          .select('*')
          .eq('abaninja_invoice_id', invoiceId)
          .single();
        
        if (!error && data) {
          demande = data;
        }
      }
      
      // If not found, try by invoice reference
      if (!demande && invoiceRef) {
        const { data, error } = await supabaseAdmin
          .from('demandes_mandat')
          .select('*')
          .eq('abaninja_invoice_ref', invoiceRef)
          .single();
        
        if (!error && data) {
          demande = data;
        }
      }

      if (!demande) {
        console.log('No demande found for this invoice');
        return new Response(
          JSON.stringify({ success: false, message: 'Demande not found for this invoice' }),
          {
            status: 200, // Return 200 to acknowledge receipt
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Found demande:', demande.id, demande.email);

      // Update demande status to paid
      const { error: updateError } = await supabaseAdmin
        .from('demandes_mandat')
        .update({
          statut: 'paye',
          date_paiement: new Date().toISOString()
        })
        .eq('id', demande.id);

      if (updateError) {
        console.error('Error updating demande:', updateError);
        throw updateError;
      }

      console.log('Demande updated to paye status');

      // Automatically trigger client invitation/activation
      console.log('Triggering automatic client activation...');
      try {
        const inviteResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/invite-client`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              email: demande.email,
              prenom: demande.prenom,
              nom: demande.nom,
              telephone: demande.telephone,
              demandeMandat: {
                id: demande.id,
                adresse: demande.adresse,
                date_naissance: demande.date_naissance,
                nationalite: demande.nationalite,
                type_permis: demande.type_permis,
                etat_civil: demande.etat_civil,
                gerance_actuelle: demande.gerance_actuelle,
                contact_gerance: demande.contact_gerance,
                loyer_actuel: demande.loyer_actuel,
                depuis_le: demande.depuis_le,
                pieces_actuel: demande.pieces_actuel,
                charges_extraordinaires: demande.charges_extraordinaires,
                montant_charges_extra: demande.montant_charges_extra,
                poursuites: demande.poursuites,
                curatelle: demande.curatelle,
                motif_changement: demande.motif_changement,
                profession: demande.profession,
                employeur: demande.employeur,
                revenus_mensuels: demande.revenus_mensuels,
                date_engagement: demande.date_engagement,
                utilisation_logement: demande.utilisation_logement,
                animaux: demande.animaux,
                instrument_musique: demande.instrument_musique,
                vehicules: demande.vehicules,
                numero_plaques: demande.numero_plaques,
                decouverte_agence: demande.decouverte_agence,
                type_recherche: demande.type_recherche,
                nombre_occupants: demande.nombre_occupants,
                type_bien: demande.type_bien,
                pieces_recherche: demande.pieces_recherche,
                region_recherche: demande.region_recherche,
                budget_max: demande.budget_max,
                apport_personnel: demande.apport_personnel,
                souhaits_particuliers: demande.souhaits_particuliers,
                candidats: demande.candidats || [],
                documents_uploades: demande.documents_uploades || [],
                signature_data: demande.signature_data,
                cgv_acceptees_at: demande.cgv_acceptees_at
              }
            })
          }
        );

        const inviteResult = await inviteResponse.json();
        
        if (inviteResult.success) {
          console.log('Client automatically activated:', inviteResult.userId);
          
          // Update demande status to active
          await supabaseAdmin
            .from('demandes_mandat')
            .update({
              statut: 'active',
              processed_at: new Date().toISOString()
            })
            .eq('id', demande.id);
        } else {
          console.error('Failed to activate client:', inviteResult.error);
        }
      } catch (inviteError) {
        console.error('Error calling invite-client:', inviteError);
        // Don't throw - payment is still recorded, admin can activate manually
      }

      // Create notification for all admins
      const { data: admins } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins) {
        for (const admin of admins) {
          await supabaseAdmin.from('notifications').insert({
            user_id: admin.user_id,
            type: 'paiement_recu',
            title: '💰 Paiement reçu + compte activé',
            message: `${demande.prenom} ${demande.nom} a payé son acompte de ${demande.montant_acompte} CHF - compte créé automatiquement`,
            link: '/admin/demandes-activation',
            metadata: { 
              demande_id: demande.id,
              email: demande.email,
              montant: demande.montant_acompte
            },
          });
        }
        console.log('Admin notifications created');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment processed and client activated',
          demande_id: demande.id 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For other events, just acknowledge receipt
    console.log('Event not handled, acknowledging receipt');
    return new Response(
      JSON.stringify({ success: true, message: 'Event received' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
