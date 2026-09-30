import { Loader2, Search } from 'lucide-react';
import { useCandidatCriteres } from '@/hooks/useCandidatCriteres';
import { CandidatCriteresForm } from './CandidatCriteresForm';

export const CRITERES_DISCLAIMER =
  'Pour que nous puissions rechercher les logements qui vous correspondent, renseignez vos critères de recherche.';

/** Écran bloquant de l'espace candidat tant que les critères de recherche ne sont pas renseignés. En cas d'erreur de lecture : on laisse passer. */
export function CandidatCriteresGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isError, complete } = useCandidatCriteres();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (isError || complete) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Vos critères de recherche</h1>
          <p className="text-muted-foreground">{CRITERES_DISCLAIMER}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <CandidatCriteresForm />
        </div>
      </div>
    </div>
  );
}
