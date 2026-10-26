import { useState } from 'react';
import type React from 'react';
import { ArrowLeft, CheckCircle2, Edit, FileCheck, Mail, MessageSquare, MoreHorizontal, Pause, Phone, RotateCcw, Send, StopCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import type { Profile, Tone } from './model';

export type ConfirmKind = 'suspend' | 'stop' | 'reactivate' | 'delete';

/** Ligne du menu « Plus » : cible 44 px, texte 15 px. */
function MenuRow({ icon: Icon, label, sub, onClick, disabled, danger }: {
  icon: React.ElementType; label: string; sub?: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'imr-lg-plain flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] font-medium disabled:pointer-events-none disabled:opacity-50',
        danger ? 'text-destructive' : 'text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {sub && <span className="block text-[13px] font-normal text-muted-foreground">{sub}</span>}
      </span>
    </button>
  );
}

/**
 * En-tête collant et compact : retour, avatar, nom, statut, parcours, agent, jours de mandat,
 * actions rapides en capsules + menu « Plus » pour les actions rares ou irréversibles.
 */
export function ClientDetailHeader({
  profile, solvable, status, extraBadges, meta,
  onBack, onMessage, onEmail, onEdit,
  inviting, onInvite, onPrefill, pdfButton,
  canSuspendStop, canReactivate, deleting, onConfirm,
}: {
  profile: Profile;
  solvable: boolean;
  status: { label: string; tone: Tone };
  extraBadges?: React.ReactNode;
  meta: React.ReactNode;
  onBack: () => void;
  onMessage: () => void;
  onEmail: () => void;
  onEdit: () => void;
  inviting: boolean;
  onInvite: () => void;
  /** Absent pour un reloueur (pas de mandat à pré-remplir). */
  onPrefill?: () => void;
  pdfButton: React.ReactNode;
  canSuspendStop: boolean;
  canReactivate: boolean;
  deleting: boolean;
  onConfirm: (kind: ConfirmKind) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const initials = `${profile.prenom?.[0] ?? ''}${profile.nom?.[0] ?? ''}`.toUpperCase();
  const tel = (profile.telephone || '').replace(/[^+0-9]/g, '');
  const run = (fn: () => void) => () => { setMoreOpen(false); fn(); };

  const capsule = 'h-11 min-w-11 px-0 sm:px-4';

  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onBack} aria-label="Retour aux clients" title="Retour aux clients">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative shrink-0">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
              {initials}
            </span>
            {solvable && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-emerald-500" title="Solvable">
                <CheckCircle2 className="h-3 w-3 text-white" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-semibold leading-tight tracking-tight text-foreground sm:text-[22px]">
              {profile.prenom} {profile.nom}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <DashBadge tone={status.tone}>{status.label}</DashBadge>
              {extraBadges}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{meta}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:shrink-0">
          {tel ? (
            <Button asChild variant="outline" className={capsule} title="Appeler">
              <a href={`tel:${tel}`} aria-label={`Appeler ${profile.prenom} ${profile.nom}`}>
                <Phone className="h-4 w-4" /><span className="hidden sm:inline">Appeler</span>
              </a>
            </Button>
          ) : (
            <Button variant="outline" className={capsule} disabled title="Aucun téléphone renseigné" aria-label="Appeler (aucun téléphone)">
              <Phone className="h-4 w-4" /><span className="hidden sm:inline">Appeler</span>
            </Button>
          )}
          <Button variant="outline" className={capsule} onClick={onMessage} aria-label="Message" title="Ouvrir la conversation">
            <MessageSquare className="h-4 w-4" /><span className="hidden sm:inline">Message</span>
          </Button>
          <Button variant="outline" className={capsule} onClick={onEmail} aria-label="E-mail : envoyer le dossier" title="Envoyer le dossier par e-mail">
            <Mail className="h-4 w-4" /><span className="hidden sm:inline">E-mail</span>
          </Button>
          <Button className={capsule} onClick={onEdit} aria-label="Modifier" title="Modifier les informations">
            <Edit className="h-4 w-4" /><span className="hidden sm:inline">Modifier</span>
          </Button>
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-11 w-11 shrink-0 px-0" aria-label="Plus d'actions" title="Plus d'actions">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(320px,calc(100vw-32px))] rounded-2xl p-2">
              <div className="space-y-0.5">
                {/* La génération du PDF garde le menu ouvert le temps du téléchargement. */}
                <div className="[&>button]:min-h-11 [&>button]:w-full [&>button]:justify-start">{pdfButton}</div>
                <MenuRow
                  icon={Send}
                  label={inviting ? 'Envoi en cours…' : !profile.actif ? 'Envoyer invitation' : 'Renvoyer invitation'}
                  onClick={run(onInvite)}
                  disabled={inviting}
                />
                {onPrefill && <MenuRow icon={FileCheck} label="Pré-remplir le mandat" onClick={run(onPrefill)} />}
                {(canSuspendStop || canReactivate) && <div className="my-1 h-px bg-border/60" />}
                {canSuspendStop && (
                  <>
                    <MenuRow icon={Pause} label="Suspendre la recherche" sub="Fige le compteur J+" onClick={run(() => onConfirm('suspend'))} />
                    <MenuRow icon={StopCircle} label="Stopper la recherche" sub="Le client reste dans la base" onClick={run(() => onConfirm('stop'))} />
                  </>
                )}
                {canReactivate && (
                  <MenuRow icon={RotateCcw} label="Réactiver la recherche" sub="Le compteur reprend" onClick={run(() => onConfirm('reactivate'))} />
                )}
                <div className="my-1 h-px bg-border/60" />
                <MenuRow icon={Trash2} label="Supprimer le client" sub="Irréversible" danger disabled={deleting} onClick={run(() => onConfirm('delete'))} />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
