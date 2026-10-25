import * as THREE from 'three';
import { createSteeveModel, srgb } from './steeve-model.js';
import fallbackUrl from './steeve-master.svg?url';

// Composant <steeve-mascot> : adapté du kit « steeve-cursor-kit 3 » pour Logisorama.
// Différences avec le kit : Three.js du projet (0.133, rendu sRGB et lumières physiques pour garder le même
// aspect), mode « inline » (positionné par l'application), accueil désactivable (greeting="off"),
// focus délégué au bouton interne (host.focus()).

const STATES = new Set(['idle', 'greeting', 'listening', 'thinking', 'success', 'dance', 'sleep', 'invite', 'curious', 'stretch', 'scroll']);
const FALLBACK = fallbackUrl;
const clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const ease = value => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };
const IDLE_AT = [8000, 18000, 35000];

// Procedural softboxes: no HDR download, photograph, Spline file or paid service.
function makeEnvironment(renderer) {
  const room = new THREE.Scene();
  room.background = srgb('#242629');
  const objects = [];
  const panel = (color, intensity, size, position) => {
    const material = new THREE.MeshBasicMaterial({ color: srgb(color), side: THREE.DoubleSide });
    material.color.multiplyScalar(intensity);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
    objects.push(mesh);
  };
  panel('#ffffff', 2.2, [3, 7], [-5, 4, 6]);
  panel('#e5e7eb', 1.2, [2, 6], [5, 2, 3]);
  panel('#ffffff', 1.8, [7, 3], [0, 7, -2]);
  panel('#85888c', 0.65, [4, 6], [-3, 0, -6]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  // Flou 0,04 : la valeur du kit (0,05) dépasse le nombre d'échantillons de Three.js 0.133.
  const target = pmrem.fromScene(room, 0.04, 0.1, 40);
  pmrem.dispose();
  objects.forEach(o => { o.geometry.dispose(); o.material.dispose(); });
  return target;
}

export class SteeveMascot extends HTMLElement {
  static observedAttributes = ['open', 'busy', 'unread', 'quiet', 'motion', 'tracking', 'autonomy', 'scroll-motion'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.shadowRoot.innerHTML = `
      <style>
        :host { --_steeve-default-size: 150px; display: block; position: fixed; right: calc(var(--steeve-right, 20px) + env(safe-area-inset-right)); bottom: calc(var(--steeve-bottom, 14px) + env(safe-area-inset-bottom)); width: var(--steeve-size, var(--_steeve-default-size)); z-index: var(--steeve-z, 50); color: #181a1d; font: 14px/1.4 system-ui, sans-serif; }
        :host([mode="preview"]) { position: relative; inset: auto; width: var(--steeve-size, 280px); z-index: 0; }
        :host([mode="inline"]) { position: relative; inset: auto; right: auto; bottom: auto; z-index: auto; }
        button { position: relative; display: block; width: 100%; min-width: 44px; min-height: 44px; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; border-radius: 18px; }
        button:focus-visible { outline: 3px solid #384653; outline-offset: 6px; }
        .visual { display: block; width: 100%; aspect-ratio: 0.76; position: relative; }
        canvas, img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
        img { object-fit: contain; }
        .label { display: inline-block; padding: 4px 10px; margin-top: 0; color: #fff; background: #24272b; border-radius: 20px; font-size: 12px; font-weight: 650; white-space: nowrap; }
        :host([mode="preview"]) .label { display: none; }
        .badge { position: absolute; right: 9%; top: 12%; background: #283d49; color: white; border: 2px solid white; min-width: 22px; height: 22px; padding: 0 3px; border-radius: 20px; display: grid; place-items: center; font-size: 11px; font-weight: 700; }
        .speech { position: absolute; right: 90%; bottom: 68%; width: max-content; max-width: 185px; background: white; border: 1px solid #d4dade; color: #293238; border-radius: 12px 12px 2px 12px; padding: 10px 13px; pointer-events: none; box-shadow: 0 3px 12px #0000000a; }
        :host([mode="preview"]) .speech { right: 55%; bottom: 87%; }
        [hidden] { display: none !important; }
        @media (min-width: 1800px) { :host { --_steeve-default-size: 170px; } }
        @media (min-width: 601px) and (max-width: 1024px) { :host { --_steeve-default-size: 112px; } }
        @media (max-width: 600px) { :host { --_steeve-default-size: 78px; right: calc(var(--steeve-right, 10px) + env(safe-area-inset-right)); } .label { font-size: 11px; padding: 4px 7px; } .speech { max-width: min(150px, calc(100vw - 112px)); font-size: 12px; } }
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
    document.addEventListener('keydown', () => {
      this._target.x = this._target.y = 0;
      this._activity();
    }, { capture: true, signal });
    document.addEventListener('pointerout', event => {
      if (!event.relatedTarget) { this._target.x = this._target.y = 0; this._request(); }
    }, { passive: true, signal });
    document.addEventListener('visibilitychange', () => this._visibility(), { signal });
    window.addEventListener('resize', () => this._measure(), { passive: true, signal });
    // Capture observes native scroll events from nested panels without reading their content.
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
    this._model?.geometries.forEach(g => g.dispose());
    this._model?.materials.forEach(m => m.dispose());
    this._environment?.dispose();
    this._renderer?.dispose();
    this._renderer?.forceContextLoss();
    this._renderer?.domElement.remove();
    this._renderer = this._model = this._environment = null;
    this._scene = this._camera = null;
    this._size = null;
    this._lastFrame = null;
    this.shadowRoot.querySelector('img').hidden = false;
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
    if (this.getAttribute('render') === 'svg') {
      this._setRendererStatus('svg-fallback');
      return;
    }
    try {
      this._renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      this._renderer.setClearColor(0x000000, 0);
      this._renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this._renderer.toneMappingExposure = 1;
      // Équivalents Three.js 0.133 des réglages par défaut de la version du kit.
      this._renderer.outputEncoding = THREE.sRGBEncoding;
      this._renderer.physicallyCorrectLights = true;
      this._scene = new THREE.Scene();
      this._camera = new THREE.PerspectiveCamera(31, 0.76, 0.1, 30);
      this._camera.position.set(0, 1.85, 8.3);
      this._camera.lookAt(0, 1.8, 0);
      this._environment = makeEnvironment(this._renderer);
      this._scene.environment = this._environment.texture;
      this._scene.add(new THREE.HemisphereLight(srgb(0xffffff), srgb(0x414449), 0.75));
      const key = new THREE.DirectionalLight(0xffffff, 1.45);
      key.position.set(-3, 5, 5);
      this._scene.add(key);
      const rim = new THREE.DirectionalLight(srgb(0xf1f4f7), 1.5);
      rim.position.set(3, 3, -2);
      this._scene.add(rim);
      this._model = createSteeveModel();
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
        this.shadowRoot.querySelector('img').hidden = false;
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
          this.shadowRoot.querySelector('img').hidden = true;
          this._setRendererStatus('webgl2');
          this._lastFrame = null;
          this._request();
        } catch (error) {
          console.warn('Steeve : contexte restauré indisponible, repli SVG.', error.message);
          this._dispose3D();
          this._setRendererStatus('svg-fallback');
        }
      }, { signal: this._abort.signal });
      this.shadowRoot.querySelector('img').hidden = true;
      this._setRendererStatus('webgl2');
      this._measure();
    } catch (error) {
      console.warn('Steeve : repli SVG, rendu 3D indisponible.', error.message);
      this._dispose3D();
      this._setRendererStatus('svg-fallback');
    }
  }

  _setRendererStatus(renderer) {
    this.dataset.renderer = renderer;
    this.dispatchEvent(new CustomEvent('steeve:rendererchange', { detail: { renderer }, bubbles: true, composed: true }));
  }

  _expression() { return ['greeting', 'invite', 'success', 'dance'].includes(this._state) ? 'smile' : this._state; }

  get _moves() { return this.getAttribute('motion') !== 'off' && !this._motionQuery?.matches; }
  get _decorates() { return !this.hasAttribute('quiet') && !this.hasAttribute('open') && !this.hasAttribute('busy'); }
  get _onScreen() { return this.isConnected && !document.hidden && this._visible; }
  get _tracks() { return this._moves && this._decorates && this.getAttribute('tracking') !== 'off' && this._pointerQuery?.matches; }
  get _autonomous() { return this._moves && this._decorates && this._onScreen && this.getAttribute('autonomy') !== 'off'; }

  _measure() {
    const rect = this._visual.getBoundingClientRect();
    this._center = { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.29 };
    const dpr = Math.min(devicePixelRatio || 1, innerWidth <= 600 ? 1.25 : 1.5);
    if (this._renderer && rect.width && rect.height && (!this._size || this._size.width !== rect.width || this._size.height !== rect.height || this._size.dpr !== dpr)) {
      this._size = { width: rect.width, height: rect.height, dpr };
      if (this._renderer.getPixelRatio() !== dpr) this._renderer.setPixelRatio(dpr);
      this._renderer.setSize(rect.width, rect.height, false);
      this._camera.aspect = rect.width / rect.height;
      this._camera.updateProjectionMatrix();
      this._request();
    }
  }

  _pointer(event) {
    this._activity();
    if (!this._tracks || event.pointerType === 'touch' || !this._center) return;
    this._target.x = clamp((event.clientX - this._center.x) / Math.max(240, innerWidth * 0.38));
    this._target.y = clamp((this._center.y - event.clientY) / Math.max(220, innerHeight * 0.42));
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
      this._auto = ['curious', 'stretch', 'sleep'][phase];
      this._autoDeadline = phase < 2 ? performance.now() + (phase === 0 ? 2400 : 3000) : 0;
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
    if (!this._moves || !this._decorates) {
      this._manual = null;
      this._deadline = 0;
      this._cancelTimer('_manualTimer');
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
    const state = this.hasAttribute('quiet') ? 'listening' : this.hasAttribute('busy') ? 'thinking' : this.hasAttribute('open') ? 'listening' : this._manual || automatic || 'idle';
    if (state === this._state) return;
    this._state = state;
    this._started = performance.now();
    this.dataset.state = state;
    this._model?.setExpression(this._expression());
    this.dispatchEvent(new CustomEvent('steeve:statechange', { detail: { state }, bubbles: true, composed: true }));
  }

  play(state, { duration = 2800, message = '' } = {}) {
    if (!STATES.has(state)) throw new TypeError(`État Steeve inconnu : ${state}`);
    this._activity();
    this._cancelAutomatic();
    this._cancelTimer('_manualTimer');
    this._manual = state === 'idle' ? null : state;
    this._started = performance.now();
    this._deadline = this._manual ? this._started + clamp(Number(duration) || 2800, 250, 30000) : 0;
    if (message && !this.hasAttribute('quiet') && !this.hasAttribute('open')) {
      this._speech.textContent = String(message).slice(0, 160);
      this._speech.hidden = false;
      const token = this._speechToken = Symbol();
      this._later(() => { if (this._speechToken === token) this._speech.hidden = true; }, 4200);
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
    }, 4800 + Math.random() * 2200);
  }

  _request() {
    if (!this.isConnected || this._raf || !this._renderer || this._contextLost || document.hidden || !this._visible) return;
    this._raf = requestAnimationFrame(time => this._frame(time));
  }

  // Describe a pose without mutating the model. Every animated channel is then
  // damped toward it, including the return to rest after an interruption.
  _buildPose(time) {
    const model = this._model;
    const pose = {
      root: [0, 0, 0], head: [0, 0, 0],
      armLeft: [0, 0, model.armLeft.userData.restRotationZ || 0],
      armRight: [0, 0, model.armRight.userData.restRotationZ || 0],
      forearmLeft: [0, 0, model.forearmLeft.userData.restRotationZ || 0],
      forearmRight: [0, 0, model.forearmRight.userData.restRotationZ || 0],
      legLeft: [0, 0, model.legLeft.userData.restRotationZ || 0],
      legRight: [0, 0, model.legRight.userData.restRotationZ || 0],
      bodyY: 0, faceX: 0, faceY: 0, eyes: 1, x: 0, y: 0, active: false,
    };
    if (!this._moves) return pose;
    let x = this._tracks ? this._gaze.x : 0;
    let y = this._tracks ? this._gaze.y : 0;
    const t = Math.max(0, (time - (this._started ?? time)) / 1000);
    const deadline = this._manual ? this._deadline : this._autoDeadline;
    const envelope = ease(t / 0.38) * (deadline ? ease((deadline - time) / 480) : 1);
    if (this._state === 'curious') {
      x = Math.sin(t * 2.3) * 0.62 * envelope;
      y = 0.16 * envelope;
    } else if (this._state === 'sleep') {
      x = y = 0;
    } else if (this._state === 'scroll') {
      const amount = this._scrollUntil > time ? ease((this._scrollUntil - time) / 800) : (this._manual ? envelope : 0);
      const direction = this._scrollDirection || 0.6;
      y = -direction * 0.38 * amount;
      x *= 0.45;
      pose.root[0] = direction * 0.035 * amount;
      pose.armLeft[2] -= direction * 0.075 * amount;
      pose.armRight[2] += direction * 0.075 * amount;
      pose.active = amount > 0;
    }
    pose.x = x;
    pose.y = y;
    pose.root[1] = x * 0.07;
    pose.head[0] = -y * 0.17;
    pose.head[1] = x * 0.27;
    pose.faceX = x * 0.038;
    pose.faceY = y * 0.028;
    switch (this._state) {
      case 'greeting':
        pose.armRight[2] += 2.28 * envelope;
        pose.forearmRight[2] = Math.sin(t * 7.6) * 0.32 * envelope;
        pose.head[2] = -0.065 * envelope;
        pose.root[2] = 0.025 * envelope;
        pose.active = true;
        break;
      case 'invite':
      case 'success':
        pose.armRight[2] += 1.2 * envelope;
        pose.forearmRight[2] = 0.78 * envelope;
        pose.head[2] = Math.sin(t * 2.8) * 0.045 * envelope;
        pose.active = true;
        break;
      case 'dance':
        pose.root[2] = Math.sin(t * 5.2) * 0.08 * envelope;
        pose.bodyY = (1 - Math.cos(t * 10.4)) * 0.028 * envelope;
        pose.head[2] = -Math.sin(t * 5.2 - 0.3) * 0.055 * envelope;
        pose.armLeft[2] -= (0.45 + Math.sin(t * 5.2) * 0.35) * envelope;
        pose.armRight[2] += (0.45 - Math.sin(t * 5.2) * 0.35) * envelope;
        pose.forearmLeft[2] = -0.2 * envelope;
        pose.forearmRight[2] = 0.2 * envelope;
        pose.legLeft[2] = Math.sin(t * 5.2) * 0.065 * envelope;
        pose.legRight[2] = Math.sin(t * 5.2) * 0.065 * envelope;
        pose.active = true;
        break;
      case 'thinking':
        pose.head[2] = Math.sin(t * 1.45) * 0.025 * envelope;
        pose.head[0] = -0.065 * envelope;
        pose.active = true;
        break;
      case 'curious':
        pose.head[2] = Math.sin(t * 1.9) * 0.07 * envelope;
        pose.active = true;
        break;
      case 'stretch':
        // A modest collar-adjusting gesture, then shoulders return to rest.
        pose.armRight[2] -= 0.42 * envelope;
        pose.forearmRight[2] = -1.35 * envelope;
        pose.armLeft[2] -= 0.19 * envelope;
        pose.root[0] = -0.025 * envelope;
        pose.head[0] = 0.065 * envelope;
        pose.head[2] = -0.035 * envelope;
        pose.active = true;
        break;
      case 'sleep':
        pose.head[0] = 0.11;
        pose.head[2] = 0.065;
        pose.root[0] = 0.025;
        pose.eyes = 0.13;
        break;
    }
    const blinkAge = time - (this._blinkStart ?? -1000);
    if (this._state !== 'sleep' && !this.hasAttribute('quiet') && blinkAge >= 0 && blinkAge < 220) {
      pose.eyes = Math.max(0.08, 1 - Math.sin(blinkAge / 220 * Math.PI));
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
    const approach = (object, property, value, timeConstant) => {
      const delta = value - object[property];
      if (!this._moves || Math.abs(delta) < 0.00015) { object[property] = value; return; }
      object[property] += delta * (1 - Math.exp(-dt / timeConstant));
      unsettled = true;
    };
    for (const name of ['root', 'head', 'armLeft', 'armRight', 'forearmLeft', 'forearmRight', 'legLeft', 'legRight']) {
      // Head and face lead the slower torso; elbows follow the shoulders.
      const tau = name === 'head' ? 100 : name === 'root' ? 230 : name.startsWith('forearm') ? 155 : 175;
      ['x', 'y', 'z'].forEach((axis, index) => approach(this._model[name].rotation, axis, pose[name][index], tau));
    }
    approach(this._model.root.position, 'y', pose.bodyY, 180);
    approach(this._model.face.position, 'x', pose.faceX, 65);
    approach(this._model.face.position, 'y', pose.faceY, 65);
    const eyeTau = this._state === 'sleep' || this._model.eyeLeft.scale.y < 0.3 && pose.eyes === 1 ? 180 : 28;
    approach(this._model.eyeLeft.scale, 'y', pose.eyes, eyeTau);
    approach(this._model.eyeRight.scale, 'y', pose.eyes, eyeTau);
    this.dataset.gazeX = pose.x.toFixed(2);
    this.dataset.gazeY = pose.y.toFixed(2);
    this._renderer.render(this._scene, this._camera);
    const movingGaze = Math.abs(this._target.x - this._gaze.x) + Math.abs(this._target.y - this._gaze.y) > 0.0005;
    if (pose.active || unsettled || movingGaze) this._request();
  }
}

if (!customElements.get('steeve-mascot')) customElements.define('steeve-mascot', SteeveMascot);
