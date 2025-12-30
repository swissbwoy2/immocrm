import { useState, useMemo } from 'react';
import { Mail, FileText, Code, Link2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface EmailViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  loading: boolean;
}

// Decode quoted-printable content
const decodeQuotedPrintable = (content: string): string => {
  if (!content) return '';
  
  // Remove soft line breaks
  let decoded = content.replace(/=\r?\n/g, '');
  
  // Decode hex characters
  decoded = decoded.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
  
  // Try to decode as UTF-8
  try {
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    return decoded;
  }
};

// Check if content looks like raw MIME
const looksLikeMime = (content: string): boolean => {
  if (!content) return false;
  const mimeIndicators = [
    'Content-Type:',
    'Content-Transfer-Encoding:',
    'boundary=',
    'This is a multi-part message',
    'MIME-Version:',
    '--===============',
    'Content-Disposition:'
  ];
  return mimeIndicators.some(indicator => content.includes(indicator));
};

// Sanitize HTML for safe rendering
const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  return html
    // Remove dangerous tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove event handlers
    .replace(/\son\w+\s*=/gi, ' data-removed=')
    // Remove javascript: urls
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
};

// Extract visible text from HTML
const stripHtml = (html: string): string => {
  if (!html) return '';
  
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

// Extract links from content
const extractLinks = (html: string, text: string): { url: string; label: string }[] => {
  const links: { url: string; label: string }[] = [];
  const seen = new Set<string>();
  
  // Extract from href attributes in HTML
  if (html) {
    const hrefRegex = /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const url = match[1];
      const label = match[2].trim() || url;
      if (url && !seen.has(url) && url.startsWith('http')) {
        seen.add(url);
        links.push({ url, label: label.substring(0, 80) });
      }
    }
  }
  
  // Extract URLs from text
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const textToSearch = html + ' ' + (text || '');
  let urlMatch;
  while ((urlMatch = urlRegex.exec(textToSearch)) !== null) {
    const url = urlMatch[0].replace(/[.,;:!?)]+$/, ''); // Remove trailing punctuation
    if (!seen.has(url)) {
      seen.add(url);
      links.push({ url, label: url.substring(0, 80) });
    }
  }
  
  return links.slice(0, 50); // Limit to 50 links
};

// Clean text content
const cleanTextContent = (text: string): string => {
  if (!text) return '';
  
  let cleaned = text;
  
  // Decode if needed
  if (cleaned.includes('=0A') || cleaned.includes('=E2') || cleaned.includes('=C3')) {
    cleaned = decodeQuotedPrintable(cleaned);
  }
  
  // Remove MIME headers
  cleaned = cleaned
    .replace(/^[\s\S]*?Content-Transfer-Encoding:\s*\S+[\r\n]+/i, '')
    .replace(/^Content-Type:[^\r\n]+[\r\n]+/gmi, '')
    .replace(/^MIME-Version:[^\r\n]+[\r\n]+/gmi, '')
    .replace(/--[A-Za-z0-9_.=-]+--?[\r\n]*/g, '') // Remove boundaries
    .replace(/boundary="[^"]+"/gi, '');
  
  // Clean up whitespace
  cleaned = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return cleaned;
};

export const EmailViewDialog = ({
  open,
  onOpenChange,
  subject,
  bodyHtml,
  bodyText,
  loading
}: EmailViewDialogProps) => {
  const [activeTab, setActiveTab] = useState('preview');
  
  const processedContent = useMemo(() => {
    const cleanedText = cleanTextContent(bodyText || '');
    const cleanedHtml = bodyHtml || '';
    
    // Check if HTML is usable
    const htmlIsMime = looksLikeMime(cleanedHtml);
    const htmlStripped = stripHtml(cleanedHtml);
    const htmlHasContent = htmlStripped.length > 50;
    
    // Decide best preview mode
    let previewMode: 'html' | 'text' | 'links' = 'text';
    let previewContent = cleanedText || 'Contenu non disponible';
    
    if (cleanedHtml && !htmlIsMime && htmlHasContent) {
      previewMode = 'html';
      previewContent = sanitizeHtml(cleanedHtml);
    } else if (cleanedText && cleanedText.length > 20) {
      previewMode = 'text';
      previewContent = cleanedText;
    }
    
    const links = extractLinks(cleanedHtml, cleanedText);
    
    return {
      html: sanitizeHtml(cleanedHtml),
      text: cleanedText,
      links,
      previewMode,
      previewContent,
      htmlIsMime,
      hasHtml: !!cleanedHtml && cleanedHtml.length > 0,
      hasText: !!cleanedText && cleanedText.length > 0
    };
  }, [bodyHtml, bodyText]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Contenu de l'email
          </DialogTitle>
          <DialogDescription className="text-base font-medium line-clamp-2">
            {subject || 'Sans sujet'}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="preview" className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Aperçu
              </TabsTrigger>
              <TabsTrigger value="html" className="flex items-center gap-1.5" disabled={!processedContent.hasHtml}>
                <Code className="h-4 w-4" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-1.5" disabled={!processedContent.hasText}>
                <FileText className="h-4 w-4" />
                Texte
              </TabsTrigger>
              <TabsTrigger value="links" className="flex items-center gap-1.5">
                <Link2 className="h-4 w-4" />
                Liens
                {processedContent.links.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {processedContent.links.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[60vh] mt-4">
              <TabsContent value="preview" className="m-0">
                {processedContent.previewMode === 'html' ? (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert p-4 bg-background"
                    dangerouslySetInnerHTML={{ __html: processedContent.previewContent }}
                  />
                ) : (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    {processedContent.previewContent ? (
                      <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">
                        {processedContent.previewContent}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>Contenu non disponible</p>
                        {processedContent.links.length > 0 && (
                          <p className="text-sm mt-1">Consultez l'onglet "Liens" pour accéder aux annonces</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="html" className="m-0">
                {processedContent.htmlIsMime ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
                    <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Le contenu HTML n'a pas pu être correctement extrait (format MIME brut)
                    </p>
                  </div>
                ) : null}
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert p-4 bg-background"
                  dangerouslySetInnerHTML={{ __html: processedContent.html || '<p>Aucun contenu HTML</p>' }}
                />
              </TabsContent>
              
              <TabsContent value="text" className="m-0">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">
                    {processedContent.text || 'Aucun contenu texte disponible'}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="links" className="m-0">
                {processedContent.links.length > 0 ? (
                  <div className="space-y-2 p-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      {processedContent.links.length} lien(s) trouvé(s) dans l'email
                    </p>
                    {processedContent.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border/50"
                      >
                        <p className="text-sm font-medium text-primary truncate">
                          {link.label}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {link.url}
                        </p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Link2 className="h-8 w-8 mb-2 opacity-50" />
                    <p>Aucun lien trouvé dans cet email</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
