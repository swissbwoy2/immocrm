import { Badge } from "@/components/ui/badge";
import { Home, Key } from "lucide-react";

interface ClientTypeBadgeProps {
  typeRecherche?: string | null;
  size?: 'sm' | 'default';
  showIcon?: boolean;
}

export function ClientTypeBadge({ typeRecherche, size = 'default', showIcon = true }: ClientTypeBadgeProps) {
  const isAcheteur = typeRecherche === 'Acheter';
  
  if (size === 'sm') {
    return (
      <Badge 
        variant={isAcheteur ? "default" : "secondary"}
        className={`text-xs ${isAcheteur ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {showIcon && (isAcheteur ? <Home className="w-3 h-3 mr-1" /> : <Key className="w-3 h-3 mr-1" />)}
        {isAcheteur ? 'Achat' : 'Location'}
      </Badge>
    );
  }

  return (
    <Badge 
      variant={isAcheteur ? "default" : "secondary"}
      className={`${isAcheteur ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
    >
      {showIcon && (isAcheteur ? <Home className="w-4 h-4 mr-1" /> : <Key className="w-4 h-4 mr-1" />)}
      {isAcheteur ? '🏠 Achat' : '🔑 Location'}
    </Badge>
  );
}

export function getClientTypeLabel(typeRecherche?: string | null): string {
  return typeRecherche === 'Acheter' ? 'Achat' : 'Location';
}

export function isClientAcheteur(typeRecherche?: string | null): boolean {
  return typeRecherche === 'Acheter';
}
