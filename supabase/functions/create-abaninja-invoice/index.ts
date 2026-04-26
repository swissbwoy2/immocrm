import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  demande_id: string;
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

    const { client_uuid, address_uuid, type_recherche, prenom, nom, email, demande_id } = await req.json() as CreateInvoiceRequest;

    console.log('Creating AbaNinja invoice for:', { client_uuid, address_uuid, type_recherche, email });

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
    console.log('Bank accounts response:', bankAccountsText);

    if (!bankAccountsResponse.ok) {
      throw new Error(`Failed to fetch bank accounts: ${bankAccountsResponse.status} - ${bankAccountsText}`);
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
    console.log('Using IBAN:', iban ? `${iban.substring(0, 8)}...` : 'none');
    console.log('Using bank account:', bankAccount.name);

    if (!iban) {
      throw new Error('No IBAN found in bank account. Please configure an IBAN in AbaNinja.');
    }
    
    // Handle missing demande_id gracefully
    const referenceId = demande_id ? demande_id.slice(0, 8).toUpperCase() : Date.now().toString(36).toUpperCase();

    // Calculate amount based on search type
    const montant = type_recherche === 'Acheter' ? 2500 : 300;
    const description = type_recherche === 'Acheter' 
      ? 'Acompte mandat de recherche - Achat immobilier'
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

    console.log('AbaNinja invoice payload:', JSON.stringify(payload, null, 2));

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
    console.log('Sending invoice by email to:', email);
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
              email: email
            }
          })
        }
      );

      const sendResponseText = await sendResponse.text();
      console.log('Send invoice response status:', sendResponse.status);
      console.log('Send invoice response:', sendResponseText);

      if (sendResponse.ok) {
        console.log('Invoice sent successfully by email to:', email);
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
        
        const altResponseText = await altSendResponse.text();
        console.log('Alternative send response status:', altSendResponse.status);
        console.log('Alternative send response:', altResponseText);
        
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
        data: invoice
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error creating AbaNinja invoice:', error);
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
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
