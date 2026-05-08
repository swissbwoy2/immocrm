import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareText, Loader2 } from "lucide-react";

interface Tpl { id: string; label: string; body: string; category: string | null; }

interface Props {
  /** Variables disponibles pour interpolation: prenom, nom, adresse, date_visite */
  variables?: Record<string, string | undefined>;
  /** Appelé avec le texte interpolé prêt à insérer */
  onInsert: (text: string) => void;
}

export function MessageTemplatePicker({ variables, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("message_templates")
      .select("id, label, body, category")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("use_count", { ascending: false })
      .limit(100);
    setTpls((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (open && tpls.length === 0) load(); /* eslint-disable-next-line */ }, [open]);

  const apply = async (t: Tpl) => {
    let body = t.body;
    Object.entries(variables || {}).forEach(([k, v]) => {
      body = body.replaceAll(`{{${k}}}`, v ?? "");
    });
    // Nettoyer variables non remplacées
    body = body.replace(/\{\{[^}]+\}\}/g, "");
    onInsert(body);
    setOpen(false);
    // Incrémenter compteur d'usage (best effort, ignore errors)
    supabase.rpc("increment_template_usage", { tpl_id: t.id }).then(() => {}, () => {});
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" title="Insérer un modèle">
          <MessageSquareText className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b text-xs font-semibold">Modèles de réponse</div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : tpls.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">Aucun modèle. Créez-en dans Paramètres.</p>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="p-1">
              {tpls.map(t => (
                <button
                  key={t.id}
                  onClick={() => apply(t)}
                  className="w-full text-left px-2 py-2 rounded hover:bg-muted text-sm"
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{t.body}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
