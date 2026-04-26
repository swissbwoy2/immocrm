import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendInvoiceRequest {
  invoice_uuid: string;
  email: string;
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

    const { invoice_uuid, email } = await req.json() as ResendInvoiceRequest;

    if (!invoice_uuid) {
      throw new Error('invoice_uuid is required');
    }

    console.log('Resending AbaNinja invoice:', { invoice_uuid, email });

    // Send invoice via AbaNinja API
    const sendPayload = {
      send_type: "email",
      recipient_email: email,
      message: "Veuillez trouver ci-joint votre facture Immo-Rama. Merci de procéder au paiement dans les meilleurs délais."
    };

    console.log('AbaNinja send payload:', JSON.stringify(sendPayload));

    const response = await fetch(
      `https://api.abaninja.ch/accounts/${accountUuid}/invoices/v2/invoices/${invoice_uuid}/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(sendPayload)
      }
    );

    const responseText = await response.text();
    console.log('AbaNinja send response status:', response.status);
    console.log('AbaNinja send response:', responseText);

    if (!response.ok) {
      throw new Error(`AbaNinja API error: ${response.status} - ${responseText}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invoice resent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error resending AbaNinja invoice:', error);
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
