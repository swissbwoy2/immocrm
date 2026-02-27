import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body_html: string;
  attachments?: Array<{
    filename: string;
    url?: string;
    content?: string; // base64 encoded content for local files
    content_type?: string;
  }>;
  client_id?: string;
  cc?: string[];
  bcc?: string[];
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Get user's email configuration
    const { data: emailConfig, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (configError || !emailConfig) {
      throw new Error('Email configuration not found. Please configure your SMTP settings first.');
    }

    // Parse request body
    const { recipient_email, recipient_name, subject, body_html, attachments, client_id, cc, bcc }: EmailRequest = await req.json();

    if (!recipient_email || !subject || !body_html) {
      throw new Error('recipient_email, subject, and body_html are required');
    }


    // Build email body with signature
    let fullBodyHtml = body_html.replace(/\n/g, '<br/>');
    if (emailConfig.signature_html) {
      fullBodyHtml += `<br/><br/>${emailConfig.signature_html}`;
    }

    // Process attachments (from URL or base64 content)
    const emailAttachments: Array<{ filename: string; content: Uint8Array; contentType: string }> = [];
    
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          // Check if it's a base64-encoded local file
          if (attachment.content) {
            // Decode base64 to Uint8Array
            const binaryString = atob(attachment.content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            emailAttachments.push({
              filename: attachment.filename,
              content: bytes,
              contentType: attachment.content_type || 'application/octet-stream',
            });
          } else if (attachment.url) {
            // Handle Supabase storage URLs
            let fetchUrl = attachment.url;
            
            // If it's not an HTTP URL, treat as a storage path
            if (!attachment.url.startsWith('http')) {
              let storageKey = attachment.url;
              // Remove bucket prefix if present
              if (storageKey.startsWith('client-documents/')) {
                storageKey = storageKey.replace('client-documents/', '');
              }
              // Generate signed URL from storage
              const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('client-documents')
                .createSignedUrl(storageKey, 300);
              
              if (signedUrlError) {
                console.warn(`Failed to create signed URL for ${storageKey}:`, signedUrlError.message);
                continue; // Skip this attachment instead of failing
              }
              if (signedUrlData?.signedUrl) {
                fetchUrl = signedUrlData.signedUrl;
              } else {
                console.warn(`No signed URL generated for ${storageKey}`);
                continue;
              }
            } else if (attachment.url.startsWith('client-documents/')) {
              // Legacy check (shouldn't reach here but kept for safety)
              const { data: signedUrlData } = await supabase.storage
                .from('client-documents')
                .createSignedUrl(attachment.url.replace('client-documents/', ''), 300);
              if (signedUrlData?.signedUrl) {
                fetchUrl = signedUrlData.signedUrl;
              }
            }

            const response = await fetch(fetchUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              emailAttachments.push({
                filename: attachment.filename,
                content: new Uint8Array(arrayBuffer),
                contentType: attachment.content_type || 'application/octet-stream',
              });
            } else {
              console.warn(`Failed to download attachment: ${attachment.filename} - ${response.status}`);
            }
          }
        } catch (err) {
          console.warn(`Error processing attachment ${attachment.filename}:`, err);
        }
      }
    }

    // Determine TLS mode based on port
    const port = emailConfig.smtp_port || 465;
    const useTLS = port === 465;
    
    
    client = new SMTPClient({
      connection: {
        hostname: emailConfig.smtp_host,
        port: port,
        tls: useTLS,
        auth: {
          username: emailConfig.smtp_user,
          password: emailConfig.smtp_password,
        },
      },
    });

    // Build from address
    const fromAddress = emailConfig.display_name 
      ? `${emailConfig.display_name} <${emailConfig.email_from}>`
      : emailConfig.email_from;

    const toAddress = recipient_name 
      ? `${recipient_name} <${recipient_email}>`
      : recipient_email;

    // Prepare attachments for denomailer
    const denomailerAttachments = emailAttachments.map(att => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
      encoding: "binary" as const,
    }));

    // Build email options
    const emailOptions: any = {
      from: fromAddress,
      to: toAddress,
      subject: subject,
      html: fullBodyHtml,
      attachments: denomailerAttachments.length > 0 ? denomailerAttachments : undefined,
    };

    // Add CC recipients if provided
    if (cc && cc.length > 0) {
      emailOptions.cc = cc.join(', ');
    }

    // Add BCC recipients if provided
    if (bcc && bcc.length > 0) {
      emailOptions.bcc = bcc.join(', ');
    }

    // Send email
    await client.send(emailOptions);

    // Close connection
    await client.close();
    client = null;

    // Log sent email
    const { error: logError } = await supabase
      .from('sent_emails')
      .insert({
        sender_id: user.id,
        client_id: client_id || null,
        recipient_email,
        recipient_name,
        subject,
        body_html: fullBodyHtml,
        attachments: attachments || [],
        status: 'sent',
      });

    if (logError) {
      console.warn('Failed to log sent email:', logError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending email:', error);
    
    // Try to close client if open
    if (client) {
      try {
        await client.close();
      } catch (e) {
        console.error('Error closing SMTP client:', e);
      }
    }
    
    // Provide helpful error message for common TLS issues
    let userFriendlyMessage = errorMessage;
    if (errorMessage.includes('InvalidContentType') || errorMessage.includes('corrupt message')) {
      userFriendlyMessage = 'Erreur de connexion SMTP. Si vous utilisez le port 587, essayez de passer au port 465 avec TLS activé dans vos paramètres email.';
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
