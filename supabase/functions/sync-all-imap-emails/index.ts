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

// Improved IMAP client with robust parsing
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
    await this.readUntilTag('*');
    console.log('[IMAP] Connected');
  }

  private async readUntilTag(expectedTag: string): Promise<string> {
    const buf = new Uint8Array(65536);
    let fullResponse = '';
    let attempts = 0;
    const maxAttempts = 500;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const n = await this.conn!.read(buf);
        if (n === null) break;
        
        const chunk = this.decoder.decode(buf.subarray(0, n));
        fullResponse += chunk;
        
        if (expectedTag === '*' && fullResponse.includes('* OK')) {
          return fullResponse;
        }
        
        const tagPattern = new RegExp(`^${expectedTag} (OK|NO|BAD)`, 'm');
        if (tagPattern.test(fullResponse)) {
          return fullResponse;
        }
        
        if (fullResponse.length > 10 * 1024 * 1024) {
          console.log('[IMAP] Response too large, stopping');
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
    await this.conn!.write(this.encoder.encode(fullCommand));
    const response = await this.readUntilTag(tag);
    console.log(`[IMAP] Command response: ${response.length} bytes`);
    return response;
  }

  async login(user: string, password: string): Promise<boolean> {
    const response = await this.sendCommand(`LOGIN "${user}" "${password}"`);
    return response.includes(' OK ');
  }

  async selectInbox(): Promise<number> {
    const response = await this.sendCommand('SELECT INBOX');
    let messageCount = 0;
    const match = response.match(/\* (\d+) EXISTS/);
    if (match) {
      messageCount = parseInt(match[1]);
    }
    console.log(`[IMAP] INBOX: ${messageCount} messages`);
    return messageCount;
  }

  async fetchEmails(start: number, end: number, imapUser: string): Promise<ParsedEmail[]> {
    const emails: ParsedEmail[] = [];
    
    if (start < 1) start = 1;
    if (end < start) return emails;

    const batchSize = 25;
    let currentStart = end;
    
    while (currentStart >= start && emails.length < 100) {
      const currentEnd = currentStart;
      const batchStart = Math.max(start, currentStart - batchSize + 1);
      
      console.log(`[IMAP] Fetching ${batchStart}:${currentEnd}...`);
      
      const response = await this.sendCommand(
        `FETCH ${batchStart}:${currentEnd} (UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)] BODY.PEEK[TEXT])`
      );
      
      const batchEmails = this.parseAllFetchResponses(response, imapUser);
      console.log(`[IMAP] Parsed ${batchEmails.length} emails from batch`);
      
      emails.push(...batchEmails);
      currentStart = batchStart - 1;
      
      if (emails.length >= 100) break;
    }

    console.log(`[IMAP] Total: ${emails.length} emails`);
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
        if (email) {
          emails.push(email);
        }
      } catch (e) {
        console.error(`[IMAP] Parse error for msg ${fetchPositions[i].msgNum}:`, e);
      }
    }
    
    return emails;
  }

  private parseSingleFetch(data: string, imapUser: string): ParsedEmail | null {
    const email: ParsedEmail = {
      message_id: '',
      from_email: '',
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
      // Fallback: look for common headers directly
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
      // From - improved regex to handle folded headers
      const fromMatch = headers.match(/^From:\s*([\s\S]+?)(?=\r?\n(?:[A-Za-z-]+:|$))/mi);
      if (fromMatch) {
        const fromValue = decodeHeaderValue(fromMatch[1].replace(/\r?\n\s+/g, ' ').trim());
        const parsed = parseEmailAddress(fromValue);
        if (parsed.email) {
          email.from_email = parsed.email;
          email.from_name = parsed.name;
        }
      }

      // Subject - improved regex
      const subjectMatch = headers.match(/^Subject:\s*([\s\S]+?)(?=\r?\n(?:[A-Za-z-]+:|$))/mi);
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

    // Extract BODY[TEXT] section
    const textMatch = data.match(/BODY\[TEXT\]\s*\{(\d+)\}/i);
    if (textMatch) {
      const size = parseInt(textMatch[1]);
      const startIdx = data.indexOf(textMatch[0]) + textMatch[0].length;
      const textStart = data.indexOf('\n', startIdx) + 1;
      const bodyContent = data.substring(textStart, textStart + Math.min(size, 50000));
      
      // Parse the body content
      const parsedBody = parseBodyContent(bodyContent);
      email.body_text = parsedBody.text;
      email.body_html = parsedBody.html;
    }

    // Fallback for empty from_email - try alternative extraction
    if (!email.from_email || email.from_email === 'unknown@email.com') {
      // Try to find email in raw data
      const rawEmailMatch = data.match(/From:[^<]*<([^>]+@[^>]+)>/i);
      if (rawEmailMatch) {
        email.from_email = rawEmailMatch[1].toLowerCase().trim();
      } else {
        const simpleEmailMatch = data.match(/From:\s*([^\s<]+@[^\s>]+)/i);
        if (simpleEmailMatch) {
          email.from_email = simpleEmailMatch[1].toLowerCase().trim();
        } else {
          email.from_email = 'unknown@email.com';
        }
      }
    }

    // Clean up text - remove null characters
    email.body_text = cleanNullChars(email.body_text.substring(0, 10000));
    email.body_html = email.body_html ? cleanNullChars(email.body_html) : null;
    email.subject = email.subject ? cleanNullChars(email.subject) : null;
    email.from_name = email.from_name ? cleanNullChars(email.from_name) : null;
    
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

// Remove null characters and other problematic chars for PostgreSQL
function cleanNullChars(str: string): string {
  if (!str) return str;
  return str
    .replace(/\u0000/g, '')  // Remove null characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // Remove other control chars
}

// Decode MIME header value (=?charset?encoding?text?=)
function decodeHeaderValue(value: string): string {
  if (!value) return value;
  
  // Handle multiple encoded words that may be split across lines
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
  
  // Remove whitespace between encoded words
  result = result.replace(/\?=\s*=\?/g, '');
  
  return cleanNullChars(result.trim());
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

function decodeBase64UTF8(base64: string): string {
  try {
    const binary = atob(base64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    return base64;
  }
}

function decodeQuotedPrintable(str: string): string {
  let result = str.replace(/=\r?\n/g, '');
  result = result.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
  return decodeUTF8Bytes(result);
}

function parseEmailAddress(addr: string): { email: string | null; name: string | null } {
  addr = addr.trim();
  
  // Format: "Name" <email@domain.com>
  const match1 = addr.match(/^"?([^"<]+)"?\s*<([^>]+)>/);
  if (match1) {
    return { name: cleanNullChars(match1[1].trim()), email: cleanNullChars(match1[2].trim().toLowerCase()) };
  }
  
  // Format: <email@domain.com>
  const match2 = addr.match(/<([^>]+)>/);
  if (match2) {
    return { name: null, email: cleanNullChars(match2[1].trim().toLowerCase()) };
  }
  
  // Plain email
  if (addr.includes('@')) {
    return { name: null, email: cleanNullChars(addr.toLowerCase()) };
  }
  
  return { name: null, email: null };
}

function parseBodyContent(body: string): { text: string; html: string | null } {
  // Check if body starts with MIME boundary
  const boundaryStartMatch = body.match(/^--([A-Za-z0-9_.=-]+)\r?\n/);
  
  if (boundaryStartMatch) {
    return parseMultipart(body, boundaryStartMatch[1]);
  }
  
  // Check for Content-Type in body
  const boundaryMatch = body.match(/boundary="?([^"\s\r\n;]+)"?/i);
  if (boundaryMatch) {
    return parseMultipart(body, boundaryMatch[1]);
  }
  
  // Check if it's HTML
  if (body.includes('<html') || body.includes('<HTML') || 
      body.includes('<body') || body.includes('<BODY') ||
      body.includes('<!DOCTYPE html')) {
    return { text: cleanNullChars(stripHtml(body)), html: cleanNullChars(body) };
  }
  
  // Check for quoted-printable encoding
  const encodingMatch = body.match(/Content-Transfer-Encoding:\s*(\S+)/i);
  const encoding = encodingMatch ? encodingMatch[1].toLowerCase() : '';
  
  let decoded = body;
  if (encoding === 'quoted-printable') {
    decoded = decodeQuotedPrintable(body);
  } else if (encoding === 'base64') {
    decoded = decodeBase64UTF8(body);
  }
  
  return { text: cleanNullChars(cleanText(decoded)), html: null };
}

function parseMultipart(body: string, boundary: string): { text: string; html: string | null } {
  let plainText = '';
  let htmlText = '';
  
  const escapedBoundary = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = body.split(new RegExp(`--${escapedBoundary}(?:--)?`));
  
  for (const part of parts) {
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
  
  return { text: cleanNullChars(plainText.trim()), html: htmlText ? cleanNullChars(htmlText) : null };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

function cleanText(text: string): string {
  return text
    .replace(/Content-Type:[^\r\n]*\r?\n/gi, '')
    .replace(/Content-Transfer-Encoding:[^\r\n]*\r?\n/gi, '')
    .replace(/Content-Disposition:[^\r\n]*\r?\n/gi, '')
    .replace(/--[A-Za-z0-9_.=-]+(?:--)?/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
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
    // Fetch last 100 emails instead of 50
    const startMsg = Math.max(1, messageCount - 99);
    const fetchedEmails = await client.fetchEmails(startMsg, messageCount, config.imap_user);
    
    await client.logout();
    
    const emailsToInsert = fetchedEmails.map(email => ({
      user_id: config.user_id,
      message_id: `${config.imap_user}_${email.message_id}`,
      from_email: cleanNullChars(email.from_email || 'unknown@email.com'),
      from_name: email.from_name ? cleanNullChars(email.from_name) : null,
      to_email: cleanNullChars(email.to_email || config.imap_user),
      subject: email.subject ? cleanNullChars(email.subject) : null,
      body_text: email.body_text ? cleanNullChars(email.body_text.substring(0, 10000)) : null,
      body_html: email.body_html ? cleanNullChars(email.body_html) : null,
      received_at: email.received_at || new Date().toISOString(),
      is_read: email.is_read,
      is_starred: false,
      folder: 'INBOX',
      attachments: [],
    }));

    if (emailsToInsert.length > 0) {
      // Insert in batches to avoid issues
      const batchSize = 25;
      for (let i = 0; i < emailsToInsert.length; i += batchSize) {
        const batch = emailsToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabaseAdmin
          .from('received_emails')
          .upsert(batch, {
            onConflict: 'user_id,message_id',
            ignoreDuplicates: true
          });

        if (insertError) {
          console.error(`Error inserting batch ${i / batchSize + 1} for user ${config.user_id}:`, insertError);
        }
      }
    }

    await supabaseAdmin
      .from('imap_configurations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.id);

    console.log(`[SYNC] User ${config.user_id}: ${fetchedEmails.length} emails synced`);
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
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
