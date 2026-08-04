import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type UserRole = 'admin' | 'agent' | 'client' | 'apporteur' | 'proprietaire' | 'coursier' | 'agent_ia' | 'closeur';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const pendingClearRef = useRef(false);
  const intentionalSignOutRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession) {
        // Session valide reçue : on annule toute vérification de perte en cours
        pendingClearRef.current = false;
        setSession(newSession);
        setUser(newSession.user ?? null);
        setTimeout(() => {
          fetchUserRole(newSession.user.id);
        }, 0);
        return;
      }

      // Déconnexion explicite demandée par l'utilisateur : on nettoie tout de suite
      if (intentionalSignOutRef.current) {
        setSession(null);
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Session nulle "transitoire" (échec ponctuel de refresh pendant une tâche
      // lourde : fusion PDF, upload, appel edge function…).
      // On NE déconnecte PAS immédiatement : on revérifie auprès de Supabase.
      pendingClearRef.current = true;
      setTimeout(async () => {
        // 3 tentatives espacées : on ne vide la session que si le serveur
        // confirme que le refresh token n'est plus valide.
        for (let attempt = 0; attempt < 3; attempt++) {
          if (!pendingClearRef.current) return;
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            pendingClearRef.current = false;
            return; // hors ligne : on garde la session
          }
          try {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              // La session est en réalité toujours valide → on ignore l'événement
              pendingClearRef.current = false;
              setSession(data.session);
              setUser(data.session.user ?? null);
              return;
            }
            const { data: refreshed, error } = await supabase.auth.refreshSession();
            if (refreshed.session) {
              pendingClearRef.current = false;
              setSession(refreshed.session);
              setUser(refreshed.session.user ?? null);
              return;
            }
            // Refresh token explicitement rejeté par le serveur → vraie déconnexion
            const status = (error as { status?: number } | null)?.status;
            if (status && status >= 400 && status < 500) break;
          } catch (e) {
            console.warn('Auth re-check failed, keeping current session state:', e);
            pendingClearRef.current = false;
            return; // en cas d'erreur réseau, on garde la session en place
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        // Perte de session réellement confirmée
        if (!pendingClearRef.current) return;
        pendingClearRef.current = false;
        setSession(null);
        setUser(null);
        setUserRole(null);
        setLoading(false);
      }, 2000);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Session longue durée : les timers de rafraîchissement sont gelés quand
    // l'onglet est en arrière-plan ou l'app mobile en veille. On force donc un
    // renouvellement dès le retour au premier plan pour ne jamais expirer.
    const revalidate = async () => {
      if (document.hidden) return;
      try {
        const { data } = await supabase.auth.getSession();
        const expiresAt = data.session?.expires_at ?? 0;
        if (!data.session) return;
        // Renouvelle si le jeton expire dans moins de 10 minutes
        if (expiresAt * 1000 - Date.now() < 10 * 60 * 1000) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed.session) {
            pendingClearRef.current = false;
            setSession(refreshed.session);
            setUser(refreshed.session.user ?? null);
          }
        }
      } catch (e) {
        // Erreur réseau : on garde la session en place
        console.warn('Session revalidation skipped:', e);
      }
    };

    document.addEventListener('visibilitychange', revalidate);
    window.addEventListener('focus', revalidate);
    window.addEventListener('online', revalidate);
    const keepAliveId = setInterval(revalidate, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', revalidate);
      window.removeEventListener('focus', revalidate);
      window.removeEventListener('online', revalidate);
      clearInterval(keepAliveId);
    };
  }, []);



  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserRole(data.role as UserRole);

      // Activate user on first login via SECURITY DEFINER RPC (bypasses RLS)
      if (data.role === 'agent') {
        await supabase.rpc('activate_agent_on_login');
      } else if (data.role === 'apporteur') {
        await supabase.rpc('activate_apporteur_on_login');
      } else if (data.role === 'coursier') {
        await supabase.rpc('activate_coursier_on_login');
      } else if (data.role === 'closeur') {
        await supabase.rpc('activate_closeur_on_login');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    intentionalSignOutRef.current = true;
    pendingClearRef.current = false;
    try {
      // Try global signout first
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.warn('Global signout failed, trying local:', error.message);
        // If global fails, try local signout
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch (error) {
      console.warn('SignOut error (continuing with local cleanup):', error);
    } finally {
      // Always clean up local state, even if API failed
      setUser(null);
      setSession(null);
      setUserRole(null);
      navigate('/login');
      intentionalSignOutRef.current = false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
