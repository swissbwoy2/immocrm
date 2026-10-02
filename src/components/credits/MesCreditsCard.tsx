import { useUserCredits } from '@/hooks/useUserCredits';

export function MesCreditsCard() {
  const { credits } = useUserCredits();
  if (!credits) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Mes crédits</h3>
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-muted/50 p-3">🎟️ Crédits visite : <b>{credits.coins_visite} visite{credits.coins_visite > 1 ? 's' : ''}</b></div>
        <div className="rounded-xl bg-muted/50 p-3">📄 Crédit mandat : <b>{credits.coins_mandat} jours restants</b></div>
        <div className="rounded-xl bg-muted/50 p-3">📨 Postulations : <b>illimité</b></div>
      </div>
    </div>
  );
}
