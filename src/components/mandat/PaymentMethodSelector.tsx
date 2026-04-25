import { Smartphone, FileText, Check } from 'lucide-react';

export type PaymentMethod = 'twint' | 'qr_invoice';

interface Props {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  prenom?: string;
  nom?: string;
}

export default function PaymentMethodSelector({ value, onChange, prenom, nom }: Props) {
  const fullName = [prenom, nom].filter(Boolean).join(' ').trim() || 'Prénom NOM';

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        Choisissez votre mode de paiement <span className="text-red-500">*</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Option TWINT */}
        <button
          type="button"
          onClick={() => onChange('twint')}
          className={`relative text-left p-4 rounded-xl border-2 transition-all ${
            value === 'twint'
              ? 'border-primary bg-primary/5 shadow-md'
              : 'border-border bg-background hover:border-primary/50'
          }`}
        >
          {value === 'twint' && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-5 w-5 text-primary" />
            <span className="font-semibold">TWINT</span>
            <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              Instantané
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Payez immédiatement depuis votre app TWINT</p>
        </button>

        {/* Option Facture QR */}
        <button
          type="button"
          onClick={() => onChange('qr_invoice')}
          className={`relative text-left p-4 rounded-xl border-2 transition-all ${
            value === 'qr_invoice'
              ? 'border-primary bg-primary/5 shadow-md'
              : 'border-border bg-background hover:border-primary/50'
          }`}
        >
          {value === 'qr_invoice' && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold">Facture QR</span>
          </div>
          <p className="text-xs text-muted-foreground">Recevez une facture QR par email</p>
        </button>
      </div>

      {/* Détails selon sélection */}
      {value === 'twint' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-3 space-y-2">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Paiement TWINT instantané
          </p>
          <div className="bg-white dark:bg-background rounded p-2 font-mono text-base font-bold text-center text-amber-900 dark:text-amber-200">
            079 483 91 99
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-200">
            ⚠️ <strong>Mention obligatoire</strong> dans le message TWINT :
          </p>
          <div className="bg-white dark:bg-background rounded p-2 text-xs font-medium text-center text-foreground">
            {fullName} – Acompte mandat
          </div>
        </div>
      )}

      {value === 'qr_invoice' && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-700 p-3">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4" /> Facture QR par email
          </p>
          <p className="text-xs text-blue-900 dark:text-blue-200">
            Vous recevrez votre facture QR par email sous quelques minutes. Vous pourrez la régler
            depuis votre application bancaire (e-banking, mobile banking).
          </p>
        </div>
      )}
    </div>
  );
}
