import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <Card>
      <CardHeader>
        <CardTitle>Authentification des e-mails</CardTitle>
        <CardDescription>
          Serveurs qui ont vérifié l'expéditeur des e-mails reçus. Déclarez de confiance uniquement celui de votre
          hébergeur de messagerie (Infomaniak) : un e-mail n'est alors pris en compte que si l'expéditeur a été authentifié.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun e-mail relevé pour l'instant.</p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {rows.map((r) => (
              <li key={`${r.mailbox_id}:${r.auth_server}`} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-all font-medium">{r.auth_server}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.address} · {r.emails} e-mail(s), dont {r.favorables} avec expéditeur authentifié
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.trusted && <Badge>De confiance</Badge>}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy === `${r.mailbox_id}:${r.auth_server}`}
                    onClick={() => void toggle(r)}
                  >
                    {r.trusted ? 'Retirer la confiance' : 'Faire confiance'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
