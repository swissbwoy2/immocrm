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
    // Port 465: Implicit TLS (connect with TLS immediately) - RECOMMENDED
    // Port 587: STARTTLS (connect plain, then upgrade) - has issues in Deno edge functions
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

    // Try to connect - this will throw if connection fails
    // We just need to verify the connection works, then close it
    console.log('Attempting SMTP connection...');
    
    // The SMTPClient connects automatically when you try to send
    // But we can test by calling close which will connect first if needed
    await client.close();
    client = null;

    console.log('SMTP connection test successful');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Connexion SMTP réussie ! Vos paramètres sont corrects.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('SMTP connection test failed:', error);
    
    // Try to close client if open
    if (client) {
      try {
        await client.close();
      } catch (e) {
        console.error('Error closing SMTP client:', e);
      }
    }
    
    // Provide helpful error messages
    let userFriendlyMessage = errorMessage;
    
    if (errorMessage.includes('InvalidContentType') || errorMessage.includes('corrupt message')) {
      userFriendlyMessage = 'Erreur de connexion TLS. Essayez le port 465 avec TLS activé.';
    } else if (errorMessage.includes('535') || errorMessage.includes('Invalid login') || errorMessage.includes('authentication')) {
      userFriendlyMessage = 'Identifiants incorrects. Vérifiez votre email et mot de passe SMTP.';
    } else if (errorMessage.includes('Connection refused') || errorMessage.includes('ECONNREFUSED')) {
      userFriendlyMessage = 'Impossible de se connecter au serveur SMTP. Vérifiez l\'adresse et le port.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      userFriendlyMessage = 'Délai de connexion dépassé. Vérifiez l\'adresse du serveur.';
    }
    
    return new Response(
      JSON.stringify({ success: false, error: userFriendlyMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
