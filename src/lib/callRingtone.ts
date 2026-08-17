/**
 * Sonnerie d'appel entrant (WebAudio, aucun fichier à charger) + vibration.
 *
 * Contrainte navigateur : l'audio est bloqué tant que l'utilisateur n'a pas
 * interagi avec la page. On « déverrouille » donc un AudioContext dès le
 * premier clic/tap n'importe où dans l'app (installAudioUnlock()), pour que la
 * sonnerie puisse démarrer plus tard, à l'arrivée d'un appel.
 *
 * Si malgré tout la lecture est refusée, on signale l'état « bloqué » à l'UI
 * (indice « Touchez pour activer le son ») et on garde la vibration.
 */

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let loopTimer: number | null = null;
let vibrateTimer: number | null = null;
let ringing = false;

type Listener = (blocked: boolean) => void;
const listeners = new Set<Listener>();
let blocked = false;

const setBlocked = (v: boolean) => {
  if (blocked === v) return;
  blocked = v;
  listeners.forEach((l) => l(v));
};

/** Abonnement UI : true = audio bloqué (proposer « Touchez pour activer le son »). */
export function onRingtoneBlocked(listener: Listener) {
  listeners.add(listener);
  listener(blocked);
  return () => listeners.delete(listener);
}

const getCtx = (): AudioContext | null => {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx || ctx.state === 'closed') ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
};

/** Déverrouille l'audio au premier geste utilisateur (à appeler au démarrage). */
export function installAudioUnlock() {
  const unlock = () => {
    const c = getCtx();
    if (!c) return;
    void c.resume().catch(() => undefined);
    try {
      // Tick silencieux : valide le déverrouillage sur iOS.
      const osc = c.createOscillator();
      const g = c.createGain();
      g.gain.value = 0.0001;
      osc.connect(g).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.02);
    } catch {
      /* noop */
    }
    if (c.state === 'running') {
      setBlocked(false);
      if (ringing) startRingtone(); // relance si un appel sonne déjà
    }
  };

  ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((evt) =>
    window.addEventListener(evt, unlock, { passive: true }),
  );
}

const beep = () => {
  if (!ctx || !gain || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  [880, 660].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.45;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.6, start + 0.05);
    g.gain.linearRampToValueAtTime(0, start + 0.4);
    osc.connect(g).connect(gain!);
    osc.start(start);
    osc.stop(start + 0.45);
  });
};

const startVibration = () => {
  if (vibrateTimer) return;
  if ('vibrate' in navigator) {
    const buzz = () => navigator.vibrate?.([500, 250, 500, 1000]);
    buzz();
    vibrateTimer = window.setInterval(buzz, 2300);
  }
};

const stopAudioLoop = () => {
  if (loopTimer) window.clearInterval(loopTimer);
  loopTimer = null;
  try {
    gain?.disconnect();
  } catch {
    /* noop */
  }
  gain = null;
};

/** Démarre (ou relance) la sonnerie en boucle + vibration. */
export function startRingtone() {
  ringing = true;
  startVibration();
  stopAudioLoop();

  const c = getCtx();
  if (!c) {
    setBlocked(true);
    return;
  }

  const run = () => {
    if (!ringing || !ctx) return;
    if (ctx.state !== 'running') {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    try {
      gain = ctx.createGain();
      gain.gain.value = 0.5; // jamais 0, jamais muet
      gain.connect(ctx.destination);
      beep();
      loopTimer = window.setInterval(beep, 2000);
    } catch {
      setBlocked(true);
    }
  };

  void c
    .resume()
    .then(run)
    .catch(() => setBlocked(true));

  // Certains navigateurs résolvent resume() sans passer en « running ».
  window.setTimeout(() => {
    if (ringing && !loopTimer) run();
  }, 250);
}

/** Relance la sonnerie suite à un tap explicite de l'utilisateur. */
export function retryRingtone() {
  if (!ringing) return;
  startRingtone();
}

export function stopRingtone() {
  ringing = false;
  stopAudioLoop();
  if (vibrateTimer) window.clearInterval(vibrateTimer);
  vibrateTimer = null;
  if ('vibrate' in navigator) navigator.vibrate?.(0);
  setBlocked(false);
  // On garde le AudioContext déverrouillé pour les appels suivants.
  void ctx?.suspend?.().catch(() => undefined);
}
