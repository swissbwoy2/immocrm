import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Known property alert sources - domains and keywords to identify real estate alerts
const ALERT_SOURCES = [
  // Major Swiss property portals
  { domain: 'realadvisor', name: 'RealAdvisor' },
  { domain: 'immoscout', name: 'ImmoScout24' },
  { domain: 'homegate', name: 'Homegate' },
  { domain: 'comparis', name: 'Comparis' },
  { domain: 'immobilier.ch', name: 'Immobilier.ch' },
  { domain: 'immostreet', name: 'ImmoStreet' },
  { domain: 'anibis', name: 'Anibis' },
  { domain: 'flatfox', name: 'Flatfox' },
  { domain: 'newhome', name: 'Newhome' },
  { domain: 'acheter-louer', name: 'Acheter-Louer' },
  { domain: 'immomapper', name: 'ImmoMapper' },
  { domain: 'home.ch', name: 'Home.ch' },
  { domain: 'propertypal', name: 'PropertyPal' },
];

// Keywords in subject that indicate property alerts
const ALERT_KEYWORDS = [
  'nouvelle annonce', 'nouvel appartement', 'nouveau bien', 'nouvelle offre',
  'alerte immobilière', 'alerte logement', 'property alert', 'new listing',
  'correspond à vos critères', 'matches your criteria', 'matching properties',
  'résultats de recherche', 'trouvé pour vous', 'nouvelles annonces',
  'pièces à louer', 'appartement à louer', 'maison à louer', 'studio à louer',
  'à vendre', 'à louer', 'chf/mois', 'chf mensuel',
];

// Domains to IGNORE (internal, spam, newsletters unrelated to properties)
const IGNORED_DOMAINS = [
  'immo-rama.ch', 'logisorama.ch', // Internal
  'linkedin.com', 'facebook.com', 'twitter.com', // Social
  'google.com', 'microsoft.com', 'apple.com', // Tech
  'noreply', 'no-reply', 'mailer-daemon', // System
  'temu.com', 'aliexpress.com', 'amazon.com', // Shopping
];

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

interface EmailData {
  id: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  from_email: string | null;
  from_name: string | null;
  user_id: string;
  ai_analyzed: boolean;
}

