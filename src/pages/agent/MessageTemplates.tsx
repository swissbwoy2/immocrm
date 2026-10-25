import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DASH_CARD, DashPage, DashPageHeader, DashBadge } from "@/components/client/dashboard/DashPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Tpl {
  id: string;
  label: string;
  body: string;
  category: string | null;
  owner_user_id: string | null;
  use_count: number;
}

export default function MessageTemplates() {
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: "", body: "", category: "general" });

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data } = await supabase.from("message_templates").select("*").eq("is_active", true).order("category");
    setTpls((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.label.trim() || !draft.body.trim() || !userId) return;
    const { error } = await supabase.from("message_templates").insert({
      label: draft.label.trim(),
      body: draft.body.trim(),
      category: draft.category,
      owner_user_id: userId,
      created_by: userId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Modèle créé");
    setDraft({ label: "", body: "", category: "general" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce modèle ?")) return;
    const { error } = await supabase.from("message_templates").update({ is_active: false }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Modèle supprimé");
    load();
  };

  const personnels = tpls.filter(t => t.owner_user_id === userId);
  const agence = tpls.filter(t => t.owner_user_id === null);

  return (
    <DashPage className="max-w-4xl">
      <DashPageHeader title="Modèles de messages rapides" />

      <section className={`${DASH_CARD} mb-6 p-4 md:p-5`} aria-labelledby="tpl-new">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Plus className="h-[18px] w-[18px]" /></span>
          <h2 id="tpl-new" className="text-base font-semibold text-foreground">Nouveau modèle personnel</h2>
        </div>
        <div className="mt-4 space-y-3">
          <Input className="rounded-xl" placeholder="Libellé court (ex: Confirmation visite)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <Input className="rounded-xl" placeholder="Catégorie (ex: visite, dossier)" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          <Textarea
            className="rounded-xl"
            placeholder="Corps du message — variables disponibles: {{prenom}}, {{nom}}, {{adresse}}, {{date_visite}}"
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={4}
          />
          <Button className="rounded-full" onClick={create} disabled={!draft.label.trim() || !draft.body.trim()}>
            <Save className="h-4 w-4 mr-2" /> Enregistrer
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <h2 className="mb-3 text-base font-semibold text-foreground">Mes modèles personnels ({personnels.length})</h2>
          {personnels.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-6">Aucun modèle personnel.</p>
          ) : (
            <div className="space-y-2 mb-6">
              {personnels.map(t => (
                <div key={t.id} className={`${DASH_CARD} flex items-start justify-between gap-3 p-4`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{t.label}</span>
                      {t.category && <DashBadge tone="neutral">{t.category}</DashBadge>}
                      {t.use_count > 0 && <DashBadge tone="muted">utilisé {t.use_count}×</DashBadge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.body}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}

          <h2 className="mb-3 text-base font-semibold text-foreground">Modèles d'agence ({agence.length})</h2>
          <div className="space-y-2">
            {agence.map(t => (
              <div key={t.id} className={`${DASH_CARD} p-4`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{t.label}</span>
                  <DashBadge tone="primary">agence</DashBadge>
                  {t.category && <DashBadge tone="neutral">{t.category}</DashBadge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.body}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </DashPage>
  );
}
