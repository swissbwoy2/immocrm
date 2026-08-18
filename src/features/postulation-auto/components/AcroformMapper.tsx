import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STANDARD_FIELD_KEYS } from '../keys';
import type { FormulaireChamp, FormulaireLocation } from '../types';
import { FORM_BUCKET, fetchBytes } from '../lib/storage';
import { autoMapFieldName, detectAcroFields, type DetectedPdfField } from '../lib/acroform';
import { useFormulaireChamps } from '../hooks/useFormulaires';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Save, Search, Wand2 } from 'lucide-react';

const UNMAPPED = '__none__';

export default function AcroformMapper({ formulaire }: { formulaire: FormulaireLocation }) {
  const { champs, setChamps, reload } = useFormulaireChamps(formulaire.id);
  const [detected, setDetected] = useState<DetectedPdfField[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);

  useEffect(() => {
    (async () => {
      const bytes = await fetchBytes(FORM_BUCKET, formulaire.fichier_pdf_url);
      if (!bytes) { setDetected([]); return; }
      setDetected(await detectAcroFields(bytes));
    })();
  }, [formulaire.fichier_pdf_url]);

  const byName = useMemo(() => {
    const m = new Map<string, FormulaireChamp>();
    champs.forEach((c) => { if (c.nom_champ_pdf) m.set(c.nom_champ_pdf, c); });
    return m;
  }, [champs]);

  const setKeyFor = (f: DetectedPdfField, key: string) => {
    const value = key === UNMAPPED ? '' : key;
    setChamps((prev) => {
      const idx = prev.findIndex((c) => c.nom_champ_pdf === f.name);
      if (idx >= 0) return prev.map((c, i) => (i === idx ? { ...c, cle_champ: value } : c));
      return [
        ...prev,
        {
          id: `tmp-${f.name}`,
          formulaire_id: formulaire.id,
          cle_champ: value,
          page: 1,
          pos_x: 0, pos_y: 0, largeur: 0, hauteur: 0, taille_police: 10,
          alignement: 'left' as const,
          nom_champ_pdf: f.name,
          type_champ: f.type,
        },
      ];
    });
  };

  const runAutoMap = (force = false) => {
    if (!detected) return;
    let count = 0;
    detected.forEach((f) => {
      const current = byName.get(f.name);
      if (current?.cle_champ && !force) return;
      const { cle_champ } = autoMapFieldName(f.name);
      if (!cle_champ) return;
      setKeyFor(f, cle_champ);
      count++;
    });
    toast.success(count ? `${count} champ(s) mappé(s) automatiquement` : 'Aucun nouveau champ à mapper');
  };

  const save = async () => {
    if (!detected) return;
    setSaving(true);
    try {
      const rows = detected
        .map((f) => ({ f, c: champs.find((x) => x.nom_champ_pdf === f.name) }))
        .filter(({ c }) => c?.cle_champ)
        .map(({ f, c }) => ({
          formulaire_id: formulaire.id,
          cle_champ: c!.cle_champ,
          nom_champ_pdf: f.name,
          type_champ: f.type,
          option_valeur: c!.option_valeur ?? null,
          page: 1,
          pos_x: 0, pos_y: 0, largeur: 0, hauteur: 0, taille_police: 10, alignement: 'left',
        }));
      await supabase.from('formulaire_champs').delete().eq('formulaire_id', formulaire.id).not('nom_champ_pdf', 'is', null);
      if (rows.length) {
        const { error } = await supabase.from('formulaire_champs').insert(rows as any);
        if (error) throw error;
      }
      await reload();
      toast.success('Correspondances enregistrées');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const visible = (detected ?? []).filter((f) => {
    if (filter && !f.name.toLowerCase().includes(filter.toLowerCase())) return false;
    if (onlyUnmapped && byName.get(f.name)?.cle_champ) return false;
    return true;
  });

  const mappedCount = (detected ?? []).filter((f) => byName.get(f.name)?.cle_champ).length;

  if (!detected) {
    return <div className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analyse du PDF…</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">Champs natifs (AcroForm)</Badge>
        <Badge variant="secondary">{mappedCount}/{detected.length} mappés</Badge>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Rechercher un champ…" className="pl-8" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setOnlyUnmapped((v) => !v)}>
          {onlyUnmapped ? 'Tous' : 'À mapper'}
        </Button>
        <Button variant="secondary" size="sm" className="gap-1" onClick={() => runAutoMap(false)}>
          <Wand2 className="h-3.5 w-3.5" /> Auto-mapper
        </Button>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => runAutoMap(true)}>
          <RefreshCw className="h-3.5 w-3.5" /> Tout recalculer
        </Button>
        <Button size="sm" onClick={save} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Enregistrer
        </Button>
      </div>

      <div className="rounded-lg border divide-y">
        {visible.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {detected.length === 0 ? "Ce PDF ne contient pas de champs de formulaire." : 'Aucun champ ne correspond au filtre.'}
          </p>
        )}
        {visible.map((f) => {
          const champ = byName.get(f.name);
          const suggestion = autoMapFieldName(f.name);
          return (
            <div key={f.name} className="grid gap-2 p-3 sm:grid-cols-[1fr_260px] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {f.type}{f.options?.length ? ` • options : ${f.options.join(', ')}` : ''}
                  {suggestion.incertain && suggestion.cle_champ ? ' • correspondance à vérifier' : ''}
                </p>
              </div>
              <div className="space-y-1.5">
                <Select value={champ?.cle_champ || UNMAPPED} onValueChange={(v) => setKeyFor(f, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={UNMAPPED}>— À mapper —</SelectItem>
                    {STANDARD_FIELD_KEYS.map((k) => (
                      <SelectItem key={k.key} value={k.key}>{k.groupe} — {k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(f.type === 'radio' || f.type === 'checkbox' || f.type === 'dropdown') && champ?.cle_champ && (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Option à cocher (laisser vide = auto)</Label>
                    <Input
                      value={champ.option_valeur ?? ''}
                      placeholder={f.options?.[0] ?? 'Yes'}
                      onChange={(e) =>
                        setChamps((prev) => prev.map((c) => (c.nom_champ_pdf === f.name ? { ...c, option_valeur: e.target.value } : c)))
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] leading-4 text-muted-foreground">
        Les champs e-mail et téléphone (titulaire comme co-titulaire) sont toujours remplis avec les coordonnées de l'agent connecté.
      </p>
    </div>
  );
}
