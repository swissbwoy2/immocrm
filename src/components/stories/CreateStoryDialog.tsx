import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Camera, Video, Type, Loader2, X } from "lucide-react";
import { useVideoConverter } from "@/hooks/useVideoConverter";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

const TEXT_COLORS = [
  "hsl(158 55% 38%)",
  "hsl(200 70% 45%)",
  "hsl(158 50% 50%)",
  "hsl(20 90% 55%)",
  "hsl(340 75% 55%)",
  "hsl(280 60% 50%)",
  "hsl(200 35% 18%)",
];

export function CreateStoryDialog({ open, onOpenChange, onCreated }: Props) {
  const { user, userRole } = useAuth();
  const [mode, setMode] = useState<"choose" | "media" | "text">("choose");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [text, setText] = useState("");
  const [bg, setBg] = useState(TEXT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { convertToMp4, needsConversion, isConverting, conversionProgress } = useVideoConverter();

  const authorRole: "admin" | "agent" | null =
    userRole === "admin" ? "admin" : userRole === "agent" ? "agent" : null;

  const reset = () => {
    setMode("choose");
    setFile(null);
    setCaption("");
    setText("");
    setBg(TEXT_COLORS[0]);
  };

  const close = () => {
    if (saving) return;
    reset();
    onOpenChange(false);
  };

  async function publish() {
    if (!user || !authorRole) {
      toast.error("Vous n'êtes pas autorisé à publier une story.");
      return;
    }
    setSaving(true);
    try {
      let mediaUrl: string | null = null;
      let mediaPath: string | null = null;
      let storyType: "image" | "video" | "text" = "text";

      if (mode === "media") {
        if (!file) {
          toast.error("Sélectionne une photo ou une vidéo.");
          setSaving(false);
          return;
        }
        storyType = file.type.startsWith("video/") ? "video" : "image";
        // Convertit les vidéos non lisibles par les navigateurs (iPhone .MOV/HEVC) en MP4/H.264
        let uploadFile = file;
        if (storyType === "video" && needsConversion(file)) {
          toast.info("Conversion de la vidéo en cours...");
          const res = await convertToMp4(file);
          uploadFile = res.file;
          if (res.skipped && res.reason) toast.warning(res.reason);
        }
        const ext = uploadFile.name.split(".").pop() || (storyType === "video" ? "mp4" : "jpg");
        const path = `stories/${user.id}/${Date.now()}.${ext}`;
        const up = await supabase.storage
          .from("message-attachments")
          .upload(path, uploadFile, { cacheControl: "3600", upsert: false, contentType: uploadFile.type });
        if (up.error) throw up.error;

        mediaPath = path;
        mediaUrl = supabase.storage.from("message-attachments").getPublicUrl(path).data.publicUrl;
      } else {
        if (!text.trim()) {
          toast.error("Écris un message pour ta story.");
          setSaving(false);
          return;
        }
      }

      // Fetch author_agent_id if agent
      let agentId: string | null = null;
      if (authorRole === "agent") {
        const { data: a } = await supabase
          .from("agents")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        agentId = a?.id ?? null;
      }

      const { error } = await supabase.from("stories").insert({
        author_user_id: user.id,
        author_role: authorRole,
        author_agent_id: agentId,
        type: storyType,
        media_url: mediaUrl,
        media_path: mediaPath,
        text_content: mode === "text" ? text.trim() : caption.trim() || null,
        background_color: mode === "text" ? bg : null,
      });
      if (error) throw error;

      toast.success("Story publiée pour 24h 🎉");
      onCreated?.();
      close();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Impossible de publier la story");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle story</DialogTitle>
        </DialogHeader>

        {mode === "choose" && (
          <div className="grid grid-cols-3 gap-3 py-2">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => {
                setMode("media");
                setTimeout(() => fileInput.current?.click(), 50);
              }}
            >
              <Camera className="h-6 w-6" style={{ color: "hsl(158 55% 38%)" }} />
              <span className="text-xs">Photo</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => {
                setMode("media");
                setTimeout(() => fileInput.current?.click(), 50);
              }}
            >
              <Video className="h-6 w-6" style={{ color: "hsl(200 70% 45%)" }} />
              <span className="text-xs">Vidéo</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => setMode("text")}
            >
              <Type className="h-6 w-6" style={{ color: "hsl(158 50% 50%)" }} />
              <span className="text-xs">Texte</span>
            </Button>
          </div>
        )}

        {mode === "media" && (
          <div className="space-y-3">
            <Input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <>
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="w-full max-h-72 object-contain rounded-md bg-muted"
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(file)}
                    controls
                    className="w-full max-h-72 rounded-md bg-black"
                  />
                )}
                <Input
                  placeholder="Légende (optionnel)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </>
            )}
          </div>
        )}

        {mode === "text" && (
          <div className="space-y-3">
            <div
              className="rounded-md p-6 min-h-40 flex items-center justify-center text-white text-center font-semibold text-lg"
              style={{ background: bg }}
            >
              {text || "Écris ta story..."}
            </div>
            <Textarea
              placeholder="Ton message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={280}
            />
            <div className="flex flex-wrap gap-2">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBg(c)}
                  className="w-8 h-8 rounded-full border-2"
                  style={{
                    background: c,
                    borderColor: bg === c ? "hsl(200 35% 18%)" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <Button variant="ghost" onClick={close} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Annuler
          </Button>
          {mode !== "choose" && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => reset()} disabled={saving}>
                Retour
              </Button>
              <Button
                onClick={publish}
                disabled={saving}
                style={{ background: "hsl(158 55% 38%)", color: "white" }}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Publier 24h
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
