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

// Parse Swiss address format: "Street Number ZipCode City" or "Street Number, ZipCode City"
function parseSwissAddress(adresse: string): { street: string; zip_code: string; city: string; state: string } | null {
  if (!adresse || adresse.trim() === '') return null;
  
  // Try to find a 4-digit Swiss postal code
  const zipMatch = adresse.match(/\b(\d{4})\b/);
  if (!zipMatch) {
    console.log('Could not find zip code in address:', adresse);
    return null;
  }
  
  const zipCode = zipMatch[1];
  const zipIndex = adresse.indexOf(zipCode);
  
  // Street is everything before the zip code
  let street = adresse.substring(0, zipIndex).trim();
  // Remove trailing comma if present
  street = street.replace(/,\s*$/, '').trim();
  
  // City is everything after the zip code
  let city = adresse.substring(zipIndex + 4).trim();
  
  // Determine canton/state based on postal code ranges (simplified)
  const state = getSwissState(zipCode);
  
  if (!street || !city) {
    console.log('Could not parse street or city from address:', adresse);
    return null;
  }
  
  return { street, zip_code: zipCode, city, state };
}

// Get Swiss canton based on postal code (simplified mapping)
function getSwissState(zipCode: string): string {
  const zip = parseInt(zipCode, 10);
  
  // Simplified canton mapping based on postal code ranges
  if (zip >= 1000 && zip <= 1299) return 'VD'; // Vaud
  if (zip >= 1300 && zip <= 1399) return 'VD'; // Vaud (Lausanne area)
  if (zip >= 1400 && zip <= 1499) return 'VD'; // Vaud
  if (zip >= 1500 && zip <= 1599) return 'VD'; // Vaud
  if (zip >= 1600 && zip <= 1699) return 'VD'; // Vaud
  if (zip >= 1700 && zip <= 1799) return 'FR'; // Fribourg
  if (zip >= 1800 && zip <= 1899) return 'VD'; // Vaud (Montreux area)
  if (zip >= 1200 && zip <= 1299) return 'GE'; // Genève
  if (zip >= 2000 && zip <= 2099) return 'NE'; // Neuchâtel
  if (zip >= 2300 && zip <= 2399) return 'NE'; // Neuchâtel
  if (zip >= 2500 && zip <= 2599) return 'BE'; // Bern
  if (zip >= 2800 && zip <= 2899) return 'JU'; // Jura
  if (zip >= 3000 && zip <= 3999) return 'BE'; // Bern
  if (zip >= 4000 && zip <= 4999) return 'BS'; // Basel area
  if (zip >= 5000 && zip <= 5999) return 'AG'; // Aargau
  if (zip >= 6000 && zip <= 6999) return 'LU'; // Luzern area
  if (zip >= 7000 && zip <= 7999) return 'GR'; // Graubünden
  if (zip >= 8000 && zip <= 8999) return 'ZH'; // Zürich
  if (zip >= 9000 && zip <= 9999) return 'SG'; // St. Gallen
  
  return 'VD'; // Default to Vaud
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

    // Parse the address if provided
    const parsedAddress = adresse ? parseSwissAddress(adresse) : null;
    console.log('Parsed address:', parsedAddress);

    // Create person in AbaNinja with the correct API v2 format
    // Documentation: https://abaninja.ch/apidocs/#tag/Addresses/paths/~1accounts~1{accountUuid}~1addresses~1v2~1addresses/post
    const personPayload: Record<string, unknown> = {
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
      ]
    };

    // Only add addresses if we could parse them properly
    if (parsedAddress) {
      personPayload.addresses = [
        {
          address: parsedAddress.street,
          city: parsedAddress.city,
          zip_code: parsedAddress.zip_code,
          state: parsedAddress.state,
          country_code: "CH"
        }
      ];
    }

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

    // The response contains the created person in data.data.uuid
    // and the address in data.data.addresses[0].uuid
    const clientUuid = data.data?.uuid || data.uuid;
    const addressUuid = data.data?.addresses?.[0]?.uuid || null;

    console.log('Created client UUID:', clientUuid, 'Address UUID:', addressUuid);

    return new Response(
      JSON.stringify({
        success: true,
        client_uuid: clientUuid,
        address_uuid: addressUuid,
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
