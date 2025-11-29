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

interface ParsedEmail {
  message_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  to_name: string | null;
  subject: string | null;
  body_text: string;
  body_html: string | null;
  received_at: string | null;
  is_read: boolean;
  flags: string[];
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
    const buf = new Uint8Array(8192);
    
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
      if (lines.length > 500) break;
    }
    
    return lines;
  }

  private async sendCommand(command: string): Promise<string[]> {
    const tag = `A${++this.tagCounter}`;
    const fullCommand = `${tag} ${command}\r\n`;
    const logCommand = command.startsWith('LOGIN') 
      ? `${tag} LOGIN ***` 
      : `${tag} ${command.substring(0, 80)}...`;
    console.log(`Sending: ${logCommand}`);
    await this.conn!.write(this.encoder.encode(fullCommand));
    return await this.readResponse();
  }

  async login(user: string, password: string): Promise<boolean> {
    const response = await this.sendCommand(`LOGIN "${user}" "${password}"`);
    const success = response.some(line => line.includes('OK'));
    console.log(`Login ${success ? 'successful' : 'failed'}`);
    if (!success) {
      console.log('Login response:', response.join('\n'));
    }
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

  async fetchEmails(start: number, end: number, imapUser: string): Promise<ParsedEmail[]> {
    const emails: ParsedEmail[] = [];
    
    if (start < 1) start = 1;
    if (end < start) return emails;

    console.log(`Fetching emails ${start}:${end}...`);
    
    // Fetch using BODYSTRUCTURE for better parsing
    const response = await this.sendCommand(
      `FETCH ${start}:${end} (FLAGS UID ENVELOPE BODY.PEEK[HEADER] BODY.PEEK[TEXT])`
    );

    // Join all response lines
    const fullResponse = response.join('\n');
    
    // Split by FETCH responses
    const fetchMatches = fullResponse.split(/\* \d+ FETCH/);
    
    for (const fetchBlock of fetchMatches) {
      if (!fetchBlock.trim()) continue;
      
      const email: ParsedEmail = {
        message_id: '',
        from_email: imapUser,
        from_name: null,
        to_email: imapUser,
        to_name: null,
        subject: null,
        body_text: '',
        body_html: null,
        received_at: null,
        is_read: false,
        flags: [],
      };

      // Parse FLAGS
      const flagsMatch = fetchBlock.match(/FLAGS \(([^)]*)\)/);
      if (flagsMatch) {
        email.flags = flagsMatch[1].split(' ').filter(f => f);
        email.is_read = email.flags.includes('\\Seen');
      }

      // Parse UID
      const uidMatch = fetchBlock.match(/UID (\d+)/);
      if (uidMatch) {
        email.message_id = uidMatch[1];
      }

      // Parse ENVELOPE - this is the complex part
      const envelopeStart = fetchBlock.indexOf('ENVELOPE (');
      if (envelopeStart !== -1) {
        const envelopeData = extractEnvelope(fetchBlock.substring(envelopeStart + 9));
        if (envelopeData) {
          email.received_at = envelopeData.date;
          email.subject = envelopeData.subject;
          email.from_email = envelopeData.fromEmail || imapUser;
          email.from_name = envelopeData.fromName;
          email.to_email = envelopeData.toEmail || imapUser;
          email.to_name = envelopeData.toName;
        }
      }

      // Parse BODY[HEADER] for additional info
      const headerMatch = fetchBlock.match(/BODY\[HEADER\] \{(\d+)\}\r?\n([\s\S]*?)(?=BODY\[TEXT\]|$)/i);
      if (headerMatch) {
        const headers = headerMatch[2];
        
        // Extract Subject if not from ENVELOPE
        if (!email.subject) {
          const subjectMatch = headers.match(/^Subject:\s*(.+?)(?:\r?\n(?!\s)|$)/mi);
          if (subjectMatch) {
            email.subject = decodeImapString(subjectMatch[1].trim());
          }
        }
        
        // Extract From if not from ENVELOPE
        if (email.from_email === imapUser) {
          const fromMatch = headers.match(/^From:\s*(.+?)(?:\r?\n(?!\s)|$)/mi);
          if (fromMatch) {
            const parsed = parseEmailAddress(fromMatch[1].trim());
            email.from_email = parsed.email || imapUser;
            email.from_name = parsed.name;
          }
        }
        
        // Extract To
        const toMatch = headers.match(/^To:\s*(.+?)(?:\r?\n(?!\s)|$)/mi);
        if (toMatch) {
          const parsed = parseEmailAddress(toMatch[1].trim());
          email.to_email = parsed.email || imapUser;
          email.to_name = parsed.name;
        }
        
        // Extract Date if not from ENVELOPE
        if (!email.received_at) {
          const dateMatch = headers.match(/^Date:\s*(.+?)(?:\r?\n|$)/mi);
          if (dateMatch) {
            try {
              email.received_at = new Date(dateMatch[1].trim()).toISOString();
            } catch (e) {
              email.received_at = new Date().toISOString();
            }
          }
        }
      }

      // Parse BODY[TEXT]
      const textMatch = fetchBlock.match(/BODY\[TEXT\] (?:\{(\d+)\}\r?\n)?([\s\S]*?)(?=\)\r?\n[A-Z]\d+|$)/i);
      if (textMatch) {
        let bodyContent = textMatch[2] || '';
        
        // Clean and decode the body
        const decoded = decodeEmailBody(bodyContent);
        email.body_text = decoded.text;
        email.body_html = decoded.html;
      }

      // Only add if we have a valid message_id
      if (email.message_id) {
        emails.push(email);
      }
    }

    console.log(`Parsed ${emails.length} emails`);
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

