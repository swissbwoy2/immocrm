import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceDictationButton } from "@/components/VoiceDictationButton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Send, Save, X, Plus, Image as ImageIcon, Video, FileText } from "lucide-react";

type Media = { url: string; type: string; name: string; size: number };

export default function CompteRenduVisite({
  role = "agent",
  visiteId,
  embedded = false,
  onSent,
}: {
  role?: "agent" | "coursier";
  /** Force l'id de visite (usage embarqué dans un dialog) au lieu de l'URL */
  visiteId?: string;
  /** Masque le bouton retour et le container plein écran */
  embedded?: boolean;
  onSent?: () => void;
} = {}) {
  const params = useParams<{ id: string }>();
  const id = visiteId ?? params.id;
  const navigate = useNavigate();

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [visite, setVisite] = useState<any>(null);
  const [crId, setCrId] = useState<string | null>(null);
  const [appreciation, setAppreciation] = useState("");
  const [etat, setEtat] = useState("");
  const [interet, setInteret] = useState("");
  const [pointsForts, setPointsForts] = useState<string[]>([]);
  const [pointsFaibles, setPointsFaibles] = useState<string[]>([]);
  const [pointFortInput, setPointFortInput] = useState("");
  const [pointFaibleInput, setPointFaibleInput] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [prochainesEtapes, setProchainesEtapes] = useState("");
  const [medias, setMedias] = useState<Media[]>([]);
  const [envoyeAt, setEnvoyeAt] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: v } = await supabase
        .from("visites")
        .select("id, adresse, date_visite, client_id, agent_id, offre_id")
        .eq("id", id)
        .maybeSingle();
      setVisite(v);
      const { data: cr } = await supabase
        .from("visite_comptes_rendus")
        .select("*")
        .eq("visite_id", id)
        .maybeSingle();
      if (cr) {
        setCrId(cr.id);
        setAppreciation(cr.appreciation_globale || "");
        setEtat(cr.etat_general || "");
        setInteret(cr.interet_client || "");
        setPointsForts(cr.points_forts || []);
        setPointsFaibles(cr.points_faibles || []);
        setCommentaire(cr.commentaire_libre || "");
        setProchainesEtapes(cr.prochaines_etapes || "");
        setMedias(((cr.medias as any) || []) as Media[]);
        setEnvoyeAt(cr.envoye_au_client_at);
      }
      setLoading(false);
    })();
  }, [id]);

  const upsertCR = async (extra: Partial<Record<string, any>> = {}) => {
    if (!visite) return null;
    const payload = {
      visite_id: visite.id,
      client_id: visite.client_id,
      agent_id: visite.agent_id,
      offre_id: visite.offre_id,
      appreciation_globale: appreciation || null,
      etat_general: etat || null,
      interet_client: interet || null,
      points_forts: pointsForts,
      points_faibles: pointsFaibles,
      commentaire_libre: commentaire || null,
      prochaines_etapes: prochainesEtapes || null,
      medias: medias as any,
      ...extra,
    };
    const { data: { user } } = await supabase.auth.getUser();
    if (crId) {
      const { error } = await supabase.from("visite_comptes_rendus").update(payload).eq("id", crId);
      if (error) throw error;
      return crId;
    } else {
      const { data, error } = await supabase
        .from("visite_comptes_rendus")
        .insert({ ...payload, created_by: user?.id })
        .select("id")
        .single();
      if (error) throw error;
      setCrId(data.id);
      return data.id;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertCR();
      toast({ title: "Brouillon enregistré" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!visite) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${visite.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("visite-medias").upload(path, file);
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("visite-medias")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      const url = signed?.signedUrl || supabase.storage.from("visite-medias").getPublicUrl(path).data.publicUrl;
      const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document";
      setMedias((m) => [...m, { url, type, name: file.name, size: file.size }]);
      toast({ title: "Média ajouté" });
    } catch (e: any) {
      toast({ title: "Erreur upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!visite?.client_id) {
      toast({ title: "Pas de client lié à cette visite", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const id = await upsertCR();

      if (role === "coursier") {
        const { error } = await supabase.functions.invoke("coursier-send-compte-rendu", {
          body: { visite_id: visite.id },
        });
        if (error) throw error;
        setEnvoyeAt(new Date().toISOString());
        toast({ title: "Compte-rendu envoyé au client", description: "Le client reçoit le récap, la vidéo et les fichiers dans son espace." });
        onSent?.();
        return;

      }

      // Build récap text
      const lines: string[] = [];
      lines.push(`Compte-rendu de la visite — ${visite.adresse}`);
      if (appreciation) lines.push(`• Appréciation : ${labelAppreciation(appreciation)}`);
      if (etat) lines.push(`• État : ${labelEtat(etat)}`);
      if (interet) lines.push(`• Votre intérêt : ${labelInteret(interet)}`);
      if (pointsForts.length) lines.push(`• Points forts : ${pointsForts.join(", ")}`);
      if (pointsFaibles.length) lines.push(`• Points faibles : ${pointsFaibles.join(", ")}`);
      if (commentaire) lines.push(`\n${commentaire}`);
      if (prochainesEtapes) lines.push(`\nProchaines étapes : ${prochainesEtapes}`);
      const recap = lines.join("\n");

      // Find or create conversation client-agent
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", String(visite.client_id))
        .eq("agent_id", String(visite.agent_id))
        .eq("conversation_type", "client-agent")
        .maybeSingle();
      let conversationId = conv?.id;
      if (!conversationId) {
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            client_id: String(visite.client_id),
            agent_id: String(visite.agent_id),
            conversation_type: "client-agent",
            subject: `Compte-rendu visite ${visite.adresse}`,
          })
          .select("id")
          .single();
        if (convErr) throw convErr;
        conversationId = newConv.id;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Insert main recap message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user?.id,
        sender_type: "agent",
        content: recap,
      });

      // For each media, insert a separate message so trigger sends them to WhatsApp natively
      for (const m of medias) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user?.id,
          sender_type: "agent",
          content: m.name,
          attachment_url: m.url,
          attachment_type: m.type,
          attachment_name: m.name,
          attachment_size: m.size,
        });
      }

      await supabase
        .from("visite_comptes_rendus")
        .update({ envoye_au_client_at: new Date().toISOString(), wa_envoye_at: new Date().toISOString() })
        .eq("id", id!);

      setEnvoyeAt(new Date().toISOString());
      toast({ title: "Compte-rendu envoyé au client", description: "Le client recevra le récap + médias dans la messagerie et sur WhatsApp." });
      onSent?.();
    } catch (e: any) {
      toast({ title: "Erreur envoi", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
  }
  if (!visite) {
    return <div className="p-6">Visite introuvable.</div>;
  }

  return (
    <div className={embedded ? "space-y-4" : "container max-w-3xl mx-auto p-4 space-y-4 pb-24"}>
      <div className="flex items-center justify-between">
        {embedded ? <span /> : (
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        )}
        {envoyeAt && <Badge variant="secondary">Envoyé au client</Badge>}
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Compte-rendu de visite</CardTitle>
          <p className="text-sm text-muted-foreground">{visite.adresse}</p>
          <p className="text-xs text-muted-foreground">{new Date(visite.date_visite).toLocaleString("fr-CH", { timeZone: "Europe/Zurich" })}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Appréciation globale</Label>
              <Select value={appreciation} onValueChange={setAppreciation}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tres_positif">Très positif</SelectItem>
                  <SelectItem value="positif">Positif</SelectItem>
                  <SelectItem value="mitige">Mitigé</SelectItem>
                  <SelectItem value="negatif">Négatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>État du bien</Label>
              <Select value={etat} onValueChange={setEtat}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="bon">Bon</SelectItem>
                  <SelectItem value="moyen">Moyen</SelectItem>
                  <SelectItem value="a_renover">À rénover</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Intérêt du client</Label>
              <Select value={interet} onValueChange={setInteret}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tres_interesse">Très intéressé</SelectItem>
                  <SelectItem value="interesse">Intéressé</SelectItem>
                  <SelectItem value="hesitant">Hésitant</SelectItem>
                  <SelectItem value="non_interesse">Non intéressé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ChipList
            label="Points forts"
            items={pointsForts}
            input={pointFortInput}
            setInput={setPointFortInput}
            onAdd={(v) => { setPointsForts([...pointsForts, v]); setPointFortInput(""); }}
            onRemove={(i) => setPointsForts(pointsForts.filter((_, idx) => idx !== i))}
          />
          <ChipList
            label="Points faibles"
            items={pointsFaibles}
            input={pointFaibleInput}
            setInput={setPointFaibleInput}
            onAdd={(v) => { setPointsFaibles([...pointsFaibles, v]); setPointFaibleInput(""); }}
            onRemove={(i) => setPointsFaibles(pointsFaibles.filter((_, idx) => idx !== i))}
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Commentaire libre</Label>
              <VoiceDictationButton onTranscript={(t) => setCommentaire(t)} />
            </div>
            <Textarea rows={4} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Vos observations détaillées sur le bien... (ou utilisez le bouton 🎙️ Dicter)" />
          </div>
          <div>
            <Label>Prochaines étapes</Label>
            <Textarea rows={2} value={prochainesEtapes} onChange={(e) => setProchainesEtapes(e.target.value)} placeholder="Ce qu'on fait après cette visite..." />
          </div>

          <div className="space-y-2">
            <Label>Photos & vidéos du bien</Label>
            <div className="flex flex-wrap gap-2">
              {medias.map((m, i) => (
                <div key={i} className="relative w-24 h-24 border rounded overflow-hidden bg-muted">
                  {m.type === "image" ? (
                    <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                  ) : m.type === "video" ? (
                    <div className="flex flex-col items-center justify-center h-full text-xs"><Video className="h-6 w-6" /><span className="truncate w-full px-1">{m.name}</span></div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-xs"><FileText className="h-6 w-6" /><span className="truncate w-full px-1">{m.name}</span></div>
                  )}
                  <button onClick={() => setMedias(medias.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-background/80 rounded-bl p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer text-xs text-muted-foreground hover:border-primary">
                {uploading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Plus className="h-5 w-5 mb-1" /><span>Caméra</span></>}
                <input
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
                />
              </label>
              <label className="w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer text-xs text-muted-foreground hover:border-primary">
                <ImageIcon className="h-5 w-5 mb-1" /><span>Galerie</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(handleUpload);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 sticky bottom-4">
        <Button variant="outline" onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer brouillon
        </Button>
        <Button onClick={handleSend} disabled={sending} className="flex-1">
          {sending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          {envoyeAt ? "Renvoyer au client" : "Envoyer au client"}
        </Button>
      </div>
    </div>
  );
}

function labelAppreciation(v: string) {
  return ({ tres_positif: "Très positif", positif: "Positif", mitige: "Mitigé", negatif: "Négatif" } as any)[v] || v;
}
function labelEtat(v: string) {
  return ({ excellent: "Excellent", bon: "Bon", moyen: "Moyen", a_renover: "À rénover" } as any)[v] || v;
}
function labelInteret(v: string) {
  return ({ tres_interesse: "Très intéressé", interesse: "Intéressé", hesitant: "Hésitant", non_interesse: "Non intéressé" } as any)[v] || v;
}

function ChipList({ label, items, input, setInput, onAdd, onRemove }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { e.preventDefault(); onAdd(input.trim()); } }}
          placeholder="Ajouter et appuyer sur Entrée"
        />
        <Button type="button" variant="outline" onClick={() => input.trim() && onAdd(input.trim())}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {items.map((it: string, i: number) => (
          <Badge key={i} variant="secondary" className="gap-1">
            {it}
            <button onClick={() => onRemove(i)}><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
