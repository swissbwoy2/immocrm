import { createElement, useEffect, useRef, useState } from 'react';
import type { SteeveGesture, SteeveMascotElement } from './mascot/steeve-mascot';
import fallbackUrl from './mascot/steeve-fallback.webp?url';
import { cn } from '@/lib/utils';

const GREETED_KEY = 'logisorama.steeve.greeted';

function readGreeted(): boolean {
  try {
    return sessionStorage.getItem(GREETED_KEY) === '1';
  } catch {
    return false;
  }
}

function markGreeted() {
  try {
    sessionStorage.setItem(GREETED_KEY, '1');
  } catch {
    // stockage indisponible : l'accueil pourra être rejoué, sans conséquence
  }
}

// Le module 3D (Three.js) est chargé une seule fois, à la demande, côté navigateur.
let loader: Promise<void> | null = null;
function loadMascot(): Promise<void> {
  loader ??= import('./mascot/steeve-mascot.js')
    .then(() => customElements.whenDefined('steeve-mascot'))
    .then(() => undefined)
    .catch((error) => {
      loader = null;
      throw error;
    });
  return loader;
}

/**
 * Réaction de Steeve à un événement réel de l'application (message envoyé, réponse reçue, erreur…).
 * Chaque nouvelle `key` est jouée une fois. Sans `gesture`, Steeve fait une invitation (« invite »).
 */
export interface SteeveCue {
  key: string | number;
  gesture?: SteeveGesture;
  message?: string;
}
/** @deprecated remplacé par SteeveCue */
export type SteeveInvite = SteeveCue;

interface Props {
  /** État réel de la messagerie (ouverte / fermée). */
  open: boolean;
  /** Ouvre ou ferme la messagerie existante (même action que l'ancien bouton). */
  onActivate: () => void;
  /** Messages non lus réels. */
  unread?: number;
  /** Attente réelle (envoi en cours, réponse de Steeve attendue). */
  busy?: boolean;
  /** Saisie en cours : Steeve reste calme. */
  quiet?: boolean;
  /** Geste à jouer (avec bulle facultative), déclenché par un événement réel. */
  cue?: SteeveCue | null;
  /** Ancien nom de `cue`. */
  invite?: SteeveCue | null;
  className?: string;
}

/**
 * Steeve 3D, déclencheur de la messagerie. Remplace l'ancienne bulle sans toucher à la messagerie :
 * un clic (ou Entrée / Espace) appelle `onActivate`, l'état affiché suit `open`, `busy` et `unread`.
 * Tant que le module 3D n'est pas chargé, ou s'il ne peut pas l'être, un bouton avec l'image fixe de Steeve
 * reste utilisable. Aucune donnée n'est stockée par la mascotte.
 */
export function SteeveLauncher({ open, onActivate, unread = 0, busy = false, quiet = false, cue: cueProp, invite, className }: Props) {
  const cue = cueProp ?? invite ?? null;
  const [ready, setReady] = useState(false);
  const ref = useRef<SteeveMascotElement | null>(null);
  const activateRef = useRef(onActivate);
  activateRef.current = onActivate;
  const [greetingOff] = useState(readGreeted);
  const wasOpen = useRef(open);

  useEffect(() => {
    let active = true;
    loadMascot().then(() => { if (active) setReady(true); }).catch(() => {
      // Module indisponible : le bouton de secours reste en place.
    });
    return () => { active = false; };
  }, []);

  // Événements du composant (le clic traverse le Shadow DOM).
  useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;
    const onOpen = () => activateRef.current();
    const onState = (event: Event) => {
      if ((event as CustomEvent<{ state: string }>).detail?.state === 'greeting') markGreeted();
    };
    el.addEventListener('steeve:open', onOpen);
    el.addEventListener('steeve:statechange', onState);
    return () => {
      el.removeEventListener('steeve:open', onOpen);
      el.removeEventListener('steeve:statechange', onState);
    };
  }, [ready]);

  useEffect(() => { if (ready) ref.current?.setChatOpen(open); }, [ready, open]);
  useEffect(() => { if (ready) ref.current?.setBusy(busy); }, [ready, busy]);
  useEffect(() => { if (ready) ref.current?.setQuiet(quiet); }, [ready, quiet]);
  useEffect(() => { if (ready) ref.current?.setUnread(unread); }, [ready, unread]);

  useEffect(() => {
    if (!ready || !cue) return;
    try {
      ref.current?.play(cue.gesture ?? 'invite', { message: cue.message });
    } catch {
      // geste inconnu : ignoré
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cue?.key]);

  // Fermeture : le focus revient sur Steeve s'il était resté dans le panneau disparu
  // (vérifié après l'animation de fermeture, sans voler le focus d'un autre champ).
  useEffect(() => {
    const closing = wasOpen.current && !open;
    wasOpen.current = open;
    if (!closing) return;
    const refocus = () => {
      const active = document.activeElement;
      if (active && active !== document.body) return;
      if (ref.current) (ref.current as HTMLElement).focus();
      else document.getElementById('steeve-launcher-fallback')?.focus();
    };
    // Après l'animation de fermeture (plus longue sur un appareil lent).
    const timers = [320, 900].map((ms) => setTimeout(refocus, ms));
    return () => timers.forEach(clearTimeout);
  }, [open]);

  if (!ready) {
    const label = `${open ? 'Fermer' : 'Ouvrir'} la messagerie avec Steeve${unread ? `, ${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : ''}`;
    return (
      <button
        id="steeve-launcher-fallback"
        type="button"
        onClick={() => onActivate()}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn('steeve-launcher-size relative block min-h-[44px] min-w-[44px] rounded-2xl', className)}
      >
        <img src={fallbackUrl} alt="" aria-hidden="true" className="block aspect-[0.75] w-full object-contain" />
        {unread > 0 && (
          <span className="absolute right-[9%] top-[12%] flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-[#283d49] px-1 text-[11px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    );
  }

  return createElement('steeve-mascot', {
    ref,
    mode: 'inline',
    ...(greetingOff ? { greeting: 'off' } : {}),
    // React 18 : sur un élément personnalisé, l'attribut s'écrit « class » (className donnerait « classname »).
    class: cn('steeve-launcher-size block', className),
  });
}
