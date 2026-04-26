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

// Optimized IMAP client - reduced batch size and body limits to prevent CPU timeout
class SimpleImapClient {
  private conn: Deno.TlsConn | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private tagCounter = 0;

  async connect(host: string, port: number): Promise<void> {
    console.log(`[IMAP] Connecting to ${host}:${port}...`);
    this.conn = await Deno.connectTls({
      hostname: host,
      port: port,
    });
    const greeting = await this.readUntilTag('*');
    console.log('[IMAP] Connected, greeting received');
  }

  // Optimized reading with smaller buffer and stricter limits
  private async readUntilTag(expectedTag: string): Promise<string> {
    const buf = new Uint8Array(32768); // Reduced to 32KB buffer
    let fullResponse = '';
    let attempts = 0;
    const maxAttempts = 300; // Reduced attempts
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const n = await this.conn!.read(buf);
        if (n === null) break;
        
        const chunk = this.decoder.decode(buf.subarray(0, n));
        fullResponse += chunk;
        
        // For greeting
        if (expectedTag === '*' && fullResponse.includes('* OK')) {
          return fullResponse;
        }
        
        // Check if we received the completion tag
        const tagPattern = new RegExp(`^${expectedTag} (OK|NO|BAD)`, 'm');
        if (tagPattern.test(fullResponse)) {
          return fullResponse;
        }
        
        // Reduced max response size to 3MB to prevent memory issues
        if (fullResponse.length > 3 * 1024 * 1024) {
          console.log('[IMAP] Response size limit reached, stopping read');
          break;
        }
      } catch (e) {
        console.error('[IMAP] Read error:', e);
        break;
      }
    }
    
    return fullResponse;
  }

  private async sendCommand(command: string): Promise<string> {
    const tag = `A${++this.tagCounter}`;
    const fullCommand = `${tag} ${command}\r\n`;
    const safeLog = command.startsWith('LOGIN') 
      ? `${tag} LOGIN ***` 
      : `${tag} ${command.substring(0, 80)}...`;
    console.log(`[IMAP] >>> ${safeLog}`);
    await this.conn!.write(this.encoder.encode(fullCommand));
    const response = await this.readUntilTag(tag);
    console.log(`[IMAP] <<< Response size: ${response.length} bytes`);
    return response;
  }

  async login(user: string, password: string): Promise<boolean> {
    const response = await this.sendCommand(`LOGIN "${user}" "${password}"`);
    const success = response.includes(' OK ');
    console.log(`[IMAP] Login ${success ? 'successful' : 'failed'}`);
    return success;
  }

  async selectInbox(): Promise<number> {
    const response = await this.sendCommand('SELECT INBOX');
    let messageCount = 0;
    const match = response.match(/\* (\d+) EXISTS/);
    if (match) {
      messageCount = parseInt(match[1]);
    }
    console.log(`[IMAP] INBOX selected, ${messageCount} messages`);
    return messageCount;
  }

  async fetchEmails(start: number, end: number, imapUser: string): Promise<ParsedEmail[]> {
    const emails: ParsedEmail[] = [];
    
    if (start < 1) start = 1;
    if (end < start) return emails;

    // OPTIMIZATION: Reduced batch size from 25 to 10 to prevent CPU timeout
    const batchSize = 10;
    let currentStart = end;
    
    // OPTIMIZATION: Reduced max emails to 50 per sync
    const maxEmails = 50;
    
    while (currentStart >= start && emails.length < maxEmails) {
      const currentEnd = currentStart;
      const batchStart = Math.max(start, currentStart - batchSize + 1);
      
      console.log(`[IMAP] Fetching batch ${batchStart}:${currentEnd}...`);
      
      // OPTIMIZATION: Limit body size to 20KB with BODY.PEEK[TEXT]<0.20000>
      const response = await this.sendCommand(
        `FETCH ${batchStart}:${currentEnd} (UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)] BODY.PEEK[TEXT]<0.20000>)`
      );
      
      // Parse the response to extract individual emails
      const batchEmails = this.parseAllFetchResponses(response, imapUser);
      console.log(`[IMAP] Batch parsed: ${batchEmails.length} emails`);
      
      emails.push(...batchEmails);
      
      currentStart = batchStart - 1;
      
      if (emails.length >= maxEmails) break;
    }

    console.log(`[IMAP] Total parsed: ${emails.length} emails`);
    return emails;
  }

  private parseAllFetchResponses(response: string, imapUser: string): ParsedEmail[] {
    const emails: ParsedEmail[] = [];
    
    const fetchRegex = /\* (\d+) FETCH \(/g;
    let match;
    const fetchPositions: {start: number; msgNum: number}[] = [];
    
    while ((match = fetchRegex.exec(response)) !== null) {
      fetchPositions.push({
        start: match.index,
        msgNum: parseInt(match[1])
      });
    }
    
    console.log(`[IMAP] Found ${fetchPositions.length} FETCH responses`);
    
    for (let i = 0; i < fetchPositions.length; i++) {
      const startPos = fetchPositions[i].start;
      const endPos = i < fetchPositions.length - 1 
        ? fetchPositions[i + 1].start 
        : response.length;
      
      const fetchData = response.substring(startPos, endPos);
      
      try {
        const email = this.parseSingleFetch(fetchData, imapUser);
        if (email && email.from_email && email.from_email !== 'unknown@email.com') {
          emails.push(email);
        }
      } catch (e) {
        // Silent error - don't log each parse error to save CPU
      }
    }
    
    return emails;
  }

  private parseSingleFetch(data: string, imapUser: string): ParsedEmail | null {
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
    const uidMatch = data.match(/UID\s+(\d+)/i);
    if (uidMatch) {
      email.message_id = `uid_${uidMatch[1]}`;
    } else {
      email.message_id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Parse FLAGS
    const flagsMatch = data.match(/FLAGS\s*\(([^)]*)\)/i);
    if (flagsMatch) {
      email.is_read = flagsMatch[1].includes('\\Seen');
    }

    // Extract HEADER.FIELDS section
    const headerFieldsMatch = data.match(/BODY\[HEADER\.FIELDS[^\]]*\]\s*\{(\d+)\}/i);
    let headers = '';
    
    if (headerFieldsMatch) {
      const size = parseInt(headerFieldsMatch[1]);
      const startIdx = data.indexOf(headerFieldsMatch[0]) + headerFieldsMatch[0].length;
      const headerStart = data.indexOf('\n', startIdx) + 1;
      headers = data.substring(headerStart, headerStart + size);
    } else {
      const fromIdx = data.indexOf('From:');
      if (fromIdx >= 0) {
        const endIdx = data.indexOf('\r\n\r\n', fromIdx);
        if (endIdx > fromIdx) {
          headers = data.substring(fromIdx, endIdx);
        }
      }
    }

    // Parse headers
    if (headers) {
      // From
      const fromMatch = headers.match(/^From:\s*(.+?)(?:\r?\n(?![^\s])|\r?\n\r?\n|$)/mi);
      if (fromMatch) {
        const fromValue = decodeHeaderValue(fromMatch[1].replace(/\r?\n\s+/g, ' ').trim());
        const parsed = parseEmailAddress(fromValue);
        if (parsed.email) {
          email.from_email = parsed.email;
          email.from_name = parsed.name;
        }
      }

      // To
      const toMatch = headers.match(/^To:\s*(.+?)(?:\r?\n(?![^\s])|\r?\n\r?\n|$)/mi);
      if (toMatch) {
        const toValue = decodeHeaderValue(toMatch[1].replace(/\r?\n\s+/g, ' ').trim());
        const parsed = parseEmailAddress(toValue);
        if (parsed.email) {
          email.to_email = parsed.email;
        }
      }

      // Subject
      const subjectMatch = headers.match(/^Subject:\s*(.+?)(?:\r?\n(?![^\s])|\r?\n\r?\n|$)/mi);
      if (subjectMatch) {
        email.subject = decodeHeaderValue(subjectMatch[1].replace(/\r?\n\s+/g, ' ').trim());
      }

      // Date
      const dateMatch = headers.match(/^Date:\s*(.+?)(?:\r?\n|$)/mi);
      if (dateMatch) {
        try {
          const dateStr = dateMatch[1].trim();
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            email.received_at = parsedDate.toISOString();
          }
        } catch (e) {
          // Keep default
        }
      }

      // Message-ID
      const msgIdMatch = headers.match(/^Message-ID:\s*<([^>]+)>/mi);
      if (msgIdMatch) {
        email.message_id = msgIdMatch[1].substring(0, 100);
      }
    }

    // Extract BODY[TEXT] section - handle partial fetch format BODY[TEXT]<0>
    const textMatch = data.match(/BODY\[TEXT\](?:<\d+>)?\s*\{(\d+)\}/i);
    if (textMatch) {
      const size = parseInt(textMatch[1]);
      const startIdx = data.indexOf(textMatch[0]) + textMatch[0].length;
      const textStart = data.indexOf('\n', startIdx) + 1;
      // OPTIMIZATION: Limit body to 15KB max for parsing
      const bodyContent = data.substring(textStart, textStart + Math.min(size, 15000));
      
      // Check if body starts with MIME boundary
      const boundaryStartMatch = bodyContent.match(/^--([A-Za-z0-9_.=-]+)\r?\n/);
      
      if (boundaryStartMatch) {
        const boundary = boundaryStartMatch[1];
        const { text, html } = parseMultipartLight(bodyContent, boundary);
        email.body_text = text || cleanText(bodyContent);
        email.body_html = html;
      } else if (bodyContent.includes('<html') || bodyContent.includes('<HTML') || 
          bodyContent.includes('<body') || bodyContent.includes('<BODY') ||
          bodyContent.includes('<!DOCTYPE html')) {
        email.body_html = bodyContent;
        email.body_text = stripHtml(bodyContent);
      } else if (bodyContent.includes('Content-Type:')) {
        const boundaryMatch = bodyContent.match(/boundary="?([^"\s\r\n;]+)"?/i);
        if (boundaryMatch) {
          const { text, html } = parseMultipartLight(bodyContent, boundaryMatch[1]);
          email.body_text = text || cleanText(bodyContent);
          email.body_html = html;
        } else {
          email.body_text = cleanText(bodyContent);
        }
      } else {
        const encodingMatch = bodyContent.match(/Content-Transfer-Encoding:\s*(\S+)/i);
        const encoding = encodingMatch ? encodingMatch[1].toLowerCase() : '';
        
        let decoded = bodyContent;
        if (encoding === 'quoted-printable') {
          decoded = decodeQuotedPrintable(bodyContent);
        } else if (encoding === 'base64') {
          decoded = decodeBase64Safe(bodyContent);
        }
        
        email.body_text = cleanText(decoded);
      }
    }

    // OPTIMIZATION: Limit text to 8000 chars
    email.body_text = email.body_text.substring(0, 8000);
    
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
        return decodeBase64Safe(text);
      } else if (encoding.toUpperCase() === 'Q') {
        const decoded = text
          .replace(/_/g, ' ')
          .replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) => 
            String.fromCharCode(parseInt(hex, 16))
          );
        return decodeUTF8Bytes(decoded);
      }
    } catch (e) {
      // Silent - don't log decode errors
    }
    return text;
  });
  
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
  
  const match1 = addr.match(/^"?([^"<]+)"?\s*<([^>]+)>/);
  if (match1) {
    return { name: match1[1].trim(), email: match1[2].trim().toLowerCase() };
  }
  
  const match2 = addr.match(/<([^>]+)>/);
  if (match2) {
    return { name: null, email: match2[1].trim().toLowerCase() };
  }
  
  if (addr.includes('@')) {
    return { name: null, email: addr.toLowerCase() };
  }
  
  return { name: null, email: null };
}

