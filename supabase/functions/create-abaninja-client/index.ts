import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateClientRequest {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse?: string;
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

    const { prenom, nom, email, telephone, adresse } = await req.json() as CreateClientRequest;

    console.log('Creating AbaNinja client:', { prenom, nom, email });

    // Create person in AbaNinja
    const personPayload = {
      type: "person",
      first_name: prenom,
      last_name: nom,
      contacts: [
        {
          type: "email",
          value: email
        },
        {
          type: "phone",
          value: telephone
        }
      ],
      addresses: adresse ? [
        {
          type: "main",
          street: adresse,
          country_code: "CH"
        }
      ] : []
    };

    console.log('AbaNinja person payload:', JSON.stringify(personPayload));

    const response = await fetch(
      `https://api.abaninja.ch/accounts/${accountUuid}/addresses/v2/persons`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(personPayload)
      }
    );

    const responseText = await response.text();
    console.log('AbaNinja response status:', response.status);
    console.log('AbaNinja response:', responseText);

    if (!response.ok) {
      throw new Error(`AbaNinja API error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);

    return new Response(
      JSON.stringify({
        success: true,
        client_uuid: data.uuid,
        data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error creating AbaNinja client:', error);
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
