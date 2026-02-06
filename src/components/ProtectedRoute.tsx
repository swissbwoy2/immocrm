import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'agent' | 'client' | 'apporteur' | 'proprietaire' | 'coursier')[];
}

const VALID_ROLES = ['admin', 'agent', 'client', 'apporteur', 'proprietaire', 'coursier'] as const;

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRole, loading, session } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Vérifier à la fois user et session pour détecter les sessions expirées
  if (!user || !session) {
    return <Navigate to="/login" replace />;
  }

  // Gestion des rôles inconnus ou manquants
  if (!userRole || !VALID_ROLES.includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Rôle non reconnu
          </h1>
          <p className="text-muted-foreground mb-6">
            Votre compte n'a pas de rôle valide attribué. Veuillez contacter l'administrateur pour résoudre ce problème.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // Vérifier si le rôle de l'utilisateur est autorisé pour cette route
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={`/${userRole}`} replace />;
  }

  return <>{children}</>;
}
