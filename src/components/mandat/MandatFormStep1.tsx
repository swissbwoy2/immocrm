import { useMemo } from 'react';
import { MandatFormData, NATIONALITES, TYPES_PERMIS, ETATS_CIVILS } from './types';
import { GoogleAddressAutocomplete, AddressComponents } from '@/components/GoogleAddressAutocomplete';
import { PremiumInput } from '@/components/forms-premium/PremiumInput';
import { PremiumSelect } from '@/components/forms-premium/PremiumSelect';
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';
import { IconUser, IconMail, IconPhone, IconMapPin, IconCalendar, IconShield } from '@/components/forms-premium/icons/LuxuryIcons';

const MONTHS = [
  { value: '01', label: 'Janvier' }, { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' }, { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' }, { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' }, { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' }, { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' },
];
const YEARS = Array.from({ length: 91 }, (_, i) => String(2010 - i));

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep1({ data, onChange }: Props) {
  const dateParts = useMemo(() => {
    if (data.date_naissance && data.date_naissance.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = data.date_naissance.split('-');
      return { day, month, year };
    }
    return { day: '', month: '', year: '' };
  }, [data.date_naissance]);

  const getDaysInMonth = (month: string, year: string) => {
    if (!month) return 31;
    const m = parseInt(month, 10);
    const y = year ? parseInt(year, 10) : 2000;
    if ([4, 6, 9, 11].includes(m)) return 30;
    if (m === 2) {
      const isLeapYear = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
      return isLeapYear ? 29 : 28;
    }
    return 31;
  };

  const daysInMonth = getDaysInMonth(dateParts.month, dateParts.year);
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));

  const handleDatePartChange = (part: 'day' | 'month' | 'year', value: string) => {
    let newDay = part === 'day' ? value : dateParts.day;
    const newMonth = part === 'month' ? value : dateParts.month;
    const newYear = part === 'year' ? value : dateParts.year;
    if (newDay && newMonth) {
      const maxDays = getDaysInMonth(newMonth, newYear);
      if (parseInt(newDay, 10) > maxDays) newDay = String(maxDays).padStart(2, '0');
    }
    if (newDay && newMonth && newYear) {
      onChange({ date_naissance: `${newYear}-${newMonth}-${newDay}` });
    } else {
      onChange({ date_naissance: `${newYear || '0000'}-${newMonth || '00'}-${newDay || '00'}` });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 mb-6">
        <LuxuryIconBadge size="lg"><IconUser size={26} /></LuxuryIconBadge>
        <div className="text-center">
          <h2 className="text-xl font-serif font-bold text-[hsl(40_20%_88%)]">Informations personnelles</h2>
          <p className="text-xs text-[hsl(40_20%_45%)] mt-1">Vos coordonnées et situation personnelle</p>
        </div>
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%/0.6)] to-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PremiumInput label="E-mail" type="email" value={data.email} onChange={(e) => onChange({ email: e.target.value })} icon={<IconMail size={16} />} placeholder="votre.email@example.ch" required />
        <PremiumInput label="Téléphone" type="tel" value={data.telephone} onChange={(e) => onChange({ telephone: e.target.value })} icon={<IconPhone size={16} />} placeholder="+41 79 123 45 67" required />
        <PremiumInput label="Prénom" value={data.prenom} onChange={(e) => onChange({ prenom: e.target.value })} icon={<IconUser size={16} />} placeholder="Prénom" required />
        <PremiumInput label="Nom de famille" value={data.nom} onChange={(e) => onChange({ nom: e.target.value })} icon={<IconUser size={16} />} placeholder="Nom" required />

        {/* Adresse avec autocomplete */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-[hsl(40_20%_60%)]">
            <span className="text-[hsl(38_45%_48%)]"><IconMapPin size={16} /></span>
            Adresse actuelle
            <span className="text-[hsl(40_20%_38%)] text-[10px]">(optionnel)</span>
          </label>
          <GoogleAddressAutocomplete
            value={data.adresse}
            onChange={(address: AddressComponents) => onChange({ adresse: address.fullAddress })}
            onInputChange={(value) => onChange({ adresse: value })}
            placeholder="Commencez à taper votre adresse..."
            className="w-full bg-[hsl(30_15%_9%/0.6)] border border-[hsl(38_45%_48%/0.2)] rounded-xl px-4 py-3 text-sm text-[hsl(40_20%_75%)] placeholder:text-[hsl(40_20%_38%)] focus:outline-none focus:border-[hsl(38_55%_65%/0.7)] focus:ring-2 focus:ring-[hsl(38_45%_48%/0.25)] transition-all duration-300"
          />
        </div>

        {/* Date de naissance — 3 selects */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-[hsl(40_20%_60%)]">
            <span className="text-[hsl(38_45%_48%)]"><IconCalendar size={16} /></span>
            Date de naissance <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <PremiumSelect label="" value={dateParts.day} onValueChange={(v) => handleDatePartChange('day', v)} placeholder="Jour" options={DAYS.map(d => ({ value: d, label: String(parseInt(d, 10)) }))} />
            <PremiumSelect label="" value={dateParts.month} onValueChange={(v) => handleDatePartChange('month', v)} placeholder="Mois" options={MONTHS} />
            <PremiumSelect label="" value={dateParts.year} onValueChange={(v) => handleDatePartChange('year', v)} placeholder="Année" options={YEARS.map(y => ({ value: y, label: y }))} />
          </div>
        </div>

        <PremiumSelect label="Nationalité" icon={<IconShield size={16} />} value={data.nationalite} onValueChange={(v) => onChange({ nationalite: v })} options={NATIONALITES.map(n => ({ value: n, label: n }))} optional />
        <PremiumSelect label="Type de permis de séjour" icon={<IconShield size={16} />} value={data.type_permis} onValueChange={(v) => onChange({ type_permis: v })} options={TYPES_PERMIS.map(p => ({ value: p.value, label: p.label }))} required />
        <div className="md:col-span-2">
          <PremiumSelect label="État civil" icon={<IconUser size={16} />} value={data.etat_civil} onValueChange={(v) => onChange({ etat_civil: v })} options={ETATS_CIVILS.map(e => ({ value: e, label: e }))} optional />
        </div>
      </div>
    </div>
  );
}