// Check if an email is from a known property alert source
function isPropertyAlertEmail(fromEmail: string | null, subject: string | null): { isAlert: boolean; source: string | null } {
  const emailLower = (fromEmail || '').toLowerCase();
  const subjectLower = (subject || '').toLowerCase();
  
  // Check if from ignored domain
  for (const ignored of IGNORED_DOMAINS) {
    if (emailLower.includes(ignored)) {
      return { isAlert: false, source: null };
    }
  }
  
  // Check known alert sources by domain
  for (const source of ALERT_SOURCES) {
    if (emailLower.includes(source.domain)) {
      return { isAlert: true, source: source.name };
    }
  }
  
  // Check subject for alert keywords
  for (const keyword of ALERT_KEYWORDS) {
    if (subjectLower.includes(keyword.toLowerCase())) {
      return { isAlert: true, source: 'Alerte email' };
    }
  }
  
  return { isAlert: false, source: null };
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

async function extractPropertyInfo(emailContent: string, subject: string, fromEmail: string, sourceName: string | null): Promise<ExtractedProperty> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return { price: null, pieces: null, surface: null, location: null, type_bien: null, address: null, disponibilite: null, regie: sourceName, is_property_offer: true, confidence: 'low' };
  }

  const prompt = `Tu es un expert en extraction d'informations immobilières suisses. Analyse cet email d'alerte de ${sourceName || 'portail immobilier'}.

ÉMETTEUR: ${fromEmail}
SUJET: ${subject}

CONTENU:
${emailContent}

INSTRUCTIONS IMPORTANTES:
1. C'est une alerte immobilière de ${sourceName || 'un portail'} - il y a FORCÉMENT des informations sur des biens
2. Extrais le PREMIER bien mentionné (prix, pièces, surface, localisation)
3. Pour la localisation, cherche: ville, code postal, canton, quartier
4. Prix en CHF (loyer mensuel pour location, prix de vente pour achat)
5. "3.5 pièces" = 3.5, "4 pièces" = 4
6. Cherche les liens vers les annonces pour plus de détails

Réponds UNIQUEMENT avec un JSON valide:
{
  "is_property_offer": true,
  "confidence": "high",
  "price": nombre ou null,
  "pieces": nombre ou null,
  "surface": nombre ou null,
  "location": "ville/région" ou null,
  "type_bien": "appartement"/"maison"/"studio"/"villa"/"duplex"/"attique" ou null,
  "address": "adresse complète" ou null,
  "disponibilite": "date/période" ou null,
  "regie": "source de l'annonce" ou null
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
          { role: "system", content: `Tu es un assistant spécialisé dans l'extraction d'informations immobilières suisses depuis les emails d'alertes. Tu réponds uniquement en JSON valide. Source: ${sourceName || 'inconnu'}. Considère TOUJOURS is_property_offer=true pour ces alertes.` },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return { price: null, pieces: null, surface: null, location: null, type_bien: null, address: null, disponibilite: null, regie: sourceName, is_property_offer: true, confidence: 'low' };
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
        regie: parsed.regie || sourceName,
        is_property_offer: true, // Always true for filtered alerts
        confidence: parsed.confidence || 'medium',
      };
    }
  } catch (error) {
    console.error("Error extracting property info:", error);
  }

  return { price: null, pieces: null, surface: null, location: null, type_bien: null, address: null, disponibilite: null, regie: sourceName, is_property_offer: true, confidence: 'low' };
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
        "lausanne": ["lausanne", "vaud", "lac leman", "leman", "ouest lausannois", "renens", "prilly", "crissier", "ecublens", "chavannes", "bussigny", "pully", "lutry", "morges"],
        "geneve": ["geneve", "geneva", "genf", "carouge", "lancy", "meyrin", "vernier", "onex", "grand-saconnex", "bernex", "plan-les-ouates"],
        "vaud": ["vaud", "lausanne", "morges", "nyon", "yverdon", "vevey", "montreux", "renens", "pully", "lutry", "prilly", "ecublens", "crissier", "rolle", "gland"],
        "fribourg": ["fribourg", "bulle", "romont", "murten", "morat", "estavayer"],
        "neuchatel": ["neuchatel", "la chaux-de-fonds", "le locle", "neuchâtel"],
        "valais": ["valais", "sion", "sierre", "martigny", "monthey", "visp", "brig", "verbier", "zermatt"],
        "bern": ["bern", "berne", "biel", "bienne", "thun", "thoune", "köniz", "muri"],
        "zurich": ["zurich", "zürich", "winterthur", "dietikon", "uster", "dübendorf"],
        "suisse romande": ["lausanne", "geneve", "geneva", "fribourg", "neuchatel", "sion", "vaud", "valais", "jura"],
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

    const { action, match_id, limit = 100 } = await req.json();
    console.log(`AI Matching action: ${action} by user: ${user.id}`);

    if (action === 'analyze') {
      // Get agent info first
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Agent non trouvé',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // STEP 1: Get the 100 most recent emails for this agent (not just unanalyzed)
      const { data: allEmails, error: emailsError } = await supabase
        .from('received_emails')
        .select('id, subject, body_text, body_html, from_email, from_name, user_id, ai_analyzed')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(limit);

      if (emailsError) {
        console.error("Error fetching emails:", emailsError);
        throw emailsError;
      }

      console.log(`Found ${allEmails?.length || 0} recent emails`);

      // STEP 2: Filter to keep only property alert emails
      const alertEmails: (EmailData & { source: string })[] = [];
      const nonAlertEmails: EmailData[] = [];

      for (const email of allEmails || []) {
        const { isAlert, source } = isPropertyAlertEmail(email.from_email, email.subject);
        if (isAlert) {
          alertEmails.push({ ...email, source: source || 'Alerte' });
        } else {
          nonAlertEmails.push(email);
        }
      }

      console.log(`Filtered: ${alertEmails.length} property alerts, ${nonAlertEmails.length} other emails`);

      // Log alert sources found
      const sourceCounts: Record<string, number> = {};
      for (const email of alertEmails) {
        sourceCounts[email.source] = (sourceCounts[email.source] || 0) + 1;
      }
      console.log('Alert sources:', sourceCounts);

      // Only analyze unanalyzed alert emails
      const unanalyzedAlerts = alertEmails.filter(e => !e.ai_analyzed);
      console.log(`${unanalyzedAlerts.length} unanalyzed alerts to process`);

      if (unanalyzedAlerts.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Aucune nouvelle alerte à analyser',
          analyzed: 0,
          matches: 0,
          total_alerts: alertEmails.length,
          sources: sourceCounts,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // STEP 3: Get ONLY this agent's clients
      const { data: clientIds } = await supabase
        .from('client_agents')
        .select('client_id')
        .eq('agent_id', agentData.id);
      
      const junctionIds = clientIds?.map(c => c.client_id) || [];
      
      const { data: primaryClients } = await supabase
        .from('clients')
        .select('id')
        .eq('agent_id', agentData.id);
      
      const primaryIds = primaryClients?.map(c => c.id) || [];
      const allClientIds = [...new Set([...junctionIds, ...primaryIds])];
      
      if (allClientIds.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Aucun client actif assigné',
          analyzed: 0,
          matches: 0,
          total_alerts: alertEmails.length,
          sources: sourceCounts,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, pieces, budget_max, region_recherche, type_bien, type_recherche, user_id, agent_id')
        .in('id', allClientIds)
        .eq('statut', 'actif');
      
      if (clientsError) {
        console.error("Error fetching clients:", clientsError);
        throw clientsError;
      }

      console.log(`Found ${clients?.length || 0} active clients for agent ${agentData.id}`);

      // STEP 4: Analyze each alert email
      let analyzedCount = 0;
      let matchesCount = 0;

      for (const email of unanalyzedAlerts) {
        console.log(`Analyzing alert: ${email.subject} from ${email.from_email} (${email.source})`);
        
        const cleanedContent = cleanEmailContent(email.body_text, email.body_html);
        
        const propertyInfo = await extractPropertyInfo(
          cleanedContent, 
          email.subject || '',
          email.from_email || '',
          email.source
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

        console.log(`Extracted from ${email.source}:`, propertyInfo);

        // Match against this agent's clients only
        for (const client of clients || []) {
          const { score, details, category } = calculateMatchScore(propertyInfo, client);
          
          // Create match if score >= 15%
          if (score >= 15) {
            console.log(`Match found: client ${client.id} with score ${score} (${category})`);
            
            const { error: insertError } = await supabase
              .from('ai_matches')
              .upsert({
                email_id: email.id,
                client_id: client.id,
                agent_id: agentData.id,
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
                match_details: { ...details, category, confidence: propertyInfo.confidence, source: email.source },
                status: 'pending',
                processed_at: new Date().toISOString(),
              }, {
                onConflict: 'email_id,client_id',
              });

            if (insertError) {
              console.error("Error inserting match:", insertError);
            } else {
              matchesCount++;
            }
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        analyzed: analyzedCount,
        matches: matchesCount,
        total_alerts: alertEmails.length,
        sources: sourceCounts,
        message: `${analyzedCount} alerte(s) analysée(s), ${matchesCount} match(s) trouvé(s)`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_matches') {
      // Get agent info
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

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
        .order('created_at', { ascending: false });

      if (agentData) {
        matchesQuery = matchesQuery.eq('agent_id', agentData.id);
      }

      const { data: matches, error: matchesError } = await matchesQuery.limit(100);

      if (matchesError) {
        console.error("Error fetching matches:", matchesError);
        throw matchesError;
      }

      // Get stats
      let statsQuery = supabase
        .from('received_emails')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('ai_analyzed', false);

      const { count: unanalyzedCount } = await statsQuery;

      // Count alert emails
      const { data: recentEmails } = await supabase
        .from('received_emails')
        .select('from_email, subject')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(100);

      let alertCount = 0;
      const sourceCounts: Record<string, number> = {};
      for (const email of recentEmails || []) {
        const { isAlert, source } = isPropertyAlertEmail(email.from_email, email.subject);
        if (isAlert) {
          alertCount++;
          if (source) {
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        matches: matches || [],
        unanalyzed_count: unanalyzedCount || 0,
        alert_count: alertCount,
        sources: sourceCounts,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_status') {
      const { status } = await req.json();
      
      if (!match_id || !status) {
        return new Response(JSON.stringify({ error: 'match_id and status required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
    }

    if (action === 'get_stats') {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Get email stats
      const { data: recentEmails } = await supabase
        .from('received_emails')
        .select('from_email, subject, ai_analyzed')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(100);

      let totalAlerts = 0;
      let analyzedAlerts = 0;
      const sourceCounts: Record<string, number> = {};
      
      for (const email of recentEmails || []) {
        const { isAlert, source } = isPropertyAlertEmail(email.from_email, email.subject);
        if (isAlert) {
          totalAlerts++;
          if (email.ai_analyzed) analyzedAlerts++;
          if (source) {
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
          }
        }
      }

      // Get match stats
      let matchStats = { pending: 0, accepted: 0, rejected: 0, converted: 0 };
      if (agentData) {
        const { data: matches } = await supabase
          .from('ai_matches')
          .select('status')
          .eq('agent_id', agentData.id);

        for (const m of matches || []) {
          if (m.status === 'pending') matchStats.pending++;
          else if (m.status === 'accepted') matchStats.accepted++;
          else if (m.status === 'rejected') matchStats.rejected++;
          else if (m.status === 'converted') matchStats.converted++;
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        stats: {
          total_emails: recentEmails?.length || 0,
          total_alerts: totalAlerts,
          analyzed_alerts: analyzedAlerts,
          unanalyzed_alerts: totalAlerts - analyzedAlerts,
          sources: sourceCounts,
          matches: matchStats,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Matching error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
