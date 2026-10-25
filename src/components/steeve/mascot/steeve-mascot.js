import * as THREE from 'three';
import { createSteeveModel, srgb } from './steeve-model.js';
import fallbackUrl from './steeve-fallback.webp?url';

// Composant <steeve-mascot> de Logisorama.
// Personnage : pack « steeve-3d-logisorama-v1 » (tête blanche, yeux noirs verticaux, « − », « + », costume ivoire),
// adapté à Three.js 0.133 (la version du projet : une seule version de Three.js dans l'application).
// Comportement : contrat du kit précédent (états, priorités, attente autonome, bulle, accessibilité), enrichi
// d'une vingtaine de gestes expressifs. Tout est calculé dans le navigateur : aucun appel réseau, aucune IA.

/** Gestes jouables avec play(), et leur durée par défaut (ms). */
export const STEEVE_GESTURES = Object.freeze({
  greeting: 2400, invite: 3200, point: 2600, success: 2200, laugh: 2200, surprise: 1600, wink: 1400,
  nod: 1400, shake: 1500, shrug: 1900, clap: 2200, sad: 2600, celebrate: 2600, bow: 2200, jump: 1500,
  spin: 1700, oops: 2000, dance: 3200, curious: 2400, stretch: 3000, thinking: 3000, sleep: 6000,
});
const STATES = new Set(['idle', 'listening', 'scroll', ...Object.keys(STEEVE_GESTURES)]);
const EXPRESSION = {
  greeting: 'smile', invite: 'smile', point: 'smile', success: 'smile', celebrate: 'laugh', clap: 'laugh',
  jump: 'laugh', spin: 'smile', bow: 'smile', dance: 'smile', nod: 'smile', listening: 'smile', laugh: 'laugh',
  wink: 'wink', surprise: 'surprise', sad: 'sad', oops: 'oops', curious: 'curious', shrug: 'curious',
  shake: 'serious', thinking: 'thinking', sleep: 'sleep', stretch: 'laugh',
};
// Attente sans activité : trois petits gestes au hasard, puis le sommeil (délais depuis la dernière activité).
const IDLE_AT = [8000, 18000, 28000, 42000];
const IDLE_POOL = ['curious', 'stretch', 'wink', 'shrug', 'nod'];
const IDLE_DURATION = { curious: 2400, stretch: 3000, wink: 1400, shrug: 1900, nod: 1400 };
const PARTS = ['root', 'body', 'head', 'armLeft', 'armRight', 'forearmLeft', 'forearmRight', 'handLeft', 'handRight', 'legLeft', 'legRight'];
const FALLBACK = fallbackUrl;
const clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const ease = value => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

