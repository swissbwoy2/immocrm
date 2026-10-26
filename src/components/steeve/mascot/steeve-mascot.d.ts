// Types du composant <steeve-mascot> (implémentation : steeve-mascot.js).

export type SteeveGesture =
  | 'greeting' | 'invite' | 'point' | 'success' | 'laugh' | 'surprise' | 'wink' | 'nod' | 'shake'
  | 'shrug' | 'clap' | 'sad' | 'celebrate' | 'bow' | 'jump' | 'spin' | 'oops' | 'dance' | 'curious'
  | 'stretch' | 'thinking' | 'sleep';

export type SteeveState = SteeveGesture | 'idle' | 'listening' | 'scroll';

/** Durée par défaut de chaque geste (ms). */
export declare const STEEVE_GESTURES: Readonly<Record<SteeveGesture, number>>;

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
