import { useState, useEffect, useRef } from "react";
import type React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { VoiceDictationButton } from "@/components/VoiceDictationButton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashBadge } from "@/components/client/dashboard/DashPrimitives";
import { VisitMediaGrid, formatVisitDate } from "@/components/visites/VisitDetailParts";
import { VisitVideoShareButton } from "@/components/calendar/VisitVideoShareButton";
import { getOrCreateClientConversation } from "@/lib/clientConversation";
import { ArrowLeft, Loader2, Send, Save, X, Plus, Image as ImageIcon, Video, Camera, ClipboardList, CheckCircle2 } from "lucide-react";

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
    <div className="min-w-0 space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Select
        value={value === null || value === undefined ? "" : value ? "oui" : "non"}
        onValueChange={(v) => onChange(v === "oui" ? true : v === "non" ? false : null)}
      >
        <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
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
  videoShare,
}: {
  role?: CompteRenduRole;
  visiteId?: string;
  embedded?: boolean;
  onSent?: () => void;
  /** Active l'option « Partager une vidéo aux clients maintenant » dans l'unique entrée médias. */
  videoShare?: { visite: any; visitesGroup?: any[]; onUploaded?: () => void };
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
  const [mediaChooserOpen, setMediaChooserOpen] = useState(false);
  const [videoShareOpen, setVideoShareOpen] = useState(false);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
              offre_id: v.offre_id ?? null, attachment_url: m.url,
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
    return <div className={`flex items-center justify-center ${embedded ? "h-32" : "h-96"}`}><Loader2 className="animate-spin" /></div>;
  }
  if (!visite) {
    return <div className="p-6">Visite introuvable.</div>;
  }

  const { day, time } = formatVisitDate(visite.date_visite);

  const actions = (
    <div className="grid grid-cols-2 gap-2 [&>*]:min-h-12">
      <Button type="button" variant="outline" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
        Brouillon
      </Button>
      <Button type="button" onClick={handleSend} disabled={sending}>
        {sending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
        {envoyeAt ? "Renvoyer au client" : "Envoyer au client"}
      </Button>
    </div>
  );

  return (
    <div className={embedded ? "space-y-3" : "mx-auto w-full max-w-3xl space-y-4 px-4 pb-4 pt-4 md:px-6"}>
      {!embedded && (
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
      )}

      {/* En-tête */}
      <div className={`${embedded ? "" : "imr-lg-card rounded-[22px] p-4 md:p-5"} space-y-1`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardList className="h-[18px] w-[18px]" />
          </span>
          <h2 className={`${embedded ? "text-[15px]" : "text-xl"} min-w-0 flex-1 font-semibold tracking-tight text-foreground`}>Compte rendu de visite</h2>
          {envoyeAt ? <DashBadge tone="success"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Envoyé au client</DashBadge> : crId ? <DashBadge tone="muted">Brouillon</DashBadge> : null}
        </div>
        {!embedded && (
          <>
            <p className="pt-1 text-[15px] font-medium text-foreground">{visite.adresse}</p>
            <p className="text-sm text-muted-foreground">{day}{time ? ` · ${time}` : ""}</p>
          </>
        )}
      </div>

      {/* 1. Impression générale */}
      <FormStep n={1} title="Impression générale">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Appréciation globale">
            <Select value={appreciation} onValueChange={setAppreciation}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tres_positif">Très positif</SelectItem>
                <SelectItem value="positif">Positif</SelectItem>
                <SelectItem value="mitige">Mitigé</SelectItem>
                <SelectItem value="negatif">Négatif</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="État du bien">
            <Select value={etat} onValueChange={setEtat}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="bon">Bon</SelectItem>
                <SelectItem value="moyen">Moyen</SelectItem>
                <SelectItem value="a_renover">À rénover</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Intérêt du client">
            <Select value={interet} onValueChange={setInteret}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tres_interesse">Très intéressé</SelectItem>
                <SelectItem value="interesse">Intéressé</SelectItem>
                <SelectItem value="hesitant">Hésitant</SelectItem>
                <SelectItem value="non_interesse">Non intéressé</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormStep>

      {/* 2. Caractéristiques */}
      <FormStep n={2} title="Caractéristiques du bien">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Cuisine">
            <Select value={cuisineType} onValueChange={setCuisineType}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                {CUISINE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <BoolSelect label="Ascenseur" value={ascenseur} onChange={setAscenseur} />
          <BoolSelect label="Balcon / terrasse" value={balcon} onChange={setBalcon} />
          <BoolSelect label="Parking" value={parking} onChange={setParking} />
        </div>
        <Field label="Description de la cuisine">
          <Textarea
            rows={2}
            value={cuisineDescription}
            onChange={(e) => setCuisineDescription(e.target.value)}
            placeholder="Ex. cuisine agencée récente, vitrocéramique, lave-vaisselle…"
            className="text-[15px]"
          />
        </Field>
      </FormStep>

      {/* 3. Points forts / faibles */}
      <FormStep n={3} title="Points forts et points faibles">
        <ChipList
          label="Points forts"
          tone="success"
          items={pointsForts}
          input={pointFortInput}
          setInput={setPointFortInput}
          onAdd={(v: string) => { setPointsForts([...pointsForts, v]); setPointFortInput(""); }}
          onRemove={(i: number) => setPointsForts(pointsForts.filter((_, idx) => idx !== i))}
        />
        <ChipList
          label="Points faibles"
          tone="warning"
          items={pointsFaibles}
          input={pointFaibleInput}
          setInput={setPointFaibleInput}
          onAdd={(v: string) => { setPointsFaibles([...pointsFaibles, v]); setPointFaibleInput(""); }}
          onRemove={(i: number) => setPointsFaibles(pointsFaibles.filter((_, idx) => idx !== i))}
        />
      </FormStep>

      {/* 4. Commentaire et suite */}
      <FormStep n={4} title="Commentaire et suite">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm">Commentaire libre</Label>
            <VoiceDictationButton onTranscript={(t) => setCommentaire(t)} />
          </div>
          <Textarea rows={4} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Vos observations détaillées sur le bien… (ou dictez avec le micro)" className="text-[15px]" />
        </div>
        <Field label="Prochaines étapes">
          <Textarea rows={2} value={prochainesEtapes} onChange={(e) => setProchainesEtapes(e.target.value)} placeholder="Ce qu'on fait après cette visite…" className="text-[15px]" />
        </Field>
      </FormStep>

      {/* 5. Médias — une seule entrée « Ajouter photo / vidéo » */}
      <FormStep n={5} title="Photos, vidéos et fichiers">
        <input
          ref={captureInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
        />
        <input
          ref={galleryInputRef}
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
        {medias.length > 0 ? (
          <VisitMediaGrid
            medias={medias}
            renderAction={(_m, i) => (
              <button
                type="button"
                aria-label="Retirer ce média"
                onClick={() => setMedias(medias.filter((_, idx) => idx !== i))}
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Aucun média pour l'instant. Les photos et vidéos ajoutées ici sont envoyées avec le compte rendu.</p>
        )}
        <Button type="button" variant="outline" className="h-12 w-full" disabled={uploading} onClick={() => setMediaChooserOpen(true)}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {uploading ? "Envoi en cours…" : "Ajouter photo / vidéo"}
        </Button>
      </FormStep>

      <Dialog open={mediaChooserOpen} onOpenChange={setMediaChooserOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter photo / vidéo</DialogTitle>
            <DialogDescription>Ajoutez des médias au compte rendu{videoShare ? " ou partagez une vidéo tout de suite aux clients" : ""}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button type="button" className="h-12 justify-start" onClick={() => { setMediaChooserOpen(false); captureInputRef.current?.click(); }}>
              <Camera className="h-4 w-4" /> Prendre une photo ou une vidéo
            </Button>
            <Button type="button" variant="outline" className="h-12 justify-start" onClick={() => { setMediaChooserOpen(false); galleryInputRef.current?.click(); }}>
              <ImageIcon className="h-4 w-4" /> Choisir dans la galerie ou les fichiers
            </Button>
            {videoShare && (
              <Button type="button" variant="outline" className="h-auto min-h-12 justify-start whitespace-normal py-2.5 text-left" onClick={() => { setMediaChooserOpen(false); setVideoShareOpen(true); }}>
                <Video className="h-4 w-4" />
                <span className="flex flex-col">
                  <span>Partager une vidéo aux clients maintenant</span>
                  <span className="text-xs font-normal text-muted-foreground">Envoi immédiat : messagerie, notification et WhatsApp</span>
                </span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {videoShare && (
        <VisitVideoShareButton
          visite={videoShare.visite}
          visitesGroup={videoShare.visitesGroup}
          onUploaded={videoShare.onUploaded}
          hideTrigger
          chooserOpen={videoShareOpen}
          onChooserOpenChange={setVideoShareOpen}
        />
      )}

      {embedded ? (
        <div className="pt-1">{actions}</div>
      ) : (
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-border/60 bg-background/90 px-4 pt-3 backdrop-blur-xl md:-mx-6 md:px-6 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          {actions}
        </div>
      )}
    </div>
  );
}

/** Étape numérotée du formulaire, dans une carte verre. */
function FormStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="imr-lg-card space-y-3 rounded-[22px] p-4" aria-label={title}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{n}</span>
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function ChipList({ label, items, input, setInput, onAdd, onRemove, tone = "neutral" }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { e.preventDefault(); onAdd(input.trim()); } }}
          placeholder="Ajouter et appuyer sur Entrée"
          className="h-11 text-[15px]"
        />
        <Button type="button" variant="outline" size="icon" aria-label={`Ajouter (${label})`} onClick={() => input.trim() && onAdd(input.trim())}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {items.map((it: string, i: number) => (
            <span key={i} className={`inline-flex min-h-9 items-center gap-1 rounded-full pl-3 pr-1 text-sm font-medium ${tone === "success" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : tone === "warning" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-muted text-foreground"}`}>
              {it}
              <button type="button" aria-label={`Retirer ${it}`} onClick={() => onRemove(i)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-foreground/10"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
