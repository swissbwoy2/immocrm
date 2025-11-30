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
  subject: string | null;
  body_text: string;
  body_html: string | null;
  received_at: string | null;
  is_read: boolean;
}

// Simple IMAP client
class SimpleImapClient {
  private conn: Deno.TlsConn | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private tagCounter = 0;
  private buffer = '';

  async connect(host: string, port: number): Promise<void> {
    console.log(`[IMAP] Connecting to ${host}:${port}...`);
    this.conn = await Deno.connectTls({
      hostname: host,
      port: port,
    });
    const greeting = await this.readResponse();
    console.log('[IMAP] Connected, greeting received');
    return;
  }

  private async readResponse(): Promise<string[]> {
    const lines: string[] = [];
    const buf = new Uint8Array(32768);
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      attempts++;
      const n = await this.conn!.read(buf);
      if (n === null) break;
      
      this.buffer += this.decoder.decode(buf.subarray(0, n));
      
      while (this.buffer.includes('\r\n')) {
        const idx = this.buffer.indexOf('\r\n');
        const line = this.buffer.substring(0, idx);
        this.buffer = this.buffer.substring(idx + 2);
        lines.push(line);
        
        // Check for completion
        if (line.match(/^[A-Z]\d+ (OK|NO|BAD)/)) {
          return lines;
        }
        if (line.startsWith('* OK') && lines.length === 1) {
          return lines;
        }
      }
      
      // Check if we have a literal coming
      const lastLine = lines[lines.length - 1] || this.buffer;
      const literalMatch = lastLine.match(/\{(\d+)\}$/);
      if (literalMatch) {
        // Wait for literal data
        const literalSize = parseInt(literalMatch[1]);
        while (this.buffer.length < literalSize && attempts < maxAttempts) {
          attempts++;
          const n = await this.conn!.read(buf);
          if (n === null) break;
          this.buffer += this.decoder.decode(buf.subarray(0, n));
        }
      }
      
      if (lines.length > 2000) break;
    }
    
