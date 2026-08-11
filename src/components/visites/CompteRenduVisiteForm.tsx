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
import { getOrCreateClientConversation } from "@/lib/clientConversation";
import { ArrowLeft, Loader2, Send, Save, X, Plus, Image as ImageIcon, Video, FileText } from "lucide-react";

type Media = { url: string; type: string; name: string; size: number };

export type CompteRenduRole = "admin" | "agent" | "coursier";

const CUISINE_OPTIONS = [
  { value: "agencee", label: "Agencée" },
  { value: "equipee", label: "Équipée" },
  { value: "simple", label: "Simple" },
  { value: "a_renover", label: "À rénover" },
];

export function labelAppreciation(v: string) {
  return ({ tres_positif: "Très positif", positif: "Positif", mitige: "Mitigé", negatif: "Négatif" } as any)[v] || v;
}
export function labelEtat(v: string) {
  return ({ excellent: "Excellent", bon: "Bon", moyen: "Moyen", a_renover: "À rénover" } as any)[v] || v;
}
export function labelInteret(v: string) {
  return ({ tres_interesse: "Très intéressé", interesse: "Intéressé", hesitant: "Hésitant", non_interesse: "Non intéressé" } as any)[v] || v;
}
export function labelCuisine(v: string) {
  return CUISINE_OPTIONS.find((o) => o.value === v)?.label || v;
}

