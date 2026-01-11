import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AnnonceurProtectedRouteProps {
  children: React.ReactNode;
}

export function AnnonceurProtectedRoute({ children }: AnnonceurProtectedRouteProps) {
  const { user, session, loading } = useAuth();

  // Wait for auth to initialize
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !session) {
    return <Navigate to="/connexion-annonceur" replace />;
  }

  return <>{children}</>;
}
