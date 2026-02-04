import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log('Creating final invoice for:', { 
      client_uuid, 
      candidature_id, 
      loyer_mensuel, 
      acompte_paye,
      adresse_bien 
    });

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
    console.log('Using bank account:', bankAccount.name);

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

    console.log('AbaNinja final invoice payload:', JSON.stringify(payload, null, 2));

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
    console.log('AbaNinja invoice response:', responseText);

    if (!response.ok) {
      throw new Error(`AbaNinja API error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);

    // v2 API returns documents in data array
    const invoice = data.data?.[0] || data.documents?.[0] || data;

    // Send invoice by email automatically
    let emailSent = false;
    console.log('Sending final invoice by email to:', email);
    console.log('Invoice UUID:', invoice.uuid);
    
    try {
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
              email: email
            }
          })
        }
      );

      const sendResponseText = await sendResponse.text();
      console.log('Send invoice response status:', sendResponse.status);

      if (sendResponse.ok) {
        console.log('Final invoice sent successfully by email to:', email);
        emailSent = true;
      } else {
        console.warn('Failed to send invoice by email:', sendResponse.status, sendResponseText);
        
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
              recipientEmail: email
            })
          }
        );
        
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
        invoice_ref: invoice.number || invoice.reference,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