/** Yes / No / unset tri-state selector */
function BoolSelect({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Select
        value={value === null || value === undefined ? "" : value ? "oui" : "non"}
        onValueChange={(v) => onChange(v === "oui" ? true : v === "non" ? false : null)}
      >
        <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="oui">Oui</SelectItem>
          <SelectItem value="non">Non</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Formulaire de compte-rendu de visite PARTAGÉ entre admin, agent et coursier.
 * Toujours stocké dans `visite_comptes_rendus`.
 */
export default function CompteRenduVisiteForm({
  role = "agent",
  visiteId,
  embedded = false,
  onSent,
}: {
  role?: CompteRenduRole;
  visiteId?: string;
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
  const [cuisineType, setCuisineType] = useState("");
  const [cuisineDescription, setCuisineDescription] = useState("");
  const [ascenseur, setAscenseur] = useState<boolean | null>(null);
  const [balcon, setBalcon] = useState<boolean | null>(null);
  const [parking, setParking] = useState<boolean | null>(null);
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
    setLoading(true);
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
        const c: any = cr;
        setCrId(c.id);
        setAppreciation(c.appreciation_globale || "");
        setEtat(c.etat_general || "");
        setInteret(c.interet_client || "");
        setCuisineType(c.cuisine_type || "");
        setCuisineDescription(c.cuisine_description || "");
        setAscenseur(c.ascenseur ?? null);
        setBalcon(c.balcon ?? null);
        setParking(c.parking ?? null);
        setPointsForts(c.points_forts || []);
        setPointsFaibles(c.points_faibles || []);
        setCommentaire(c.commentaire_libre || "");
        setProchainesEtapes(c.prochaines_etapes || "");
        setMedias(((c.medias as any) || []) as Media[]);
        setEnvoyeAt(c.envoye_au_client_at);
      } else {
        setCrId(null);
        setEnvoyeAt(null);
      }
      setLoading(false);
    })();
  }, [id]);

  const buildPayload = () => ({
    appreciation_globale: appreciation || null,
    etat_general: etat || null,
    interet_client: interet || null,
    cuisine_type: cuisineType || null,
    cuisine_description: cuisineDescription || null,
    ascenseur,
    balcon,
    parking,
    points_forts: pointsForts,
    points_faibles: pointsFaibles,
    commentaire_libre: commentaire || null,
    prochaines_etapes: prochainesEtapes || null,
    medias: medias as any,
  });

  const upsertCR = async (extra: Partial<Record<string, any>> = {}) => {
    if (!visite) return null;
    const payload: any = {
      visite_id: visite.id,
      client_id: visite.client_id,
      agent_id: visite.agent_id,
      offre_id: visite.offre_id,
      ...buildPayload(),
      ...extra,
    };
    const { data: { user } } = await supabase.auth.getUser();
    if (crId) {
      const { error } = await supabase.from("visite_comptes_rendus").update(payload).eq("id", crId);
      if (error) throw error;
      return crId;
    }
    const { data, error } = await supabase
      .from("visite_comptes_rendus")
      .insert({ ...payload, created_by: user?.id })
      .select("id")
      .single();
    if (error) throw error;
    setCrId(data.id);
    return data.id;
  };

  /** Toutes les visites de la même visite physique (adresse + horaire + agent) */
  const loadGroup = async () => {
    if (!visite) return [] as any[];
    const { data } = await supabase
      .from("visites")
      .select("id, adresse, date_visite, client_id, agent_id, offre_id")
      .eq("adresse", visite.adresse)
      .eq("date_visite", visite.date_visite)
      .eq("agent_id", visite.agent_id);
    const rows = (data && data.length > 0 ? data : [visite]) as any[];
    return rows.filter((v) => v.client_id);
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
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || supabase.storage.from("visite-medias").getPublicUrl(path).data.publicUrl;
      const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document";
      setMedias((m) => [...m, { url, type, name: file.name, size: file.size }]);
      toast({ title: "Fichier ajouté" });
    } catch (e: any) {
      toast({ title: "Erreur upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const buildRecap = () => {
    const lines: string[] = [];
    lines.push(`📋 Compte-rendu de la visite — ${visite.adresse}`);
    if (appreciation) lines.push(`• Appréciation : ${labelAppreciation(appreciation)}`);
    if (etat) lines.push(`• État : ${labelEtat(etat)}`);
    if (interet) lines.push(`• Intérêt : ${labelInteret(interet)}`);
    if (cuisineType) lines.push(`• Cuisine : ${labelCuisine(cuisineType)}`);
    if (cuisineDescription) lines.push(`• Détail cuisine : ${cuisineDescription}`);
    if (ascenseur !== null) lines.push(`• Ascenseur : ${ascenseur ? "Oui" : "Non"}`);
    if (balcon !== null) lines.push(`• Balcon / terrasse : ${balcon ? "Oui" : "Non"}`);
    if (parking !== null) lines.push(`• Parking : ${parking ? "Oui" : "Non"}`);
    if (pointsForts.length) lines.push(`• Points forts : ${pointsForts.join(", ")}`);
    if (pointsFaibles.length) lines.push(`• Points faibles : ${pointsFaibles.join(", ")}`);
    if (commentaire) lines.push(`\n${commentaire}`);
    if (prochainesEtapes) lines.push(`\nProchaines étapes : ${prochainesEtapes}`);
    lines.push("\nL'équipe Immo-rama.ch");
    return lines.join("\n");
  };

  const handleSend = async () => {
    if (!visite?.client_id) {
      toast({ title: "Pas de client lié à cette visite", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await upsertCR();

      if (role === "coursier") {
        const { error } = await supabase.functions.invoke("coursier-send-compte-rendu", {
          body: { visite_id: visite.id },
        });
        if (error) throw error;
        setEnvoyeAt(new Date().toISOString());
        toast({ title: "Compte-rendu envoyé au client" });
        onSent?.();
        return;
      }

      const nowIso = new Date().toISOString();
      const recap = buildRecap();
      const group = await loadGroup();
      const { data: { user } } = await supabase.auth.getUser();

      // Un seul CR + un seul message par client de la visite physique
      const seenClients = new Set<string>();
      let sent = 0;
      for (const v of group) {
        if (seenClients.has(v.client_id)) continue;
        seenClients.add(v.client_id);

        // 1) CR enregistré pour CHAQUE client (visible dans son espace)
        try {
          const { data: existing } = await supabase
            .from("visite_comptes_rendus")
            .select("id")
            .eq("visite_id", v.id)
            .maybeSingle();
          const row: any = {
            visite_id: v.id,
            client_id: v.client_id,
            agent_id: v.agent_id ?? visite.agent_id,
            offre_id: v.offre_id ?? null,
            ...buildPayload(),
            envoye_au_client_at: nowIso,
          };
          if (existing?.id) {
            await supabase.from("visite_comptes_rendus").update(row).eq("id", existing.id);
          } else {
            await supabase.from("visite_comptes_rendus").insert({ ...row, created_by: user?.id });
          }
        } catch (e) {
          console.warn("[CompteRendu] upsert CR échoué pour la visite", v.id, e);
        }

        // 2) Message dans LA conversation unique du client
        try {
          const conversationId = await getOrCreateClientConversation(v.client_id);
          if (!conversationId) continue;

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: user?.id,
            sender_type: "agent",
            content: recap,
            offre_id: v.offre_id ?? null,
            payload: {
              type: "visite_compte_rendu",
              visite_id: v.id,
              medias,
            } as any,
          } as any);

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
            } as any);
          }

          await supabase
            .from("conversations")
            .update({ last_message_at: nowIso })
            .eq("id", conversationId);
          sent += 1;
        } catch (e) {
          console.warn("[CompteRendu] envoi client échoué", v.client_id, e);
        }
      }

      setEnvoyeAt(nowIso);
      toast({
        title: `Compte-rendu envoyé à ${sent} client(s)`,
        description: "Disponible dans leur messagerie et dans « Visite effectuée par votre agent ».",
      });
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
          <p className="text-xs text-muted-foreground">
            {new Date(visite.date_visite).toLocaleString("fr-CH", { timeZone: "Europe/Zurich" })}
          </p>
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

          {/* Caractéristiques du bien */}
          <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
            <Label className="text-sm font-semibold">Caractéristiques du bien</Label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Cuisine</Label>
                <Select value={cuisineType} onValueChange={setCuisineType}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {CUISINE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <BoolSelect label="Ascenseur" value={ascenseur} onChange={setAscenseur} />
              <BoolSelect label="Balcon / terrasse" value={balcon} onChange={setBalcon} />
              <BoolSelect label="Parking" value={parking} onChange={setParking} />
            </div>
            <div>
              <Label>Description de la cuisine</Label>
              <Textarea
                rows={2}
                value={cuisineDescription}
                onChange={(e) => setCuisineDescription(e.target.value)}
                placeholder="Ex. cuisine agencée récente, vitrocéramique, lave-vaisselle…"
              />
            </div>
          </div>

          <ChipList
            label="Points forts"
            items={pointsForts}
            input={pointFortInput}
            setInput={setPointFortInput}
            onAdd={(v: string) => { setPointsForts([...pointsForts, v]); setPointFortInput(""); }}
            onRemove={(i: number) => setPointsForts(pointsForts.filter((_, idx) => idx !== i))}
          />
          <ChipList
            label="Points faibles"
            items={pointsFaibles}
            input={pointFaibleInput}
            setInput={setPointFaibleInput}
            onAdd={(v: string) => { setPointsFaibles([...pointsFaibles, v]); setPointFaibleInput(""); }}
            onRemove={(i: number) => setPointsFaibles(pointsFaibles.filter((_, idx) => idx !== i))}
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
            <Label>Photos, vidéos & fichiers</Label>
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
                <ImageIcon className="h-5 w-5 mb-1" /><span>Fichiers</span>
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
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
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((it: string, i: number) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {it}
              <button onClick={() => onRemove(i)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
