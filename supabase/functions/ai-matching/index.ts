import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedProperty {
  price: number | null;
  pieces: number | null;
  surface: number | null;
  location: string | null;
  type_bien: string | null;
  address: string | null;
  disponibilite: string | null;
  regie: string | null;
  is_property_offer: boolean;
}

interface Client {
  id: string;
  pieces: number | null;
  budget_max: number | null;
  region_recherche: string | null;
  type_bien: string | null;
  type_recherche: string | null;
  user_id: string;
  agent_id: string | null;
}

async function extractPropertyInfo(emailContent: string, subject: string): Promise<ExtractedProperty> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return { price: null, pieces: null, surface: null, location: null, type_bien: null, address: null, disponibilite: null, regie: null, is_property_offer: false };
  }

  const prompt = `Tu es un expert en extraction d'informations immobilières. Analyse cet email et extrait les informations sur le bien immobilier proposé.

SUJET DE L'EMAIL:
${subject}

CONTENU DE L'EMAIL:
${emailContent.substring(0, 4000)}

INSTRUCTIONS:
1. Détermine d'abord si cet email contient une offre immobilière (appartement, maison, studio à louer ou vendre)
2. Si oui, extrais les informations suivantes

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "is_property_offer": true/false,
  "price": nombre ou null (loyer mensuel ou prix de vente en CHF),
  "pieces": nombre ou null (nombre de pièces, ex: 3.5, 4, 2),
  "surface": nombre ou null (surface en m²),
  "location": "ville/localité" ou null,
  "type_bien": "appartement" ou "maison" ou "studio" ou "villa" ou "duplex" ou "attique" ou null,
  "address": "adresse complète si disponible" ou null,
  "disponibilite": "date ou période de disponibilité" ou null,
  "regie": "nom de la régie/agence immobilière" ou null
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un assistant spécialisé dans l'extraction d'informations immobilières. Tu réponds uniquement en JSON valide." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return { price: null, pieces: null, surface: null, location: null, type_bien: null, address: null, disponibilite: null, regie: null, is_property_offer: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        price: parsed.price,
        pieces: parsed.pieces,
        surface: parsed.surface,
        location: parsed.location,
        type_bien: parsed.type_bien,
        address: parsed.address,
        disponibilite: parsed.disponibilite,
        regie: parsed.regie,
        is_property_offer: parsed.is_property_offer === true,
      };
    }
  } catch (error) {
    console.error("Error extracting property info:", error);
  }

  return { price: null, pieces: null, surface: null, location: null, type_bien: null, address: null, disponibilite: null, regie: null, is_property_offer: false };
}

function calculateMatchScore(property: ExtractedProperty, client: Client): { score: number; details: Record<string, any> } {
  let score = 0;
  const details: Record<string, any> = {
    price_match: false,
    pieces_match: false,
    location_match: false,
    type_match: false,
  };

  // Price match (30 points max)
  if (property.price !== null && client.budget_max !== null) {
    if (property.price <= client.budget_max) {
      score += 30;
      details.price_match = true;
      details.price_info = `${property.price} CHF ≤ budget ${client.budget_max} CHF`;
    } else if (property.price <= client.budget_max * 1.1) {
      // Within 10% over budget
      score += 15;
      details.price_info = `${property.price} CHF légèrement au-dessus du budget`;
    }
  }

  // Pieces match (25 points max)
  if (property.pieces !== null && client.pieces !== null) {
    const diff = Math.abs(property.pieces - client.pieces);
    if (diff === 0) {
      score += 25;
      details.pieces_match = true;
      details.pieces_info = `${property.pieces} pièces = recherche exacte`;
    } else if (diff <= 0.5) {
      score += 20;
      details.pieces_info = `${property.pieces} pièces ≈ ${client.pieces} pièces recherchées`;
    } else if (diff <= 1) {
      score += 10;
      details.pieces_info = `${property.pieces} pièces proche de ${client.pieces} pièces`;
    }
  }

  // Location match (25 points max)
  if (property.location && client.region_recherche) {
    const propertyLocation = property.location.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const clientRegion = client.region_recherche.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Check if location contains region or vice versa
    if (propertyLocation.includes(clientRegion) || clientRegion.includes(propertyLocation)) {
      score += 25;
      details.location_match = true;
      details.location_info = `${property.location} correspond à ${client.region_recherche}`;
    } else {
      // Check for common Swiss regions
      const regions: Record<string, string[]> = {
        "lausanne": ["lausanne", "vaud", "lac leman", "leman"],
        "geneve": ["geneve", "geneva", "genf"],
        "vaud": ["vaud", "lausanne", "morges", "nyon", "yverdon", "vevey", "montreux", "renens", "pully", "lutry"],
        "fribourg": ["fribourg", "bulle", "romont"],
        "neuchatel": ["neuchatel", "la chaux-de-fonds"],
        "valais": ["valais", "sion", "sierre", "martigny", "monthey"],
      };
      
      for (const [region, cities] of Object.entries(regions)) {
        const matchesProperty = cities.some(c => propertyLocation.includes(c));
        const matchesClient = cities.some(c => clientRegion.includes(c)) || clientRegion.includes(region);
        if (matchesProperty && matchesClient) {
          score += 20;
          details.location_match = true;
          details.location_info = `${property.location} dans la région ${client.region_recherche}`;
          break;
        }
      }
    }
  }

  // Type match (20 points max)
  if (property.type_bien && client.type_bien) {
    const propertyType = property.type_bien.toLowerCase();
    const clientType = client.type_bien.toLowerCase();
    
    if (propertyType === clientType) {
      score += 20;
      details.type_match = true;
      details.type_info = `Type ${property.type_bien} correspond`;
    } else {
      // Similar types
      const similar: Record<string, string[]> = {
        "appartement": ["appartement", "studio", "duplex", "attique"],
        "maison": ["maison", "villa", "chalet"],
      };
      for (const [main, types] of Object.entries(similar)) {
        if (types.includes(propertyType) && types.includes(clientType)) {
          score += 10;
          details.type_info = `${property.type_bien} similaire à ${client.type_bien}`;
          break;
        }
      }
    }
  }

  return { score, details };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, email_id, match_id, limit = 20 } = await req.json();
    console.log(`AI Matching action: ${action} by user: ${user.id}`);

    if (action === 'analyze') {
      // Get unanalyzed emails for this user
      const { data: emails, error: emailsError } = await supabase
        .from('received_emails')
        .select('id, subject, body_text, from_email, user_id')
        .eq('user_id', user.id)
        .eq('ai_analyzed', false)
        .order('received_at', { ascending: false })
        .limit(limit);

      if (emailsError) {
        console.error("Error fetching emails:", emailsError);
        throw emailsError;
      }

      console.log(`Found ${emails?.length || 0} unanalyzed emails`);

      if (!emails || emails.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Aucun nouvel email à analyser',
          analyzed: 0,
          matches: 0 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get active clients (for agents: their clients, for admins: all)
      let clientsQuery = supabase
        .from('clients')
        .select('id, pieces, budget_max, region_recherche, type_bien, type_recherche, user_id, agent_id')
        .eq('statut', 'actif');

      // Check if user is agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (agentData) {
        // Get clients for this agent (primary + co-agent)
        const { data: clientIds } = await supabase
          .from('client_agents')
          .select('client_id')
          .eq('agent_id', agentData.id);
        
        const ids = clientIds?.map(c => c.client_id) || [];
        
        // Also get clients where agent is primary
        const { data: primaryClients } = await supabase
          .from('clients')
          .select('id')
          .eq('agent_id', agentData.id);
        
        const primaryIds = primaryClients?.map(c => c.id) || [];
        const allIds = [...new Set([...ids, ...primaryIds])];
        
        if (allIds.length > 0) {
          clientsQuery = clientsQuery.in('id', allIds);
        } else {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Aucun client actif assigné',
            analyzed: 0,
            matches: 0 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const { data: clients, error: clientsError } = await clientsQuery;
      
      if (clientsError) {
        console.error("Error fetching clients:", clientsError);
        throw clientsError;
      }

      console.log(`Found ${clients?.length || 0} active clients to match against`);

      let analyzedCount = 0;
      let matchesCount = 0;

      for (const email of emails) {
        console.log(`Analyzing email: ${email.subject}`);
        
        // Extract property info using AI
        const propertyInfo = await extractPropertyInfo(
          email.body_text || '', 
          email.subject || ''
        );

        // Mark email as analyzed
        await supabase
          .from('received_emails')
          .update({ 
            ai_analyzed: true, 
            ai_analyzed_at: new Date().toISOString() 
          })
          .eq('id', email.id);

        analyzedCount++;

        // Skip if not a property offer
        if (!propertyInfo.is_property_offer) {
          console.log(`Email ${email.id} is not a property offer, skipping matching`);
          continue;
        }

        console.log(`Extracted property info:`, propertyInfo);

        // Match against clients
        for (const client of clients || []) {
          // Skip if client is looking to buy but email is rental (or vice versa)
          // For now, we match all types
          
          const { score, details } = calculateMatchScore(propertyInfo, client);
          
          // Only create match if score is above threshold (30%)
          if (score >= 30) {
            console.log(`Match found: client ${client.id} with score ${score}`);
            
            const { error: insertError } = await supabase
              .from('ai_matches')
              .upsert({
                email_id: email.id,
                client_id: client.id,
                agent_id: agentData?.id || client.agent_id,
                extracted_price: propertyInfo.price,
                extracted_pieces: propertyInfo.pieces,
                extracted_surface: propertyInfo.surface,
                extracted_location: propertyInfo.location,
                extracted_type_bien: propertyInfo.type_bien,
                extracted_address: propertyInfo.address,
                extracted_disponibilite: propertyInfo.disponibilite,
                extracted_regie: propertyInfo.regie,
                email_subject: email.subject,
                email_from: email.from_email,
                match_score: score,
                match_details: details,
                status: 'pending',
                processed_at: new Date().toISOString(),
              }, {
                onConflict: 'email_id,client_id',
              });

            if (insertError) {
              console.error(`Error inserting match:`, insertError);
            } else {
              matchesCount++;
            }
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: `Analyse terminée`,
        analyzed: analyzedCount,
        matches: matchesCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'get_matches') {
      // Get matches for the user's clients
      let matchesQuery = supabase
        .from('ai_matches')
        .select(`
          *,
          client:clients(
            id,
            user_id,
            pieces,
            budget_max,
            region_recherche,
            type_bien,
            profiles:user_id(prenom, nom, email)
          )
        `)
        .order('match_score', { ascending: false })
        .order('created_at', { ascending: false });

      // Check if user is agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (agentData) {
        matchesQuery = matchesQuery.eq('agent_id', agentData.id);
      }

      const { data: matches, error: matchesError } = await matchesQuery;

      if (matchesError) {
        console.error("Error fetching matches:", matchesError);
        throw matchesError;
      }

      return new Response(JSON.stringify({ 
        success: true,
        matches: matches || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'update_status') {
      if (!match_id) {
        return new Response(JSON.stringify({ error: 'match_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { status } = await req.json();
      
      const { error: updateError } = await supabase
        .from('ai_matches')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', match_id);

      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'get_stats') {
      // Check if user is agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let query = supabase.from('ai_matches').select('status', { count: 'exact' });
      
      if (agentData) {
        query = query.eq('agent_id', agentData.id);
      }

      const { data: pending } = await query.eq('status', 'pending');
      const { data: accepted } = await supabase.from('ai_matches').select('id', { count: 'exact' }).eq('status', 'accepted');
      const { data: converted } = await supabase.from('ai_matches').select('id', { count: 'exact' }).eq('status', 'converted');

      return new Response(JSON.stringify({ 
        success: true,
        stats: {
          pending: pending?.length || 0,
          accepted: accepted?.length || 0,
          converted: converted?.length || 0,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-matching function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