// Reflets de studio procéduraux : aucune image HDR, aucun téléchargement.
function makeEnvironment(renderer) {
  const room = new THREE.Scene();
  room.background = srgb('#353638');
  const panels = [];
  for (const [width, height, x, y, z, intensity] of [
    [5, 7, -5, 4, 6, 2.4], [3, 6, 5, 3, 4, 1.25], [7, 3, 0, 7, -1, 1.8], [4, 5, -3, 1, -6, 0.6],
  ]) {
    const material = new THREE.MeshBasicMaterial({ color: srgb('#ffffff'), side: THREE.DoubleSide });
    material.color.multiplyScalar(intensity);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    panel.position.set(x, y, z);
    panel.lookAt(0, 1, 0);
    room.add(panel);
    panels.push(panel);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  // 0,04 : maximum de Three.js 0.133 sans avertissement (le pack utilise 0,07).
  const target = generator.fromScene(room, 0.04, 0.1, 40);
  generator.dispose();
  for (const panel of panels) { panel.geometry.dispose(); panel.material.dispose(); }
  return target;
}

export class SteeveMascot extends HTMLElement {
  static observedAttributes = ['open', 'busy', 'unread', 'quiet', 'motion', 'tracking', 'autonomy', 'scroll-motion'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.shadowRoot.innerHTML = `
      <style>
        :host { --_steeve-default-size: 145px; display: block; position: fixed; right: calc(var(--steeve-right, 20px) + env(safe-area-inset-right)); bottom: calc(var(--steeve-bottom, 14px) + env(safe-area-inset-bottom)); width: var(--steeve-size, var(--_steeve-default-size)); z-index: var(--steeve-z, 50); color: #202525; font: 14px/1.4 system-ui, sans-serif; }
        :host([mode="preview"]) { position: relative; inset: auto; width: var(--steeve-size, 280px); z-index: 0; }
        :host([mode="inline"]) { position: relative; inset: auto; right: auto; bottom: auto; z-index: auto; }
        button { position: relative; display: block; width: 100%; min-width: 44px; min-height: 44px; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; border-radius: 14px; }
        button:focus-visible { outline: 3px solid #196d54; outline-offset: 5px; }
        .visual { display: block; width: 100%; aspect-ratio: 0.75; position: relative; }
        canvas, img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
        img { object-fit: contain; }
        .label { display: table; margin: -3px auto 0; padding: 5px 10px; color: #fff; background: #202525; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        :host([mode="preview"]) .label, :host([mode="preview"]) .badge { display: none; }
        .badge { position: absolute; right: 8%; top: 12%; background: #176c52; color: white; border: 2px solid white; min-width: 23px; height: 23px; box-sizing: border-box; padding: 0 5px; border-radius: 999px; display: grid; place-items: center; font-size: 11px; font-weight: 700; }
        .speech { position: absolute; right: 88%; bottom: 70%; width: max-content; max-width: 190px; background: white; border: 1px solid #d4dade; color: #293238; border-radius: 12px 12px 2px 12px; padding: 9px 12px; pointer-events: none; box-shadow: 0 3px 12px #0000000f; }
        :host([mode="preview"]) .speech { right: 55%; bottom: 87%; }
        [hidden] { display: none !important; }
        @media (min-width: 1800px) { :host { --_steeve-default-size: 165px; } }
        @media (min-width: 601px) and (max-width: 1024px) { :host { --_steeve-default-size: 115px; } }
        @media (max-width: 600px) { :host { --_steeve-default-size: 82px; } .label { font-size: 11px; padding: 4px 8px; } .badge { top: 9%; right: 2%; } .speech { max-width: min(160px, calc(100vw - 120px)); font-size: 12px; } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      </style>
      <button type="button" aria-label="Ouvrir la messagerie avec Steeve" aria-haspopup="dialog" aria-expanded="false">
        <span class="visual"><img src="${FALLBACK}" alt="" aria-hidden="true"></span>
        <span class="label" aria-hidden="true">Écris-moi</span>
        <span class="badge" hidden aria-hidden="true"></span>
      </button>
      <span class="speech" role="status" hidden></span>`;
    this._button = this.shadowRoot.querySelector('button');
    this._visual = this.shadowRoot.querySelector('.visual');
    this._speech = this.shadowRoot.querySelector('.speech');
    this._badge = this.shadowRoot.querySelector('.badge');
    this._img = this.shadowRoot.querySelector('img');
    this._state = 'idle';
    this._gaze = { x: 0, y: 0 };
    this._target = { x: 0, y: 0 };
    this._visible = true;
    this._raf = 0;
    this._deadline = 0;
    this._manual = null;
    this._timers = new Set();
    this._greeted = false;
    this._idlePhase = 0;
    this._auto = null;
    this._autoDeadline = 0;
    this._scrollUntil = 0;
    this._scrollDirection = 0;
    this._scrollPositions = new WeakMap();
  }

  connectedCallback() {
    if (this._abort) return;
    this.dataset.state = this._state;
    this._lastActivity = performance.now();
    this._lastFrame = null;
    this._idlePhase = 0;
    this._scrollPositions = new WeakMap();
    if (document.scrollingElement) this._scrollPositions.set(document.scrollingElement, scrollY);
    this._abort = new AbortController();
    const signal = this._abort.signal;
    this._motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    this._pointerQuery = matchMedia('(hover: hover) and (pointer: fine)');
    this._button.addEventListener('click', () => {
      this._activity();
      this.dispatchEvent(new CustomEvent('steeve:open', { bubbles: true, composed: true }));
    }, { signal });
    this._motionQuery.addEventListener('change', () => this._sync(), { signal });
    this._pointerQuery.addEventListener('change', () => this._sync(), { signal });
    window.addEventListener('pointermove', event => this._pointer(event), { passive: true, signal });
    document.addEventListener('pointerdown', () => this._activity(), { passive: true, capture: true, signal });
    document.addEventListener('keydown', () => { this._target.x = this._target.y = 0; this._activity(); }, { capture: true, signal });
    document.addEventListener('pointerout', event => {
      if (!event.relatedTarget) { this._target.x = this._target.y = 0; this._request(); }
    }, { passive: true, signal });
    document.addEventListener('visibilitychange', () => this._visibility(), { signal });
    window.addEventListener('resize', () => this._measure(), { passive: true, signal });
    // Capture : observe aussi le défilement des panneaux, sans lire leur contenu.
    document.addEventListener('scroll', event => this._scroll(event), { passive: true, capture: true, signal });
    this._resize = new ResizeObserver(() => this._measure());
    this._resize.observe(this._visual);
    this._intersection = new IntersectionObserver(entries => {
      this._visible = entries[0].isIntersecting;
      this._visibility();
    });
    this._intersection.observe(this);
    this._init3D();
    this._sync();
    this._scheduleBlink();
    if (!this._greeted && this.getAttribute('mode') !== 'preview' && this.getAttribute('greeting') !== 'off') {
      this._greeted = true;
      this._later(() => {
        if (this._autonomous) this.play('greeting', { message: 'Coucou, je suis Steeve !' });
      }, 900);
    }
  }

  disconnectedCallback() {
    this._abort?.abort();
    this._abort = null;
    this._resize?.disconnect();
    this._intersection?.disconnect();
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._timers.forEach(clearTimeout);
    this._timers.clear();
    this._blinkTimer = this._idleTimer = this._autoTimer = this._scrollTimer = this._manualTimer = null;
    this._manual = null;
    this._deadline = 0;
    this._auto = null;
    this._autoDeadline = this._scrollUntil = 0;
    this._idlePhase = 0;
    this._gaze.x = this._gaze.y = this._target.x = this._target.y = 0;
    this._speech.hidden = true;
    this._contextLost = false;
    this._dispose3D();
  }

  _dispose3D() {
    this._model?.dispose();
    this._environment?.dispose();
    this._renderer?.dispose();
    this._renderer?.forceContextLoss();
    this._renderer?.domElement.remove();
    this._renderer = this._model = this._environment = null;
    this._scene = this._camera = null;
    this._size = null;
    this._lastFrame = null;
    this._img.hidden = false;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._abort || oldValue === newValue) return;
    if (['motion', 'autonomy', 'scroll-motion', 'open', 'busy', 'quiet'].includes(name)) {
      this._lastActivity = performance.now();
      this._idlePhase = 0;
      this._cancelTimer('_idleTimer');
    }
    this._sync();
  }

  _later(fn, ms) {
    const id = setTimeout(() => { this._timers.delete(id); if (this.isConnected) fn(); }, ms);
    this._timers.add(id);
    return id;
  }

  _cancelTimer(key) {
    if (this[key] == null) return;
    clearTimeout(this[key]);
    this._timers.delete(this[key]);
    this[key] = null;
  }

  _cancelAutomatic() {
    this._auto = null;
    this._autoDeadline = this._scrollUntil = 0;
    this._cancelTimer('_autoTimer');
    this._cancelTimer('_scrollTimer');
  }

  _init3D() {
    this._contextLost = false;
    if (this.getAttribute('render') === 'svg' || this.getAttribute('render') === 'fallback') {
      this._setRendererStatus('svg-fallback');
      return;
    }
    try {
      this._renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      this._renderer.setClearColor(0x000000, 0);
      this._renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this._renderer.toneMappingExposure = 1.15;
      // Équivalents Three.js 0.133 des réglages par défaut de la version du pack.
      this._renderer.outputEncoding = THREE.sRGBEncoding;
      this._renderer.physicallyCorrectLights = true;
      this._scene = new THREE.Scene();
      this._camera = new THREE.OrthographicCamera(-1.74, 1.74, 2.32, -2.32, 0.1, 30);
      this._camera.position.set(0, 1.96, 9);
      this._camera.lookAt(0, 1.91, 0);
      this._environment = makeEnvironment(this._renderer);
      this._scene.environment = this._environment.texture;
      this._scene.add(new THREE.HemisphereLight(srgb('#ffffff'), srgb('#646366'), 1.05));
      const key = new THREE.DirectionalLight(srgb('#ffffff'), 2.15);
      key.position.set(-3, 5, 5);
      this._scene.add(key);
      const fill = new THREE.DirectionalLight(srgb('#ffffff'), 1.25);
      fill.position.set(4, 3, -2);
      this._scene.add(fill);
      this._model = createSteeveModel();
      this._rest = {};
      for (const name of PARTS) {
        const object = name === 'root' ? this._model.root : this._model[name];
        this._rest[name] = [object.rotation.x, object.rotation.y, object.rotation.z];
      }
      this._restPos = { root: this._model.root.position.y, faceX: this._model.face.position.x, faceY: this._model.face.position.y };
      this._model.setExpression(this._expression());
      this._scene.add(this._model.root);
      this._visual.append(this._renderer.domElement);
      this._renderer.domElement.setAttribute('aria-hidden', 'true');
      this._renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        if (!this._renderer) return;
        cancelAnimationFrame(this._raf);
        this._raf = 0;
        this._contextLost = true;
        this._renderer.domElement.hidden = true;
        this._img.hidden = false;
        this._setRendererStatus('svg-fallback');
      }, { signal: this._abort.signal });
      this._renderer.domElement.addEventListener('webglcontextrestored', () => {
        if (!this._renderer || !this.isConnected) return;
        try {
          this._contextLost = false;
          this._environment?.dispose();
          this._environment = makeEnvironment(this._renderer);
          this._scene.environment = this._environment.texture;
          this._renderer.domElement.hidden = false;
          this._img.hidden = true;
          this._setRendererStatus('webgl2');
          this._lastFrame = null;
          this._request();
        } catch (error) {
          console.warn('Steeve : contexte restauré indisponible, image de secours.', error.message);
          this._dispose3D();
          this._setRendererStatus('svg-fallback');
        }
      }, { signal: this._abort.signal });
      this._img.hidden = true;
      this._setRendererStatus('webgl2');
      this._measure();
    } catch (error) {
      console.warn('Steeve : image de secours, rendu 3D indisponible.', error.message);
      this._dispose3D();
      this._setRendererStatus('svg-fallback');
    }
  }

  _setRendererStatus(renderer) {
    this.dataset.renderer = renderer;
    this.dispatchEvent(new CustomEvent('steeve:rendererchange', { detail: { renderer }, bubbles: true, composed: true }));
  }

  _expression() { return EXPRESSION[this._state] || 'neutre'; }

  get _moves() { return this.getAttribute('motion') !== 'off' && !this._motionQuery?.matches; }
  /** Gestes demandés par l'application : jamais pendant la saisie ni une attente en cours. */
  get _canPlay() { return !this.hasAttribute('quiet') && !this.hasAttribute('busy'); }
  /** Réactions autonomes (regard, défilement, attente) : seulement messagerie fermée. */
  get _decorates() { return this._canPlay && !this.hasAttribute('open'); }
  get _onScreen() { return this.isConnected && !document.hidden && this._visible; }
  get _tracks() { return this._moves && this._decorates && this.getAttribute('tracking') !== 'off' && this._pointerQuery?.matches; }
  get _autonomous() { return this._moves && this._decorates && this._onScreen && this.getAttribute('autonomy') !== 'off'; }

  _measure() {
    const rect = this._visual.getBoundingClientRect();
    this._center = { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.3 };
    const dpr = Math.min(devicePixelRatio || 1, innerWidth <= 600 ? 1.25 : 1.5);
    if (this._renderer && rect.width && rect.height && (!this._size || this._size.width !== rect.width || this._size.height !== rect.height || this._size.dpr !== dpr)) {
      this._size = { width: rect.width, height: rect.height, dpr };
      if (this._renderer.getPixelRatio() !== dpr) this._renderer.setPixelRatio(dpr);
      this._renderer.setSize(rect.width, rect.height, false);
      const half = 2.32;
      this._camera.left = -half * rect.width / rect.height;
      this._camera.right = -this._camera.left;
      this._camera.top = half;
      this._camera.bottom = -half;
      this._camera.updateProjectionMatrix();
      this._request();
    }
  }

  _pointer(event) {
    this._activity();
    if (!this._tracks || event.pointerType === 'touch' || !this._center) return;
    this._target.x = clamp((event.clientX - this._center.x) / Math.max(250, innerWidth * 0.34));
    this._target.y = clamp((this._center.y - event.clientY) / Math.max(220, innerHeight * 0.4));
    this._request();
  }

  _activity() {
    const waking = Boolean(this._auto);
    const advanced = this._idlePhase > 0;
    this._lastActivity = performance.now();
    this._idlePhase = 0;
    this._auto = null;
    this._autoDeadline = 0;
    this._cancelTimer('_autoTimer');
    if (advanced) this._cancelTimer('_idleTimer');
    this._armIdle();
    if (waking) { this._chooseState(); this._request(); this._scheduleBlink(); }
  }

  _armIdle() {
    if (!this._autonomous || this._manual || this._idlePhase >= IDLE_AT.length) {
      this._cancelTimer('_idleTimer');
      return;
    }
    if (this._idleTimer) return;
    const delay = Math.max(20, IDLE_AT[this._idlePhase] - (performance.now() - this._lastActivity));
    this._idleTimer = this._later(() => {
      this._idleTimer = null;
      if (!this._autonomous || this._manual) return;
      if (performance.now() - this._lastActivity + 10 < IDLE_AT[this._idlePhase]) { this._armIdle(); return; }
      const phase = this._idlePhase++;
      const last = phase === IDLE_AT.length - 1;
      if (last) {
        this._auto = 'sleep';
        this._autoDeadline = 0;
      } else {
        const pool = IDLE_POOL.filter(name => name !== this._lastIdle);
        this._auto = this._lastIdle = pool[Math.floor(Math.random() * pool.length)];
        this._autoDeadline = performance.now() + IDLE_DURATION[this._auto];
      }
      this._chooseState();
      this._request();
      this._cancelTimer('_autoTimer');
      if (this._autoDeadline) this._autoTimer = this._later(() => {
        this._autoTimer = null;
        this._auto = null;
        this._autoDeadline = 0;
        this._chooseState();
        this._request();
      }, this._autoDeadline - performance.now() + 20);
      this._armIdle();
    }, delay);
  }

  _scroll(event) {
    const scroller = event.target === document ? document.scrollingElement : event.target;
    const position = scroller?.scrollTop;
    const previous = scroller && this._scrollPositions.get(scroller);
    if (scroller && Number.isFinite(position)) this._scrollPositions.set(scroller, position);
    const delta = Number.isFinite(position) ? position - (previous ?? 0) : 0;
    this._activity();
    if (this.getAttribute('mode') === 'preview') this._measure();
    if (!this._moves || !this._decorates || this.getAttribute('scroll-motion') === 'off' || !delta) return;
    this._scrollDirection = Math.sign(delta) * Math.min(1, 0.35 + Math.abs(delta) / 90);
    this._scrollUntil = performance.now() + 800;
    this._chooseState();
    this._request();
    const finish = () => {
      this._scrollTimer = null;
      const remaining = this._scrollUntil - performance.now();
      if (remaining > 0) { this._scrollTimer = this._later(finish, remaining + 20); return; }
      this._scrollUntil = 0;
      this._chooseState();
      this._request();
    };
    if (!this._scrollTimer) this._scrollTimer = this._later(finish, 820);
  }

  _sync() {
    if (this._motionAllowed !== this._moves) {
      this._motionAllowed = this._moves;
      this._lastActivity = performance.now();
      this._idlePhase = 0;
      this._cancelTimer('_idleTimer');
    }
    if (!this._moves || !this._canPlay) {
      this._manual = null;
      this._deadline = 0;
      this._cancelTimer('_manualTimer');
    }
    if (!this._moves || !this._decorates) {
      this._cancelAutomatic();
    } else {
      if (this.getAttribute('autonomy') === 'off') {
        this._auto = null;
        this._autoDeadline = 0;
        this._cancelTimer('_autoTimer');
      }
      if (this.getAttribute('scroll-motion') === 'off') {
        this._scrollUntil = 0;
        this._cancelTimer('_scrollTimer');
      }
    }
    if (!this._tracks) this._target.x = this._target.y = 0;
    const open = this.hasAttribute('open');
    const unread = Math.max(0, Math.floor(Number(this.getAttribute('unread')) || 0));
    this._badge.hidden = !unread;
    this._badge.textContent = unread > 99 ? '99+' : String(unread);
    this._button.setAttribute('aria-expanded', String(open));
    this._button.setAttribute('aria-label', `Ouvrir la messagerie avec Steeve${unread ? `, ${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : ''}`);
    this.shadowRoot.querySelector('.label').textContent = open ? 'À ton écoute' : 'Écris-moi';
    if (open || this.hasAttribute('quiet')) this._speech.hidden = true;
    this._chooseState();
    this._request();
    this._armIdle();
    this._scheduleBlink();
  }

  _chooseState() {
    const now = performance.now();
    if (this._deadline && now >= this._deadline) { this._manual = null; this._deadline = 0; }
    if (this._autoDeadline && now >= this._autoDeadline) { this._auto = null; this._autoDeadline = 0; }
    const automatic = this._moves && this._decorates ? (this._scrollUntil > now ? 'scroll' : this._auto) : null;
    // Priorité : saisie > attente réelle > geste demandé > messagerie ouverte > défilement / autonomie > repos.
    const state = this.hasAttribute('quiet') ? 'listening'
      : this.hasAttribute('busy') ? 'thinking'
        : (this._moves && this._manual) || (this.hasAttribute('open') ? 'listening' : automatic || 'idle');
    if (state === this._state) return;
    this._state = state;
    this._started = performance.now();
    this.dataset.state = state;
    this._model?.setExpression(this._expression());
    this.dispatchEvent(new CustomEvent('steeve:statechange', { detail: { state }, bubbles: true, composed: true }));
  }

  play(state, { duration, message = '' } = {}) {
    if (!STATES.has(state)) throw new TypeError(`État Steeve inconnu : ${state}`);
    this._activity();
    this._cancelAutomatic();
    this._cancelTimer('_manualTimer');
    this._manual = state === 'idle' ? null : state;
    this._started = performance.now();
    const ms = Number(duration) || STEEVE_GESTURES[state] || 2800;
    this._deadline = this._manual ? this._started + clamp(ms, 250, 30000) : 0;
    if (message && !this.hasAttribute('quiet') && !this.hasAttribute('open')) {
      this._speech.textContent = String(message).slice(0, 160);
      this._speech.hidden = false;
      const token = this._speechToken = Symbol();
      this._later(() => { if (this._speechToken === token) this._speech.hidden = true; }, 4200);
    }
    // Rejouer le même geste : on repart de zéro.
    if (this._manual && this._state === this._manual) {
      this._started = performance.now();
      this._model?.setExpression(this._expression());
    }
    this._sync();
    const deadline = this._deadline;
    if (deadline) this._manualTimer = this._later(() => {
      this._manualTimer = null;
      if (this._deadline === deadline) { this._manual = null; this._deadline = 0; }
      this._sync();
    }, deadline - performance.now() + 20);
  }

  setBusy(value) { this.toggleAttribute('busy', Boolean(value)); }
  setChatOpen(value) { this.toggleAttribute('open', Boolean(value)); }
  setQuiet(value) { this.toggleAttribute('quiet', Boolean(value)); }
  setUnread(value) { this.setAttribute('unread', String(Math.max(0, Math.floor(Number(value) || 0)))); }
  setMotionEnabled(value) { this.setAttribute('motion', value ? 'auto' : 'off'); }
  setTrackingEnabled(value) { this.setAttribute('tracking', value ? 'auto' : 'off'); }
  setAutonomyEnabled(value) { this.setAttribute('autonomy', value ? 'auto' : 'off'); }
  setScrollEnabled(value) { this.setAttribute('scroll-motion', value ? 'auto' : 'off'); }

  _visibility() {
    if (document.hidden || !this._visible) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      this._cancelTimer('_blinkTimer');
      this._cancelTimer('_idleTimer');
      this._cancelAutomatic();
    } else {
      this._lastActivity = performance.now();
      this._lastFrame = null;
      this._idlePhase = 0;
      this._chooseState();
      this._measure();
      this._request();
      this._scheduleBlink();
      this._armIdle();
    }
  }

  _scheduleBlink() {
    if (!this._moves || !this._onScreen || this.hasAttribute('quiet') || this._state === 'sleep') {
      this._cancelTimer('_blinkTimer');
      return;
    }
    if (this._blinkTimer) return;
    this._blinkTimer = this._later(() => {
      this._blinkTimer = null;
      if (this._moves && !this.hasAttribute('quiet')) { this._blinkStart = performance.now(); this._request(); }
      this._scheduleBlink();
    }, 4200 + Math.random() * 2600);
  }

  _request() {
    if (!this.isConnected || this._raf || !this._renderer || this._contextLost || document.hidden || !this._visible) return;
    this._raf = requestAnimationFrame(time => this._frame(time));
  }

  // Décrit une pose sans toucher au modèle ; chaque canal est ensuite amorti vers elle.
  _buildPose(time) {
    const R = this._rest;
    const pose = { rootY: 0, faceX: 0, faceY: 0, eyes: 1, eyesWide: 1, x: 0, y: 0, active: false };
    for (const name of PARTS) pose[name] = [...R[name]];
    if (!this._moves) return pose;
    const add = (name, axis, value) => { pose[name][axis] += value; };
    let x = this._tracks ? this._gaze.x : 0;
    let y = this._tracks ? this._gaze.y : 0;
    const t = Math.max(0, (time - (this._started ?? time)) / 1000);
    const deadline = this._manual ? this._deadline : this._autoDeadline;
    const w = ease(t / 0.3) * (deadline ? ease((deadline - time) / 450) : 1);
    const s = this._state;
    const X = 0, Y = 1, Z = 2;
    switch (s) {
      case 'greeting': // coucou : bras levé, avant-bras qui salue
        add('armRight', Z, 2.3 * w);
        add('forearmRight', Z, Math.sin(t * 11) * 0.42 * w);
        add('head', Z, -0.07 * w);
        add('body', Z, 0.025 * w);
        pose.rootY += Math.abs(Math.sin(t * 5.5)) * 0.02 * w;
        break;
      case 'invite':
      case 'point': // montre la messagerie, à sa gauche
        add('armLeft', Z, -1.05 * w);
        add('armLeft', X, -0.15 * w);
        add('forearmLeft', Z, -0.25 * w + Math.sin(t * 6) * 0.08 * w);
        add('head', Y, -0.3 * w);
        add('body', Y, -0.12 * w);
        pose.faceX -= 0.03 * w;
        pose.rootY += Math.abs(Math.sin(t * 4)) * 0.025 * w;
        x *= 0.3;
        break;
      case 'success': // pouce levé
        add('armRight', X, -1.05 * w);
        add('armRight', Z, -0.15 * w);
        add('forearmRight', X, -1.15 * w);
        add('head', Z, 0.06 * w);
        pose.rootY += (1 - Math.cos(t * 7)) * 0.025 * w;
        break;
      case 'laugh': // rire : secoue les épaules, tête en arrière, mains sur le ventre
        add('body', Z, Math.sin(t * 17) * 0.035 * w);
        add('head', X, -(0.12 + Math.sin(t * 15) * 0.05) * w);
        add('armLeft', X, -0.55 * w); add('armRight', X, -0.55 * w);
        add('armLeft', Z, 0.25 * w); add('armRight', Z, -0.25 * w);
        add('forearmLeft', X, -0.9 * w); add('forearmRight', X, -0.9 * w);
        pose.rootY += Math.abs(Math.sin(t * 8.5)) * 0.035 * w;
        break;
      case 'surprise': // petit saut, bras écartés, yeux grands ouverts
        pose.rootY += Math.sin(clamp(t / 0.35, 0, 1) * Math.PI) * 0.16 * w;
        add('armLeft', Z, -0.75 * w); add('armRight', Z, 0.75 * w);
        add('forearmLeft', Z, -0.5 * w); add('forearmRight', Z, 0.5 * w);
        add('head', X, -0.1 * w);
        pose.eyes = 1 + 0.15 * w;
        pose.eyesWide = 1 + 0.18 * w;
        break;
      case 'wink': // clin d'œil complice
        add('head', Z, 0.13 * w);
        add('body', Z, 0.03 * w);
        add('armRight', X, -0.7 * w);
        add('forearmRight', X, -0.9 * w);
        break;
      case 'nod': // oui
        add('head', X, Math.sin(t * 9) * 0.2 * w);
        break;
      case 'shake': // non
        add('head', Y, Math.sin(t * 10) * 0.32 * w);
        add('body', Y, Math.sin(t * 10) * 0.05 * w);
        break;
      case 'shrug': // « je ne sais pas »
        add('armLeft', Z, -0.3 * w); add('armRight', Z, 0.3 * w);
        add('forearmLeft', X, -1.15 * w); add('forearmRight', X, -1.15 * w);
        add('forearmLeft', Z, -0.55 * w); add('forearmRight', Z, 0.55 * w);
        add('head', Z, 0.12 * w);
        pose.rootY += 0.03 * w;
        break;
      case 'clap': // applaudit
        add('armLeft', X, -0.95 * w); add('armRight', X, -0.95 * w);
        add('armLeft', Z, 0.3 * w); add('armRight', Z, -0.3 * w);
        add('forearmLeft', X, -0.55 * w); add('forearmRight', X, -0.55 * w);
        add('forearmLeft', Z, (Math.sin(t * 16) * 0.5 + 0.5) * 0.35 * w);
        add('forearmRight', Z, -(Math.sin(t * 16) * 0.5 + 0.5) * 0.35 * w);
        pose.rootY += Math.abs(Math.sin(t * 8)) * 0.02 * w;
        break;
      case 'sad': // déçu, tête basse
        add('head', X, 0.24 * w);
        add('head', Z, Math.sin(t * 1.5) * 0.04 * w);
        add('body', X, 0.05 * w);
        add('armLeft', Z, 0.12 * w); add('armRight', Z, -0.12 * w);
        pose.eyes = 1 - 0.15 * w;
        break;
      case 'celebrate': // bras en l'air et sauts
        add('armLeft', Z, -2.55 * w); add('armRight', Z, 2.55 * w);
        add('forearmLeft', Z, -Math.sin(t * 10) * 0.3 * w);
        add('forearmRight', Z, Math.sin(t * 10 + 1) * 0.3 * w);
        add('head', X, -0.08 * w);
        pose.rootY += Math.abs(Math.sin(t * 6.5)) * 0.17 * w;
        break;
      case 'bow': // révérence, main sur le cœur
        add('body', X, 0.32 * w);
        add('head', X, 0.15 * w);
        add('armRight', X, -0.55 * w);
        add('forearmRight', Z, -1.25 * w);
        add('armLeft', X, 0.25 * w);
        break;
      case 'jump': { // saut de joie
        const air = Math.sin(clamp(t / 0.8, 0, 1) * Math.PI);
        pose.rootY += air * 0.32 * w;
        add('armLeft', Z, -1.3 * air * w); add('armRight', Z, 1.3 * air * w);
        add('legLeft', Z, -0.15 * air * w); add('legRight', Z, 0.15 * air * w);
        break;
      }
      case 'spin': { // tour sur lui-même
        const k = ease(t / 1.2);
        add('root', Y, Math.PI * 2 * k);
        const open = Math.sin(Math.PI * clamp(t / 1.2, 0, 1));
        add('armLeft', Z, -0.5 * open); add('armRight', Z, 0.5 * open);
        pose.rootY += open * 0.06;
        x = y = 0;
        break;
      }
      case 'oops': // oups, main sur la tête
        add('armRight', Z, 2.0 * w);
        add('armRight', X, -0.25 * w);
        add('forearmRight', Z, 1.75 * w);
        add('head', Z, 0.1 * w);
        add('head', X, 0.05 * w);
        add('body', Z, -0.03 * w);
        break;
      case 'dance':
        add('body', Z, Math.sin(t * 5.2) * 0.08 * w);
        add('root', Y, Math.sin(t * 2.6) * 0.25 * w);
        add('head', Z, -Math.sin(t * 5.2 - 0.3) * 0.06 * w);
        add('armLeft', Z, -(0.5 + Math.sin(t * 5.2) * 0.45) * w);
        add('armRight', Z, (0.5 - Math.sin(t * 5.2) * 0.45) * w);
        add('forearmLeft', X, -0.6 * w); add('forearmRight', X, -0.6 * w);
        add('legLeft', Z, Math.sin(t * 5.2) * 0.07 * w);
        add('legRight', Z, Math.sin(t * 5.2) * 0.07 * w);
        pose.rootY += (1 - Math.cos(t * 10.4)) * 0.035 * w;
        break;
      case 'curious': // regarde autour de lui
        x = Math.sin(t * 2.3) * 0.62 * w;
        y = 0.16 * w;
        add('head', Z, Math.sin(t * 1.9) * 0.07 * w);
        break;
      case 'stretch': { // s'étire
        const up = Math.sin(Math.PI * clamp(t / 2.6, 0, 1));
        add('armLeft', Z, -2.5 * up * w); add('armRight', Z, 2.5 * up * w);
        add('body', X, -0.06 * up * w);
        add('head', X, -0.12 * up * w);
        pose.rootY += 0.03 * up * w;
        break;
      }
      case 'thinking': // la main au menton, regard vers le haut
        add('armRight', X, -0.95 * w);
        add('armRight', Z, -0.62 * w);
        add('forearmRight', X, -2.25 * w);
        add('head', Z, (0.06 + Math.sin(t * 1.45) * 0.04) * w);
        add('head', X, -0.07 * w);
        pose.faceY += 0.03 * w;
        x *= 0.3; y = 0;
        break;
      case 'listening':
        add('head', Z, -0.045);
        add('head', X, 0.03);
        break;
      case 'sleep':
        add('head', X, 0.22);
        add('head', Z, 0.07);
        add('body', X, 0.03);
        x = y = 0;
        break;
      case 'scroll': {
        const amount = this._scrollUntil > time ? ease((this._scrollUntil - time) / 800) : 0;
        const direction = this._scrollDirection || 0.6;
        y = -direction * 0.38 * amount;
        x *= 0.45;
        add('body', X, direction * 0.03 * amount);
        add('armLeft', Z, -direction * 0.08 * amount);
        add('armRight', Z, direction * 0.08 * amount);
        pose.active = amount > 0;
        break;
      }
    }
    if (s !== 'idle' && s !== 'listening' && s !== 'sleep' && s !== 'scroll') pose.active = true;
    pose.x = x;
    pose.y = y;
    add('head', Y, x * 0.34);
    add('head', X, -y * 0.19);
    add('head', Z, -x * 0.025);
    add('body', Y, x * 0.05);
    pose.faceX += x * 0.035;
    pose.faceY += y * 0.025;
    const blinkAge = time - (this._blinkStart ?? -1000);
    if (s !== 'sleep' && !this.hasAttribute('quiet') && blinkAge >= 0 && blinkAge < 200) {
      pose.eyes = Math.max(0.09, 1 - Math.sin(blinkAge / 200 * Math.PI));
      pose.active = true;
    }
    return pose;
  }

  _frame(time) {
    this._raf = 0;
    if (!this._renderer || !this._model || this._contextLost || !this._onScreen) return;
    this._chooseState();
    const dt = Math.max(1, Math.min(64, this._lastFrame == null ? 16 : time - this._lastFrame));
    this._lastFrame = time;
    const smoothing = this._moves ? 1 - Math.exp(-dt / 70) : 1;
    this._gaze.x += (this._target.x - this._gaze.x) * smoothing;
    this._gaze.y += (this._target.y - this._gaze.y) * smoothing;
    const pose = this._buildPose(time);
    let unsettled = false;
    const approach = (object, property, value, timeConstant, angular = false) => {
      let delta = value - object[property];
      if (angular) delta = wrapAngle(delta);
      if (!this._moves || Math.abs(delta) < 0.00015) { object[property] = value; return; }
      object[property] += delta * (1 - Math.exp(-dt / timeConstant));
      unsettled = true;
    };
    const m = this._model;
    for (const name of PARTS) {
      const object = name === 'root' ? m.root : m[name];
      // La tête mène, le corps suit ; les avant-bras suivent les épaules.
      const tau = name === 'head' ? 95 : name === 'root' || name === 'body' ? 200 : name.startsWith('forearm') || name.startsWith('hand') ? 120 : 150;
      ['x', 'y', 'z'].forEach((axis, index) => approach(object.rotation, axis, pose[name][index], tau, name === 'root' && axis === 'y'));
    }
    // Un tour complet se termine sur la pose de face, sans dérouler à l'envers.
    if (Math.abs(m.root.rotation.y) > Math.PI) m.root.rotation.y = wrapAngle(m.root.rotation.y);
    approach(m.root.position, 'y', this._restPos.root + pose.rootY, 110);
    approach(m.face.position, 'x', this._restPos.faceX + pose.faceX, 65);
    approach(m.face.position, 'y', this._restPos.faceY + pose.faceY, 65);
    const eyeTau = this._state === 'sleep' ? 180 : 28;
    for (const eye of [m.eyeLeft, m.eyeRight]) {
      approach(eye.scale, 'y', pose.eyes, eyeTau);
      approach(eye.scale, 'x', pose.eyesWide, 60);
    }
    this.dataset.gazeX = pose.x.toFixed(2);
    this.dataset.gazeY = pose.y.toFixed(2);
    this._renderer.render(this._scene, this._camera);
    const movingGaze = Math.abs(this._target.x - this._gaze.x) + Math.abs(this._target.y - this._gaze.y) > 0.0005;
    if (pose.active || unsettled || movingGaze) this._request();
  }
}

if (!customElements.get('steeve-mascot')) customElements.define('steeve-mascot', SteeveMascot);