// Extract ENVELOPE data from IMAP response
function extractEnvelope(envelopeStr: string): {
  date: string | null;
  subject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmail: string | null;
  toName: string | null;
} | null {
  try {
    const result = {
      date: null as string | null,
      subject: null as string | null,
      fromEmail: null as string | null,
      fromName: null as string | null,
      toEmail: null as string | null,
      toName: null as string | null,
    };

    // Parse using position-based approach
    // ENVELOPE format: (date subject from sender reply-to to cc bcc in-reply-to message-id)
    
    let pos = 0;
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    let inQuote = false;
    
    // Find the closing parenthesis of ENVELOPE
    for (let i = 0; i < envelopeStr.length && parts.length < 10; i++) {
      const char = envelopeStr[i];
      
      if (char === '"' && envelopeStr[i-1] !== '\\') {
        inQuote = !inQuote;
        current += char;
      } else if (char === '(' && !inQuote) {
        depth++;
        current += char;
      } else if (char === ')' && !inQuote) {
        depth--;
        if (depth < 0) {
          // End of envelope
          if (current.trim()) parts.push(current.trim());
          break;
        }
        current += char;
        if (depth === 0) {
          parts.push(current.trim());
          current = '';
        }
      } else if (char === ' ' && depth === 0 && !inQuote) {
        if (current.trim()) {
          parts.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }

    // Parse date (first part)
    if (parts[0] && parts[0] !== 'NIL') {
      const dateStr = parts[0].replace(/^"|"$/g, '');
      try {
        result.date = new Date(dateStr).toISOString();
      } catch (e) {
        result.date = new Date().toISOString();
      }
    }

    // Parse subject (second part)
    if (parts[1] && parts[1] !== 'NIL') {
      const subject = parts[1].replace(/^"|"$/g, '');
      result.subject = decodeImapString(subject);
    }

    // Parse from (third part) - format: ((name route mailbox host))
    if (parts[2] && parts[2] !== 'NIL') {
      const fromParsed = parseAddressList(parts[2]);
      if (fromParsed.length > 0) {
        result.fromEmail = fromParsed[0].email;
        result.fromName = fromParsed[0].name;
      }
    }

    // Parse to (sixth part)
    if (parts[5] && parts[5] !== 'NIL') {
      const toParsed = parseAddressList(parts[5]);
      if (toParsed.length > 0) {
        result.toEmail = toParsed[0].email;
        result.toName = toParsed[0].name;
      }
    }

    return result;
  } catch (e) {
    console.error('Error parsing envelope:', e);
    return null;
  }
}

// Parse IMAP address list format: ((name NIL mailbox host)(name NIL mailbox host))
function parseAddressList(addressStr: string): Array<{ email: string; name: string | null }> {
  const addresses: Array<{ email: string; name: string | null }> = [];
  
  // Match individual addresses: (name NIL mailbox host)
  const addressRegex = /\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let match;
  
  while ((match = addressRegex.exec(addressStr)) !== null) {
    const parts = match[1];
    
    // Extract parts: "name" NIL "mailbox" "host"
    const partMatches = parts.match(/(?:"([^"]*)"|NIL)/g);
    
    if (partMatches && partMatches.length >= 4) {
      const name = partMatches[0] === 'NIL' ? null : partMatches[0].replace(/^"|"$/g, '');
      const mailbox = partMatches[2] === 'NIL' ? '' : partMatches[2].replace(/^"|"$/g, '');
      const host = partMatches[3] === 'NIL' ? '' : partMatches[3].replace(/^"|"$/g, '');
      
      if (mailbox && host) {
        addresses.push({
          email: `${mailbox}@${host}`,
          name: name ? decodeImapString(name) : null,
        });
      }
    }
  }
  
  return addresses;
}

// Parse email address from header format: "Name" <email@domain.com> or email@domain.com
function parseEmailAddress(addr: string): { email: string | null; name: string | null } {
  addr = decodeImapString(addr.trim());
  
  // Format: "Name" <email>
  const match1 = addr.match(/^"?([^"<]+)"?\s*<([^>]+)>/);
  if (match1) {
    return { name: match1[1].trim(), email: match1[2].trim() };
  }
  
  // Format: Name <email>
  const match2 = addr.match(/^([^<]+)<([^>]+)>/);
  if (match2) {
    return { name: match2[1].trim(), email: match2[2].trim() };
  }
  
  // Format: <email>
  const match3 = addr.match(/<([^>]+)>/);
  if (match3) {
    return { name: null, email: match3[1].trim() };
  }
  
  // Just email
  if (addr.includes('@')) {
    return { name: null, email: addr };
  }
  
  return { name: null, email: null };
}

// Decode email body (handle MIME, quoted-printable, base64)
function decodeEmailBody(body: string): { text: string; html: string | null } {
  let text = body;
  let html: string | null = null;

  // Remove IMAP literal marker
  text = text.replace(/^\{\d+\}\r?\n/, '');

  // Check if it's multipart
  const boundaryMatch = body.match(/boundary="?([^"\s\r\n]+)"?/i);
  
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = body.split(new RegExp(`--${escapeRegex(boundary)}`));
    
    let plainText = '';
    let htmlText = '';
    
    for (const part of parts) {
      const contentTypeMatch = part.match(/Content-Type:\s*([^;\r\n]+)/i);
      const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase().trim() : '';
      
      // Get content after headers
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      
      let content = part.substring(headerEnd + 4);
      
      // Check transfer encoding
      const encodingMatch = part.match(/Content-Transfer-Encoding:\s*(\S+)/i);
      const encoding = encodingMatch ? encodingMatch[1].toLowerCase() : '';
      
      // Decode based on encoding
      if (encoding === 'quoted-printable') {
        content = decodeQuotedPrintable(content);
      } else if (encoding === 'base64') {
        content = decodeBase64(content);
      }
      
      if (contentType.includes('text/plain')) {
        plainText = content;
      } else if (contentType.includes('text/html')) {
        htmlText = content;
      }
    }
    
    text = plainText || stripHtml(htmlText);
    html = htmlText || null;
  } else {
    // Single part email
    const contentTypeMatch = body.match(/Content-Type:\s*([^;\r\n]+)/i);
    const encodingMatch = body.match(/Content-Transfer-Encoding:\s*(\S+)/i);
    
    // Remove headers if present
    const headerEnd = body.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      text = body.substring(headerEnd + 4);
    }
    
    // Decode
    const encoding = encodingMatch ? encodingMatch[1].toLowerCase() : '';
    if (encoding === 'quoted-printable') {
      text = decodeQuotedPrintable(text);
    } else if (encoding === 'base64') {
      text = decodeBase64(text);
    }
    
    const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase() : '';
    if (contentType.includes('text/html')) {
      html = text;
      text = stripHtml(text);
    }
  }

  // Final cleanup
  text = cleanEmailText(text);

  return { text, html };
}

