import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImapConfig {
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_password: string;
  imap_secure: boolean;
}

// Simple IMAP client using Deno's native TLS
class SimpleImapClient {
  private conn: Deno.TlsConn | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private tagCounter = 0;
  private buffer = '';

  async connect(host: string, port: number): Promise<void> {
    console.log(`Connecting to ${host}:${port}...`);
    this.conn = await Deno.connectTls({
      hostname: host,
      port: port,
    });
    // Read greeting
    await this.readResponse();
    console.log('Connected to IMAP server');
  }

  private async readResponse(): Promise<string[]> {
    const lines: string[] = [];
    const buf = new Uint8Array(4096);
    
    while (true) {
      const n = await this.conn!.read(buf);
      if (n === null) break;
      
      this.buffer += this.decoder.decode(buf.subarray(0, n));
      
      while (this.buffer.includes('\r\n')) {
        const idx = this.buffer.indexOf('\r\n');
        const line = this.buffer.substring(0, idx);
        this.buffer = this.buffer.substring(idx + 2);
        lines.push(line);
        
        // Check if we got a tagged response (OK, NO, BAD) or untagged
        if (line.match(/^[A-Z]\d+ (OK|NO|BAD)/)) {
          return lines;
        }
        if (line.startsWith('* OK') && lines.length === 1) {
          return lines; // Greeting
        }
      }
      
      // Timeout protection
      if (lines.length > 100) break;
    }
    
    return lines;
  }

  private async sendCommand(command: string): Promise<string[]> {
    const tag = `A${++this.tagCounter}`;
    const fullCommand = `${tag} ${command}\r\n`;
    console.log(`Sending: ${tag} ${command.substring(0, 50)}...`);
    await this.conn!.write(this.encoder.encode(fullCommand));
    return await this.readResponse();
  }

  async login(user: string, password: string): Promise<boolean> {
    const response = await this.sendCommand(`LOGIN "${user}" "${password}"`);
    const success = response.some(line => line.includes('OK'));
    console.log(`Login ${success ? 'successful' : 'failed'}`);
    return success;
  }

  async selectInbox(): Promise<number> {
    const response = await this.sendCommand('SELECT INBOX');
    let messageCount = 0;
    for (const line of response) {
      const match = line.match(/\* (\d+) EXISTS/);
      if (match) {
        messageCount = parseInt(match[1]);
      }
    }
    console.log(`INBOX selected, ${messageCount} messages`);
    return messageCount;
  }

  async fetchEmails(start: number, end: number): Promise<any[]> {
    const emails: any[] = [];
    
    if (start < 1) start = 1;
    if (end < start) return emails;

    console.log(`Fetching emails ${start}:${end}...`);
    
    // Fetch headers and body structure
    const response = await this.sendCommand(
      `FETCH ${start}:${end} (FLAGS UID ENVELOPE BODY.PEEK[TEXT])`
    );

    let currentEmail: any = null;
    let bodyText = '';
    let inBody = false;

    for (const line of response) {
      // Start of a new email
      if (line.match(/^\* \d+ FETCH/)) {
        if (currentEmail) {
          currentEmail.body_text = bodyText.trim();
          emails.push(currentEmail);
        }
        currentEmail = {
          message_id: '',
          from_email: '',
          from_name: null,
          subject: null,
          body_text: '',
          body_html: null,
          received_at: null,
          is_read: false,
          flags: [],
        };
        bodyText = '';
        inBody = false;
        
        // Parse FLAGS
        const flagsMatch = line.match(/FLAGS \(([^)]*)\)/);
        if (flagsMatch) {
          currentEmail.flags = flagsMatch[1].split(' ').filter(f => f);
          currentEmail.is_read = currentEmail.flags.includes('\\Seen');
        }
        
        // Parse UID
        const uidMatch = line.match(/UID (\d+)/);
        if (uidMatch) {
          currentEmail.message_id = uidMatch[1];
        }
        
        // Parse ENVELOPE
        const envelopeMatch = line.match(/ENVELOPE \(([^)]+(?:\([^)]*\))*[^)]*)\)/);
        if (envelopeMatch) {
          const envelope = envelopeMatch[1];
          
          // Parse date
          const dateMatch = envelope.match(/^"([^"]+)"/);
          if (dateMatch) {
            try {
              currentEmail.received_at = new Date(dateMatch[1]).toISOString();
            } catch (e) {
              currentEmail.received_at = new Date().toISOString();
            }
          }
          
          // Parse subject - it's after the date
          const subjectMatch = envelope.match(/"[^"]*"\s+"([^"]*)"/);
          if (subjectMatch) {
            currentEmail.subject = decodeImapString(subjectMatch[1]);
          }
          
          // Parse from
          const fromMatch = envelope.match(/\(\("([^"]*)" NIL "([^"]*)" "([^"]*)"\)\)/);
          if (fromMatch) {
            currentEmail.from_name = decodeImapString(fromMatch[1]) || null;
            currentEmail.from_email = `${fromMatch[2]}@${fromMatch[3]}`;
          } else {
            // Alternative pattern
            const altFromMatch = envelope.match(/\(\(NIL NIL "([^"]*)" "([^"]*)"\)\)/);
            if (altFromMatch) {
              currentEmail.from_email = `${altFromMatch[1]}@${altFromMatch[2]}`;
            }
          }
        }
      } else if (line.includes('BODY[TEXT]')) {
        inBody = true;
      } else if (inBody && currentEmail) {
        if (!line.match(/^[A-Z]\d+ /)) {
          bodyText += line + '\n';
        }
      }
    }
    
    // Don't forget the last email
    if (currentEmail) {
      currentEmail.body_text = bodyText.trim();
      emails.push(currentEmail);
    }

    console.log(`Fetched ${emails.length} emails`);
    return emails;
  }

  async logout(): Promise<void> {
    try {
      await this.sendCommand('LOGOUT');
    } catch (e) {
      // Ignore errors on logout
    }
    this.conn?.close();
  }
}

