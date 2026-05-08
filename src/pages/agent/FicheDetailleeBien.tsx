import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Plus, X, Image as ImageIcon, Video, FileText } from "lucide-react";

type Media = { url: string; type: string; name: string; size: number };

export default function FicheDetailleeBien() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [titre, setTitre] = useState("");
  const [adresse, setAdresse] = useState("");
  const [prix, setPrix] = useState<number | "">("");
  const [pieces, setPieces] = useState<number | "">("");
  const [surface, setSurface] = useState<number | "">("");
  const [etage, setEtage] = useState("");
  const [typeBien, setTypeBien] = useState("");
  const [disponibilite, setDisponibilite] = useState("");
  const [description, setDescription] = useState("");
  const [descMarketing, setDescMarketing] = useState("");
  const [equipements, setEquipements] = useState<string[]>([]);
  const [equipInput, setEquipInput] = useState("");
  const [annee, setAnnee] = useState<number | "">("");
  const [chauffage, setChauffage] = useState("");
  const [orientation, setOrientation] = useState("");
  const [classeEnergie, setClasseEnergie] = useState("");
  const [medias, setMedias] = useState<Media[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("offres").select("*").eq("id", id).maybeSingle();
      if (data) {
        setTitre(data.titre || "");
        setAdresse(data.adresse || "");
        setPrix(data.prix ?? "");
        setPieces(data.pieces ?? "");
        setSurface(data.surface ?? "");
        setEtage(data.etage || "");
        setTypeBien(data.type_bien || "");
        setDisponibilite(data.disponibilite || "");
        setDescription(data.description || "");
        setDescMarketing((data as any).description_marketing || "");
        setEquipements(((data as any).equipements as string[]) || []);
        setAnnee((data as any).annee_construction ?? "");
        setChauffage((data as any).type_chauffage || "");
        setOrientation((data as any).orientation || "");
        setClasseEnergie((data as any).classe_energetique || "");
        setMedias((((data as any).medias_galerie as any) || []) as Media[]);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("offres")
        .update({
          titre: titre || null,
          adresse,
          prix: prix === "" ? null : Number(prix),
          pieces: pieces === "" ? null : Number(pieces),
          surface: surface === "" ? null : Number(surface),
          etage: etage || null,
          type_bien: typeBien || null,
          disponibilite: disponibilite || null,
          description: description || null,
          description_marketing: descMarketing || null,
          equipements,
          annee_construction: annee === "" ? null : Number(annee),
          type_chauffage: chauffage || null,
          orientation: orientation || null,
          classe_energetique: classeEnergie || null,
          medias_galerie: medias as any,
        } as any)
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Fiche enregistrée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("bien-medias").upload(path, file);
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("bien-medias")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || supabase.storage.from("bien-medias").getPublicUrl(path).data.publicUrl;
      const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document";
      setMedias((m) => [...m, { url, type, name: file.name, size: file.size }]);
      toast({ title: "Média ajouté" });
    } catch (e: any) {
      toast({ title: "Erreur upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4 pb-24">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Retour
      </Button>

      <Card>
        <CardHeader><CardTitle>Caractéristiques du bien</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Titre</Label><Input value={titre} onChange={(e) => setTitre(e.target.value)} /></div>
          <div><Label>Adresse</Label><Input value={adresse} onChange={(e) => setAdresse(e.target.value)} /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>Prix (CHF)</Label><Input type="number" value={prix} onChange={(e) => setPrix(e.target.value === "" ? "" : Number(e.target.value))} /></div>
            <div><Label>Pièces</Label><Input type="number" step="0.5" value={pieces} onChange={(e) => setPieces(e.target.value === "" ? "" : Number(e.target.value))} /></div>
            <div><Label>Surface (m²)</Label><Input type="number" value={surface} onChange={(e) => setSurface(e.target.value === "" ? "" : Number(e.target.value))} /></div>
            <div><Label>Étage</Label><Input value={etage} onChange={(e) => setEtage(e.target.value)} /></div>
            <div><Label>Type de bien</Label><Input value={typeBien} onChange={(e) => setTypeBien(e.target.value)} placeholder="Appartement, Villa..." /></div>
            <div><Label>Disponibilité</Label><Input value={disponibilite} onChange={(e) => setDisponibilite(e.target.value)} /></div>
            <div><Label>Année construction</Label><Input type="number" value={annee} onChange={(e) => setAnnee(e.target.value === "" ? "" : Number(e.target.value))} /></div>
            <div>
              <Label>Classe énergétique</Label>
              <Select value={classeEnergie} onValueChange={setClasseEnergie}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {["A","B","C","D","E","F","G"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Type de chauffage</Label><Input value={chauffage} onChange={(e) => setChauffage(e.target.value)} placeholder="Gaz, Pompe à chaleur..." /></div>
            <div><Label>Orientation</Label><Input value={orientation} onChange={(e) => setOrientation(e.target.value)} placeholder="Sud, Sud-Ouest..." /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Équipements</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={equipInput}
              onChange={(e) => setEquipInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && equipInput.trim()) { e.preventDefault(); setEquipements([...equipements, equipInput.trim()]); setEquipInput(""); } }}
              placeholder="Balcon, Cave, Lave-vaisselle..."
            />
            <Button type="button" variant="outline" onClick={() => { if (equipInput.trim()) { setEquipements([...equipements, equipInput.trim()]); setEquipInput(""); } }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {equipements.map((it, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {it}
                <button onClick={() => setEquipements(equipements.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Description courte (interne)</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Description marketing (publique)</Label><Textarea rows={5} value={descMarketing} onChange={(e) => setDescMarketing(e.target.value)} placeholder="Texte attractif pour les annonces..." /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Photos & vidéos</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {medias.map((m, i) => (
              <div key={i} className="relative w-32 h-32 border rounded overflow-hidden bg-muted">
                {m.type === "image" ? (
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                ) : m.type === "video" ? (
                  <div className="flex flex-col items-center justify-center h-full text-xs"><Video className="h-8 w-8" /><span className="truncate w-full px-1">{m.name}</span></div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-xs"><FileText className="h-8 w-8" /><span className="truncate w-full px-1">{m.name}</span></div>
                )}
                <button onClick={() => setMedias(medias.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-background/80 rounded-bl p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="w-32 h-32 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer text-xs text-muted-foreground hover:border-primary">
              {uploading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Plus className="h-6 w-6 mb-1" /><span>Caméra</span></>}
              <input type="file" accept="image/*,video/*" capture="environment" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
            </label>
            <label className="w-32 h-32 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer text-xs text-muted-foreground hover:border-primary">
              <ImageIcon className="h-6 w-6 mb-1" /><span>Galerie</span>
              <input type="file" accept="image/*,video/*,.pdf" multiple className="hidden"
                onChange={(e) => { const files = Array.from(e.target.files || []); files.forEach(handleUpload); e.target.value = ""; }} />
            </label>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sticky bottom-4">
        {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Enregistrer la fiche
      </Button>
    </div>
  );
}