// Decode quoted-printable encoding
function decodeQuotedPrintable(str: string): string {
  return str
    // Handle soft line breaks (= at end of line)
    .replace(/=\r?\n/g, '')
    // Decode =XX hex codes
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
}

// Decode base64 encoding
function decodeBase64(str: string): string {
  try {
    // Remove line breaks and whitespace
    const cleaned = str.replace(/[\r\n\s]/g, '');
    return atob(cleaned);
  } catch (e) {
    console.error('Base64 decode error:', e);
    return str;
  }
}

// Strip HTML tags for plain text
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Clean email text content
function cleanEmailText(text: string): string {
  return text
    // Remove MIME boundaries
    .replace(/--[A-Za-z0-9_-]+(?:--)?/g, '')
    // Remove Content-* headers that might have been left
    .replace(/Content-[A-Za-z-]+:.*(?:\r?\n(?:\s+.*)?)*/gi, '')
    // Remove excessive whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Decode IMAP encoded strings (=?UTF-8?B?...?= or =?UTF-8?Q?...?=)
function decodeImapString(str: string): string {
  if (!str) return str;
  
  // Handle =?charset?encoding?text?= format
  const regex = /=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi;
  
  let result = str.replace(regex, (match, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        // Base64
        const decoded = atob(text);
        // Try to handle UTF-8
        try {
          return decodeURIComponent(escape(decoded));
        } catch {
          return decoded;
        }
      } else if (encoding.toUpperCase() === 'Q') {
        // Quoted-printable
        return text
          .replace(/_/g, ' ')
          .replace(/=([0-9A-F]{2})/gi, (m: string, hex: string) => 
            String.fromCharCode(parseInt(hex, 16))
          );
      }
    } catch (e) {
      console.error('Decode error:', e);
    }
    return text;
  });
  
  // Handle consecutive encoded words (should be joined without space)
  result = result.replace(/\?=\s*=\?/g, '');
  
  return result;
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
        const fetchedEmails = await client.fetchEmails(startMsg, messageCount, imapConfig.imap_user);
        
        await client.logout();
        
        // Store emails in database
        const emailsToInsert = fetchedEmails.map(email => ({
          user_id: user.id,
          message_id: `${imapConfig.imap_user}_${email.message_id}`,
          from_email: email.from_email || 'unknown@email.com',
          from_name: email.from_name,
          to_email: email.to_email || imapConfig.imap_user,
          subject: email.subject,
          body_text: email.body_text?.substring(0, 50000) || null,
          body_html: email.body_html?.substring(0, 100000) || null,
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
              ignoreDuplicates: false // Update existing
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
