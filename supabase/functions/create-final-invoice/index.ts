import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailInvoice, extractCreatedInvoice } from "../_shared/abaninja-invoice.ts";
import { requireAuth } from "../_shared/require-admin.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateFinalInvoiceRequest {
  client_uuid: string;
  address_uuid: string;
  candidature_id: string;
  loyer_mensuel: number;
  acompte_paye: number;
  prenom: string;
  nom: string;
  email: string;
  adresse_bien: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuth(req, { allowedRoles: ['admin', 'agent'] });
  if (!auth.ok) return auth.response!;

  try {
    const apiKey = Deno.env.get('ABANINJA_API_KEY');
    const accountUuid = Deno.env.get('ABANINJA_ACCOUNT_UUID');

    if (!apiKey || !accountUuid) {
      console.error('Missing AbaNinja credentials');
      throw new Error('AbaNinja credentials not configured');
    }

    const { 
      client_uuid, 
      address_uuid, 
      candidature_id, 
      loyer_mensuel, 
      acompte_paye, 
      prenom, 
      nom, 
      email, 
      adresse_bien 
    } = await req.json() as CreateFinalInvoiceRequest;

    if (!client_uuid || !address_uuid || !candidature_id || !prenom || !nom ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim()) ||
        !Number.isFinite(loyer_mensuel) || !Number.isFinite(acompte_paye) ||
        loyer_mensuel <= 0 || loyer_mensuel > 100000 ||
        acompte_paye < 0 || acompte_paye > 100000 ||
        String(adresse_bien || '').length > 500) {
      return new Response(JSON.stringify({ success: false, error: 'Données de facture invalides' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const scopedClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: visibleCandidature } = await scopedClient
      .from('candidatures')
      .select('id')
      .eq('id', candidature_id)
      .maybeSingle();
    if (!visibleCandidature) {
      return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating final AbaNinja invoice request');

    // Calculate final amount
    const montant_final = loyer_mensuel - acompte_paye;
    
    if (montant_final <= 0) {
      throw new Error(`Montant final invalide: ${montant_final} CHF (loyer: ${loyer_mensuel}, acompte: ${acompte_paye})`);
    }

    // Fetch bank accounts from AbaNinja
    console.log('Fetching bank accounts from AbaNinja...');
    const bankAccountsResponse = await fetch(
      `https://api.abaninja.ch/accounts/${accountUuid}/finances/v2/bank-accounts`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      }
    );

    const bankAccountsText = await bankAccountsResponse.text();
    console.log('Bank accounts response status:', bankAccountsResponse.status);

    if (!bankAccountsResponse.ok) {
      throw new Error(`Failed to fetch bank accounts: ${bankAccountsResponse.status} - ${bankAccountsText}`);
    }

    const bankAccounts = JSON.parse(bankAccountsText);
    
    // Find the active/default bank account
    const bankAccount = bankAccounts.data?.find((acc: any) => acc.isActive && acc.isDefault) 
      || bankAccounts.data?.find((acc: any) => acc.isActive)
      || bankAccounts.data?.[0];
    
    if (!bankAccount) {
      throw new Error('No bank account found in AbaNinja. Please configure a bank account first.');
    }

    const iban = bankAccount.qrBill?.qrIban || bankAccount.iban;
    if (!iban) {
      throw new Error('No IBAN found in bank account. Please configure an IBAN in AbaNinja.');
    }
    
    // Generate reference ID from candidature_id
    const referenceId = candidature_id.slice(0, 8).toUpperCase();

    // Calculate dates
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 10);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Create invoice in AbaNinja - v2 API
    const invoiceData = {
      receiver: {
        personUuid: client_uuid,
        addressUuid: address_uuid
      },
      invoiceDate: formatDate(today),
      dueDate: formatDate(dueDate),
      currencyCode: "CHF",
      title: `Solde mandat de recherche - ${prenom} ${nom}`,
      reference: `SOLDE-${referenceId}`,
      publicNotes: "Félicitations pour votre nouveau logement ! Merci pour votre confiance.",
      terms: "Solde du mandat de recherche suite à l'attribution réussie de votre logement.",
      footerText: "www.immo-rama.ch",
      paymentInstructions: bankAccount.qrBill?.qrIban ? {
        qrIban: bankAccount.qrBill.qrIban
      } : {
        iban: bankAccount.iban
      },
      documentTotal: montant_final,
      pricesIncludeVat: true,
      positions: [
        {
          kind: "product",
          positionNumber: 1,
          productDescription: "Solde mandat de recherche - Location réussie",
          additionalDescription: `Bien attribué: ${adresse_bien}\nLoyer mensuel: ${loyer_mensuel.toFixed(2)} CHF\nDéduction acompte versé: -${acompte_paye.toFixed(2)} CHF`,
          quantity: 1,
          singlePrice: montant_final,
          positionTotal: montant_final,
          vat: {
            percentage: 0,
            amount: 0
          }
        }
      ]
    };

    // v2 API requires wrapping in documents array
    const payload = {
      documents: [invoiceData]
    };

    const response = await fetch(
      `https://api.abaninja.ch/accounts/${accountUuid}/documents/v2/invoices`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const responseText = await response.text();
    console.log('AbaNinja invoice response status:', response.status);
    if (!response.ok) {
      console.error('AbaNinja final invoice creation rejected', { status: response.status });
      throw new Error('Final invoice creation failed');
    }

    const data = JSON.parse(responseText);

    // Réponse v2 : { data: { documents: [ … ] } }
    const invoice = extractCreatedInvoice(data);
    console.log('Invoice UUID:', invoice.uuid);

    // Envoi par e-mail (PATCH …/actions/email). Sans UUID, la facture reste en brouillon : on le signale.
    let emailSent = false;
    if (invoice.uuid) {
      const sent = await emailInvoice(accountUuid, apiKey, invoice.uuid);
      emailSent = sent.ok;
      console.log('AbaNinja email action status:', sent.status);
    } else {
      console.error('AbaNinja: facture créée mais UUID introuvable dans la réponse');
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoice.uuid,
        invoice_ref: invoice.number,
        montant: montant_final,
        email_sent: emailSent,
        data: invoice
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error creating final invoice:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Création de la facture finale impossible'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
