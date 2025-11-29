import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        
        if (line.match(/^[A-Z]\d+ (OK|NO|BAD)/)) {
          return lines;
        }
        if (line.startsWith('* OK') && lines.length === 1) {
          return lines;
        }
      }
      
      if (lines.length > 100) break;
    }
    
    return lines;
  }

  private async sendCommand(command: string): Promise<string[]> {
    const tag = `A${++this.tagCounter}`;
    const fullCommand = `${tag} ${command}\r\n`;
    await this.conn!.write(this.encoder.encode(fullCommand));
    return await this.readResponse();
  }

  async login(user: string, password: string): Promise<boolean> {
    const response = await this.sendCommand(`LOGIN "${user}" "${password}"`);
    return response.some(line => line.includes('OK'));
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
    return messageCount;
  }

  async fetchEmails(start: number, end: number): Promise<any[]> {
    const emails: any[] = [];
    
    if (start < 1) start = 1;
    if (end < start) return emails;

    const response = await this.sendCommand(
      `FETCH ${start}:${end} (FLAGS UID ENVELOPE BODY.PEEK[TEXT])`
    );

    let currentEmail: any = null;
    let bodyText = '';
    let inBody = false;

    for (const line of response) {
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
        
        const flagsMatch = line.match(/FLAGS \(([^)]*)\)/);
        if (flagsMatch) {
          currentEmail.flags = flagsMatch[1].split(' ').filter((f: string) => f);
          currentEmail.is_read = currentEmail.flags.includes('\\Seen');
        }
        
        const uidMatch = line.match(/UID (\d+)/);
        if (uidMatch) {
          currentEmail.message_id = uidMatch[1];
        }
        
        const envelopeMatch = line.match(/ENVELOPE \(([^)]+(?:\([^)]*\))*[^)]*)\)/);
        if (envelopeMatch) {
          const envelope = envelopeMatch[1];
          
          const dateMatch = envelope.match(/^"([^"]+)"/);
          if (dateMatch) {
            try {
              currentEmail.received_at = new Date(dateMatch[1]).toISOString();
            } catch (e) {
              currentEmail.received_at = new Date().toISOString();
            }
          }
          
          const subjectMatch = envelope.match(/"[^"]*"\s+"([^"]*)"/);
          if (subjectMatch) {
            currentEmail.subject = decodeImapString(subjectMatch[1]);
          }
          
          const fromMatch = envelope.match(/\(\("([^"]*)" NIL "([^"]*)" "([^"]*)"\)\)/);
          if (fromMatch) {
            currentEmail.from_name = decodeImapString(fromMatch[1]) || null;
            currentEmail.from_email = `${fromMatch[2]}@${fromMatch[3]}`;
          } else {
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
    
    if (currentEmail) {
      currentEmail.body_text = bodyText.trim();
      emails.push(currentEmail);
    }

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

function decodeImapString(str: string): string {
  if (!str) return str;
  
  const regex = /=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi;
  
  return str.replace(regex, (match, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return atob(text);
      } else if (encoding.toUpperCase() === 'Q') {
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

async function syncUserEmails(
  supabaseAdmin: any,
  config: any
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = new SimpleImapClient();
  
  try {
    await client.connect(config.imap_host, config.imap_port);
    const loginSuccess = await client.login(config.imap_user, config.imap_password);
    
    if (!loginSuccess) {
      return { success: false, count: 0, error: 'Login failed' };
    }
    
    const messageCount = await client.selectInbox();
    const startMsg = Math.max(1, messageCount - 49);
    const fetchedEmails = await client.fetchEmails(startMsg, messageCount);
    
    await client.logout();
    
    const emailsToInsert = fetchedEmails.map(email => ({
      user_id: config.user_id,
      message_id: `${config.imap_user}_${email.message_id}`,
      from_email: email.from_email || 'unknown@email.com',
      from_name: email.from_name,
      to_email: config.imap_user,
      subject: email.subject,
      body_text: email.body_text?.substring(0, 10000) || null,
      body_html: email.body_html,
      received_at: email.received_at || new Date().toISOString(),
      is_read: email.is_read,
      is_starred: false,
      folder: 'INBOX',
      attachments: [],
    }));

    if (emailsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('received_emails')
        .upsert(emailsToInsert, {
          onConflict: 'user_id,message_id',
          ignoreDuplicates: true
        });

      if (insertError) {
        console.error(`Error inserting emails for user ${config.user_id}:`, insertError);
      }
    }

    await supabaseAdmin
      .from('imap_configurations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.id);

    return { success: true, count: fetchedEmails.length };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`IMAP sync error for user ${config.user_id}:`, errorMessage);
    return { success: false, count: 0, error: errorMessage };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automatic IMAP sync for all users...');
    
    // Use service role to access all configurations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active IMAP configurations
    const { data: configs, error: configError } = await supabaseAdmin
      .from('imap_configurations')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      throw new Error(`Failed to fetch configurations: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      console.log('No active IMAP configurations found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active IMAP configurations',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${configs.length} active IMAP configurations`);

    const results = [];
    for (const config of configs) {
      console.log(`Syncing emails for user ${config.user_id}...`);
      const result = await syncUserEmails(supabaseAdmin, config);
      results.push({
        user_id: config.user_id,
        ...result
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalEmails = results.reduce((sum, r) => sum + r.count, 0);

    console.log(`Sync completed: ${successCount}/${configs.length} users, ${totalEmails} emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${successCount} users, ${totalEmails} emails`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
