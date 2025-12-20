import { useParams, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PremiumPageHeader } from '@/components/premium';

export default function ImmeubleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8">
      <Button variant="ghost" onClick={() => navigate('/proprietaire/immeubles')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour
      </Button>
      <PremiumPageHeader
        title="Détail de l'immeuble"
        subtitle={`ID: ${id}`}
        icon={Building2}
      />
      <p className="text-muted-foreground">Page en construction...</p>
    </div>
  );
}
