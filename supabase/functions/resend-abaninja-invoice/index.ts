import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { emailInvoice } from "../_shared/abaninja-invoice.ts";

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

  // Réservé à l'équipe (pages admin « Factures AbaNinja » et « Demandes d'activation ») : sans ce contrôle,
  // n'importe qui pouvait faire envoyer une facture à n'importe quelle adresse.
  const caller = await verifyInternalCaller(req);
  if (!caller.ok || !(caller.kind === 'service' || caller.kind === 'secret' || (caller.kind === 'staff' && (caller.roles ?? []).includes('admin')))) {
    return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    });
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

    // Envoi par e-mail : PATCH …/actions/email (vers l'e-mail du contact AbaNinja).
    const sent = await emailInvoice(accountUuid, apiKey, invoice_uuid);
    console.log('AbaNinja email action status:', sent.status);
    if (!sent.ok) {
      throw new Error(`AbaNinja API error: ${sent.status} - ${sent.detail}`);
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
