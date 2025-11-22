import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Début de la migration des documents...');

    // Récupérer tous les documents avec des URLs base64
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .like('url', 'data:%');

    if (fetchError) {
      throw new Error(`Erreur récupération documents: ${fetchError.message}`);
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Aucun document à migrer',
          migrated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 ${documents.length} documents à migrer`);

    let migratedCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const doc of documents) {
      try {
        console.log(`Migration du document: ${doc.nom} (${doc.id})`);

        // Extraire les données base64
        const matches = doc.url.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Format base64 invalide');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        // Décoder le base64
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Générer le chemin du fichier
        const fileExtension = doc.nom.split('.').pop() || 'pdf';
        const fileName = `${doc.user_id}/${doc.id}.${fileExtension}`;

        console.log(`📤 Upload vers Storage: ${fileName}`);

        // Uploader vers Storage
        const { error: uploadError } = await supabase.storage
          .from('client-documents')
          .upload(fileName, bytes, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Erreur upload: ${uploadError.message}`);
        }

        // Mettre à jour la BDD avec le nouveau chemin
        const { error: updateError } = await supabase
          .from('documents')
          .update({ url: fileName })
          .eq('id', doc.id);

        if (updateError) {
          throw new Error(`Erreur mise à jour: ${updateError.message}`);
        }

        migratedCount++;
        console.log(`✅ Document migré avec succès: ${doc.nom}`);

      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error(`❌ Erreur pour ${doc.nom}:`, errorMsg);
        errors.push({
          documentId: doc.id,
          documentName: doc.nom,
          error: errorMsg,
        });
      }
    }

    console.log(`✨ Migration terminée: ${migratedCount} réussis, ${errorCount} erreurs`);

    return new Response(
      JSON.stringify({
        success: true,
        migrated: migratedCount,
        errors: errorCount,
        details: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur globale:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
