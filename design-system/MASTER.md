# Logisorama — Design System MASTER v4

## Brand Identity
**Product**: Immo-rama.ch / Logisorama  
**Positioning**: Luxury Swiss real estate concierge — premium dark gold elegant

---

## Color Palette

### Primary — Champagne Gold
| Token | HSL | Usage |
|---|---|---|
| `gold-primary` | `hsl(38 45% 48%)` | CTAs, borders, icons |
| `gold-light` | `hsl(38 55% 65%)` | Highlights, gradients |
| `gold-deep` | `hsl(28 35% 38%)` | Gradient end, copper |
| `gold-bg` | `hsl(38 45% 48% / 0.08)` | Subtle tint backgrounds |

### Dark Base — Anthracite Luxury
| Token | HSL | Usage |
|---|---|---|
| `noir-profond` | `hsl(30 15% 8%)` | Page background |
| `noir-moyen` | `hsl(30 15% 10%)` | Section backgrounds |
| `noir-clair` | `hsl(30 15% 14%)` | Card backgrounds |
| `brun-cuivre` | `hsl(28 25% 12%)` | Mid gradient |

### Text
| Token | HSL | Usage |
|---|---|---|
| `ivoire-pur` | `hsl(40 25% 96%)` | Primary text |
| `ivoire-chaud` | `hsl(40 25% 92%)` | Headings |
| `ivoire-doux` | `hsl(40 20% 75%)` | Body text |
| `ivoire-muet` | `hsl(40 20% 55%)` | Muted / captions |

### Status
| Token | Color | Usage |
|---|---|---|
| `success` | `hsl(142 70% 45%)` | Positive indicators |
| `warning` | `hsl(38 95% 55%)` | Warnings |
| `error` | `hsl(0 72% 51%)` | Errors |

---

## Typography

### Fonts
- **Serif headlines**: `font-serif` (Cormorant Garamond, Georgia fallback)
- **UI / Body**: `Inter`, `system-ui` sans-serif
- **Mono**: `JetBrains Mono` for code/numbers

### Scale
| Level | Size | Weight | Usage |
|---|---|---|---|
| `display` | `text-6xl md:text-8xl` | `font-bold` | Hero cinematic |
| `h1` | `text-4xl md:text-6xl` | `font-bold font-serif` | Page titles |
| `h2` | `text-3xl md:text-4xl` | `font-bold font-serif` | Section titles |
| `h3` | `text-xl md:text-2xl` | `font-semibold font-serif` | Card titles |
| `body-lg` | `text-base md:text-lg` | `font-normal` | Lead paragraphs |
| `body` | `text-sm md:text-base` | `font-normal` | Body text |
| `caption` | `text-xs` | `font-medium` | Labels, badges |

---

## Glassmorphism Premium
```css
/* Card standard */
bg-card/60 backdrop-blur-xl border border-[hsl(38_45%_48%/0.2)]
/* Card hover */
hover:border-[hsl(38_45%_48%/0.5)] hover:shadow-[0_8px_30px_hsl(38_45%_48%/0.1)]
/* Pill / Badge */
bg-[hsl(38_45%_48%/0.1)] backdrop-blur-md border border-[hsl(38_45%_48%/0.3)]
```

---

## Spacing Rhythm
- Section padding: `py-24 md:py-32`
- Container: `container mx-auto px-4`
- Card padding: `p-6 md:p-8`
- Grid gap: `gap-6 md:gap-8`

---

## Shadows
| Name | Value |
|---|---|
| `gold-glow-sm` | `0 0 12px hsl(38 45% 48% / 0.2)` |
| `gold-glow-md` | `0 0 24px hsl(38 45% 48% / 0.3)` |
| `gold-glow-lg` | `0 0 48px hsl(38 45% 48% / 0.4)` |
| `card-elevate` | `0 8px 30px hsl(38 45% 48% / 0.08)` |

---

## Animation Tokens
| Name | Duration | Easing |
|---|---|---|
| `quick` | `150ms` | `ease-out` |
| `normal` | `300ms` | `ease-in-out` |
| `smooth` | `500ms` | `[0.22, 1, 0.36, 1]` cubic-bezier |
| `slow` | `800ms` | `[0.22, 1, 0.36, 1]` |
| `spring` | `stiffness:120 damping:20` | spring |
| `spring-soft` | `stiffness:50 damping:20` | spring soft |

---

## Component Patterns

### CTA Primary
```tsx
<Button className="luxury-shimmer-btn luxury-cta-glow bg-gradient-to-r from-[hsl(38_45%_44%)] via-[hsl(38_55%_52%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] border-0 font-semibold" />
```

### Gold Hairline Divider
```tsx
<div className="w-24 h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%)] to-transparent" />
```

### Section Label
```tsx
<p className="text-xs uppercase tracking-widest text-[hsl(38_45%_55%)] font-semibold">Label</p>
```

### Card with BorderBeam
```tsx
<div className="relative rounded-2xl p-6 bg-[hsl(38_45%_48%/0.06)] border border-[hsl(38_45%_48%/0.25)] overflow-hidden">
  <BorderBeam duration={8} colorFrom="hsl(38 55% 65%)" colorTo="hsl(28 35% 38%)" />
</div>
```

---

## Magic UI Components in Use
- `BorderBeam` — rotating conic-gradient border on premium cards
- `Marquee` — horizontally scrolling partner logos
- `OrbitingCircles` — tech visualization
- `AnimatedBeam` — SVG beam connecting services
- `NumberTicker` — animated counter (Intl fr-CH)
- `AnimatedList` — stagger reveal
- `Meteors` — gold particle shower on hero

---

## 3D / WebGL Components
- `Scene3DWrapper` — R3F Canvas with luxury settings
- `LuxuryParticles3D` — 1200 gold floating particles
- `SwissGlobe3D` — Swiss cantons sphere
- `TravelingGoldKey3D` — Scroll-driven 3D key zig-zagging across page

---

## Accessibility
- `useReducedMotion()` — disables all animations when requested
- Mobile `< 768px` — all 3D/WebGL disabled, static fallbacks
- Focus ring: `ring-2 ring-[hsl(38_45%_48%/0.5)]`
- Color contrast — all gold on dark ≥ 4.5:1 AA
