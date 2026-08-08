# MIRACLE — Design System

Luxury skincare intelligence platform. Editorial-luxury stance: cinematic, botanical + scientific, generous whitespace.

## Brand
- **Name:** MIRACLE · **Tagline:** Intelligent Skincare. Naturally Perfect.
- **Logo:** `components/miracle/Logo.tsx` — botanical leaf fused with molecular nodes inside a geometric ring. Variants: `horizontal`, `stacked`, `mark`.

## Color tokens (`src/styles/theme.css`)
Primary greens `--forest #16301f`, `--emerald`, `--olive`, `--sage`. Neutrals `--cream` (page ground), `--champagne`, `--beige`. Accents `--gold`, `--sky`, `--orange`, `--vitc`, `--leaf`, `--niacinamide`. Use mapped Tailwind classes: `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `border-border`.

## Typography
- **Display:** Fraunces (serif) — headings, `.font-display`. Weight 400, tight tracking, occasional italic accent.
- **Body:** Inter — `.font-body`.

## Primitives (`components/miracle/primitives.tsx`)
`<Section>` (page rhythm), `<Reveal>` (scroll-in animation), `<Eyebrow>` (label), `<Button>` (solid/outline/ghost with gold glow).

## Sections (`components/miracle/sections/`)
Hero → Stats → Products → Concerns → Ingredients → Routine → Results → WhyCare → Journal → Testimonials → FinalCTA → Footer.

## Imagery
Curated Unsplash set centralized in `src/app/data/images.ts`. Always rendered via `ImageWithFallback` with meaningful alt text.

## Motion
`motion/react` throughout — floating product objects, scroll reveals, hover lifts, carousel, before/after slider. House easing `[0.16, 1, 0.3, 1]`.
