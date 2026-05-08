import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">📝 Modèles de messages rapides</h1>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Nouveau modèle personnel</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Libellé court (ex: Confirmation visite)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <Input placeholder="Catégorie (ex: visite, dossier)" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          <Textarea
            placeholder="Corps du message — variables disponibles: {{prenom}}, {{nom}}, {{adresse}}, {{date_visite}}"
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={4}
          />
          <Button onClick={create} disabled={!draft.label.trim() || !draft.body.trim()}>
            <Save className="h-4 w-4 mr-2" /> Enregistrer
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
      ) : (
        <>
          <h2 className="text-lg font-semibold mb-3">Mes modèles personnels ({personnels.length})</h2>
          {personnels.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-6">Aucun modèle personnel.</p>
          ) : (
            <div className="space-y-2 mb-6">
              {personnels.map(t => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{t.label}</span>
                        {t.category && <Badge variant="outline" className="text-[10px]">{t.category}</Badge>}
                        {t.use_count > 0 && <Badge variant="secondary" className="text-[10px]">utilisé {t.use_count}×</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.body}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <h2 className="text-lg font-semibold mb-3">Modèles d'agence ({agence.length})</h2>
          <div className="space-y-2">
            {agence.map(t => (
              <Card key={t.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{t.label}</span>
                    <Badge variant="default" className="text-[10px]">agence</Badge>
                    {t.category && <Badge variant="outline" className="text-[10px]">{t.category}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
