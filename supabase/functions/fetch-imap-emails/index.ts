import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    await this.readResponse();
    console.log('Connected to IMAP server');
  }

  private async readResponse(): Promise<string[]> {
    const lines: string[] = [];
    const buf = new Uint8Array(16384);
    
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
      
      if (lines.length > 1000) break;
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
    
    // Fetch emails one by one for better reliability
    for (let msgNum = end; msgNum >= start && emails.length < 50; msgNum--) {
      try {
        const email = await this.fetchSingleEmail(msgNum, imapUser);
        if (email) {
          emails.push(email);
        }
      } catch (e) {
        console.error(`Error fetching email ${msgNum}:`, e);
      }
    }

    console.log(`Parsed ${emails.length} emails`);
    return emails;
  }

  private async fetchSingleEmail(msgNum: number, imapUser: string): Promise<ParsedEmail | null> {
    // First fetch FLAGS, UID, and headers
    const headerResponse = await this.sendCommand(
      `FETCH ${msgNum} (FLAGS UID BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)])`
    );
    
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

    const headerText = headerResponse.join('\n');
    
    // Parse FLAGS
    const flagsMatch = headerText.match(/FLAGS \(([^)]*)\)/);
    if (flagsMatch) {
      email.flags = flagsMatch[1].split(' ').filter(f => f);
      email.is_read = email.flags.includes('\\Seen');
    }

    // Parse UID
    const uidMatch = headerText.match(/UID (\d+)/);
    if (uidMatch) {
      email.message_id = uidMatch[1];
    } else {
      email.message_id = `msg_${msgNum}_${Date.now()}`;
    }

    // Parse headers
    const fromMatch = headerText.match(/^From:\s*(.+?)(?:\r?\n(?!\s)|$)/mi);
    if (fromMatch) {
      const parsed = parseEmailAddress(decodeHeaderValue(fromMatch[1].trim()));
      email.from_email = parsed.email || imapUser;
      email.from_name = parsed.name;
    }

    const toMatch = headerText.match(/^To:\s*(.+?)(?:\r?\n(?!\s)|$)/mi);
    if (toMatch) {
      const parsed = parseEmailAddress(decodeHeaderValue(toMatch[1].trim()));
      email.to_email = parsed.email || imapUser;
      email.to_name = parsed.name;
    }

    const subjectMatch = headerText.match(/^Subject:\s*(.+?)(?:\r?\n(?!\s)|$)/mi);
    if (subjectMatch) {
      email.subject = decodeHeaderValue(subjectMatch[1].trim());
    }

    const dateMatch = headerText.match(/^Date:\s*(.+?)(?:\r?\n|$)/mi);
    if (dateMatch) {
      try {
        email.received_at = new Date(dateMatch[1].trim()).toISOString();
      } catch (e) {
        email.received_at = new Date().toISOString();
      }
    } else {
      email.received_at = new Date().toISOString();
    }

    // Now fetch body
    const bodyResponse = await this.sendCommand(
      `FETCH ${msgNum} (BODY.PEEK[TEXT])`
    );
    
    const bodyText = bodyResponse.join('\n');
    
    // Extract body content
    const bodyContentMatch = bodyText.match(/BODY\[TEXT\]\s*(?:\{(\d+)\})?\s*\r?\n?([\s\S]*?)(?:\)\r?\n[A-Z]\d+|$)/i);
    if (bodyContentMatch) {
      let content = bodyContentMatch[2] || '';
      
      // Remove trailing ) if present
      content = content.replace(/\)\s*$/, '');
      
      // Decode the body
      const decoded = decodeEmailBody(content, headerText);
      email.body_text = decoded.text;
      email.body_html = decoded.html;
    }

    return email;
  }

  async logout(): Promise<void> {
    try {
      await this.sendCommand('LOGOUT');
    } catch (e) {
      // Ignore
    }
    this.conn?.close();
  }
}

// Decode header value (handles =?UTF-8?B?...?= and =?UTF-8?Q?...?= formats)
function decodeHeaderValue(value: string): string {
  if (!value) return value;
  
  // Handle encoded words: =?charset?encoding?text?=
  const regex = /=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi;
  
  let result = value.replace(regex, (match, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        // Base64
        const decoded = atob(text);
        return decodeUTF8Bytes(decoded);
      } else if (encoding.toUpperCase() === 'Q') {
        // Quoted-printable
        const decoded = text
          .replace(/_/g, ' ')
          .replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) => 
            String.fromCharCode(parseInt(hex, 16))
          );
        return decodeUTF8Bytes(decoded);
      }
    } catch (e) {
      console.error('Header decode error:', e);
    }
    return text;
  });
  
  // Handle consecutive encoded words
  result = result.replace(/\?=\s*=\?/g, '');
  
  return result;
}

// Decode UTF-8 byte sequence from a string
function decodeUTF8Bytes(str: string): string {
  try {
    // Convert string to byte array
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    // Decode as UTF-8
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    return str;
  }
}

// Parse email address from header format
function parseEmailAddress(addr: string): { email: string | null; name: string | null } {
  addr = addr.trim();
  
  // Format: "Name" <email> or Name <email>
  const match1 = addr.match(/^"?([^"<]+)"?\s*<([^>]+)>/);
  if (match1) {
    return { name: match1[1].trim(), email: match1[2].trim() };
  }
  
  // Format: <email>
  const match2 = addr.match(/<([^>]+)>/);
  if (match2) {
    return { name: null, email: match2[1].trim() };
  }
  
  // Just email
  if (addr.includes('@')) {
    return { name: null, email: addr };
  }
  
  return { name: null, email: null };
}

