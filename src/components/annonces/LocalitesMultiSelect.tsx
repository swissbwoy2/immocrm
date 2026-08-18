import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, X, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { searchLocalitesGoogle } from '@/lib/swissLocalities';

export interface LocaliteOption {
  /** Valeur utilisée pour filtrer (nom de ville, canton ou NPA) */
  value: string;
  /** Libellé affiché, ex. "Lausanne (ville)" */
  label: string;
  kind: 'ville' | 'npa' | 'canton';
}

interface Props {
  selected: LocaliteOption[];
  onChange: (next: LocaliteOption[]) => void;
  onAddNeighbours?: () => void;
  neighboursLoading?: boolean;
  className?: string;
  placeholder?: string;
}

export function parseLocalite(raw: string): LocaliteOption {
  const value = raw.trim();
  if (/^\d{4}$/.test(value)) return { value, label: `${value} (NPA)`, kind: 'npa' };
  return { value, label: `${value} (ville)`, kind: 'ville' };
}

export function LocalitesMultiSelect({
  selected,
  onChange,
  onAddNeighbours,
  neighboursLoading,
  className,
  placeholder = 'Ville, région ou code postal…',
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [googleSuggestions, setGoogleSuggestions] = useState<LocaliteOption[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoaded: mapsLoaded } = useGoogleMapsLoader();

  const { data: localites = [] } = useQuery({
    queryKey: ['localites-annonces'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<LocaliteOption[]> => {
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select('ville, code_postal, canton')
        .eq('statut', 'publie')
        .limit(5000);
      if (error) throw error;
      const map = new Map<string, LocaliteOption>();
      (data || []).forEach((r: any) => {
        if (r.ville) map.set(`v:${r.ville.toLowerCase()}`, { value: r.ville, label: `${r.ville} (ville)`, kind: 'ville' });
        if (r.code_postal) map.set(`n:${r.code_postal}`, { value: r.code_postal, label: `${r.code_postal} (NPA)`, kind: 'npa' });
        if (r.canton) map.set(`c:${r.canton.toLowerCase()}`, { value: r.canton, label: `${r.canton} (canton)`, kind: 'canton' });
      });
      return Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value, 'fr'));
    },
  });

  // Autocomplétion Google Places (toute la Suisse), debouncée
  useEffect(() => {
    const q = query.trim();
    if (!mapsLoaded || q.length < 2) {
      setGoogleSuggestions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await searchLocalitesGoogle(q);
        if (!cancelled) setGoogleSuggestions(res.map(({ value, label, kind }) => ({ value, label, kind })));
      } catch (e: any) {
        console.error('[Localités] Google Places autocomplete a échoué:', e?.message || e);
        if (!cancelled) setGoogleSuggestions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.clearTimeout(t);
    };
  }, [query, mapsLoaded]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(selected.map((s) => s.value.toLowerCase()));
    const local = localites.filter((l) => l.value.toLowerCase().includes(q) && !taken.has(l.value.toLowerCase()));
    const merged: LocaliteOption[] = [];
    const seen = new Set<string>();
    [...googleSuggestions, ...local].forEach((o) => {
      const k = o.value.toLowerCase();
      if (taken.has(k) || seen.has(k)) return;
      seen.add(k);
      merged.push(o);
    });
    return merged.slice(0, 10);
  }, [query, localites, selected, googleSuggestions]);

  const add = (opt: LocaliteOption) => {
    if (selected.some((s) => s.value.toLowerCase() === opt.value.toLowerCase())) return;
    onChange([...selected, opt]);
    setQuery('');
    setGoogleSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const remove = (value: string) => onChange(selected.filter((s) => s.value !== value));


  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          placeholder={selected.length ? 'Ajouter une localité…' : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              e.preventDefault();
              add(suggestions[0] ?? parseLocalite(query));
            }
            if (e.key === 'Backspace' && !query && selected.length) {
              remove(selected[selected.length - 1].value);
            }
          }}
          className="pl-9"
          aria-label="Localités"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}



        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <li key={`${s.kind}-${s.value}`}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer flex items-center gap-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(s)}
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(selected.length > 0 || onAddNeighbours) && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {selected.map((s) => (
            <Badge key={s.value} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
              {s.label}
              <button
                type="button"
                aria-label={`Retirer ${s.label}`}
                onClick={() => remove(s.value)}
                className="rounded-full p-0.5 hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {onAddNeighbours && selected.length > 0 && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-6 px-1 text-xs cursor-pointer"
              onClick={onAddNeighbours}
              disabled={neighboursLoading}
            >
              {neighboursLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              Ajouter des localités voisines
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
