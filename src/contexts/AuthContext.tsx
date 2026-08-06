import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  authLog,
  classifyAuthError,
  ensureFreshSession,
  getAuthStorageKeyName,
  hasPersistedAuthEntry,
} from '@/lib/authSession';
import { purgePersistedAuth, withAuthStorageRemoval, mirrorSession } from '@/lib/authStorageGuard';

type UserRole = 'admin' | 'agent' | 'client' | 'apporteur' | 'proprietaire' | 'coursier' | 'agent_ia' | 'closeur' | 'automation_operator';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  /** true tant que l'amorçage (lecture stockage + récupération silencieuse) n'est pas terminé */
  loading: boolean;
  /** true quand une récupération de session est en cours après une erreur temporaire */
  recovering: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const navigate = useNavigate();
  const intentionalSignOutRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const applySession = (next: Session) => {
      // Copie de secours persistante (résiste aux purges du SDK sur panne serveur).
      mirrorSession({ access_token: next.access_token, refresh_token: next.refresh_token });
      if (!mountedRef.current) return;
      setSession(next);
      setUser(next.user ?? null);
      setRecovering(false);
      setLoading(false);
      setTimeout(() => fetchUserRole(next.user.id), 0);
    };


    const clearSession = (raison: string) => {
      // Purge du stockage : uniquement pour un verdict définitif ou une action manuelle.
      purgePersistedAuth(raison);
      if (!mountedRef.current) return;
      authLog('session.effacee', { raison, redirection_login: true });
      setSession(null);
      setUser(null);
      setUserRole(null);
      setRecovering(false);
      setLoading(false);
    };


    authLog('amorcage.debut', {
      origine: typeof window !== 'undefined' ? window.location.origin : 'n/a',
      cle_stockage: getAuthStorageKeyName(),
      entree_persistante_presente: hasPersistedAuthEntry(),
    });

    // 1) Écoute des changements d'état
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession) {
        authLog('evenement', { event, session_presente: true });
        applySession(newSession);
        setLoading(false);
        return;
      }

      authLog('evenement', { event, session_presente: false });

      if (intentionalSignOutRef.current) {
        clearSession('deconnexion_manuelle');
        return;
      }

      if (event === 'INITIAL_SESSION') {
        // Traité par l'amorçage explicite ci-dessous.
        return;
      }

      // Session nulle non demandée : on ne déconnecte JAMAIS directement.
      setRecovering(true);
      void ensureFreshSession(`evenement_${event}`).then((outcome) => {
        if (!mountedRef.current || intentionalSignOutRef.current) return;
        if (outcome.status === 'session') {
          applySession(outcome.session);
        } else if (outcome.status === 'definitif') {
          clearSession('refresh_token_invalide_confirme_par_serveur');
        } else {
          // Erreur temporaire : session persistante conservée, on reste en
          // récupération tant que des jetons existent dans ce profil.
          authLog('session.conservee_erreur_temporaire', { classification: outcome.kind });
          setRecovering(hasPersistedAuthEntry());
          setLoading(false);
        }
      });

    });

    // 2) Amorçage explicite : lecture du stockage persistant + récupération silencieuse
    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (data.session) {
          authLog('amorcage.session_lue', { session_presente: true });
          applySession(data.session);
          setLoading(false);
          return;
        }

        if (error) {
          const kind = classifyAuthError(error);
          authLog('amorcage.erreur_lecture', { classification: kind });
          if (kind === 'refresh_token_invalide') {
            clearSession('refresh_token_invalide_au_demarrage');
            return;
          }
        }

        if (!hasPersistedAuthEntry()) {
          authLog('amorcage.aucun_stockage_persistant', { session_presente: false });
          clearSession('aucune_session_persistante_dans_ce_profil');
          return;
        }

        setRecovering(true);
        const outcome = await ensureFreshSession('amorcage');
        if (!mountedRef.current) return;

        if (outcome.status === 'session') {
          applySession(outcome.session);
          setLoading(false);
        } else if (outcome.status === 'definitif') {
          clearSession('refresh_token_invalide_confirme_au_demarrage');
        } else {
          // Panne temporaire au démarrage : on garde les jetons et on reste en
          // récupération (nouvelle tentative au retour réseau / prochain réveil).
          authLog('amorcage.recuperation_differee', { classification: outcome.kind });
          setRecovering(hasPersistedAuthEntry());
          setLoading(false);
        }

      } catch (e) {
        if (!mountedRef.current) return;
        authLog('amorcage.exception', { classification: classifyAuthError(e) });
        setRecovering(false);
        setLoading(false);
      }
    };

    void bootstrap();

    // 3) Revalidation : timer + focus/visibilité/retour réseau, tous en single flight
    const revalidate = (reason: string) => {
      if (intentionalSignOutRef.current) return;
      if (typeof document !== 'undefined' && document.hidden && reason !== 'online') return;

      void (async () => {
        const { data } = await supabase.auth.getSession();
        const expiresAt = (data.session?.expires_at ?? 0) * 1000;
        const needsRefresh = !data.session || expiresAt - Date.now() < 10 * 60 * 1000;
        if (!needsRefresh) return;

        const outcome = await ensureFreshSession(reason);
        if (!mountedRef.current || intentionalSignOutRef.current) return;
        if (outcome.status === 'session') {
          applySession(outcome.session);
        } else if (outcome.status === 'definitif') {
          clearSession('refresh_token_invalide_confirme_pendant_revalidation');
        } else {
          authLog('revalidation.reportee', { reason, classification: outcome.kind });
        }
      })();
    };

    const onVisibility = () => revalidate('visibilitychange');
    const onFocus = () => revalidate('focus');
    const onOnline = () => revalidate('online');

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    const keepAliveId = window.setInterval(() => revalidate('timer'), 5 * 60 * 1000);

    // Nettoyage complet : compatible double montage du mode Strict de React.
    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.clearInterval(keepAliveId);
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
      if (!mountedRef.current) return;
      setUserRole(data.role as UserRole);

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
      if (mountedRef.current) setUserRole(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const signOut = async () => {
    intentionalSignOutRef.current = true;
    authLog('deconnexion.manuelle', { session_presente: !!session });
    try {
      await withAuthStorageRemoval(async () => {
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error) {
          console.warn('Global signout failed, trying local:', error.message);
          await supabase.auth.signOut({ scope: 'local' });
        }
      });
    } catch (error) {
      console.warn('SignOut error (continuing with local cleanup):', error);
    } finally {
      purgePersistedAuth('deconnexion_manuelle');
      setUser(null);
      setSession(null);
      setUserRole(null);
      setRecovering(false);
      navigate('/login');
      intentionalSignOutRef.current = false;
    }

  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, recovering, signOut }}>
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