// Decode email body
function decodeEmailBody(body: string, headers: string): { text: string; html: string | null } {
  let text = body;
  let html: string | null = null;

  // Check content type from the full message headers
  const contentTypeMatch = headers.match(/Content-Type:\s*([^;\r\n]+)/i);
  const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase().trim() : 'text/plain';
  
  // Check transfer encoding
  const encodingMatch = body.match(/Content-Transfer-Encoding:\s*(\S+)/i) || 
                        headers.match(/Content-Transfer-Encoding:\s*(\S+)/i);
  const encoding = encodingMatch ? encodingMatch[1].toLowerCase().trim() : '';

  // Check for multipart
  const boundaryMatch = body.match(/boundary="?([^"\s\r\n;]+)"?/i) ||
                        headers.match(/boundary="?([^"\s\r\n;]+)"?/i);

  if (boundaryMatch) {
    // Multipart message
    const boundary = boundaryMatch[1];
    const parts = body.split(new RegExp(`--${escapeRegex(boundary)}`));
    
    let plainText = '';
    let htmlText = '';
    
    for (const part of parts) {
      if (part.trim() === '' || part.trim() === '--') continue;
      
      const partContentTypeMatch = part.match(/Content-Type:\s*([^;\r\n]+)/i);
      const partType = partContentTypeMatch ? partContentTypeMatch[1].toLowerCase().trim() : '';
      
      const partEncodingMatch = part.match(/Content-Transfer-Encoding:\s*(\S+)/i);
      const partEncoding = partEncodingMatch ? partEncodingMatch[1].toLowerCase().trim() : '';
      
      // Find content after headers (empty line separator)
      const headerEndIndex = part.indexOf('\r\n\r\n');
      const altHeaderEnd = part.indexOf('\n\n');
      const contentStart = headerEndIndex !== -1 ? headerEndIndex + 4 : 
                          (altHeaderEnd !== -1 ? altHeaderEnd + 2 : 0);
      
      let content = part.substring(contentStart);
      
      // Decode content
      if (partEncoding === 'quoted-printable') {
        content = decodeQuotedPrintable(content);
      } else if (partEncoding === 'base64') {
        content = decodeBase64UTF8(content);
      }
      
      if (partType.includes('text/plain')) {
        plainText = content;
      } else if (partType.includes('text/html')) {
        htmlText = content;
      }
    }
    
    text = plainText || stripHtml(htmlText);
    html = htmlText || null;
  } else {
    // Single part
    
    // Remove any headers from body if present
    const headerEnd = body.indexOf('\r\n\r\n');
    const altHeaderEnd = body.indexOf('\n\n');
    if (headerEnd !== -1 && headerEnd < 500) {
      text = body.substring(headerEnd + 4);
    } else if (altHeaderEnd !== -1 && altHeaderEnd < 500) {
      text = body.substring(altHeaderEnd + 2);
    }
    
    // Decode
    if (encoding === 'quoted-printable') {
      text = decodeQuotedPrintable(text);
    } else if (encoding === 'base64') {
      text = decodeBase64UTF8(text);
    }
    
    if (contentType.includes('text/html')) {
      html = text;
      text = stripHtml(text);
    }
  }

  // Final cleanup
  text = cleanText(text);

  return { text, html };
}

// Decode quoted-printable with proper UTF-8 handling
function decodeQuotedPrintable(str: string): string {
  // First handle soft line breaks
  let result = str.replace(/=\r?\n/g, '');
  
  // Then decode hex codes
  result = result.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Convert to proper UTF-8
  return decodeUTF8Bytes(result);
}

// Decode base64 with UTF-8 support
function decodeBase64UTF8(str: string): string {
  try {
    const cleaned = str.replace(/[\r\n\s]/g, '');
    const decoded = atob(cleaned);
    return decodeUTF8Bytes(decoded);
  } catch (e) {
    console.error('Base64 decode error:', e);
    return str;
  }
}

// Strip HTML tags
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Clean text
function cleanText(text: string): string {
  return text
    .replace(/--[A-Za-z0-9_=-]+--?/g, '') // Remove MIME boundaries
    .replace(/Content-[A-Za-z-]+:.*(?:\r?\n(?:\s+.*)?)*\r?\n/gi, '') // Remove Content-* headers
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Escape regex
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

serve(async (req) => {
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { action } = body;
    console.log(`Processing IMAP action: ${action} for user: ${user.id}`);

    if (action === 'fetch_emails') {
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
            message: 'Aucune configuration IMAP trouvée.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Connecting to IMAP: ${imapConfig.imap_host}:${imapConfig.imap_port}`);
      
      const client = new SimpleImapClient();
      
      try {
        await client.connect(imapConfig.imap_host, imapConfig.imap_port);
        const loginSuccess = await client.login(imapConfig.imap_user, imapConfig.imap_password);
        
        if (!loginSuccess) {
          throw new Error('Échec de l\'authentification IMAP.');
        }
        
        const messageCount = await client.selectInbox();
        const startMsg = Math.max(1, messageCount - 49);
        const fetchedEmails = await client.fetchEmails(startMsg, messageCount, imapConfig.imap_user);
        
        await client.logout();
        
        // Store emails
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

        if (emailsToInsert.length > 0) {
          const { error: insertError } = await supabaseClient
            .from('received_emails')
            .upsert(emailsToInsert, {
              onConflict: 'user_id,message_id',
              ignoreDuplicates: false
            });

          if (insertError) {
            console.error('Error inserting emails:', insertError);
          } else {
            console.log(`Inserted/updated ${emailsToInsert.length} emails`);
          }
        }

        await supabaseClient
          .from('imap_configurations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', user.id);

        const { data: emails } = await supabaseClient
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
        const errorMessage = imapError instanceof Error ? imapError.message : 'Erreur IMAP';
        
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
            message: `Erreur: ${errorMessage}`
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
