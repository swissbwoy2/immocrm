import { supabase } from "@/integrations/supabase/client";

export type SignupStage = 'auth_signup_failed' | 'provision_failed' | 'succeeded' | 'lead_only';

export interface SignupAttemptPayload {
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  source?: string;
  parcours?: string;
  stage: SignupStage;
  error_message?: string;
}

/**
 * Fire-and-forget logging of a signup attempt (success or failure).
 * Never throws — best-effort telemetry so admin can recover lost signups.
 */
export async function logSignupAttempt(payload: SignupAttemptPayload): Promise<void> {
  try {
    await supabase.functions.invoke('log-signup-attempt', { body: payload });
  } catch (e) {
    console.warn('log-signup-attempt failed (non-blocking):', e);
  }
}

/**
 * Translate Supabase auth errors into user-friendly French messages.
 */
export function humanizeAuthError(message: string | undefined | null): string {
  const m = (message || '').toLowerCase();
  if (m.includes('already registered') || m.includes('already exists') || m.includes('user already')) {
    return "Cet email a déjà un compte. Connectez-vous ou utilisez 'Mot de passe oublié'.";
  }
  if (m.includes('password') && (m.includes('short') || m.includes('weak') || m.includes('6 characters'))) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  if (m.includes('invalid email') || m.includes('email address') && m.includes('invalid')) {
    return "L'adresse email est invalide.";
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  return message || "Erreur lors de l'inscription. Réessayez ou contactez-nous.";
}
