import { Check, CheckCircle2, FileText } from 'lucide-react';
import { MandatFormData } from './types';
import { isPurchaseMandat, legalCheckboxesFor } from './achat/achatMandat';
import { contractTextFor, contractTitleFor } from './mandatContrats';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

/** Une ligne de titre du contrat : « 1. … », « 2.3. … », ou ligne courte en capitales. */
const isHeading = (line: string) =>
  /^\d+(\.\d+)*\.?\s/.test(line) && line.length < 90 || (line.length < 70 && line === line.toUpperCase() && /[A-Z]/.test(line));

export default function MandatLegalConsents({ data, onChange }: Props) {
  const isPurchase = isPurchaseMandat(data.journey, data.type_recherche);
  const consents = legalCheckboxesFor(data.journey, data.type_recherche);
  const contractText = contractTextFor(data.journey, data.type_recherche);
  const contractTitle = contractTitleFor(data.journey, data.type_recherche);

  const checkedCount = consents.filter((cb) => (data as any)[cb.key] === true).length;
  const allChecked = checkedCount === consents.length;

  const handleChange = (key: string, checked: boolean) => {
    const at = { ...(data.legal_consents_at || {}) };
    if (checked) at[key] = new Date().toISOString();
    else delete at[key];
    const nextCount = consents.filter((cb) => (cb.key === key ? checked : (data as any)[cb.key] === true)).length;
    onChange({
      [key]: checked,
      legal_consents_at: at,
      cgv_acceptees: nextCount === consents.length,
    } as Partial<MandatFormData>);
  };

  return (
    <div className="space-y-5 text-[#222222]">
      {/* Texte intégral du mandat */}
      <div className="overflow-hidden rounded-[14px] border border-[#dddddd] bg-white">
        <div className="flex items-center gap-2 border-b border-[#ebebeb] px-4 py-3">
          <FileText size={16} className="shrink-0 text-[#222222]" />
          <h3 className="text-[15px] font-semibold">{contractTitle}</h3>
        </div>
        <div className="max-h-[340px] overflow-y-auto px-4 py-4 sm:max-h-[420px]">
          {contractText.split('\n').map((line, i) => {
            const t = line.trim();
            if (!t) return <div key={i} className="h-2" />;
            return isHeading(t) ? (
              <p key={i} className="mt-2 text-[14px] font-semibold leading-snug text-[#222222]">{t}</p>
            ) : (
              <p key={i} className="text-[14px] leading-relaxed text-[#3f3f3f]">{t}</p>
            );
          })}
        </div>
      </div>

      {/* Dispositions à approuver une à une */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold">
            Dispositions à approuver <span className="text-[#6a6a6a]">({checkedCount}/{consents.length})</span>
          </h3>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ebebeb]">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(checkedCount / consents.length) * 100}%` }}
          />
        </div>

        {consents.map((cb, index) => {
          const checked = (data as any)[cb.key] === true;
          return (
            <div
              key={cb.key}
              role="checkbox"
              tabIndex={0}
              aria-checked={checked}
              onClick={() => handleChange(cb.key, !checked)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleChange(cb.key, !checked); }
              }}
              className={`w-full cursor-pointer rounded-[14px] border p-4 text-left transition-colors ${
                checked ? 'border-primary/50 bg-primary/5' : 'border-[#dddddd] bg-white hover:border-[#b0b0b0]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    checked ? 'border-primary bg-primary text-white' : 'border-[#b0b0b0] bg-white'
                  }`}
                >
                  {checked && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-snug">
                    {index + 1}. {cb.title}
                  </span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-[#3f3f3f]">{cb.question}</span>
                  {cb.note && <span className="mt-1 block text-[13px] italic text-[#6a6a6a]">{cb.note}</span>}
                  <span className={`mt-2 block text-[14px] font-semibold ${checked ? 'text-primary' : 'text-[#222222]'}`}>
                    {checked ? `✓ ${cb.cta}` : cb.cta}
                  </span>
                </span>
              </div>
              {cb.linkHref && (
                <a
                  href={cb.linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="ml-9 mt-2 inline-block text-[13px] text-[#222222] underline underline-offset-2"
                >
                  {cb.linkLabel}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {allChecked && (
        <div className="flex items-center gap-2 rounded-[14px] border border-primary/40 bg-primary/5 p-3">
          <CheckCircle2 size={16} className="shrink-0 text-primary" />
          <p className="text-[14px] text-[#222222]">
            Toutes les dispositions sont acceptées. Vous pouvez signer votre mandat{isPurchase ? " d'achat" : ''}.
          </p>
        </div>
      )}

      <p className="text-[13px] text-[#6a6a6a]">Une question ? info@immo-rama.ch — 021 634 31 61</p>
    </div>
  );
}
