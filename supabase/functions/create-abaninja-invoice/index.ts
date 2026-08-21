import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { verifyInvoiceWorkflowToken } from "../_shared/invoice-workflow-token.ts";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateInvoiceRequest {
  client_uuid: string;
  address_uuid: string;
  type_recherche: string;
  prenom: string;
  nom: string;
  email: string;
  demande_id?: string | null;
  workflow_token?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ABANINJA_API_KEY');
    const accountUuid = Deno.env.get('ABANINJA_ACCOUNT_UUID');

    if (!apiKey || !accountUuid) {
      console.error('Missing AbaNinja credentials');
      throw new Error('AbaNinja credentials not configured');
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const limited = await enforceRateLimit(admin, req, corsHeaders, 'abaninja-public-invoice', {
      maxRequests: 5,
      windowSeconds: 3600,
    });
    if (limited) return limited;

    const { client_uuid, address_uuid, type_recherche, prenom, nom, email, demande_id, workflow_token } = await req.json() as CreateInvoiceRequest;
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!client_uuid || !address_uuid || !prenom || !nom ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
        !['Acheter', 'Louer'].includes(type_recherche) ||
        String(prenom).length > 100 || String(nom).length > 100 || cleanEmail.length > 254) {
      return new Response(JSON.stringify({ success: false, error: 'Données de facture invalides' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const caller = await verifyInternalCaller(req);
    const validWorkflow = await verifyInvoiceWorkflowToken(workflow_token, {
      clientUuid: client_uuid,
      addressUuid: address_uuid,
      email: cleanEmail,
    });
    if (!caller.ok && !validWorkflow) {
      return new Response(JSON.stringify({ success: false, error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating AbaNinja invoice request');

    // Fetch bank accounts from AbaNinja - CORRECTED endpoint with /finances/v2/
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
      console.error('AbaNinja bank account lookup failed', { status: bankAccountsResponse.status });
      throw new Error('Bank account lookup failed');
    }

    const bankAccounts = JSON.parse(bankAccountsText);
    
    // Find the active/default bank account (Raiffeisen PRO with correct IBAN)
    const bankAccount = bankAccounts.data?.find((acc: any) => acc.isActive && acc.isDefault) 
      || bankAccounts.data?.find((acc: any) => acc.isActive)
      || bankAccounts.data?.[0];
    
    if (!bankAccount) {
      throw new Error('No bank account found in AbaNinja. Please configure a bank account first.');
    }

    // Extract IBAN or QR-IBAN from the bank account
    const iban = bankAccount.qrBill?.qrIban || bankAccount.iban;
    if (!iban) {
      throw new Error('No IBAN found in bank account. Please configure an IBAN in AbaNinja.');
    }
    
    // Handle missing demande_id gracefully
    const referenceId = demande_id ? demande_id.slice(0, 8).toUpperCase() : Date.now().toString(36).toUpperCase();

    // Calculate amount based on search type
    const montant = type_recherche === 'Acheter' ? 2500 : 300;
    const description = type_recherche === 'Acheter' 
      ? "Montant d'activation - Mandat de recherche Achat immobilier (CHF 2'500.- imputés sur la commission de 1 % du prix de vente, min. CHF 500)"
      : 'Acompte mandat de recherche - Location';

    // Calculate dates
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 10);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Create invoice in AbaNinja - v2 API with correct schema
    const invoiceData = {
      receiver: {
        personUuid: client_uuid,
        addressUuid: address_uuid
      },
      invoiceDate: formatDate(today),
      dueDate: formatDate(dueDate),
      currencyCode: "CHF",
      title: `Mandat de recherche - ${prenom} ${nom}`,
      reference: `MANDAT-${referenceId}`,
      // Notes publiques (champ API: publicNotes)
      publicNotes: "Merci pour votre confiance et votre collaboration",
      // Conditions (champ API: terms)
      terms: "Acompte dû pour l'activation de vos recherches.",
      // Pied de page (champ API: footerText)
      footerText: "www.immo-rama.ch",
      paymentInstructions: bankAccount.qrBill?.qrIban ? {
        qrIban: bankAccount.qrBill.qrIban
      } : {
        iban: bankAccount.iban
      },
      documentTotal: montant,
      pricesIncludeVat: true,
      positions: [
        {
          kind: "product",
          positionNumber: 1,
          productDescription: description,
          additionalDescription: `Activation des recherches de logement à ${type_recherche.toLowerCase()} pour ${prenom} ${nom}`,
          quantity: 1,
          singlePrice: montant,
          positionTotal: montant,
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
      console.error('AbaNinja invoice creation rejected', { status: response.status });
      throw new Error('Invoice creation failed');
    }

    const data = JSON.parse(responseText);

    // v2 API returns documents in data array
    const invoice = data.data?.[0] || data.documents?.[0] || data;

    // Send invoice by email automatically
    let emailSent = false;
    console.log('Invoice UUID:', invoice.uuid);
    
    try {
      // AbaNinja API v2 - Send invoice via POST to /send endpoint
      const sendResponse = await fetch(
        `https://api.abaninja.ch/accounts/${accountUuid}/documents/v2/invoices/${invoice.uuid}/send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            channel: 'email',
            recipient: {
              email: cleanEmail
            }
          })
        }
      );

      await sendResponse.text();
      console.log('Send invoice response status:', sendResponse.status);

      if (sendResponse.ok) {
        console.log('Invoice sent successfully');
        emailSent = true;
      } else {
        console.warn('Failed to send invoice by email', { status: sendResponse.status });
        
        // Fallback: Try alternative endpoint format
        console.log('Trying alternative send endpoint...');
        const altSendResponse = await fetch(
          `https://api.abaninja.ch/accounts/${accountUuid}/documents/v2/invoices/${invoice.uuid}/actions/send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              channel: 'email',
              recipientEmail: cleanEmail
            })
          }
        );
        
        await altSendResponse.text();
        console.log('Alternative send response status:', altSendResponse.status);
        
        if (altSendResponse.ok) {
          console.log('Invoice sent via alternative endpoint');
          emailSent = true;
        }
      }
    } catch (sendErr) {
      console.warn('Error sending invoice by email:', sendErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoice.uuid,
        invoice_number: invoice.number || invoice.reference,
        amount: montant,
        email_sent: emailSent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error creating AbaNinja invoice:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Création de la facture impossible'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
