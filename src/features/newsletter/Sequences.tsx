import PortalVisits from "./PortalVisits";
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { type Category, CONTACT_CATEGORIES } from "./model";

type Step = { subject: string; html: string; preheader?: string };
type Sequence = { category: Category; enabled: boolean; steps: Step[] };
type Enrollment = {
  id: string;
  category: Category;
  state: string;
  reason: string | null;
  enrolled_at: string;
  form_id: string;
  welcome_campaign_id: string | null;
  newsletter_contacts: { email: string };
  meta_leads: { form_name: string };
  newsletter_sequence_messages: {
    step: number;
    due_at: string;
    newsletter_id: string | null;
  }[];
};
const days = [0, 1, 3, 7, 10, 14];
const labels: Record<string, string> = {
  active: "En cours",
  review: "À configurer",
  stopped: "Arrêtée",
  completed: "Terminée",
};
const db = supabase as unknown as SupabaseClient;
const safe = (html: string) =>
  DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ["style"],
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "link",
      "base",
      "meta",
    ],
  });
export default function NewsletterSequences() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [welcomes, setWelcomes] = useState<
    {
      campaign_id: string;
      name: string;
      enabled: boolean;
      subject: string;
      normal_delay_hours: number;
    }[]
  >([]);
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<Sequence | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const load = async () => {
    const [a, b, c] = await Promise.all([
      db.from("newsletter_sequences").select("category,enabled,steps").order(
        "category",
      ),
      db.from("newsletter_sequence_enrollments").select(
        "id,category,state,reason,enrolled_at,form_id,welcome_campaign_id,newsletter_contacts(email),meta_leads(form_name),newsletter_sequence_messages(step,due_at,newsletter_id)",
      ).order("enrolled_at", { ascending: false }).limit(200).returns<
        Enrollment[]
      >(),
      db.from("newsletter_sequence_welcomes").select(
        "campaign_id,name,enabled,subject,normal_delay_hours",
      ).order("name"),
    ]);
    if (a.error || b.error || c.error) {
      setError((a.error || b.error || c.error).message);
      return;
    }
    setError("");
    setSequences(a.data || []);
    setRows(b.data || []);
    setWelcomes(c.data || []);
  };
  useEffect(() => {
    void load();
  }, []);
  const save = async (enabled: boolean) => {
    if (!edit) return;
    setBusy(true);
    try {
      const { error } = await db.rpc("newsletter_sequence_configure", {
        p_category: edit.category,
        p_enabled: enabled,
        p_steps: edit.steps.map((s) => ({ ...s, html: safe(s.html) })),
      });
      if (error) throw error;
      toast.success(
        enabled
          ? "Séquence activée pour les nouveaux leads"
          : "Séquence enregistrée, envois suspendus",
      );
      setEdit(null);
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : String(
          e && typeof e === "object" && "message" in e ? e.message : e,
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const stop = async (id: string) => {
    const { error } = await db.rpc("newsletter_sequence_stop", { p_id: id });
    if (error) toast.error(error.message);
    else await load();
  };
  const patch = (field: keyof Step, value: string) =>
    setEdit((e) =>
      e
        ? {
          ...e,
          steps: e.steps.map((s, i) =>
            i === step ? { ...s, [field]: value } : s
          ),
        }
        : e
    );
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Séquences automatiques</h2>
        <Button variant="outline" onClick={load}>Actualiser</Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Un nouveau lead Meta reconnu reçoit le message de son groupe, puis cinq
        relances à J+1, J+3, J+7, J+10 et J+14. Le traitement démarre
        automatiquement à la réception ; la livraison dépend du prestataire. Une
        visite ou un essai ne constitue pas une conversion.
      </p>
      <Card>
        <CardContent className="pt-5 text-sm">
          Les relances s’arrêtent après{" "}
          <strong>signature du mandat et activation du service</strong>, ou à la
          désinscription. Un compte propriétaire actif est également exclu.
          Chaque adresse n’entre qu’une fois dans une séquence. Les imports
          historiques ne déclenchent pas d’envoi.
        </CardContent>
      </Card>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <PortalVisits />
      {welcomes.filter((w) => !w.campaign_id.startsWith("portal:")).map((w) => (
        <Card key={w.campaign_id}>
          <CardContent className="pt-5 text-sm space-y-2">
            <p className="font-semibold">
              {w.name} · email préalable {w.enabled ? "actif" : "suspendu"}
            </p>
            <p>{w.subject}</p>
            <p>
              Invitation à consulter l’annonce et réserver une visite dès
              réception du lead Meta. Les six emails habituels démarrent{" "}
              {w.normal_delay_hours} heures après l’envoi de cette invitation.
            </p>
            <p className="text-muted-foreground">
              Campagne Meta :{" "}
              {w.campaign_id}. Modèle disponible dans la bibliothèque.
            </p>
          </CardContent>
        </Card>
      ))}
      <div className="grid gap-4 md:grid-cols-2">
        {sequences.map((s) => (
          <Card key={s.category}>
            <CardHeader>
              <CardTitle className="text-base">
                {CONTACT_CATEGORIES[s.category]}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <span className="text-sm">
                {s.enabled
                  ? "Active"
                  : s.steps.length === 6
                  ? "Prête · suspendue"
                  : "Modèles à préparer"} · {s.steps.length}/6 emails
              </span>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(0);
                  setPreview(false);
                  setEdit({
                    ...s,
                    steps: days.map((_, i) =>
                      s.steps[i] || { subject: "", html: "" }
                    ),
                  });
                }}
              >
                Configurer
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <h3 className="text-lg font-semibold">Derniers parcours (200 maximum)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3">Contact / formulaire</th>
              <th className="p-3">Groupe</th>
              <th className="p-3">Parcours</th>
              <th className="p-3">État</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sent = r.newsletter_sequence_messages.filter((m) =>
                m.newsletter_id
              ).length;
              const next = r.newsletter_sequence_messages.filter((m) =>
                !m.newsletter_id
              ).sort((a, b) => a.step - b.step)[0];
              return (
                <tr key={r.id} className="border-b">
                  <td className="p-3">
                    {r.newsletter_contacts?.email}
                    <div className="text-xs text-muted-foreground">
                      {r.meta_leads?.form_name || r.form_id}
                    </div>
                  </td>
                  <td className="p-3">
                    {CONTACT_CATEGORIES[r.category] || "À classer"}
                    {r.welcome_campaign_id && (
                      <div className="text-xs text-muted-foreground">
                        Invitation visite + 6 emails
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {sent}/{r.welcome_campaign_id ? 7 : 6}{" "}
                    mis en file{r.state === "active" && next && (
                      <div className="text-xs">
                        Prochain :{" "}
                        {next.step === -1 ? "Invitation visite · " : ""}{" "}
                        {new Date(next.due_at).toLocaleString("fr-CH", {
                          timeZone: "Europe/Zurich",
                        })}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {labels[r.state]}
                    <div className="text-xs text-muted-foreground">
                      {r.reason}
                    </div>
                  </td>
                  <td>
                    {["active", "review"].includes(r.state) && (
                      <Button
                        variant="ghost"
                        onClick={() => stop(r.id)}
                      >
                        Arrêter
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && !error && (
          <p className="p-4 text-muted-foreground">
            Les nouveaux leads apparaîtront ici avec leur formulaire et le suivi
            de leur séquence.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Les réceptions, ouvertures et clics sont disponibles dans Suivi &amp;
        statistiques. Un email mis en file n’est pas une confirmation de
        réception.
      </p>
      <Dialog open={!!edit} onOpenChange={(v) => !v && !busy && setEdit(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {edit && CONTACT_CATEGORIES[edit.category]} · six emails
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {days.map((d, i) => (
              <Button
                key={d}
                variant={i === step ? "default" : "outline"}
                onClick={() => setStep(i)}
              >
                {d === 0 ? "Immédiat" : `J+${d}`}
              </Button>
            ))}
          </div>
          <label className="text-sm">
            Objet<Input
              value={edit?.steps[step]?.subject || ""}
              onChange={(e) => patch("subject", e.target.value)}
            />
          </label>
          <label className="text-sm">
            Prévisualisation dans la boîte email<Input
              value={edit?.steps[step]?.preheader || ""}
              onChange={(e) => patch("preheader", e.target.value)}
            />
          </label>
          <label className="text-sm">
            Code HTML<Textarea
              className="min-h-60 font-mono text-xs"
              value={edit?.steps[step]?.html || ""}
              onChange={(e) => patch("html", e.target.value)}
            />
          </label>
          <Button variant="outline" onClick={() => setPreview(!preview)}>
            {preview ? "Masquer" : "Prévisualiser"}
          </Button>
          {preview && (
            <iframe
              title="Aperçu de la relance"
              sandbox=""
              referrerPolicy="no-referrer"
              srcDoc={safe(edit?.steps[step]?.html || "")}
              className="h-[480px] w-full border bg-white"
            />
          )}
          <p className="text-xs text-muted-foreground">
            L’activation concerne les prochaines entrées uniquement. Les
            messages déjà transmis au prestataire ne peuvent plus être rappelés.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => save(false)}
            >
              Enregistrer et suspendre
            </Button>
            <Button disabled={busy} onClick={() => save(true)}>
              Enregistrer et activer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
