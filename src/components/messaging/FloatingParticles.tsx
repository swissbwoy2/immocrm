import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

/**
 * Neutralized in WhatsApp redesign — no floating particles.
 * Component kept for API compatibility with existing pages.
 */
export const FloatingParticles: React.FC<FloatingParticlesProps> = () => null;

/**
 * Neutralized — no mesh gradient. WhatsApp uses a flat textured background.
 */
export const MeshGradientBackground: React.FC<{ className?: string }> = () => null;

/**
 * WhatsApp-style chat background (subtle textured beige/dark).
 * Uses --whatsapp-bg token defined in index.css and the .bg-whatsapp-pattern class.
 */
export const ChatPatternBackground: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-hidden
    className={cn(
      'absolute inset-0 pointer-events-none bg-whatsapp-pattern',
      className,
    )}
  />
);
