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
    url: string;
    content_type?: string;
  }>;
  client_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const { recipient_email, recipient_name, subject, body_html, attachments, client_id }: EmailRequest = await req.json();

    if (!recipient_email || !subject || !body_html) {
      throw new Error('recipient_email, subject, and body_html are required');
    }

    // IMPORTANT: Port 587 STARTTLS does not work reliably in Supabase Edge Functions
    // Force port 465 with direct TLS for reliability
    const smtpPort = 465;
    const useTls = true;

    console.log(`Sending email to ${recipient_email} via ${emailConfig.smtp_host}:${smtpPort} (TLS: ${useTls})`);

    // Build email body with signature
    let fullBodyHtml = body_html.replace(/\n/g, '<br/>');
    if (emailConfig.signature_html) {
      fullBodyHtml += `<br/><br/>${emailConfig.signature_html}`;
    }

    // Download attachments from Supabase Storage
    const emailAttachments: Array<{ filename: string; content: Uint8Array; contentType: string }> = [];
    
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          const response = await fetch(attachment.url);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            emailAttachments.push({
              filename: attachment.filename,
              content: new Uint8Array(arrayBuffer),
              contentType: attachment.content_type || 'application/octet-stream',
            });
            console.log(`Attached: ${attachment.filename}`);
          } else {
            console.warn(`Failed to download attachment: ${attachment.filename}`);
          }
        } catch (err) {
          console.warn(`Error downloading attachment ${attachment.filename}:`, err);
        }
      }
    }

    // Create SMTP client with port 465 (direct SSL/TLS)
    const client = new SMTPClient({
      connection: {
        hostname: emailConfig.smtp_host,
        port: smtpPort,
        tls: useTls,
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

    // Send email
    await client.send({
      from: fromAddress,
      to: toAddress,
      subject: subject,
      html: fullBodyHtml,
      attachments: emailAttachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        encoding: 'binary',
      })),
    });

    await client.close();

    console.log('Email sent successfully');

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
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
