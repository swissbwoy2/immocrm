import { useEffect, useState } from 'react';
import { Loader2, User } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AchatOffreResume, AchatSlotOption } from './AchatOffreParts';

const DIALOG_CLS = 'max-h-[92vh] overflow-y-auto sm:max-w-lg sm:rounded-2xl';
const FOOTER_CLS = 'mt-2 flex-row gap-2 sm:space-x-0 border-t border-border/70 pt-4 sm:justify-between [&>*]:flex-1 sm:[&>*]:flex-none';

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offre: any | null;
  busy?: boolean;
}

/** Visite accompagnée par le conseiller : choisir un créneau proposé, ou donner ses disponibilités. */
export function AchatVisiteDialog({
  open, onOpenChange, offre, busy, creneaux, onConfirm, onDeleguer,
}: BaseProps & {
  creneaux: any[];
  onConfirm: (opts: { creneau?: { id: string; date_visite: string } | null; disponibilites?: string }) => void;
  onDeleguer: () => void;
}) {
  const [slotId, setSlotId] = useState<string | null>(null);
  const [dispo, setDispo] = useState('');

  useEffect(() => {
    if (open) { setSlotId(null); setDispo(''); }
  }, [open]);

  const slot = creneaux.find((c) => c.id === slotId) || null;
  const peutEnvoyer = creneaux.length > 0 ? !!slot : dispo.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CLS}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-semibold">Je visite avec mon conseiller</DialogTitle>
          <DialogDescription>
            {creneaux.length > 0
              ? 'Choisissez un créneau proposé par votre conseiller.'
              : 'Indiquez vos disponibilités : votre conseiller fixe la visite avec le vendeur.'}
          </DialogDescription>
        </DialogHeader>

        {offre && (
          <div className="space-y-5">
            <AchatOffreResume offre={offre} />

            {creneaux.length > 0 ? (
              <div className="space-y-2" role="radiogroup" aria-label="Créneaux de visite">
                {creneaux.map((c) => (
                  <AchatSlotOption
                    key={c.id}
                    date={c.date_visite}
                    selected={slotId === c.id}
                    onSelect={() => setSlotId(c.id)}
                  />
                ))}
                <button
                  type="button"
                  className="w-full py-2 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={onDeleguer}
                >
                  Aucun créneau ne me convient : je confie la visite à mon conseiller
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="achat-dispo">Mes disponibilités</Label>
                <Textarea
                  id="achat-dispo"
                  rows={3}
                  value={dispo}
                  onChange={(e) => setDispo(e.target.value)}
                  placeholder="Ex. : en semaine après 17 h, ou samedi matin"
                />
                <button
                  type="button"
                  className="w-full py-2 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={onDeleguer}
                >
                  Je préfère que mon conseiller visite pour moi
                </button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className={FOOTER_CLS}>
          <Button variant="ghost" className="h-11 rounded-full" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="h-11 rounded-full px-6"
            disabled={!peutEnvoyer || busy}
            onClick={() => onConfirm(slot ? { creneau: { id: slot.id, date_visite: slot.date_visite } } : { disponibilites: dispo })}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {creneaux.length > 0 ? 'Confirmer la visite' : 'Envoyer ma demande'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Visite déléguée au conseiller (compte-rendu et vidéo ensuite). */
export function AchatDelegationDialog({
  open, onOpenChange, offre, busy, creneaux, onConfirm,
}: BaseProps & {
  creneaux: any[];
  onConfirm: (opts: { date?: string | null }) => void;
}) {
  const [slotId, setSlotId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSlotId(null);
  }, [open]);

  const slot = creneaux.find((c) => c.id === slotId) || null;
  const peutEnvoyer = creneaux.length === 0 || !!slot;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CLS}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-semibold">Mon conseiller visite pour moi</DialogTitle>
          <DialogDescription>
            Votre conseiller visite le bien à votre place et vous envoie un compte-rendu avec vidéo.
          </DialogDescription>
        </DialogHeader>

        {offre && (
          <div className="space-y-5">
            <AchatOffreResume offre={offre} />
            {creneaux.length > 0 ? (
              <div className="space-y-2" role="radiogroup" aria-label="Créneaux de visite">
                {creneaux.map((c) => (
                  <AchatSlotOption
                    key={c.id}
                    date={c.date_visite}
                    selected={slotId === c.id}
                    onSelect={() => setSlotId(c.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4">
                <User className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Aucun créneau n'est encore fixé : votre conseiller convient de la date avec le vendeur et vous tient informé.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className={FOOTER_CLS}>
          <Button variant="ghost" className="h-11 rounded-full" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="h-11 rounded-full px-6"
            disabled={!peutEnvoyer || busy}
            onClick={() => onConfirm({ date: slot?.date_visite ?? null })}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confier la visite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Après la visite : souhait d'offre d'achat (montant indicatif facultatif). */
export function AchatOffreAchatDialog({
  open, onOpenChange, offre, busy, onConfirm,
}: BaseProps & {
  onConfirm: (opts: { montant?: number | null; commentaire?: string }) => void;
}) {
  const [montant, setMontant] = useState('');
  const [commentaire, setCommentaire] = useState('');

  useEffect(() => {
    if (open) { setMontant(''); setCommentaire(''); }
  }, [open]);

  const valeur = Number(montant.replace(/[^\d]/g, ''));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CLS}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-semibold">Faire une offre d'achat</DialogTitle>
          <DialogDescription>
            Votre conseiller vous recontacte pour préparer l'offre, vérifier le financement et négocier avec le vendeur.
            Rien n'est envoyé au vendeur sans votre accord.
          </DialogDescription>
        </DialogHeader>

        {offre && (
          <div className="space-y-4">
            <AchatOffreResume offre={offre} />
            <div className="space-y-2">
              <Label htmlFor="achat-montant">Montant envisagé (facultatif)</Label>
              <Input
                id="achat-montant"
                inputMode="numeric"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="Ex. : 850 000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="achat-commentaire">Message à votre conseiller (facultatif)</Label>
              <Textarea
                id="achat-commentaire"
                rows={3}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Conditions, questions, points à négocier…"
              />
            </div>
          </div>
        )}

        <DialogFooter className={FOOTER_CLS}>
          <Button variant="ghost" className="h-11 rounded-full" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="h-11 rounded-full px-6"
            disabled={busy}
            onClick={() => onConfirm({ montant: valeur > 0 ? valeur : null, commentaire })}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transmettre à mon conseiller
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