    return lines;
  }

  private async sendCommand(command: string): Promise<string[]> {
    const tag = `A${++this.tagCounter}`;
    const fullCommand = `${tag} ${command}\r\n`;
    const safeLog = command.startsWith('LOGIN') 
      ? `${tag} LOGIN ***` 
      : `${tag} ${command.substring(0, 100)}`;
    console.log(`[IMAP] >>> ${safeLog}`);
    await this.conn!.write(this.encoder.encode(fullCommand));
    const response = await this.readResponse();
    console.log(`[IMAP] <<< ${response.length} lines received`);
    return response;
  }

  async login(user: string, password: string): Promise<boolean> {
    const response = await this.sendCommand(`LOGIN "${user}" "${password}"`);
    const success = response.some(line => line.includes(' OK '));
    console.log(`[IMAP] Login ${success ? 'successful' : 'failed'}`);
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
    console.log(`[IMAP] INBOX selected, ${messageCount} messages`);
    return messageCount;
  }

  async fetchEmails(start: number, end: number, imapUser: string): Promise<ParsedEmail[]> {
    const emails: ParsedEmail[] = [];
    
    if (start < 1) start = 1;
    if (end < start) return emails;

    const range = `${start}:${end}`;
    console.log(`[IMAP] Fetching range ${range}...`);
    
    // Fetch all emails in one request with full data
    const response = await this.sendCommand(
      `FETCH ${range} (UID FLAGS BODY.PEEK[HEADER] BODY.PEEK[TEXT])`
    );
    
    const fullResponse = response.join('\n');
    console.log(`[IMAP] Response size: ${fullResponse.length} chars`);
    
    // Split by FETCH responses - improved regex
    const fetchMatches = fullResponse.split(/^\* \d+ FETCH/m);
    
    console.log(`[IMAP] Found ${fetchMatches.length - 1} FETCH responses`);
    
    for (let i = 1; i < fetchMatches.length && emails.length < 200; i++) {
      const fetchData = fetchMatches[i];
      
      try {
        const email = this.parseFetchResponse(fetchData, imapUser);
        if (email && email.message_id) {
          emails.push(email);
        }
      } catch (e) {
        console.error(`[IMAP] Error parsing email ${i}:`, e);
      }
    }

    console.log(`[IMAP] Parsed ${emails.length} emails`);
    return emails;
  }

  private parseFetchResponse(data: string, imapUser: string): ParsedEmail | null {
    const email: ParsedEmail = {
      message_id: '',
      from_email: imapUser,
      from_name: null,
      to_email: imapUser,
      subject: null,
      body_text: '',
      body_html: null,
      received_at: new Date().toISOString(),
      is_read: false,
    };

    // Parse UID
    const uidMatch = data.match(/UID (\d+)/i);
    if (uidMatch) {
      email.message_id = uidMatch[1];
    } else {
      email.message_id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Parse FLAGS
    const flagsMatch = data.match(/FLAGS \(([^)]*)\)/i);
    if (flagsMatch) {
      email.is_read = flagsMatch[1].includes('\\Seen');
    }

    // Find HEADER section - try multiple patterns
    let headers = '';
    
    // Pattern 1: BODY[HEADER] with literal size
    const headerMatch1 = data.match(/BODY\[HEADER\]\s*\{(\d+)\}\s*\r?\n([\s\S]*)/i);
    if (headerMatch1) {
      const size = parseInt(headerMatch1[1]);
      headers = headerMatch1[2].substring(0, size);
    }
    
    // Pattern 2: BODY[HEADER] without literal size
    if (!headers) {
      const headerMatch2 = data.match(/BODY\[HEADER\]\s*\r?\n([\s\S]*?)(?=BODY\[TEXT\]|$)/i);
      if (headerMatch2) {
        headers = headerMatch2[1];
      }
    }
    
    // Pattern 3: Look for common email headers directly
    if (!headers) {
      const fromIdx = data.search(/^From:/mi);
      if (fromIdx >= 0) {
        const endIdx = data.indexOf('\n\n', fromIdx);
        if (endIdx > fromIdx) {
          headers = data.substring(fromIdx, endIdx);
        }
      }
    }

    // Parse From header with improved regex
    const fromPatterns = [
      /^From:\s*(.+?)(?=\r?\n[A-Z][a-zA-Z-]*:|$)/mi,
      /^From:\s*(.+)/mi
    ];
    for (const pattern of fromPatterns) {
      const fromMatch = headers.match(pattern);
      if (fromMatch) {
        const fromValue = decodeHeaderValue(fromMatch[1].replace(/\r?\n\s+/g, ' ').trim());
        const parsed = parseEmailAddress(fromValue);
        if (parsed.email) {
          email.from_email = parsed.email;
          email.from_name = parsed.name;
          break;
        }
      }
    }

    // Parse To header
    const toPatterns = [
      /^To:\s*(.+?)(?=\r?\n[A-Z][a-zA-Z-]*:|$)/mi,
      /^To:\s*(.+)/mi
    ];
    for (const pattern of toPatterns) {
      const toMatch = headers.match(pattern);
      if (toMatch) {
        const toValue = decodeHeaderValue(toMatch[1].replace(/\r?\n\s+/g, ' ').trim());
        const parsed = parseEmailAddress(toValue);
        if (parsed.email) {
          email.to_email = parsed.email;
          break;
        }
      }
    }

    // Parse Subject header with improved regex
    const subjectPatterns = [
      /^Subject:\s*(.+?)(?=\r?\n[A-Z][a-zA-Z-]*:|$)/mi,
      /^Subject:\s*(.+)/mi
    ];
    for (const pattern of subjectPatterns) {
      const subjectMatch = headers.match(pattern);
      if (subjectMatch) {
        const subject = decodeHeaderValue(subjectMatch[1].replace(/\r?\n\s+/g, ' ').trim());
        if (subject) {
          email.subject = subject;
          break;
        }
      }
    }

    // Parse Date header
    const dateMatch = headers.match(/^Date:\s*(.+?)(?=\r?\n|$)/mi);
    if (dateMatch) {
      try {
        const dateStr = dateMatch[1].trim();
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          email.received_at = parsedDate.toISOString();
        }
      } catch (e) {
        // Keep default date
      }
    }

    // Find TEXT section
    const textMatch = data.match(/BODY\[TEXT\]\s*(?:\{\d+\})?\s*\r?\n([\s\S]*?)(?=\)\s*$|\nA\d+)/i);
    let bodyContent = '';
    if (textMatch) {
      bodyContent = textMatch[1];
    }

    // Parse Content-Type from headers
    const contentTypeMatch = headers.match(/^Content-Type:\s*([^;\r\n]+)/mi);
    const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase().trim() : 'text/plain';
    
    // Check for multipart
    const boundaryMatch = headers.match(/boundary="?([^"\s\r\n;]+)"?/i) ||
                          bodyContent.match(/boundary="?([^"\s\r\n;]+)"?/i);

    if (boundaryMatch && bodyContent) {
      // Multipart message
      const boundary = boundaryMatch[1];
      const { text, html } = parseMultipart(bodyContent, boundary);
      email.body_text = text;
      email.body_html = html;
    } else if (bodyContent) {
      // Single part
      const encodingMatch = headers.match(/^Content-Transfer-Encoding:\s*(\S+)/mi);
      const encoding = encodingMatch ? encodingMatch[1].toLowerCase().trim() : '';
      
      let decoded = bodyContent;
      if (encoding === 'quoted-printable') {
        decoded = decodeQuotedPrintable(bodyContent);
      } else if (encoding === 'base64') {
        decoded = decodeBase64UTF8(bodyContent);
      }
      
      if (contentType.includes('text/html')) {
        email.body_html = decoded;
        email.body_text = stripHtml(decoded);
      } else {
        email.body_text = decoded;
      }
    }

    // Clean up text
    email.body_text = cleanText(email.body_text);

    return email;
  }

  async logout(): Promise<void> {
    try {
      await this.sendCommand('LOGOUT');
    } catch (e) {
      // Ignore
    }
    try {
      this.conn?.close();
    } catch (e) {
      // Ignore
    }
  }
}

