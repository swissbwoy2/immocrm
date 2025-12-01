import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey || !accountUuid) {
      console.error('Missing AbaNinja credentials');
      throw new Error('AbaNinja credentials not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      throw new Error('Supabase credentials not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { prenom, nom, email, telephone, adresse } = await req.json() as CreateClientRequest;

    console.log('Creating AbaNinja client:', { prenom, nom, email });

    // Get next client number using the database function
    const { data: clientNumber, error: numberError } = await supabase.rpc('get_next_abaninja_client_number');

    if (numberError) {
      console.error('Error getting next client number:', numberError);
      throw new Error('Failed to generate client number');
    }

    console.log('Generated client number:', clientNumber);

    // Create person in AbaNinja with the correct API v2 format
    // Documentation: https://abaninja.ch/apidocs/#tag/Addresses/paths/~1accounts~1{accountUuid}~1addresses~1v2~1addresses/post
    const personPayload = {
      type: "person",
      customer_number: clientNumber, // e.g., "IR0149"
      first_name: prenom,
      last_name: nom,
      currency_code: "CHF",
      language: "fr",
      contacts: [
        {
          type: "email",
          value: email,
          primary: true
        },
        {
          type: "phone",
          value: telephone,
          primary: false
        }
      ],
      addresses: adresse ? [
        {
          address: adresse,
          country_code: "CH"
        }
      ] : []
    };

    console.log('AbaNinja person payload:', JSON.stringify(personPayload));

    // Use the correct v2 endpoint for creating addresses
    const response = await fetch(
      `https://api.abaninja.ch/accounts/${accountUuid}/addresses/v2/addresses?force=true`,
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

    // The response contains the created address in data.data.uuid
    const clientUuid = data.data?.uuid || data.uuid;

    return new Response(
      JSON.stringify({
        success: true,
        client_uuid: clientUuid,
        client_number: clientNumber,
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
