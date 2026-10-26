import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Landmark, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Calculateur de budget (lead magnet) affiché sur la fiche d'une annonce publique.
 * - Location : règle du tiers (loyer charges comprises ≤ 1/3 des revenus nets du ménage).
 * - Achat : critères bancaires suisses (charges théoriques 5 % du prix ≤ 1/3 des revenus, fonds propres ≥ 20 %).
 * Le résultat n'est affiché qu'après saisie des coordonnées ; la demande est enregistrée dans `leads`.
 */

interface AnnonceBudgetCalculatorProps {
  annonceId: string;
  titre?: string | null;
  typeTransaction?: string | null;
  prix?: number | null;
  chargesMensuelles?: number | null;
  chargesComprises?: boolean | null;
  localite?: string | null;
  nbPieces?: number | string | null;
  className?: string;
}

const formatCHF = (n: number) =>
  new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AnnonceBudgetCalculator({
  annonceId,
  titre,
  typeTransaction,
  prix,
  chargesMensuelles,
  chargesComprises,
  localite,
  nbPieces,
  className,
}: AnnonceBudgetCalculatorProps) {
  const isAchat = !!typeTransaction && typeTransaction !== 'location';

  const [revenus, setRevenus] = useState('');
  const [apport, setApport] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [step, setStep] = useState<'saisie' | 'contact' | 'resultat'>('saisie');
  const [submitting, setSubmitting] = useState(false);

  const prixNum = Number(prix) || 0;
  const loyerCC = useMemo(() => {
    if (isAchat || !prixNum) return 0;
    const charges = Number(chargesMensuelles) || 0;
    return chargesComprises ? prixNum : prixNum + charges;
  }, [isAchat, prixNum, chargesMensuelles, chargesComprises]);

  const result = useMemo(() => {
    const rev = parseFloat(revenus) || 0;
    if (!isAchat) {
      if (rev <= 0) return null;
      const budgetMax = Math.floor(rev / 3);
      const revenuRequis = loyerCC ? loyerCC * 3 : 0;
      const dansBudget = loyerCC ? loyerCC <= budgetMax : null;
      return { kind: 'location' as const, budgetMax, revenuRequis, dansBudget, ecart: loyerCC ? budgetMax - loyerCC : 0 };
    }
    const ap = parseFloat(apport) || 0;
    if (rev <= 0 && ap <= 0) return null;
    const chargesMaxAnnuelles = rev * 12 * 0.33;
    const prixParRevenus = rev > 0 ? chargesMaxAnnuelles / 0.05 : Infinity;
    const prixParApport = ap > 0 ? ap / 0.2 : Infinity;
    const prixMax = Math.min(prixParRevenus, prixParApport);
    const prixMaxFinal = Number.isFinite(prixMax) ? prixMax : 0;
    const apportRequis = prixNum ? prixNum * 0.2 : 0;
    const chargesMensuellesBien = prixNum ? (prixNum * 0.05) / 12 : 0;
    const revenuRequis = prixNum ? (prixNum * 0.05) / 0.33 / 12 : 0;
    const dansBudget = prixNum ? prixNum <= prixMaxFinal : null;
    const facteur = prixParRevenus < prixParApport ? 'revenus' : 'apport';
    return {
      kind: 'achat' as const,
      prixMax: prixMaxFinal,
      apportRequis,
      chargesMensuellesBien,
      revenuRequis,
      dansBudget,
      facteur,
      ecart: prixNum ? prixMaxFinal - prixNum : 0,
    };
  }, [revenus, apport, isAchat, loyerCC, prixNum]);

  const canCompute = isAchat ? !!(parseFloat(revenus) > 0 || parseFloat(apport) > 0) : parseFloat(revenus) > 0;
  const contactValid = prenom.trim().length > 0 && EMAIL_RE.test(email.trim()) && telephone.trim().length >= 9;

  const handleSubmit = async () => {
    if (!result || !contactValid) return;
    setSubmitting(true);
    const revNum = parseFloat(revenus) || null;
    const budgetMax = result.kind === 'location' ? result.budgetMax : Math.round(result.prixMax);
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    const notes = [
      `Calculateur de budget sur l'annonce : ${titre || annonceId}`,
      pageUrl ? `Lien : ${pageUrl}` : null,
      result.kind === 'location'
        ? `Loyer CC du bien : ${loyerCC ? formatCHF(loyerCC) : 'n.c.'} — budget max calculé : ${formatCHF(result.budgetMax)}`
        : `Prix du bien : ${prixNum ? formatCHF(prixNum) : 'n.c.'} — prix max calculé : ${formatCHF(result.prixMax)} — fonds propres déclarés : ${apport ? formatCHF(parseFloat(apport)) : 'n.c.'}`,
      result.dansBudget === null ? null : result.dansBudget ? 'Bien dans le budget' : 'Bien hors budget',
    ].filter(Boolean).join('\n');

    try {
      const { error } = await supabase.from('leads').insert({
        email: email.trim(),
        prenom: prenom.trim(),
        nom: '',
        telephone: telephone.trim(),
        localite: localite || null,
        budget: budgetMax ? String(budgetMax) : null,
        source: isAchat ? 'annonce_calculateur_achat' : 'annonce_calculateur_location',
        formulaire: 'calculateur_budget_annonce',
        type_recherche: isAchat ? 'achat' : 'location',
        apport_personnel: isAchat && apport ? String(Math.round(parseFloat(apport))) : null,
        revenu_net_mensuel_chf: revNum,
        budget_max_chf: budgetMax || null,
        nb_pieces: nbPieces != null ? String(nbPieces) : null,
        localite_recherche: localite || null,
        is_qualified: result.dansBudget === true,
        notes,
      } as any);
      if (error) throw error;

      supabase.functions
        .invoke('notify-new-lead', {
          body: {
            email: email.trim(),
            prenom: prenom.trim(),
            nom: '',
            telephone: telephone.trim(),
            localite: localite || null,
            budget: budgetMax ? String(budgetMax) : null,
            is_qualified: result.dansBudget === true,
            type_recherche: isAchat ? 'achat' : 'location',
            utm_source: 'annonce_calculateur',
          },
        })
        .catch(() => {});

      if ((window as any).fbq) (window as any).fbq('track', 'Lead');
      setStep('resultat');
    } catch (e) {
      console.error('[AnnonceBudgetCalculator] lead insert failed', e);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = isAchat ? Landmark : Calculator;

  return (
    <Card className={cn('p-5 border-primary/30', className)}>
      <div className="flex items-center gap-2 mb-1">
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">Calculateur gratuit</span>
      </div>
      <h3 className="text-lg font-semibold leading-snug">
        {isAchat ? 'Pouvez-vous acheter ce bien ?' : 'Ce loyer est-il dans votre budget ?'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {isAchat
          ? 'Estimez votre capacité d’achat selon les critères des banques suisses.'
          : 'Découvrez le loyer maximum que les régies vous accorderont.'}
      </p>

      {step !== 'resultat' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`calc-rev-${annonceId}`} className="text-sm">
              Revenus mensuels nets du ménage (CHF)
            </Label>
            <Input
              id={`calc-rev-${annonceId}`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={isAchat ? 'Ex : 12000' : 'Ex : 6000'}
              value={revenus}
              onChange={(e) => { setRevenus(e.target.value); if (step === 'contact') setStep('saisie'); }}
            />
          </div>
          {isAchat && (
            <div className="space-y-1.5">
              <Label htmlFor={`calc-apport-${annonceId}`} className="text-sm">Fonds propres disponibles (CHF)</Label>
              <Input
                id={`calc-apport-${annonceId}`}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Ex : 200000"
                value={apport}
                onChange={(e) => { setApport(e.target.value); if (step === 'contact') setStep('saisie'); }}
              />
            </div>
          )}

          {step === 'saisie' && (
            <Button className="w-full" disabled={!canCompute} onClick={() => setStep('contact')}>
              Calculer mon budget
            </Button>
          )}

          {step === 'contact' && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium flex items-center gap-2 pt-2">
                <Lock className="h-4 w-4 text-primary" />
                Votre résultat est prêt. Où pouvons-nous vous l’envoyer ?
              </p>
              <Input placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" />
              <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <Input type="tel" placeholder="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} autoComplete="tel" />
              <Button className="w-full" disabled={!contactValid || submitting} onClick={handleSubmit}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Voir mon résultat
              </Button>
              <p className="text-[11px] leading-snug text-muted-foreground">
                En validant, vous acceptez d’être recontacté par Immo-Rama au sujet de votre recherche. Vos données ne sont jamais revendues.
              </p>
            </div>
          )}
        </div>
      )}

      {step === 'resultat' && result && (
        <div className="space-y-4">
          {result.kind === 'location' ? (
            <>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Loyer maximum conseillé (charges comprises)</p>
                <p className="text-2xl font-bold text-primary">{formatCHF(result.budgetMax)}<span className="text-base font-medium">/mois</span></p>
              </div>
              {result.dansBudget !== null && (
                <div className={cn('flex gap-2 rounded-lg p-3 text-sm', result.dansBudget ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700')}>
                  {result.dansBudget ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
                  <span>
                    {result.dansBudget
                      ? `Ce bien (${formatCHF(loyerCC)}/mois CC) est dans votre budget, avec une marge de ${formatCHF(result.ecart)}.`
                      : `Ce bien (${formatCHF(loyerCC)}/mois CC) dépasse votre budget de ${formatCHF(-result.ecart)}. Les régies demandent en général un revenu de ${formatCHF(result.revenuRequis)} net par mois.`}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Prix d’achat maximum estimé</p>
                <p className="text-2xl font-bold text-primary">{formatCHF(result.prixMax)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Limité par vos {result.facteur === 'revenus' ? 'revenus (charges ≤ 1/3)' : 'fonds propres (min. 20 %)'}
                </p>
              </div>
              {result.dansBudget !== null && (
                <div className={cn('flex gap-2 rounded-lg p-3 text-sm', result.dansBudget ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700')}>
                  {result.dansBudget ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
                  <span>
                    {result.dansBudget
                      ? `Ce bien (${formatCHF(prixNum)}) est dans votre capacité d’achat.`
                      : `Ce bien (${formatCHF(prixNum)}) dépasse votre capacité estimée de ${formatCHF(-result.ecart)}.`}
                  </span>
                </div>
              )}
              {prixNum > 0 && (
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Fonds propres requis : <span className="font-medium text-foreground">{formatCHF(result.apportRequis)}</span></li>
                  <li>Charges théoriques : <span className="font-medium text-foreground">{formatCHF(result.chargesMensuellesBien)}/mois</span></li>
                  <li>Revenu net conseillé : <span className="font-medium text-foreground">{formatCHF(result.revenuRequis)}/mois</span></li>
                </ul>
              )}
            </>
          )}

          <Button asChild className="w-full" size="lg">
            <Link to="/nouveau-mandat">
              Faites-vous accompagner dans votre recherche
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setStep('saisie')}
          >
            Refaire un calcul
          </button>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-snug text-muted-foreground">
        {isAchat
          ? 'Estimation indicative basée sur les critères bancaires suisses usuels (charges théoriques 5 % du prix ≤ 1/3 des revenus, fonds propres ≥ 20 %). Chaque banque applique ses propres critères.'
          : 'Estimation indicative basée sur la règle du tiers appliquée par la plupart des régies (loyer ≤ 1/3 des revenus nets). Chaque dossier est étudié individuellement.'}
      </p>
    </Card>
  );
}

export default AnnonceBudgetCalculator;
