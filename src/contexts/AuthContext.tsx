import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'agent' | 'client' | 'apporteur' | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'agent' | 'client' | 'apporteur' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch user role after session is established
        setTimeout(() => {
          fetchUserRole(session.user.id);
        }, 0);
      } else {
        setUserRole(null);
        setLoading(false);
      }
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

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserRole(data.role as 'admin' | 'agent' | 'client' | 'apporteur');

      // If this is an agent, activate them on first login
      if (data.role === 'agent') {
        const { data: agentData } = await supabase
          .from('agents')
          .select('statut')
          .eq('user_id', userId)
          .single();

        if (agentData?.statut === 'en_attente') {
          const { error: updateError } = await supabase
            .from('agents')
            .update({ statut: 'actif', updated_at: new Date().toISOString() })
            .eq('user_id', userId);
          
          if (updateError) {
            console.error('Failed to activate agent on first login:', updateError);
          } else {
            console.log('Agent activated successfully on first login:', userId);
          }
        }
      }

      // If this is an apporteur, activate them on first login
      if (data.role === 'apporteur') {
        const { data: apporteurData } = await supabase
          .from('apporteurs')
          .select('statut')
          .eq('user_id', userId)
          .single();

        if (apporteurData?.statut === 'en_attente') {
          const { error: updateError } = await supabase
            .from('apporteurs')
            .update({ statut: 'actif', updated_at: new Date().toISOString() })
            .eq('user_id', userId);
          
          if (updateError) {
            console.error('Failed to activate apporteur on first login:', updateError);
          } else {
            console.log('Apporteur activated successfully on first login:', userId);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
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
