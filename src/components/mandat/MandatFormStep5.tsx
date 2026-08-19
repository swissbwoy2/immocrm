import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Users, UserPlus, Wallet, Briefcase, Globe } from 'lucide-react';
import { MandatFormData, CandidatData, NATIONALITES, TYPES_PERMIS, LIENS_CANDIDAT } from './types';
import { LandingInput } from '@/components/forms-premium/LandingInput';
import { LandingSelect } from '@/components/forms-premium/LandingSelect';
import { LandingTextarea } from '@/components/forms-premium/LandingTextarea';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

const TYPE_CONTRAT_OPTIONS = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'Indépendant', label: 'Indépendant / Freelance' },
  { value: 'Rentier', label: 'Rentier / Retraite' },
  { value: 'Autre', label: 'Autre' },
];

const emptyCandidat: Omit<CandidatData, 'id'> = {
  prenom: '', nom: '', date_naissance: '', nationalite: '',
  type_permis: '', email: '', telephone: '', adresse: '',
  profession: '', employeur: '', type_contrat: '', date_entree_fonction: '',
  revenus_mensuels: 0, revenus_annuels: 0, autres_revenus: 0,
  charges_mensuelles: 0, credit_leasing_pension: 0,
  fonds_propres_personnels: 0, lpp_disponible: 0, troisieme_pilier: 0,
  lien_avec_client: '', remarques: '',
};

