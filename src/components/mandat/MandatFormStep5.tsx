import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Users, UserPlus, Wallet, Briefcase, Globe } from 'lucide-react';
import { MandatFormData, CandidatData, NATIONALITES, TYPES_PERMIS, LIENS_CANDIDAT } from './types';
import { PremiumInput } from '@/components/forms-premium/PremiumInput';
import { PremiumSelect } from '@/components/forms-premium/PremiumSelect';
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

const emptyCanditat: Omit<CandidatData, 'id'> = {
  prenom: '', nom: '', date_naissance: '', nationalite: '',
  type_permis: '', profession: '', employeur: '', revenus_mensuels: 0, lien_avec_client: '',
};

export default function MandatFormStep5({ data, onChange }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCandidat, setCurrentCandidat] = useState<Omit<CandidatData, 'id'>>(emptyCanditat);

  const handleAddCandidat = () => {
    if (!currentCandidat.prenom || !currentCandidat.nom || !currentCandidat.lien_avec_client) return;
    const newCandidat: CandidatData = { ...currentCandidat, id: crypto.randomUUID() };
    onChange({ candidats: [...data.candidats, newCandidat] });
    setCurrentCandidat(emptyCanditat);
    setIsDialogOpen(false);
  };

  const handleRemoveCandidat = (id: string) => {
    onChange({ candidats: data.candidats.filter(c => c.id !== id) });
  };

  const totalRevenus = data.candidats.reduce((sum, c) => sum + (c.revenus_mensuels || 0), 0);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Candidats supplémentaires</h2>
        <p className="text-sm text-[hsl(40_20%_55%)] mt-1">
          Ajoutez les personnes qui occuperont le logement avec vous (conjoint, enfants, colocataires, garants…).
        </p>
      </div>

      {/* Add button */}
      <div className="flex justify-center">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-[hsl(38_45%_48%/0.3)] text-[hsl(38_55%_65%)] bg-[hsl(38_45%_48%/0.06)] hover:bg-[hsl(38_45%_48%/0.12)] hover:border-[hsl(38_45%_48%/0.5)] transition-all duration-200"
            >
              <UserPlus size={16} />
              Ajouter un candidat
            </button>
          </DialogTrigger>

          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[hsl(30_15%_10%)] border-[hsl(38_45%_48%/0.2)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[hsl(40_20%_88%)] font-serif">
                <UserPlus size={18} className="text-[hsl(38_55%_65%)]" />
                Ajouter un candidat
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <PremiumInput label="Prénom" value={currentCandidat.prenom} onChange={(e) => setCurrentCandidat({ ...currentCandidat, prenom: e.target.value })} placeholder="Prénom" required />
                <PremiumInput label="Nom" value={currentCandidat.nom} onChange={(e) => setCurrentCandidat({ ...currentCandidat, nom: e.target.value })} placeholder="Nom" required />
              </div>
              <PremiumSelect
                label="Lien avec le titulaire"
                value={currentCandidat.lien_avec_client}
                onValueChange={(v) => setCurrentCandidat({ ...currentCandidat, lien_avec_client: v })}
                options={LIENS_CANDIDAT.map(l => ({ value: l, label: l }))}
                required
              />
              <PremiumInput label="Date de naissance" type="date" value={currentCandidat.date_naissance} onChange={(e) => setCurrentCandidat({ ...currentCandidat, date_naissance: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <PremiumSelect label="Nationalité" value={currentCandidat.nationalite} onValueChange={(v) => setCurrentCandidat({ ...currentCandidat, nationalite: v })} options={NATIONALITES.map(n => ({ value: n, label: n }))} />
                <PremiumSelect label="Type de permis" value={currentCandidat.type_permis} onValueChange={(v) => setCurrentCandidat({ ...currentCandidat, type_permis: v })} options={TYPES_PERMIS.map(p => ({ value: p.value, label: p.label }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <PremiumInput label="Profession" value={currentCandidat.profession} onChange={(e) => setCurrentCandidat({ ...currentCandidat, profession: e.target.value })} placeholder="Profession" />
                <PremiumInput label="Employeur" value={currentCandidat.employeur} onChange={(e) => setCurrentCandidat({ ...currentCandidat, employeur: e.target.value })} placeholder="Employeur" />
              </div>

              {/* Revenus CHF */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[hsl(40_20%_60%)]">Revenus mensuels (CHF)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={currentCandidat.revenus_mensuels || ''}
                    onChange={(e) => setCurrentCandidat({ ...currentCandidat, revenus_mensuels: Number(e.target.value) })}
                    placeholder="Ex: 4000"
                    className="w-full bg-[hsl(30_15%_9%/0.6)] border border-[hsl(38_45%_48%/0.2)] rounded-xl px-4 py-3 pr-14 text-sm text-[hsl(40_20%_75%)] placeholder:text-[hsl(40_20%_38%)] focus:outline-none focus:border-[hsl(38_55%_65%/0.7)] focus:ring-2 focus:ring-[hsl(38_45%_48%/0.25)] transition-all duration-300"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(40_20%_45%)] text-xs font-medium pointer-events-none">CHF</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCandidat}
                disabled={!currentCandidat.prenom || !currentCandidat.nom || !currentCandidat.lien_avec_client}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(38_45%_48%)] text-[hsl(30_15%_8%)] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Plus size={16} /> Ajouter
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {data.candidats.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(30_10%_14%)] mb-3">
            <Users size={28} strokeWidth={1.2} className="text-[hsl(40_20%_35%)]" />
          </div>
          <p className="text-sm text-[hsl(40_20%_45%)]">Aucun candidat supplémentaire ajouté</p>
          <p className="text-xs text-[hsl(40_20%_35%)] mt-1">Vous pouvez passer cette étape si vous êtes seul(e)</p>
        </div>
      ) : (
        <div className="space-y-3">
          {totalRevenus > 0 && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3 flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-300 flex items-center gap-1.5">
                <Wallet size={14} /> Revenus additionnels
              </span>
              <span className="text-sm font-bold text-emerald-400">+{totalRevenus.toLocaleString('fr-CH')} CHF/mois</span>
            </div>
          )}
          {data.candidats.map((candidat, index) => (
            <div
              key={candidat.id}
              className="group rounded-xl border border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_12%_10%/0.6)] p-4 hover:border-[hsl(38_45%_48%/0.35)] transition-all duration-200"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(38_45%_48%/0.25)] to-[hsl(38_45%_48%/0.08)] flex items-center justify-center flex-shrink-0 border border-[hsl(38_45%_48%/0.2)]">
                    <span className="text-xs font-bold text-[hsl(38_55%_65%)]">
                      {candidat.prenom.charAt(0)}{candidat.nom.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[hsl(40_20%_82%)] truncate">{candidat.prenom} {candidat.nom}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[hsl(38_45%_48%/0.15)] text-[hsl(38_55%_65%)] border border-[hsl(38_45%_48%/0.2)]">
                      {candidat.lien_avec_client}
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-[hsl(40_20%_45%)]">
                      {candidat.profession && <span className="flex items-center gap-1"><Briefcase size={10} />{candidat.profession}</span>}
                      {candidat.nationalite && <span className="flex items-center gap-1"><Globe size={10} />{candidat.nationalite}</span>}
                      {candidat.revenus_mensuels > 0 && <span className="flex items-center gap-1 text-emerald-400"><Wallet size={10} />{candidat.revenus_mensuels.toLocaleString('fr-CH')} CHF/mois</span>}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCandidat(candidat.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-red-400 hover:bg-red-950/30"
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
