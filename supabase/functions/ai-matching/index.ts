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
  confidence: 'high' | 'medium' | 'low';
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

// Decode quoted-printable content
function decodeQuotedPrintable(str: string): string {
  let result = str.replace(/=\r?\n/g, '');
  result = result.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
  try {
    const bytes = new Uint8Array(result.length);
    for (let i = 0; i < result.length; i++) {
      bytes[i] = result.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    return result;
  }
}

// Strip HTML tags and clean content
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// Clean email content for AI analysis
function cleanEmailContent(bodyText: string | null, bodyHtml: string | null): string {
  let content = '';
  
  // Prefer HTML if available (more structured)
  if (bodyHtml && bodyHtml.length > 100) {
    content = stripHtml(bodyHtml);
  } else if (bodyText) {
    content = bodyText;
  }
  
  // Decode quoted-printable if detected
  if (content.includes('=C3') || content.includes('=E2') || content.includes('=20')) {
    content = decodeQuotedPrintable(content);
  }
  
  // Clean MIME headers/boundaries
  content = content
    .replace(/Content-Type:[^\r\n]*\r?\n/gi, '')
    .replace(/Content-Transfer-Encoding:[^\r\n]*\r?\n/gi, '')
    .replace(/--[A-Za-z0-9_.=-]+(?:--)?/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return content.substring(0, 6000);
}

async function extractPropertyInfo(emailContent: string, subject: string, fromEmail: string): Promise<ExtractedProperty> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return { price: null, pieces: null, surface: null, location: null, type_bien: null, address: null, disponibilite: null, regie: null, is_property_offer: false, confidence: 'low' };
  }

  const prompt = `Tu es un expert en extraction d'informations immobilières suisses. Analyse cet email et extrait les informations.

ÉMETTEUR: ${fromEmail}
SUJET: ${subject}

CONTENU:
${emailContent}

INSTRUCTIONS:
1. Les emails d'alertes immobilières (RealAdvisor, Immoscout, Homegate, Comparis, etc.) contiennent TOUJOURS des offres
2. Extrais TOUTES les informations même partielles
3. Pour la localisation, recherche: ville, code postal, canton, quartier
4. Les prix sont en CHF (loyer mensuel pour location)
5. "3.5 pièces" = 3.5, "4 pièces" = 4

Réponds UNIQUEMENT avec un JSON valide:
{
  "is_property_offer": true/false,
  "confidence": "high"/"medium"/"low",
  "price": nombre ou null,
  "pieces": nombre ou null,
  "surface": nombre ou null,
  "location": "ville/région" ou null,
  "type_bien": "appartement"/"maison"/"studio"/"villa"/"duplex"/"attique" ou null,
  "address": "adresse complète" ou null,
  "disponibilite": "date/période" ou null,
  "regie": "nom régie/source" ou null
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
          { role: "system", content: "Tu es un assistant spécialisé dans l'extraction d'informations immobilières suisses. Tu réponds uniquement en JSON valide. Pour les emails d'alertes (RealAdvisor, Immoscout, Homegate, Comparis), considère toujours is_property_offer=true." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return { price: null, pieces: null, surface: null, location: null, type_bien: null, address: null, disponibilite: null, regie: null, is_property_offer: false, confidence: 'low' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
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
        regie: parsed.regie || getRegieFromEmail(fromEmail),
        is_property_offer: parsed.is_property_offer === true,
        confidence: parsed.confidence || 'medium',
      };
    }
  } catch (error) {
    console.error("Error extracting property info:", error);
  }

  return { price: null, pieces: null, surface: null, location: null, type_bien: null, address: null, disponibilite: null, regie: null, is_property_offer: false, confidence: 'low' };
}

function getRegieFromEmail(email: string): string | null {
  const sources: Record<string, string> = {
    'realadvisor': 'RealAdvisor',
    'immoscout': 'ImmoScout24',
    'homegate': 'Homegate',
    'comparis': 'Comparis',
    'immostreet': 'ImmoStreet',
    'anibis': 'Anibis',
  };
  
  const lowerEmail = email.toLowerCase();
  for (const [key, name] of Object.entries(sources)) {
    if (lowerEmail.includes(key)) return name;
  }
  return null;
}

function calculateMatchScore(property: ExtractedProperty, client: Client): { score: number; details: Record<string, any>; category: string } {
  let score = 0;
  const details: Record<string, any> = {
    price_match: false,
    pieces_match: false,
    location_match: false,
    type_match: false,
  };

  // Location match (35 points max) - Most important for partial matches
  if (property.location && client.region_recherche) {
    const propertyLocation = property.location.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const clientRegion = client.region_recherche.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (propertyLocation.includes(clientRegion) || clientRegion.includes(propertyLocation)) {
      score += 35;
      details.location_match = true;
      details.location_info = `${property.location} correspond à ${client.region_recherche}`;
    } else {
      const regions: Record<string, string[]> = {
        "lausanne": ["lausanne", "vaud", "lac leman", "leman", "ouest lausannois", "renens", "prilly", "crissier", "ecublens", "chavannes", "bussigny"],
        "geneve": ["geneve", "geneva", "genf", "carouge", "lancy", "meyrin", "vernier", "onex"],
        "vaud": ["vaud", "lausanne", "morges", "nyon", "yverdon", "vevey", "montreux", "renens", "pully", "lutry", "prilly", "ecublens", "crissier"],
        "fribourg": ["fribourg", "bulle", "romont", "murten", "morat"],
        "neuchatel": ["neuchatel", "la chaux-de-fonds", "le locle"],
        "valais": ["valais", "sion", "sierre", "martigny", "monthey", "visp", "brig"],
        "bern": ["bern", "berne", "biel", "bienne", "thun", "thoune"],
        "zurich": ["zurich", "zürich", "winterthur", "dietikon"],
      };
      
      for (const [region, cities] of Object.entries(regions)) {
        const matchesProperty = cities.some(c => propertyLocation.includes(c));
        const matchesClient = cities.some(c => clientRegion.includes(c)) || clientRegion.includes(region);
        if (matchesProperty && matchesClient) {
          score += 30;
          details.location_match = true;
          details.location_info = `${property.location} dans la région ${client.region_recherche}`;
          break;
        }
      }
    }
  }

  // Price match (25 points max)
  if (property.price !== null && client.budget_max !== null) {
    if (property.price <= client.budget_max) {
      score += 25;
      details.price_match = true;
      details.price_info = `${property.price} CHF ≤ budget ${client.budget_max} CHF`;
    } else if (property.price <= client.budget_max * 1.15) {
      score += 15;
      details.price_info = `${property.price} CHF légèrement au-dessus du budget`;
    } else if (property.price <= client.budget_max * 1.25) {
      score += 8;
      details.price_info = `${property.price} CHF au-dessus du budget`;
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
      details.pieces_match = true;
      details.pieces_info = `${property.pieces} pièces ≈ ${client.pieces} pièces recherchées`;
    } else if (diff <= 1) {
      score += 12;
      details.pieces_info = `${property.pieces} pièces proche de ${client.pieces} pièces`;
    }
  }

  // Type match (15 points max)
  if (property.type_bien && client.type_bien) {
    const propertyType = property.type_bien.toLowerCase();
    const clientType = client.type_bien.toLowerCase();
    
    if (propertyType === clientType) {
      score += 15;
      details.type_match = true;
      details.type_info = `Type ${property.type_bien} correspond`;
    } else {
      const similar: Record<string, string[]> = {
        "appartement": ["appartement", "studio", "duplex", "attique", "loft"],
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

  // Determine category based on score
  let category = 'À vérifier';
  if (score >= 70) {
    category = 'Match parfait';
  } else if (score >= 40) {
    category = 'Match probable';
  }

  return { score, details, category };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      // Get unanalyzed emails - include body_html for better extraction
      const { data: emails, error: emailsError } = await supabase
        .from('received_emails')
        .select('id, subject, body_text, body_html, from_email, from_name, user_id')
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

      // Get active clients for this agent
      let clientsQuery = supabase
        .from('clients')
        .select('id, pieces, budget_max, region_recherche, type_bien, type_recherche, user_id, agent_id')
        .eq('statut', 'actif');

      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (agentData) {
        const { data: clientIds } = await supabase
          .from('client_agents')
          .select('client_id')
          .eq('agent_id', agentData.id);
        
        const ids = clientIds?.map(c => c.client_id) || [];
        
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
        console.log(`Analyzing email: ${email.subject} from ${email.from_email}`);
        
        // Clean and prepare email content
        const cleanedContent = cleanEmailContent(email.body_text, email.body_html);
        
        // Extract property info using AI
        const propertyInfo = await extractPropertyInfo(
          cleanedContent, 
          email.subject || '',
          email.from_email || ''
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
          console.log(`Email ${email.id} is not a property offer, skipping`);
          continue;
        }

        console.log(`Extracted property info:`, propertyInfo);

        // Match against clients - LOWERED threshold to 15%
        for (const client of clients || []) {
          const { score, details, category } = calculateMatchScore(propertyInfo, client);
          
          // Create match if score >= 15% (was 30%)
          if (score >= 15) {
            console.log(`Match found: client ${client.id} with score ${score} (${category})`);
            
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
                match_details: { ...details, category, confidence: propertyInfo.confidence },
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

      // Get unanalyzed email count
      const { count: unanalyzedCount } = await supabase
        .from('received_emails')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('ai_analyzed', false);

      return new Response(JSON.stringify({ 
        success: true,
        matches: matches || [],
        unanalyzed_count: unanalyzedCount || 0
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
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let baseQuery = supabase.from('ai_matches').select('status');
      if (agentData) {
        baseQuery = baseQuery.eq('agent_id', agentData.id);
      }

      const { data: allMatches } = await baseQuery;
      
      const pending = allMatches?.filter(m => m.status === 'pending').length || 0;
      const accepted = allMatches?.filter(m => m.status === 'accepted').length || 0;
      const converted = allMatches?.filter(m => m.status === 'converted').length || 0;

      // Get unanalyzed email count
      const { count: unanalyzedCount } = await supabase
        .from('received_emails')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('ai_analyzed', false);

      return new Response(JSON.stringify({ 
        success: true,
        stats: {
          pending,
          accepted,
          converted,
          unanalyzed: unanalyzedCount || 0,
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