export default function MandatFormStep5({ data, onChange }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCandidat, setCurrentCandidat] = useState<Omit<CandidatData, 'id'>>(emptyCandidat);
  const isPurchase = data.journey === 'purchase';

  const handleAddCandidat = () => {
    if (!currentCandidat.prenom || !currentCandidat.nom || !currentCandidat.lien_avec_client) return;
    const newCandidat: CandidatData = { ...currentCandidat, id: crypto.randomUUID() };
    onChange({ candidats: [...data.candidats, newCandidat] });
    setCurrentCandidat(emptyCandidat);
    setIsDialogOpen(false);
  };

  const handleRemoveCandidat = (id: string) => {
    onChange({ candidats: data.candidats.filter(c => c.id !== id) });
  };

  const totalRevenus = data.candidats.reduce((sum, c) => sum + (c.revenus_mensuels || 0), 0);
  const totalFondsPropres = data.candidats.reduce((sum, c) =>
    sum + (c.fonds_propres_personnels || 0) + (c.lpp_disponible || 0) + (c.troisieme_pilier || 0), 0);

  const set = (field: keyof Omit<CandidatData, 'id'>, value: any) =>
    setCurrentCandidat(prev => ({ ...prev, [field]: value }));

  const dialogTitle = isPurchase ? 'Ajouter un co-acquéreur' : 'Ajouter un candidat';
  const addBtnLabel = isPurchase ? 'Ajouter un co-acquéreur' : 'Ajouter un candidat';
  const emptyLabel = isPurchase
    ? 'Aucun co-acquéreur ajouté'
    : 'Aucun candidat supplémentaire ajouté';
  const emptyHint = isPurchase
    ? 'Ajoutez votre conjoint(e) ou co-acheteur si applicable'
    : 'Vous pouvez passer cette étape si vous êtes seul(e)';

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {isPurchase ? 'Co-acquéreurs' : 'Candidats supplémentaires'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isPurchase
            ? "Ajoutez toute personne qui participera à l'achat (conjoint, co-acheteur, garant…)."
            : 'Ajoutez les personnes qui occuperont le logement avec vous (conjoint, enfants, colocataires, garants…).'}
        </p>
      </div>

      <div className="flex justify-center">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border text-primary bg-primary/10 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
            >
              <UserPlus size={16} />
              {addBtnLabel}
            </button>
          </DialogTrigger>

          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-muted/40 border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground font-serif">
                <UserPlus size={18} className="text-primary" />
                {dialogTitle}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Identité */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Identité</p>
                <div className="grid grid-cols-2 gap-3">
                  <LandingInput label="Prénom *" value={currentCandidat.prenom} onChange={(e) => set('prenom', e.target.value)} placeholder="Prénom" required />
                  <LandingInput label="Nom *" value={currentCandidat.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Nom" required />
                </div>
                <LandingSelect
                  label="Lien avec le titulaire *"
                  value={currentCandidat.lien_avec_client}
                  onValueChange={(v) => set('lien_avec_client', v)}
                  options={LIENS_CANDIDAT.map(l => ({ value: l, label: l }))}
                  required
                />
                <LandingInput label="Date de naissance" type="date" value={currentCandidat.date_naissance || ''} onChange={(e) => set('date_naissance', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <LandingSelect label="Nationalité" value={currentCandidat.nationalite || ''} onValueChange={(v) => set('nationalite', v)} options={NATIONALITES.map(n => ({ value: n, label: n }))} />
                  <LandingSelect label="Type de permis" value={currentCandidat.type_permis || ''} onValueChange={(v) => set('type_permis', v)} options={TYPES_PERMIS.map(p => ({ value: p.value, label: p.label }))} />
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <LandingInput label="Email" type="email" value={currentCandidat.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="email@exemple.ch" />
                  <LandingInput label="Téléphone" type="tel" value={currentCandidat.telephone || ''} onChange={(e) => set('telephone', e.target.value)} placeholder="+41 79 000 00 00" />
                </div>
                <LandingInput label="Adresse actuelle" value={currentCandidat.adresse || ''} onChange={(e) => set('adresse', e.target.value)} placeholder="Rue, ville" />
              </div>

              {/* Situation professionnelle */}
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Situation professionnelle</p>
                <div className="grid grid-cols-2 gap-3">
                  <LandingInput label="Profession" value={currentCandidat.profession} onChange={(e) => set('profession', e.target.value)} placeholder="Profession" />
                  <LandingInput label="Employeur" value={currentCandidat.employeur} onChange={(e) => set('employeur', e.target.value)} placeholder="Employeur" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <LandingSelect
                    label="Type de contrat"
                    value={currentCandidat.type_contrat || ''}
                    onValueChange={(v) => set('type_contrat', v)}
                    options={TYPE_CONTRAT_OPTIONS}
                  />
                  <LandingInput label="Date d'entrée en fonction" type="date" value={currentCandidat.date_entree_fonction || ''} onChange={(e) => set('date_entree_fonction', e.target.value)} />
                </div>
              </div>

              {/* Revenus */}
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Revenus (CHF)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Revenus mensuels nets</label>
                    <div className="relative">
                      <input type="number" value={currentCandidat.revenus_mensuels || ''} onChange={(e) => set('revenus_mensuels', Number(e.target.value))} placeholder="Ex: 4000" className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none">CHF</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Revenus annuels</label>
                    <div className="relative">
                      <input type="number" value={currentCandidat.revenus_annuels || ''} onChange={(e) => set('revenus_annuels', Number(e.target.value))} placeholder="Ex: 60000" className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none">CHF</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Autres revenus (rentes, loyers, etc.)</label>
                  <div className="relative">
                    <input type="number" value={currentCandidat.autres_revenus || ''} onChange={(e) => set('autres_revenus', Number(e.target.value))} placeholder="0" className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none">CHF</span>
                  </div>
                </div>
              </div>

              {/* Charges */}
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Charges mensuelles (CHF)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Charges totales</label>
                    <div className="relative">
                      <input type="number" value={currentCandidat.charges_mensuelles || ''} onChange={(e) => set('charges_mensuelles', Number(e.target.value))} placeholder="0" className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none">CHF</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Crédits / leasing / pensions</label>
                    <div className="relative">
                      <input type="number" value={currentCandidat.credit_leasing_pension || ''} onChange={(e) => set('credit_leasing_pension', Number(e.target.value))} placeholder="0" className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none">CHF</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fonds propres */}
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Fonds propres (CHF)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Cash / épargne</label>
                    <input type="number" value={currentCandidat.fonds_propres_personnels || ''} onChange={(e) => set('fonds_propres_personnels', Number(e.target.value))} placeholder="0" className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">LPP (2e pilier)</label>
                    <input type="number" value={currentCandidat.lpp_disponible || ''} onChange={(e) => set('lpp_disponible', Number(e.target.value))} placeholder="0" className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">3e pilier</label>
                    <input type="number" value={currentCandidat.troisieme_pilier || ''} onChange={(e) => set('troisieme_pilier', Number(e.target.value))} placeholder="0" className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300" />
                  </div>
                </div>
              </div>

              {/* Remarques */}
              <div className="pt-2 border-t border-border">
                <LandingTextarea
                  label="Remarques (optionnel)"
                  value={currentCandidat.remarques || ''}
                  onChange={(e) => set('remarques', e.target.value)}
                  placeholder="Informations complémentaires..."
                  rows={2}
                />
              </div>

              <button
                type="button"
                onClick={handleAddCandidat}
                disabled={!currentCandidat.prenom || !currentCandidat.nom || !currentCandidat.lien_avec_client}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-primary text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Plus size={16} /> Ajouter
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {data.candidats.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/40 mb-3">
            <Users size={28} strokeWidth={1.2} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">{emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(totalRevenus > 0 || totalFondsPropres > 0) && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3 space-y-1">
              {totalRevenus > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                    <Wallet size={14} /> Revenus additionnels
                  </span>
                  <span className="text-sm font-bold text-emerald-600">+{totalRevenus.toLocaleString('fr-CH')} CHF/mois</span>
                </div>
              )}
              {totalFondsPropres > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                    <Wallet size={14} /> Fonds propres additionnels
                  </span>
                  <span className="text-sm font-bold text-emerald-600">+{totalFondsPropres.toLocaleString('fr-CH')} CHF</span>
                </div>
              )}
            </div>
          )}
          {data.candidats.map((candidat, index) => (
            <div
              key={candidat.id}
              className="group rounded-xl border border-border bg-muted/40 p-4 hover:border-border transition-all duration-200"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center flex-shrink-0 border border-border">
                    <span className="text-xs font-bold text-primary">
                      {candidat.prenom.charAt(0)}{candidat.nom.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{candidat.prenom} {candidat.nom}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-border">
                      {candidat.lien_avec_client}
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {candidat.profession && <span className="flex items-center gap-1"><Briefcase size={10} />{candidat.profession}</span>}
                      {candidat.nationalite && <span className="flex items-center gap-1"><Globe size={10} />{candidat.nationalite}</span>}
                      {candidat.revenus_mensuels > 0 && <span className="flex items-center gap-1 text-emerald-600"><Wallet size={10} />{candidat.revenus_mensuels.toLocaleString('fr-CH')} CHF/mois</span>}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCandidat(candidat.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-destructive hover:bg-red-950/30"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
