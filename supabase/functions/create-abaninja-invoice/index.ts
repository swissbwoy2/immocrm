import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateInvoiceRequest {
  client_uuid: string;
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

    const { client_uuid, type_recherche, prenom, nom, email, demande_id } = await req.json() as CreateInvoiceRequest;

    console.log('Creating AbaNinja invoice for:', { client_uuid, type_recherche, email });

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

    // Create invoice in AbaNinja - v2 API requires camelCase field names
    const invoiceData = {
      addressUuid: client_uuid,
      invoiceDate: formatDate(today),
      dueDate: formatDate(dueDate),
      currencyCode: "CHF",
      title: `Mandat de recherche - ${prenom} ${nom}`,
      reference: `MANDAT-${demande_id.slice(0, 8).toUpperCase()}`,
      positions: [
        {
          type: "product",
          name: description,
          description: `Activation des recherches de logement à ${type_recherche.toLowerCase()} pour ${prenom} ${nom}`,
          quantity: 1,
          unitPrice: montant,
          vatRate: 0 // Services exemptés de TVA
        }
      ]
    };

    // v2 API requires wrapping in documents array
    const payload = {
      documents: [invoiceData]
    };

    console.log('AbaNinja invoice payload:', JSON.stringify(payload));

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

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoice.uuid,
        invoice_number: invoice.number || invoice.reference,
        amount: montant,
        data: invoice
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error creating AbaNinja invoice:', error);
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
