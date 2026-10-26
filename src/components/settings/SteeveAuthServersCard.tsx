import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ServerRow = {
  mailbox_id: string;
  address: string;
  auth_server: string;
  emails: number;
  favorables: number;
  trusted: boolean;
};

/**
 * Serveurs qui ont vérifié l'expéditeur des e-mails relevés (en-tête Authentication-Results).
 * Steeve ne tient compte d'un e-mail que si ce serveur est déclaré de confiance pour la boîte :
 * celui de l'hébergeur de la boîte (Infomaniak), jamais un serveur inconnu.
 */
export function SteeveAuthServersCard() {
  const [rows, setRows] = useState<ServerRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('admin_mailbox_auth_servers');
    setRows((data ?? []) as ServerRow[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (r: ServerRow) => {
    setBusy(`${r.mailbox_id}:${r.auth_server}`);
    const { error } = await supabase.rpc('admin_set_mailbox_trusted_server', {
      p_mailbox_id: r.mailbox_id,
      p_server: r.auth_server,
      p_trusted: !r.trusted,
    });
    setBusy(null);
    if (error) {
      toast.error("Le réglage n'a pas pu être enregistré");
      return;
    }
    toast.success(r.trusted ? 'Confiance retirée' : 'Serveur déclaré de confiance');
    void load();
  };

  return (
    <section aria-labelledby="steeve-auth-title" className={`${DASH_CARD} min-w-0 p-4 md:p-6`}>
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id="steeve-auth-title" className="text-base font-semibold leading-snug text-foreground md:text-[17px]">Authentification des e-mails</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Serveurs qui ont vérifié l'expéditeur des e-mails reçus. Déclarez de confiance uniquement celui de votre
            hébergeur de messagerie (Infomaniak) : un e-mail n'est alors pris en compte que si l'expéditeur a été authentifié.
          </p>
        </div>
      </header>
      <div className="mt-4 md:mt-5">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground dark:bg-white/[0.03]">Aucun e-mail relevé pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/50 text-sm dark:bg-white/[0.03]">
            {rows.map((r) => (
              <li key={`${r.mailbox_id}:${r.auth_server}`} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-all font-medium text-foreground">{r.auth_server}</p>
                    {r.trusted && <DashBadge tone="success">De confiance</DashBadge>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {r.address} · {r.emails} e-mail(s), dont {r.favorables} avec expéditeur authentifié
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="min-h-11 w-full shrink-0 sm:w-auto"
                  disabled={busy === `${r.mailbox_id}:${r.auth_server}`}
                  onClick={() => void toggle(r)}
                >
                  {r.trusted ? 'Retirer la confiance' : 'Faire confiance'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
