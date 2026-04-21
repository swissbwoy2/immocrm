import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  sectionName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SectionErrorBoundary:${this.props.sectionName}]`, error, errorInfo);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('error_logs').insert({
        user_id: user?.id ?? null,
        error_message: `[Section: ${this.props.sectionName}] ${error.message}`,
        error_stack: error.stack ?? null,
        component_stack: errorInfo.componentStack ?? null,
        page_url: typeof window !== 'undefined' ? window.location.href : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
    } catch (e) {
      console.error('Failed to log section error', e);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Cette section est temporairement indisponible
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Le reste de votre tableau de bord reste accessible. Notre équipe a été notifiée.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <p className="text-xs font-mono text-destructive mt-2 break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
