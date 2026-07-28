import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Save, ClipboardList, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { getOrCreateClientConversation } from '@/lib/clientConversation';

export interface CompteRenduPayload {
  ascenseur: 'oui' | 'non' | '';
  type_sol: string;
  etat_general: string;
  avantages: string;
  inconvenients: string;
  contact_regie: string;
  autres_infos: string;
}

const EMPTY: CompteRenduPayload = {
  ascenseur: '',
  type_sol: '',
  etat_general: '',
  avantages: '',
  inconvenients: '',
  contact_regie: '',
  autres_infos: '',
};

interface Props {
  visite: any; // has id, adresse, date_visite, agent_id, compte_rendu, compte_rendu_at
  visitesGroup?: any[]; // optional — same address+date group
  onSaved?: () => void;
}

function buildMessageContent(adresse: string, cr: CompteRenduPayload): string {
  const lines: string[] = [];
  lines.push('📋 Compte-rendu de la visite');
  lines.push(`📍 ${adresse}`);
  if (cr.ascenseur) lines.push(`🛗 Ascenseur : ${cr.ascenseur === 'oui' ? 'Oui' : 'Non'}`);
  if (cr.type_sol.trim()) lines.push(`🧱 Sol : ${cr.type_sol.trim()}`);
  if (cr.etat_general.trim()) lines.push(`🏠 État : ${cr.etat_general.trim()}`);
  if (cr.avantages.trim()) lines.push(`👍 Avantages : ${cr.avantages.trim()}`);
  if (cr.inconvenients.trim()) lines.push(`👎 Inconvénients : ${cr.inconvenients.trim()}`);
  if (cr.contact_regie.trim()) lines.push(`🏢 Régie : ${cr.contact_regie.trim()}`);
  if (cr.autres_infos.trim()) lines.push(`📝 ${cr.autres_infos.trim()}`);
  lines.push("L'équipe Immo-rama.ch");
  return lines.join('\n');
}

export function VisitCompteRenduForm({ visite, visitesGroup, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<CompteRenduPayload>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const existing = (visite?.compte_rendu ?? null) as Partial<CompteRenduPayload> | null;
    if (existing && typeof existing === 'object') {
      setForm({ ...EMPTY, ...existing });
    } else {
      setForm(EMPTY);
    }
    setSavedAt(visite?.compte_rendu_at ?? null);
  }, [visite?.id]);

  const update = <K extends keyof CompteRenduPayload>(k: K, v: CompteRenduPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!user || !visite?.id) return;
    setSaving(true);
    try {
      // 1. Resolve group of visites (same address + date_visite)
      let group = visitesGroup && visitesGroup.length > 0 ? visitesGroup : null;
      if (!group) {
        const { data } = await supabase
          .from('visites')
          .select('id, client_id, agent_id, adresse, date_visite, offre_id')
          .eq('adresse', visite.adresse)
          .eq('date_visite', visite.date_visite);
        group = data && data.length > 0 ? data : [visite];
      }

      const nowIso = new Date().toISOString();

      // 2. Write compte_rendu on every visite in the group
      for (const v of group) {
        try {
          await supabase
            .from('visites')
            .update({ compte_rendu: form as any, compte_rendu_at: nowIso } as any)
            .eq('id', v.id);
        } catch (e) {
          console.warn('[CompteRendu] update failed for visite', v.id, e);
        }

        // Auto-advance offre status → 'visite_effectuee' (only from 'envoyee' or 'interesse')
        const offreId = (v as any).offre_id ?? visite.offre_id;
        if (offreId) {
          try {
            const { data: off } = await supabase
              .from('offres').select('statut').eq('id', offreId).maybeSingle();
            if (off && (off.statut === 'envoyee' || off.statut === 'interesse')) {
              await supabase.from('offres').update({ statut: 'visite_effectuee' }).eq('id', offreId);
            }
          } catch (e) { console.warn('[CompteRendu] offre statut update failed', e); }
        }
      }

      // 3. For each unique client, insert one message in their conversation
      const uniqueClients = Array.from(
        new Map(group.filter((v: any) => v.client_id).map((v: any) => [v.client_id, v])).values(),
      );

      const messageContent = buildMessageContent(visite.adresse || 'Bien visité', form);

      let successCount = 0;
      let failureCount = 0;

      for (const v of uniqueClients) {
        try {
          const clientId = v.client_id;
          const convId = await getOrCreateClientConversation(clientId);
          if (!convId) { failureCount += 1; continue; }

          await supabase.from('messages').insert({
            conversation_id: convId,
            sender_id: user.id,
            sender_type: 'agent',
            content: messageContent,
            offre_id: v.offre_id ?? visite.offre_id ?? null,
            payload: {
              type: 'visite_compte_rendu',
              visite_id: v.id,
              offre_id: v.offre_id ?? visite.offre_id ?? null,
              compte_rendu: form,
            } as any,
          });
          successCount += 1;
        } catch (perClientErr) {
          failureCount += 1;
          console.warn('[CompteRendu] send to client failed (non-blocking)', perClientErr);
        }
      }

      setSavedAt(nowIso);
      const recap = failureCount > 0
        ? `Compte-rendu envoyé à ${successCount} client(s) (${failureCount} échec${failureCount > 1 ? 's' : ''})`
        : `Compte-rendu envoyé à ${successCount} client(s)`;
      if (failureCount > 0 && successCount === 0) toast.error(recap);
      else toast.success(recap);
      onSaved?.();
    } catch (err: any) {
      console.error('[CompteRendu] save error', err);
      toast.error(err?.message || 'Erreur lors de la sauvegarde du compte-rendu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 border border-primary/20 rounded-lg p-4 bg-muted/30">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h4 className="font-semibold">Compte-rendu de la visite</h4>
        {savedAt && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" /> Enregistré
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Ascenseur</Label>
          <RadioGroup
            value={form.ascenseur}
            onValueChange={(v) => update('ascenseur', v as 'oui' | 'non')}
            className="flex gap-4"
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="oui" id="asc-oui" /> Oui
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="non" id="asc-non" /> Non
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cr-sol">Type de sol</Label>
          <Input
            id="cr-sol"
            placeholder="parquet, carrelage…"
            value={form.type_sol}
            onChange={(e) => update('type_sol', e.target.value)}
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="cr-etat">État général</Label>
          <Input
            id="cr-etat"
            placeholder="neuf, rénové, ancien…"
            value={form.etat_general}
            onChange={(e) => update('etat_general', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cr-plus">Avantages</Label>
          <Textarea
            id="cr-plus"
            rows={3}
            value={form.avantages}
            onChange={(e) => update('avantages', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cr-moins">Inconvénients</Label>
          <Textarea
            id="cr-moins"
            rows={3}
            value={form.inconvenients}
            onChange={(e) => update('inconvenients', e.target.value)}
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="cr-regie">Contact régie</Label>
          <Input
            id="cr-regie"
            placeholder="Nom + téléphone / email"
            value={form.contact_regie}
            onChange={(e) => update('contact_regie', e.target.value)}
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="cr-autres">Autres informations</Label>
          <Textarea
            id="cr-autres"
            rows={2}
            value={form.autres_infos}
            onChange={(e) => update('autres_infos', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          💾 Enregistrer et envoyer au client
        </Button>
      </div>
    </div>
  );
}