// Decode IMAP encoded strings (basic support for =?UTF-8?...?= format)
function decodeImapString(str: string): string {
  if (!str) return str;
  
  // Handle =?charset?encoding?text?= format
  const regex = /=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi;
  
  return str.replace(regex, (match, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        // Base64
        return atob(text);
      } else if (encoding.toUpperCase() === 'Q') {
        // Quoted-printable
        return text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (m: string, hex: string) => 
          String.fromCharCode(parseInt(hex, 16))
        );
      }
    } catch (e) {
      // Return original if decoding fails
    }
    return text;
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { action } = body;
    console.log(`Processing IMAP action: ${action} for user: ${user.id}`);

    if (action === 'fetch_emails') {
      // Get IMAP configuration
      const { data: imapConfig, error: configError } = await supabaseClient
        .from('imap_configurations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (configError) {
        throw new Error(`Erreur configuration: ${configError.message}`);
      }

      if (!imapConfig) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'no_config',
            message: 'Aucune configuration IMAP trouvée. Veuillez configurer votre boîte de réception.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Connecting to IMAP: ${imapConfig.imap_host}:${imapConfig.imap_port}`);
      
      const client = new SimpleImapClient();
      
      try {
        // Connect and authenticate
        await client.connect(imapConfig.imap_host, imapConfig.imap_port);
        const loginSuccess = await client.login(imapConfig.imap_user, imapConfig.imap_password);
        
        if (!loginSuccess) {
          throw new Error('Échec de l\'authentification IMAP. Vérifiez vos identifiants.');
        }
        
        // Select inbox and get message count
        const messageCount = await client.selectInbox();
        
        // Fetch last 50 emails (or less if not enough)
        const startMsg = Math.max(1, messageCount - 49);
        const fetchedEmails = await client.fetchEmails(startMsg, messageCount);
        
        await client.logout();
        
        // Store emails in database
        const emailsToInsert = fetchedEmails.map(email => ({
          user_id: user.id,
          message_id: `${imapConfig.imap_user}_${email.message_id}`,
          from_email: email.from_email || 'unknown@email.com',
          from_name: email.from_name,
          to_email: imapConfig.imap_user,
          subject: email.subject,
          body_text: email.body_text?.substring(0, 10000) || null, // Limit body size
          body_html: email.body_html,
          received_at: email.received_at || new Date().toISOString(),
          is_read: email.is_read,
          is_starred: false,
          folder: 'INBOX',
          attachments: [],
        }));

        // Upsert emails (avoid duplicates)
        if (emailsToInsert.length > 0) {
          const { error: insertError } = await supabaseClient
            .from('received_emails')
            .upsert(emailsToInsert, {
              onConflict: 'user_id,message_id',
              ignoreDuplicates: true
            });

          if (insertError) {
            console.error('Error inserting emails:', insertError);
          } else {
            console.log(`Inserted/updated ${emailsToInsert.length} emails`);
          }
        }

        // Update last sync time
        await supabaseClient
          .from('imap_configurations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', user.id);

        // Get all stored emails
        const { data: emails, error: emailsError } = await supabaseClient
          .from('received_emails')
          .select('*')
          .eq('user_id', user.id)
          .order('received_at', { ascending: false })
          .limit(100);

        return new Response(
          JSON.stringify({ 
            success: true, 
            emails: emails || [],
            fetched_count: fetchedEmails.length,
            total_on_server: messageCount,
            message: `${fetchedEmails.length} emails synchronisés`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } catch (imapError: unknown) {
        console.error('IMAP error:', imapError);
        const errorMessage = imapError instanceof Error ? imapError.message : 'Erreur de connexion IMAP';
        
        // Still return stored emails even if sync fails
        const { data: emails } = await supabaseClient
          .from('received_emails')
          .select('*')
          .eq('user_id', user.id)
          .order('received_at', { ascending: false })
          .limit(100);
          
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: errorMessage,
            emails: emails || [],
            message: `Erreur de synchronisation: ${errorMessage}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'mark_read') {
      const { email_id, is_read } = body;

      const { error } = await supabaseClient
        .from('received_emails')
        .update({ is_read })
        .eq('id', email_id)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'toggle_star') {
      const { email_id, is_starred } = body;

      const { error } = await supabaseClient
        .from('received_emails')
        .update({ is_starred })
        .eq('id', email_id)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_email') {
      const { email_id } = body;

      const { error } = await supabaseClient
        .from('received_emails')
        .delete()
        .eq('id', email_id)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Action non reconnue: ${action}`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('IMAP function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});