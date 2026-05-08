import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  onTranscript: (text: string) => void;
  /** Si true, ajoute au texte existant au lieu de remplacer */
  append?: boolean;
}

// Bouton de dictée vocale (API native Web Speech, langue fr-CH)
export function VoiceDictationButton({ onTranscript, append = true }: Props) {
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef("");

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Dictée vocale non supportée par ce navigateur. Utilisez Chrome/Safari récent."); return; }
    const r = new SR();
    r.lang = "fr-CH";
    r.continuous = true;
    r.interimResults = true;
    finalRef.current = "";

    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += transcript + " ";
        else interim += transcript;
      }
      onTranscript((append ? "" : "") + finalRef.current + interim);
    };
    r.onerror = (e: any) => {
      console.error("Speech error", e);
      if (e.error === "not-allowed") toast.error("Microphone refusé. Autorisez l'accès au micro.");
      setRecording(false);
    };
    r.onend = () => setRecording(false);
    r.start();
    recognitionRef.current = r;
    setRecording(true);
    toast.info("🎙️ Dictée en cours — parlez");
  };

  const stop = () => {
    recognitionRef.current?.stop?.();
    setRecording(false);
  };

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "outline"}
      size="sm"
      onClick={recording ? stop : start}
    >
      {recording ? <MicOff className="h-4 w-4 mr-2 animate-pulse" /> : <Mic className="h-4 w-4 mr-2" />}
      {recording ? "Arrêter" : "Dicter"}
    </Button>
  );
}
