import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  email_from: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let client: SMTPClient | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Parse request body
    const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, email_from }: TestRequest = await req.json();

    if (!smtp_host || !smtp_port || !smtp_user || !smtp_password || !email_from) {
      throw new Error('All SMTP fields are required');
    }

    console.log(`Testing SMTP connection to ${smtp_host}:${smtp_port}`);

    // Determine TLS mode based on port
    const port = smtp_port || 465;
    const useTLS = port === 465;
    
    console.log(`SMTP test: host=${smtp_host}, port=${port}, implicitTLS=${useTLS}`);
    
    if (port === 587) {
      console.warn('WARNING: Port 587 (STARTTLS) may not work reliably. Consider using port 465.');
    }

    // Create SMTP client
    client = new SMTPClient({
      connection: {
        hostname: smtp_host,
        port: port,
        tls: useTLS,
        auth: {
          username: smtp_user,
          password: smtp_password,
        },
      },
    });

    // Test by sending an email to self - this forces connection and auth
    // Use a minimal test that will validate credentials
    console.log('Attempting SMTP connection and authentication...');
    
    // Send a test email to the sender's own address
    await client.send({
      from: email_from,
      to: email_from,
      subject: '[Test] Connexion SMTP vérifiée',
      content: 'Ce message confirme que votre configuration SMTP fonctionne correctement.',
    });
    
    console.log('SMTP test email sent successfully');
    
    // Close the connection
    await client.close();
    client = null;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Connexion SMTP réussie ! Un email de test a été envoyé à votre adresse.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('SMTP connection test failed:', errorMessage);
    
    // Try to close client if it exists
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        // Ignore close errors - connection might not be established
        console.log('Note: Could not close client (may not have connected)');
      }
    }
    
    // Provide helpful error messages in French
    let userFriendlyMessage = errorMessage;
    
    if (errorMessage.includes('InvalidContentType') || errorMessage.includes('corrupt message')) {
      userFriendlyMessage = 'Erreur de connexion TLS. Essayez le port 465 avec TLS activé.';
    } else if (errorMessage.includes('535') || errorMessage.includes('Invalid login') || errorMessage.includes('authentication') || errorMessage.includes('password')) {
      userFriendlyMessage = 'Identifiants incorrects. Vérifiez votre email et mot de passe SMTP. Pour certains fournisseurs (Gmail, Infomaniak), un mot de passe d\'application spécifique peut être nécessaire.';
    } else if (errorMessage.includes('Connection refused') || errorMessage.includes('ECONNREFUSED')) {
      userFriendlyMessage = 'Impossible de se connecter au serveur SMTP. Vérifiez l\'adresse et le port.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      userFriendlyMessage = 'Délai de connexion dépassé. Vérifiez l\'adresse du serveur.';
    } else if (errorMessage.includes('getaddrinfo') || errorMessage.includes('ENOTFOUND')) {
      userFriendlyMessage = 'Serveur SMTP introuvable. Vérifiez l\'adresse du serveur.';
    }
    
    // Return with 200 status so frontend can properly parse the JSON response
    return new Response(
      JSON.stringify({ success: false, error: userFriendlyMessage }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
