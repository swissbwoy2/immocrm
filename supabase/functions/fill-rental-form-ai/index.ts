import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClientData {
  profile: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
  };
  client: {
    date_naissance?: string;
    nationalite?: string;
    type_permis?: string;
    etat_civil?: string;
    profession?: string;
    employeur?: string;
    revenus_mensuels?: number;
    adresse?: string;
    loyer_actuel?: number;
    depuis_le?: string;
    gerance_actuelle?: string;
    contact_gerance?: string;
    motif_changement?: string;
    nombre_occupants?: number;
    animaux?: boolean;
    vehicules?: boolean;
    numero_plaques?: string;
    poursuites?: boolean;
    curatelle?: boolean;
  };
  candidates: Array<{
    type: string;
    nom: string;
    prenom: string;
    date_naissance?: string;
    nationalite?: string;
    type_permis?: string;
    profession?: string;
    employeur?: string;
    revenus_mensuels?: number;
    email?: string;
    telephone?: string;
    lien_avec_client?: string;
  }>;
}

interface FormField {
  label: string;
  value: string;
  confidence: number;
  source?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, clientData } = await req.json() as { 
      pdfText: string; 
      clientData: ClientData;
    };

    if (!pdfText || !clientData) {
      return new Response(
        JSON.stringify({ error: 'pdfText et clientData sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build a structured summary of client data for the AI
    const clientSummary = buildClientSummary(clientData);

    const systemPrompt = `Tu es un assistant expert en immobilier suisse, spécialisé dans le remplissage de formulaires de demande de location.

Ton rôle est d'analyser un formulaire PDF de demande de location et de le pré-remplir avec les données d'un candidat locataire.

RÈGLES IMPORTANTES:
1. Identifie chaque champ du formulaire dans le texte PDF
2. Mappe les données du candidat aux champs correspondants
3. Pour les champs à cocher (oui/non), indique "☑" pour oui et "☐" pour non
4. Si une donnée n'est pas disponible, laisse le champ vide ou indique "N/A"
5. Adapte le format des dates au format suisse (JJ.MM.AAAA)
6. Les revenus doivent être en CHF
7. Si le formulaire demande des informations sur le conjoint/colocataire, utilise les données des candidats supplémentaires

DONNÉES DU CANDIDAT:
${clientSummary}

Retourne un JSON structuré avec tous les champs identifiés et leurs valeurs à insérer.
Le format doit être:
{
  "fields": [
    {
      "label": "Nom exact du champ dans le formulaire",
      "value": "Valeur à insérer",
      "confidence": 0.9,
      "source": "profile.nom ou candidates[0].nom etc"
    }
  ],
  "warnings": ["Liste des champs non remplis ou informations manquantes"],
  "suggestions": ["Suggestions pour améliorer le dossier"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Voici le contenu du formulaire de demande de location à remplir:\n\n${pdfText.substring(0, 15000)}` }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte, réessayez dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits IA épuisés, veuillez ajouter des crédits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    console.log(`Successfully analyzed form with ${parsedResult.fields?.length || 0} fields`);

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fill-rental-form-ai:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildClientSummary(data: ClientData): string {
  const { profile, client, candidates } = data;
  
  let summary = `## TITULAIRE PRINCIPAL
- Nom: ${profile.nom}
- Prénom: ${profile.prenom}
- Email: ${profile.email}
- Téléphone: ${profile.telephone}
- Date de naissance: ${client.date_naissance || 'Non renseignée'}
- Nationalité: ${client.nationalite || 'Non renseignée'}
- Type de permis: ${client.type_permis || 'Non renseigné'}
- État civil: ${client.etat_civil || 'Non renseigné'}
- Profession: ${client.profession || 'Non renseignée'}
- Employeur: ${client.employeur || 'Non renseigné'}
- Revenus mensuels: ${client.revenus_mensuels ? `CHF ${client.revenus_mensuels}` : 'Non renseignés'}
- Adresse actuelle: ${client.adresse || 'Non renseignée'}
- Loyer actuel: ${client.loyer_actuel ? `CHF ${client.loyer_actuel}` : 'Non renseigné'}
- Locataire depuis: ${client.depuis_le || 'Non renseigné'}
- Gérance actuelle: ${client.gerance_actuelle || 'Non renseignée'}
- Contact gérance: ${client.contact_gerance || 'Non renseigné'}
- Motif de changement: ${client.motif_changement || 'Non renseigné'}
- Nombre d'occupants: ${client.nombre_occupants || 'Non renseigné'}
- Animaux: ${client.animaux === true ? 'Oui' : client.animaux === false ? 'Non' : 'Non renseigné'}
- Véhicules: ${client.vehicules === true ? 'Oui' : client.vehicules === false ? 'Non' : 'Non renseigné'}
- Numéro plaques: ${client.numero_plaques || 'Non renseigné'}
- Poursuites: ${client.poursuites === true ? 'Oui' : client.poursuites === false ? 'Non' : 'Non renseigné'}
- Curatelle: ${client.curatelle === true ? 'Oui' : client.curatelle === false ? 'Non' : 'Non renseigné'}
`;

  if (candidates && candidates.length > 0) {
    candidates.forEach((candidate, index) => {
      const typeLabel = getTypeLabel(candidate.type);
      summary += `\n## ${typeLabel.toUpperCase()} ${index + 1}
- Lien: ${candidate.lien_avec_client || candidate.type}
- Nom: ${candidate.nom}
- Prénom: ${candidate.prenom}
- Date de naissance: ${candidate.date_naissance || 'Non renseignée'}
- Nationalité: ${candidate.nationalite || 'Non renseignée'}
- Type de permis: ${candidate.type_permis || 'Non renseigné'}
- Profession: ${candidate.profession || 'Non renseignée'}
- Employeur: ${candidate.employeur || 'Non renseigné'}
- Revenus mensuels: ${candidate.revenus_mensuels ? `CHF ${candidate.revenus_mensuels}` : 'Non renseignés'}
- Email: ${candidate.email || 'Non renseigné'}
- Téléphone: ${candidate.telephone || 'Non renseigné'}
`;
    });
  }

  return summary;
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'conjoint': 'Conjoint(e)',
    'colocataire': 'Colocataire',
    'enfant': 'Enfant',
    'garant': 'Garant',
    'autre': 'Autre occupant'
  };
  return labels[type] || type;
}
