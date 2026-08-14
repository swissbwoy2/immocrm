import { ArrowLeft, Mail, Phone, Building2, Briefcase, User, DollarSign, Home, CheckCircle2, Edit, Trash2, MailPlus, Send, MessageSquare, Sparkles, Clock, TrendingUp, Loader2, Receipt, Users, FileText, Key, Shield, Target, Wallet, Banknote, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';
import { PremiumCard } from '@/components/premium/PremiumCard';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { PurchaseDetailSections } from './PurchaseDetailSections';
import { computeProgression, formatCHF } from '@/lib/purchaseFinancing';
import type { UsePurchaseProjectResult } from '@/hooks/usePurchaseProject';
import { SwissRomandeMapGoogle } from '@/components/SwissRomandeMapGoogle';

const PremiumStatCard = ({
  label, value, prefix = '', animated = false, variant = 'default', icon: Icon,
}: {
  label: string; value: number | string; prefix?: string; animated?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'; icon?: React.ElementType;
}) => {
  const variantStyles = {
    default: 'bg-muted/50 border-border/30',
    primary: 'bg-primary/10 border-primary/30',
    success: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-orange-500/10 border-orange-500/30',
    danger: 'bg-red-500/10 border-red-500/30',
  };
  const textStyles = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-orange-600 dark:text-orange-400',
    danger: 'text-red-600 dark:text-red-400',
  };
  return (
    <div className={`group p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${variantStyles[variant]}`}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className={`w-4 h-4 ${textStyles[variant]} opacity-70`} />}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${textStyles[variant]}`}>
        {animated && typeof value === 'number' ? (
          <>{prefix}<AnimatedCounter value={value} duration={1200} decimals={0} /></>
        ) : (
          `${prefix}${typeof value === 'number' ? value.toLocaleString() : value}`
        )}
      </p>
    </div>
  );
};

const Cell = ({ label, value }: { label: string; value: any }) => (
  <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="font-medium text-sm">{value ?? 'Non renseigné'}</p>
  </div>
);

interface Props {
  client: any;
  profile: any;
  agent: any | null;
  purchaseHook: UsePurchaseProjectResult;
  navigate: (path: any) => void;
  onInvite: () => void;
  inviting: boolean;
  onSendEmailOpen: () => void;
  onSendMessage: () => void;
  onEditOpen: () => void;
  onDeleteConfirm: () => void;
  deleting: boolean;
  onCreateInvoice: () => void;
  abaNinjaLoading: boolean;
  onUploadDoc?: () => void;
}

export function PurchaseClientDetailPremium({
  client, profile, agent, purchaseHook, navigate,
  onInvite, inviting, onSendEmailOpen, onSendMessage,
  onEditOpen, onDeleteConfirm, deleting,
  onCreateInvoice, abaNinjaLoading, onUploadDoc,
}: Props) {
  const { project, financing, computed, properties, visitReports, negotiations, steps, documents } = purchaseHook;

  const isPending = !project || project.statut === 'en_attente_activation';
  const isActive = project?.statut === 'actif';

  const prog = isActive && project
    ? computeProgression(project.date_debut_progression, project.duree_progression_jours || 180)
    : null;

  const doneSteps = steps.filter((s) => s.statut === 'fait').length;

  const montantMandat = project?.montant_mandat ?? 4999;
  const montantAcompte = project?.montant_acompte ?? 2499;
  const soldeSucces = montantMandat - montantAcompte;

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-sky-500/3">
      <div className="p-4 md:p-8 space-y-6">

        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Retour
        </Button>

        {/* Status banner */}
        {isPending ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 animate-fade-in">
            <div className="p-2 rounded-full bg-amber-500/20 shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400">Projet d'achat en attente d'activation</p>
              <p className="text-sm text-muted-foreground">
                Mandat achat : 6 mois · Activation en attente.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-primary/20/30 bg-sky-500/10 p-4 flex items-center gap-3 animate-fade-in">
            <div className="p-2 rounded-full bg-sky-500/20">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-primary dark:text-primary">✅ Parcours achat actif</p>
              <p className="text-sm text-muted-foreground">
                {prog ? `Mandat achat : 6 mois · ${doneSteps}/${steps.length} étapes complétées` : 'Mandat achat : 6 mois'}
              </p>
            </div>
          </div>
        )}

        {/* ─── Hero card ─── */}
        <div className="relative rounded-3xl bg-gradient-to-br from-card via-card to-sky-500/5 border border-border/50 p-6 overflow-hidden animate-fade-in">
          <FloatingParticles count={20} />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left: avatar + name + progress */}
            <div className="relative flex-1 min-w-0">
              <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sky-500/4 blur-3xl" />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-sky-500/3 blur-3xl" />
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_25px_rgba(14,165,233,0.3)]">
                    {profile.prenom?.[0]}{profile.nom?.[0]}
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    {profile.prenom} {profile.nom}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge className="bg-sky-500/20 text-primary dark:text-primary border-primary/20/30 backdrop-blur-sm">
                      <Key className="w-3 h-3 mr-1" />
                      Acheteur
                    </Badge>
                    <Badge className={`backdrop-blur-sm border ${isPending
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30'}`}>
                      {isPending ? '⏳ En attente' : '✅ Actif'}
                    </Badge>
                    {project?.statut_mandat && (
                      <Badge variant="outline" className="bg-card/50 backdrop-blur-sm text-xs">
                        Mandat : {project.statut_mandat}
                      </Badge>
                    )}
                    {project?.statut_acompte && (
                      <Badge variant="outline" className="bg-card/50 backdrop-blur-sm text-xs">
                        Acompte : {project.statut_acompte}
                      </Badge>
                    )}
                    {financing?.statut_bancaire && (
                      <Badge className="bg-indigo-500/20 text-primary dark:text-primary border-primary/20/30 backdrop-blur-sm text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Banque : {financing.statut_bancaire}
                      </Badge>
                    )}
                    {!profile.actif && (
                      <Badge variant="outline" className="bg-blue-500/10 text-primary border-primary/20/30 backdrop-blur-sm animate-pulse-soft text-xs">
                        <Mail className="w-3 h-3 mr-1" />
                        Non activé
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* 60-day progress bar */}
              {isPending ? (
                <div className="mt-6 max-w-2xl">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-muted-foreground">⏳ En attente d'activation</p>
                        <p className="text-sm text-muted-foreground">
                          Le dossier sera activé par l'admin pour démarrer le parcours
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 relative h-3 bg-muted/50 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-muted" style={{ width: '0%' }} />
                    </div>
                  </div>
                </div>
              ) : prog ? (
                <div className="mt-6 max-w-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">Progression achat — mandat 6 mois</p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                      prog.jourActuel < 90
                        ? 'bg-sky-500/20 text-primary dark:text-primary shadow-[0_0_15px_rgba(14,165,233,0.2)]'
                        : prog.jourActuel < 150
                        ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                        : 'bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse'
                    }`}>
                      <TrendingUp className="w-4 h-4" />
                      Temps restant : {prog.tempsRestantLabel}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-right mb-2">
                    <AnimatedCounter value={doneSteps} duration={800} decimals={0} />/{steps.length} étapes complétées
                  </p>
                  <div className="relative h-4 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r rounded-full transition-all duration-1000 ease-out ${
                        prog.jourActuel < 90 ? 'from-sky-500 to-sky-400' : prog.jourActuel < 150 ? 'from-orange-500 to-amber-400' : 'from-red-500 to-rose-400'
                      }`}
                      style={{ width: `${Math.min(prog.pourcentage, 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
                    </div>
                    <div
                      className={`absolute inset-y-0 left-0 blur-md opacity-50 rounded-full bg-gradient-to-r ${
                        prog.jourActuel < 90 ? 'from-sky-500 to-sky-400' : prog.jourActuel < 150 ? 'from-orange-500 to-amber-400' : 'from-red-500 to-rose-400'
                      }`}
                      style={{ width: `${Math.min(prog.pourcentage, 100)}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right: Action buttons */}
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap lg:flex-nowrap w-full sm:w-auto">
              <Button
                variant="outline"
                className={`w-full sm:w-auto group backdrop-blur-sm border-border/50 transition-all duration-300 ${
                  !profile.actif
                    ? 'bg-blue-500/10 border-primary/20/30 text-primary hover:bg-blue-500/20 animate-pulse-soft'
                    : 'bg-card/50 hover:bg-primary/10 hover:border-primary/30'
                }`}
                onClick={onInvite}
                disabled={inviting}
              >
                {inviting
                  ? <div className="h-4 w-4 sm:mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Send className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                }
                <span className="hidden sm:inline">{!profile.actif ? 'Envoyer invitation' : 'Renvoyer invitation'}</span>
                <span className="sm:hidden">Inviter</span>
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                onClick={onSendEmailOpen}
              >
                <MailPlus className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Email</span>
                <span className="sm:hidden">Email</span>
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                onClick={onSendMessage}
              >
                <MessageSquare className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Message</span>
                <span className="sm:hidden">Msg</span>
              </Button>
              {client.abaninja_invoice_ref ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    <span className="hidden sm:inline">Facture: </span>
                    {client.abaninja_invoice_ref}
                  </span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto group bg-amber-500/10 backdrop-blur-sm border-amber-500/30 text-amber-600 hover:bg-amber-500/20 transition-all duration-300"
                  onClick={onCreateInvoice}
                  disabled={abaNinjaLoading}
                >
                  {abaNinjaLoading
                    ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                    : <Receipt className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                  }
                  <span className="hidden sm:inline">Facture</span>
                  <span className="sm:hidden">Facture</span>
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full sm:w-auto group hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300"
                    disabled={deleting}
                  >
                    <Trash2 className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Supprimer</span>
                    <span className="sm:hidden">Suppr.</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-red-500/20">
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </div>
                      Confirmer la suppression
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer ce client acheteur ? Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Supprimer définitivement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                className="w-full sm:w-auto group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all duration-300"
                onClick={onEditOpen}
              >
                <Edit className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                <span>Modifier</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Mandat financier summary ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <PremiumStatCard label="Mandat total achat" value={`CHF ${montantMandat.toLocaleString('fr-CH')}`} variant="primary" icon={Banknote} />
          <PremiumStatCard label="Acompte" value={`CHF ${montantAcompte.toLocaleString('fr-CH')}`} variant="warning" icon={Wallet} />
          <PremiumStatCard label="Solde au succès" value={`CHF ${soldeSucces.toLocaleString('fr-CH')}`} variant="success" icon={Target} />
          <PremiumStatCard label="Durée mandat" value="6 mois" icon={Clock} />
        </div>

        {/* ─── KPI grid ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <PremiumStatCard label="Prix cible" value={computed ? formatCHF(computed.prixCible) : '—'} variant="primary" icon={Target} />
          <PremiumStatCard label="Capacité achat max" value={computed ? formatCHF(computed.capaciteAchatMax) : '—'} variant="success" icon={TrendingUp} />
          <PremiumStatCard label="Fonds propres totaux" value={computed ? formatCHF(computed.fondsPropresTotal) : '—'} icon={Wallet} />
          <PremiumStatCard label="Hypothèque estimée" value={computed ? formatCHF(computed.montantHypothecaire) : '—'} icon={Building2} />
          <PremiumStatCard
            label="Taux d'effort"
            value={computed ? `${computed.tauxEffort.toFixed(1)} %` : '—'}
            variant={computed && computed.tauxEffort > 33 ? 'danger' : computed && computed.tauxEffort > 28 ? 'warning' : 'success'}
            icon={Sparkles}
          />
          <PremiumStatCard
            label="Étapes faites"
            value={`${doneSteps} / ${steps.length || 17}`}
            variant={doneSteps === steps.length && steps.length > 0 ? 'success' : 'default'}
            icon={CheckCircle2}
          />
        </div>

        {/* ─── KPI row 2 ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <PremiumStatCard label="Biens sélectionnés" value={properties.length} icon={Home} />
          <PremiumStatCard label="Rapports de visite" value={visitReports.length} icon={FileText} />
          <PremiumStatCard label="Offres & négociations" value={negotiations.length} icon={MessageSquare} />
          <PremiumStatCard label="Documents achat" value={documents.length} icon={FileText} />
        </div>

        {/* ─── Premium info cards ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Informations personnelles */}
          <PremiumCard icon={User} title="Informations personnelles" delay={250}>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">{profile.telephone || 'Non renseigné'}</span>
                </div>
                {client.date_naissance && (
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm">{new Date(client.date_naissance).toLocaleDateString('fr-CH')}</span>
                  </div>
                )}
                {client.adresse && (
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm">{client.adresse}</span>
                  </div>
                )}
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
              <div className="grid grid-cols-2 gap-4">
                <Cell label="État civil" value={client.etat_civil} />
                <Cell label="Nationalité" value={client.nationalite} />
                <Cell label="Type de permis" value={client.type_permis} />
                <Cell label="Situation familiale" value={client.situation_familiale} />
              </div>
            </CardContent>
          </PremiumCard>

          {/* Critères d'achat (NO location fields) */}
          <PremiumCard icon={Home} title="Critères d'achat" delay={300}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Cell label="Type de bien recherché" value={client.type_bien} />
                <Cell label="Pièces souhaitées" value={client.pieces} />
                <Cell label="Usage" value={client.utilisation_logement} />
                <Cell label="Nombre d'occupants" value={client.nombre_occupants} />
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 backdrop-blur-sm">
                <p className="text-xs text-muted-foreground mb-2">Zone(s) recherchée(s)</p>
                <p className="font-medium text-sm text-primary">{client.region_recherche || 'Non renseigné'}</p>
              </div>
              {client.souhaits_particuliers && (
                <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 transition-all duration-300">
                  <p className="text-xs text-muted-foreground mb-2">Souhaits particuliers</p>
                  <p className="text-sm">{client.souhaits_particuliers}</p>
                </div>
              )}
            </CardContent>
          </PremiumCard>

          {/* Situation professionnelle */}
          <PremiumCard icon={Briefcase} title="Situation professionnelle" delay={350}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Cell label="Profession" value={client.profession} />
                <Cell label="Employeur" value={client.employeur} />
                <Cell label="Type de contrat" value={client.type_contrat} />
                <Cell label="Secteur d'activité" value={client.secteur_activite} />
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 transition-all duration-300">
                  <p className="text-xs text-muted-foreground mb-1">Date d'engagement</p>
                  <p className="font-medium text-sm">
                    {client.date_engagement ? new Date(client.date_engagement).toLocaleDateString('fr-CH') : 'Non renseigné'}
                  </p>
                </div>
                {getBuyerAnnualIncome(financing, client) > 0 ? (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground mb-1">Revenu annuel retenu</p>
                    <p className="font-bold text-green-600 dark:text-green-400">
                      CHF {getBuyerAnnualIncome(financing, client).toLocaleString('fr-CH')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      soit CHF {getBuyerMonthlyIncome(financing, client).toLocaleString('fr-CH')} / mois
                    </p>
                  </div>
                ) : null}

              </div>
            </CardContent>
          </PremiumCard>

          {/* Conseiller assigné + suivi */}
          <PremiumCard icon={Users} title="Suivi & conseiller" delay={400}>
            <CardContent className="space-y-4">
              {agent ? (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 backdrop-blur-sm">
                  <p className="text-xs text-muted-foreground mb-2">Conseiller assigné</p>
                  <p className="font-bold text-primary">
                    {(agent as any).prenom ?? (agent as any).profile?.prenom} {(agent as any).nom ?? (agent as any).profile?.nom}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(agent as any).email ?? (agent as any).profile?.email}
                  </p>
                </div>
              ) : (
                <div className="text-center p-4 rounded-xl bg-muted/30 backdrop-blur-sm">
                  <p className="text-muted-foreground mb-2">Aucun conseiller assigné</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin/assignations')}
                    className="group hover:bg-primary/10 hover:border-primary/30"
                  >
                    <Users className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Assigner un conseiller
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm">
                  <p className="text-xs text-muted-foreground mb-2">Date d'ajout</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">
                      {new Date(client.date_ajout || client.created_at || '').toLocaleDateString('fr-CH')}
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm">
                  <p className="text-xs text-muted-foreground mb-2">Durée contractuelle mandat</p>
                  <p className="font-bold">6 mois</p>
                </div>
              </div>
              {client.note_agent && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                  <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 transition-all duration-300">
                    <p className="text-xs text-muted-foreground mb-2">Notes du conseiller</p>
                    <p className="text-sm">{client.note_agent}</p>
                  </div>
                </>
              )}
            </CardContent>
          </PremiumCard>
        </div>

        {/* ─── Zones de recherche (Google Maps) ─── */}
        <SwissRomandeMapGoogle client={client} />

        {/* ─── PurchaseDetailSections: financing, docs, properties, visits, negotiations, notary, steps ─── */}
        <PurchaseDetailSections clientId={client.id} userId={client.user_id} mode="admin" onUploadDoc={onUploadDoc} />

      </div>
    </div>
  );
}
