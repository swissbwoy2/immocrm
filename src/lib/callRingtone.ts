/**
 * Sonnerie d'appel entrant générée en WebAudio (aucun fichier à charger)
 * + vibration mobile. Toujours arrêtée via stopRingtone().
 */
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let loopTimer: number | null = null;
let vibrateTimer: number | null = null;

const beep = () => {
  if (!ctx || !gain) return;
  const now = ctx.currentTime;
  [880, 660].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.45;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.5, start + 0.05);
    g.gain.linearRampToValueAtTime(0, start + 0.4);
    osc.connect(g).connect(gain!);
    osc.start(start);
    osc.stop(start + 0.45);
  });
};

export function startRingtone() {
  stopRingtone();
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctor) {
      ctx = new Ctor();
      void ctx.resume().catch(() => undefined);
      gain = ctx.createGain();
      gain.gain.value = 0.35;
      gain.connect(ctx.destination);
      beep();
      loopTimer = window.setInterval(beep, 2000);
    }
  } catch {
    /* audio indisponible : on garde la vibration */
  }

  if ('vibrate' in navigator) {
    const buzz = () => navigator.vibrate?.([400, 200, 400, 1000]);
    buzz();
    vibrateTimer = window.setInterval(buzz, 2000);
  }
}

export function stopRingtone() {
  if (loopTimer) window.clearInterval(loopTimer);
  if (vibrateTimer) window.clearInterval(vibrateTimer);
  loopTimer = null;
  vibrateTimer = null;
  if ('vibrate' in navigator) navigator.vibrate?.(0);
  try {
    gain?.disconnect();
    void ctx?.close();
  } catch {
    /* noop */
  }
  gain = null;
  ctx = null;
}
