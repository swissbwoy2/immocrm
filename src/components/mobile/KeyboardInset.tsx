import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Clavier iPhone (app et Safari) : la coquille mobile et les panneaux de discussion sont en position fixe sur tout
 * l'écran, le clavier les recouvrait et cachait le champ de saisie. Ce composant publie la zone réellement visible
 * au-dessus du clavier dans des variables CSS, lues par index.css :
 *   --imr-vv-top (décalage de la zone visible), --imr-vv-h (sa hauteur), --imr-kb (hauteur du clavier)
 * et la classe html.imr-kb-open tant que le clavier est ouvert. Aucun effet quand le clavier est fermé.
 */
const OPEN_THRESHOLD = 80;
const SCROLL_SELECTOR = '[data-radix-scroll-area-viewport], [data-imr-chat-scroll]';

export function KeyboardInset() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    const isIosApp = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
    let nativeKb = 0;
    let open = false;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const full = window.innerHeight;
      let height = vv ? vv.height : full;
      let top = vv ? vv.offsetTop : 0;
      // Dans l'app, si la zone visible n'a pas suivi le clavier, on se fie à la hauteur donnée par iOS.
      if (nativeKb > 0 && full - height < nativeKb / 2) {
        height = full - nativeKb;
        top = 0;
      }
      const kb = Math.max(0, Math.round(full - height - top));
      const nowOpen = kb > OPEN_THRESHOLD;

      // Fils de discussion qui étaient en bas : ils y restent quand la zone rétrécit (on se lit en écrivant).
      const pinned = nowOpen !== open || nowOpen
        ? Array.from(document.querySelectorAll<HTMLElement>(SCROLL_SELECTOR))
            .filter((el) => el.scrollHeight - el.scrollTop - el.clientHeight < 120)
        : [];

      root.style.setProperty('--imr-kb', `${nowOpen ? kb : 0}px`);
      root.style.setProperty('--imr-vv-top', `${nowOpen ? Math.round(top) : 0}px`);
      root.style.setProperty('--imr-vv-h', nowOpen ? `${Math.round(height)}px` : '100dvh');
      root.classList.toggle('imr-kb-open', nowOpen);

      if (pinned.length) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const el of pinned) el.scrollTop = el.scrollHeight;
          const active = document.activeElement as HTMLElement | null;
          if (nowOpen && active && /^(TEXTAREA|INPUT)$/.test(active.tagName)) active.scrollIntoView({ block: 'nearest' });
        }));
      }
      // Clavier refermé : iOS laisse parfois la page décalée vers le haut ; la coquille native reprend sa place.
      if (open && !nowOpen && root.classList.contains('imr-native-shell')) window.scrollTo(0, 0);
      open = nowOpen;
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    vv?.addEventListener('resize', schedule);
    vv?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('focusin', schedule);
    window.addEventListener('focusout', schedule);

    const handles: Array<Promise<{ remove: () => Promise<void> }>> = [];
    if (isIosApp) {
      const onShow = (info: { keyboardHeight: number }) => { nativeKb = info?.keyboardHeight || 0; schedule(); };
      const onHide = () => { nativeKb = 0; schedule(); };
      handles.push(
        Keyboard.addListener('keyboardWillShow', onShow),
        Keyboard.addListener('keyboardDidShow', onShow),
        Keyboard.addListener('keyboardWillHide', onHide),
        Keyboard.addListener('keyboardDidHide', onHide),
      );
    }
    schedule();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv?.removeEventListener('resize', schedule);
      vv?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('focusin', schedule);
      window.removeEventListener('focusout', schedule);
      for (const h of handles) h.then((l) => l.remove()).catch(() => undefined);
      root.classList.remove('imr-kb-open');
      root.style.removeProperty('--imr-kb');
      root.style.removeProperty('--imr-vv-top');
      root.style.removeProperty('--imr-vv-h');
    };
  }, []);

  return null;
}
