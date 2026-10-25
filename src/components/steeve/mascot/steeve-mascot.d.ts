// Types du composant <steeve-mascot> (implémentation : steeve-mascot.js).

export type SteeveState =
  | 'idle' | 'greeting' | 'listening' | 'thinking' | 'success' | 'dance'
  | 'sleep' | 'invite' | 'curious' | 'stretch' | 'scroll';

export interface SteeveMascotElement extends HTMLElement {
  /** Joue un état pendant `duration` millisecondes, avec une bulle facultative. */
  play(state: SteeveState, options?: { duration?: number; message?: string }): void;
  setChatOpen(value: boolean): void;
  setBusy(value: boolean): void;
  setQuiet(value: boolean): void;
  setUnread(value: number): void;
  setMotionEnabled(value: boolean): void;
  setTrackingEnabled(value: boolean): void;
  setAutonomyEnabled(value: boolean): void;
  setScrollEnabled(value: boolean): void;
}

export declare class SteeveMascot extends HTMLElement {}
