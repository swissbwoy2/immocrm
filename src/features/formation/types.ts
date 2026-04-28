import { LucideIcon } from 'lucide-react';

export type Block =
  | { type: 'text'; content: string }
  | { type: 'heading'; content: string; level?: 2 | 3 }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'tip'; content: string; variant?: 'tip' | 'warning' | 'info' | 'success' }
  | { type: 'video'; title: string; src?: string; poster?: string; duration?: string }
  | { type: 'screenshot'; src: string; alt: string; caption?: string }
  | { type: 'feature-tour'; items: { icon: string; title: string; description: string; path?: string }[] }
  | { type: 'checklist'; id: string; title?: string; items: { id: string; label: string }[] }
  | { type: 'table'; headers: string[]; rows: string[][]; caption?: string }
  | { type: 'script'; title: string; content: string; variant?: 'call' | 'email' }
  | { type: 'sites-grid'; items: SiteAnnonce[] }
  | { type: 'cta'; label: string; path: string; description?: string }
  | { type: 'quiz'; id: string; questions: QuizQuestion[] };

export interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; label: string }[];
  correct: string;
  explanation?: string;
}

export interface SiteAnnonce {
  name: string;
  url: string;
  type: 'portail' | 'agregateur' | 'petites-annonces' | 'reseau';
  logo?: string;
  description: string;
  highlight?: boolean;
}

export interface Chapter {
  id: string;
  partie: 'application' | 'metier' | 'bonus';
  numero: number;
  titre: string;
  description: string;
  icon: LucideIcon;
  duree: string;
  blocks: Block[];
  isNew?: boolean;
}