// Decode MIME header value
function decodeHeaderValue(value: string): string {
  if (!value) return value;
  
  const regex = /=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi;
  
  let result = value.replace(regex, (match, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return decodeBase64UTF8(text);
      } else if (encoding.toUpperCase() === 'Q') {
        const decoded = text
          .replace(/_/g, ' ')
          .replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) => 
            String.fromCharCode(parseInt(hex, 16))
          );
        return decodeUTF8Bytes(decoded);
      }
    } catch (e) {
      console.error('[DECODE] Header decode error:', e);
    }
    return text;
  });
  
  // Handle consecutive encoded words
  result = result.replace(/\?=\s*=\?/g, '');
  
  return result.trim();
}

function decodeUTF8Bytes(str: string): string {
  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    return str;
  }
}

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

function parseMultipart(body: string, boundary: string): { text: string; html: string | null } {
  let plainText = '';
  let htmlText = '';
  
  const escapedBoundary = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = body.split(new RegExp(`--${escapedBoundary}`));
  
  for (const part of parts) {
    if (part.trim() === '' || part.trim() === '--') continue;
    
    const partContentTypeMatch = part.match(/Content-Type:\s*([^;\r\n]+)/i);
    const partType = partContentTypeMatch ? partContentTypeMatch[1].toLowerCase().trim() : '';
    
    const partEncodingMatch = part.match(/Content-Transfer-Encoding:\s*(\S+)/i);
    const partEncoding = partEncodingMatch ? partEncodingMatch[1].toLowerCase().trim() : '';
    
    // Find content after headers
    let contentStart = part.indexOf('\r\n\r\n');
    if (contentStart === -1) contentStart = part.indexOf('\n\n');
    if (contentStart === -1) continue;
    
    let content = part.substring(contentStart + (part[contentStart + 1] === '\n' ? 2 : 4));
    
    // Decode content
    if (partEncoding === 'quoted-printable') {
      content = decodeQuotedPrintable(content);
    } else if (partEncoding === 'base64') {
      content = decodeBase64UTF8(content);
    }
    
    // Check for nested multipart
    const nestedBoundaryMatch = part.match(/boundary="?([^"\s\r\n;]+)"?/i);
    if (nestedBoundaryMatch && partType.includes('multipart')) {
      const nested = parseMultipart(content, nestedBoundaryMatch[1]);
      if (nested.text && !plainText) plainText = nested.text;
      if (nested.html && !htmlText) htmlText = nested.html;
      continue;
    }
    
    if (partType.includes('text/plain') && !plainText) {
      plainText = content;
    } else if (partType.includes('text/html') && !htmlText) {
      htmlText = content;
    }
  }
  
  if (!plainText && htmlText) {
    plainText = stripHtml(htmlText);
  }
  
  return { text: plainText, html: htmlText || null };
}