// OPTIMIZATION: Lightweight multipart parser - no deep recursion, limited iterations
function parseMultipartLight(body: string, boundary: string): { text: string; html: string | null } {
  let plainText = '';
  let htmlText = '';
  
  const escapedBoundary = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = body.split(new RegExp(`--${escapedBoundary}(?:--)?`));
  
  // OPTIMIZATION: Only process first 5 parts max
  const maxParts = Math.min(parts.length, 5);
  
  for (let i = 0; i < maxParts; i++) {
    const part = parts[i];
    const trimmedPart = part.trim();
    if (trimmedPart === '' || trimmedPart === '--') continue;
    
    const partContentTypeMatch = part.match(/Content-Type:\s*([^;\r\n]+)/i);
    const partType = partContentTypeMatch ? partContentTypeMatch[1].toLowerCase().trim() : '';
    
    const partEncodingMatch = part.match(/Content-Transfer-Encoding:\s*(\S+)/i);
    const partEncoding = partEncodingMatch ? partEncodingMatch[1].toLowerCase().trim() : '';
    
    let contentStart = part.indexOf('\r\n\r\n');
    if (contentStart === -1) contentStart = part.indexOf('\n\n');
    if (contentStart === -1) continue;
    
    let content = part.substring(contentStart + (part.charAt(contentStart + 1) === '\n' ? 2 : 4));
    content = content.replace(/\r?\n--[A-Za-z0-9_.=-]+--?\s*$/g, '').trim();
    
    // OPTIMIZATION: Limit content size before decoding
    content = content.substring(0, 10000);
    
    if (partEncoding === 'quoted-printable') {
      content = decodeQuotedPrintable(content);
    } else if (partEncoding === 'base64') {
      content = decodeBase64Safe(content);
    }
    
    // Skip nested multipart - too CPU intensive
    if (partType.includes('multipart')) {
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
  
  return { text: plainText.trim(), html: htmlText || null };
}

function decodeQuotedPrintable(str: string): string {
  try {
    let result = str.replace(/=\r?\n/g, '');
    result = result.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    return decodeUTF8Bytes(result);
  } catch (e) {
    return str;
  }
}

// OPTIMIZATION: Silent Base64 decoder - no logging on errors
function decodeBase64Safe(str: string): string {
  try {
    // Clean the string first
    const cleaned = str.replace(/[\r\n\s]/g, '');
    if (cleaned.length === 0) return '';
    
    // Validate base64 chars
    if (!/^[A-Za-z0-9+/=]+$/.test(cleaned)) {
      return str;
    }
    
    const decoded = atob(cleaned);
    return decodeUTF8Bytes(decoded);
  } catch (e) {
    // Silent return - no logging to save CPU
    return '';
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
    .replace(/--[A-Za-z0-9_.=-]+--?/g, '')
    .replace(/Content-[A-Za-z-]+:.*(?:\r?\n(?:\s+.*)?)*\r?\n/gi, '')
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
        
        // OPTIMIZATION: Reduced default count and max
        const { full_sync = false, count = 30 } = body || {};
        const emailsToFetch = full_sync ? Math.min(messageCount, 100) : Math.min(count, messageCount, 50);
        const startMsg = Math.max(1, messageCount - emailsToFetch + 1);
        
        console.log(`[IMAP] Fetching ${emailsToFetch} emails (full_sync: ${full_sync}, total: ${messageCount})`);
        const fetchedEmails = await client.fetchEmails(startMsg, messageCount, imapConfig.imap_user);
        
        await client.logout();
        
        // Store emails
        const emailsToInsert = fetchedEmails
          .filter(email => email.from_email && email.from_email !== 'unknown@email.com')
          .map(email => ({
            user_id: user.id,
            message_id: `${imapConfig.imap_user}_${email.message_id}`,
            from_email: email.from_email,
            from_name: email.from_name,
            to_email: email.to_email || imapConfig.imap_user,
            subject: email.subject,
            body_text: email.body_text?.substring(0, 30000) || null,
            body_html: email.body_html?.substring(0, 50000) || null,
            received_at: email.received_at || new Date().toISOString(),
            is_read: email.is_read,
            is_starred: false,
            folder: 'INBOX',
            attachments: [],
          }));

        console.log(`[IMAP] Inserting ${emailsToInsert.length} emails`);
        
        if (emailsToInsert.length > 0) {
          console.log(`[IMAP] Sample: ${emailsToInsert[0].subject} from ${emailsToInsert[0].from_email}`);
          
          const { error: insertError } = await supabaseClient
            .from('received_emails')
            .upsert(emailsToInsert, {
              onConflict: 'user_id,message_id',
              ignoreDuplicates: false
            });

          if (insertError) {
            console.error('[IMAP] Insert error:', insertError);
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
          .limit(200);

        return new Response(
          JSON.stringify({ 
            success: true, 
            emails: emails || [],
            fetched_count: fetchedEmails.length,
            inserted_count: emailsToInsert.length,
            total_on_server: messageCount,
            message: `${emailsToInsert.length} emails synchronisés`
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
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
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
