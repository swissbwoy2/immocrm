import { ArrowDownLeft, ArrowUpRight, Receipt, Calendar, Building2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PremiumTransactionComptableCardProps {
  transaction: {
    id: string;
    categorie: string;
    sous_categorie?: string;
    date_transaction: string;
    libelle: string;
    debit?: number;
    credit?: number;
    tiers_nom?: string;
    numero_facture?: string;
    statut?: string;
  };
  immeubleName?: string;
  onClick?: () => void;
  className?: string;
}

const getCategorieConfig = (categorie: string) => {
  switch (categorie) {
    case 'recette':
      return { label: 'Recette', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' };
    case 'charge_courante':
      return { label: 'Charge courante', color: 'text-blue-600', bgColor: 'bg-blue-500/10' };
    case 'charge_entretien':
      return { label: 'Entretien', color: 'text-orange-600', bgColor: 'bg-orange-500/10' };
    case 'charge_financiere':
      return { label: 'Charge financière', color: 'text-purple-600', bgColor: 'bg-purple-500/10' };
    case 'investissement':
      return { label: 'Investissement', color: 'text-indigo-600', bgColor: 'bg-indigo-500/10' };
    default:
      return { label: categorie, color: 'text-muted-foreground', bgColor: 'bg-muted' };
  }
};

const getStatutConfig = (statut?: string) => {
  switch (statut) {
    case 'paye':
      return { label: 'Payé', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' };
    case 'comptabilise':
      return { label: 'Comptabilisé', color: 'bg-blue-500/10 text-blue-600 border-blue-200' };
    case 'en_attente':
      return { label: 'En attente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' };
    case 'annule':
      return { label: 'Annulé', color: 'bg-gray-500/10 text-gray-600 border-gray-200' };
    default:
      return { label: 'Non défini', color: 'bg-gray-500/10 text-gray-600 border-gray-200' };
  }
};

export function PremiumTransactionComptableCard({
  transaction,
  immeubleName,
  onClick,
  className
}: PremiumTransactionComptableCardProps) {
  const categorieConfig = getCategorieConfig(transaction.categorie);
  const statutConfig = getStatutConfig(transaction.statut);
  
  const isCredit = (transaction.credit || 0) > 0;
  const amount = isCredit ? transaction.credit : transaction.debit;
  
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'CHF 0';
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div 
      className={cn(
        "group flex items-center gap-4 p-4 rounded-lg transition-all duration-200",
        "bg-card hover:bg-muted/50 border border-border/50 hover:border-primary/30",
        "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn(
        "p-2.5 rounded-full shrink-0",
        isCredit ? "bg-emerald-500/10" : "bg-destructive/10"
      )}>
        {isCredit ? (
          <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
        ) : (
          <ArrowUpRight className="w-5 h-5 text-destructive" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
            {transaction.libelle}
          </h4>
          <Badge className={cn("text-xs shrink-0", statutConfig.color)}>
            {statutConfig.label}
          </Badge>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className={cn("px-1.5 py-0.5 rounded", categorieConfig.bgColor, categorieConfig.color)}>
            {categorieConfig.label}
          </span>
          
          {transaction.sous_categorie && (
            <span>{transaction.sous_categorie}</span>
          )}
          
          {transaction.tiers_nom && (
            <span className="flex items-center gap-1">
              <Receipt className="w-3 h-3" />
              {transaction.tiers_nom}
            </span>
          )}
          
          {immeubleName && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {immeubleName}
            </span>
          )}
          
          {transaction.numero_facture && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {transaction.numero_facture}
            </span>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
        <Calendar className="w-3.5 h-3.5" />
        {formatDate(transaction.date_transaction)}
      </div>

      {/* Amount */}
      <div className={cn(
        "text-right font-semibold shrink-0",
        isCredit ? "text-emerald-600" : "text-foreground"
      )}>
        {isCredit ? '+' : '-'} {formatCurrency(amount)}
      </div>
    </div>
  );
}
