import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  favicon_url: string | null;
}

interface LinkPreviewCardProps {
  url: string;
  showInline?: boolean;
  className?: string;
}

export function LinkPreviewCard({ url, showInline = false, className }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!url) {
        setLoading(false);
        setError(true);
        return;
      }

      try {
        setLoading(true);
        setError(false);
        
        const { data, error: fnError } = await supabase.functions.invoke('get-link-preview', {
          body: { url }
        });
        
        if (fnError) throw fnError;
        setPreview(data);
      } catch (e) {
        console.error('Error fetching preview:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  const hostname = url ? new URL(url).hostname : '';

  const PreviewContent = () => {
    if (loading) {
      return (
        <div className="flex gap-3 p-3">
          <Skeleton className="h-20 w-32 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      );
    }

    if (error || !preview) {
      return (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
          <span className="truncate">{hostname}</span>
        </a>
      );
    }

    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block hover:bg-muted/50 transition-colors rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3 p-3">
          {preview.image_url && !imageError ? (
            <img 
              src={preview.image_url} 
              alt={preview.title || 'Preview'}
              className="h-20 w-32 object-cover rounded-lg flex-shrink-0 bg-muted"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="h-20 w-32 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {preview.favicon_url && (
                <img 
                  src={preview.favicon_url} 
                  alt="" 
                  className="h-4 w-4"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <span className="text-xs text-muted-foreground truncate">
                {preview.site_name || hostname}
              </span>
            </div>
            <h4 className="font-medium text-sm line-clamp-2">
              {preview.title || 'Voir l\'annonce'}
            </h4>
            {preview.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {preview.description}
              </p>
            )}
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </a>
    );
  };

  // Inline mode (card displayed directly)
  if (showInline) {
    return (
      <Card className={cn("overflow-hidden border", className)}>
        <PreviewContent />
      </Card>
    );
  }

  // Hover card mode (preview on hover)
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("gap-2", className)}
          onClick={(e) => {
            e.stopPropagation();
            window.open(url, '_blank', 'noopener,noreferrer');
          }}
        >
          <ExternalLink className="h-4 w-4" />
          Voir l'annonce
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0" side="top">
        <PreviewContent />
      </HoverCardContent>
    </HoverCard>
  );
}