function decodeQuotedPrintable(str: string): string {
  let result = str.replace(/=\r?\n/g, '');
  result = result.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  return decodeUTF8Bytes(result);
}

function decodeBase64UTF8(str: string): string {
  try {
    const cleaned = str.replace(/[\r\n\s]/g, '');
    const decoded = atob(cleaned);
    return decodeUTF8Bytes(decoded);
  } catch (e) {
    console.error('[DECODE] Base64 error:', e);
    return str;
  }
}

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

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/--[A-Za-z0-9_=-]+--?/g, '') // Remove MIME boundaries
    .replace(/Content-[A-Za-z-]+:.*(?:\r?\n(?:\s+.*)?)*\r?\n/gi, '') // Remove Content-* headers
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
    console.log(`[IMAP] Action: ${action}, User: ${user.id}`);

    if (action === 'fetch_emails') {
      const { data: imapConfig, error: configError } = await supabaseClient
        .from('imap_configurations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (configError) {
        throw new Error(`Config error: ${configError.message}`);
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

      console.log(`[IMAP] Connecting to ${imapConfig.imap_host}:${imapConfig.imap_port}`);
      
      const client = new SimpleImapClient();
      
      try {
        await client.connect(imapConfig.imap_host, imapConfig.imap_port);
        const loginSuccess = await client.login(imapConfig.imap_user, imapConfig.imap_password);
        
        if (!loginSuccess) {
          throw new Error('Échec de l\'authentification IMAP.');
        }
        
        const messageCount = await client.selectInbox();
        
        // Support for full_sync and custom count
        const { full_sync = false, count = 100 } = body || {};
        const emailsToFetch = full_sync ? Math.min(messageCount, 500) : Math.min(count, messageCount);
        const startMsg = Math.max(1, messageCount - emailsToFetch + 1);
        
        console.log(`[IMAP] Fetching ${emailsToFetch} emails (full_sync: ${full_sync}, total: ${messageCount})`);
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

        console.log(`[IMAP] Inserting ${emailsToInsert.length} emails`);
        
        if (emailsToInsert.length > 0) {
          // Log first email for debugging
          if (emailsToInsert[0]) {
            console.log(`[IMAP] First email subject: ${emailsToInsert[0].subject}`);
            console.log(`[IMAP] First email from: ${emailsToInsert[0].from_email}`);
            console.log(`[IMAP] First email body_text length: ${emailsToInsert[0].body_text?.length || 0}`);
          }
          
          const { error: insertError } = await supabaseClient
            .from('received_emails')
            .upsert(emailsToInsert, {
              onConflict: 'user_id,message_id',
              ignoreDuplicates: false
            });

          if (insertError) {
            console.error('[IMAP] Insert error:', insertError);
          } else {
            console.log(`[IMAP] Inserted/updated ${emailsToInsert.length} emails`);
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
          .limit(500);

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
        console.error('[IMAP] Error:', imapError);
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
    console.error('[IMAP] Function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
