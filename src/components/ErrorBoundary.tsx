import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // Log en base pour diagnostic distant
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('error_logs').insert({
        user_id: user?.id ?? null,
        error_message: error.message || String(error),
        error_stack: error.stack ?? null,
        component_stack: errorInfo.componentStack ?? null,
        page_url: typeof window !== 'undefined' ? window.location.href : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
    } catch (logError) {
      console.error('Failed to persist error log:', logError);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out failed', e);
    }
    // Nettoyage défensif des clés Supabase locales
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.startsWith('supabase.auth.')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.toString() ?? 'Erreur inconnue';
      const componentStack = this.state.errorInfo?.componentStack ?? '';
      const stackPreview = (this.state.error?.stack ?? '').split('\n').slice(0, 6).join('\n');

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-lg w-full text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Une erreur est survenue
            </h1>
            
            <p className="text-muted-foreground mb-6">
              L'application a rencontré un problème inattendu. Notre équipe a été notifiée. 
              Veuillez réessayer, retourner à l'accueil ou vous déconnecter.
            </p>

            <details className="mb-6 text-left bg-muted/40 rounded-lg p-4 group">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors">
                Détails techniques
              </summary>
              <div className="mt-3 space-y-2 max-h-64 overflow-auto">
                <p className="text-xs font-mono text-destructive break-all whitespace-pre-wrap">
                  {errorMessage}
                </p>
                {stackPreview && (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                    {stackPreview}
                  </pre>
                )}
                {componentStack && (
                  <pre className="text-xs text-muted-foreground/80 whitespace-pre-wrap break-all border-t border-border pt-2">
                    {componentStack.split('\n').slice(0, 8).join('\n')}
                  </pre>
                )}
              </div>
            </details>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={this.handleRetry} 
                variant="outline"
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Réessayer
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Accueil
              </Button>

              <Button 
                onClick={this.handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
