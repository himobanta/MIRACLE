import { motion } from 'motion/react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { Section, Reveal, Eyebrow } from '../primitives';
import { IMG } from '../../../data/images';

function Molecule({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none" aria-hidden>
      <path d="M20 8 L31 14 L31 26 L20 32 L9 26 L9 14 Z" stroke={color} strokeWidth="1.3" />
      <circle cx="20" cy="8" r="2.4" fill={color} />
      <circle cx="31" cy="14" r="2.4" fill={color} />
      <circle cx="20" cy="32" r="2.4" fill={color} />
      <circle cx="9" cy="26" r="2.4" fill={color} />
    </svg>
  );
}

const INGREDIENTS = [
  { name: 'Vitamin C', tone: '#e7c65a', img: IMG.serumAmber, benefit: 'Brightens & evens tone', note: '15% L-ascorbic acid, clinically stabilised.' },
  { name: 'Niacinamide', tone: '#7fa8c9', img: IMG.serumClear, benefit: 'Refines pores & texture', note: '10% concentration for barrier support.' },
  { name: 'Hyaluronic Acid', tone: '#a9c9d6', img: IMG.serumDrop, benefit: 'Deep multi-weight hydration', note: 'Holds 1000× its weight in water.' },
  { name: 'Ceramides', tone: '#c3a468', img: IMG.creamSmear, benefit: 'Restores the skin barrier', note: "Identical to skin's own lipids." },
  { name: 'Retinol', tone: '#e08a4a', img: IMG.serumSand, benefit: 'Smooths lines & renews', note: 'Encapsulated for gentle release.' },
  { name: 'Salicylic Acid', tone: '#7bab5a', img: IMG.tubeCream, benefit: 'Clears & decongests', note: 'Oil-soluble BHA, 2% exfoliant.' },
  { name: 'Peptides', tone: '#2f6b4c', img: IMG.creamSilk, benefit: 'Firms & rebuilds collagen', note: 'Signal peptides for elasticity.' },
  { name: 'Centella Asiatica', tone: '#9caf92', img: IMG.leafMacro, benefit: 'Calms & soothes redness', note: 'Rich in madecassoside.' },
  { name: 'Green Tea', tone: '#7bab5a', img: IMG.leafDark, benefit: 'Antioxidant defence', note: 'EGCG protects against pollution.' },
  { name: 'Aloe Vera', tone: '#9caf92', img: IMG.plantDrops, benefit: 'Hydrates & repairs', note: 'Cooling polysaccharide complex.' },
];

export function Ingredients() {
  return (
    <Section id="ingredients" style={{ background: 'var(--sec-forest)', color: 'var(--forest-fg)' }}>
      <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <Eyebrow className="!text-[var(--sage)]">Powered by Nature + Science</Eyebrow>
          <h2 className="mt-5 font-display" style={{ fontSize: 'clamp(2rem,4vw,3.4rem)', lineHeight: 1.05, fontWeight: 400, letterSpacing: '-0.02em' }}>
            Actives you can
            <span className="italic text-[var(--gold)]"> trust.</span>
          </h2>
        </div>
        <p className="max-w-sm font-body leading-relaxed text-[var(--cream)]/70">
          Every molecule is chosen for evidence, sourced responsibly and dosed at clinically effective levels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {INGREDIENTS.map((ing, i) => (
          <Reveal key={ing.name} delay={(i % 5) * 0.05}>
            <motion.div
              whileHover={{ y: -6 }}
              className="group h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm"
            >
              <div className="relative h-40 overflow-hidden">
                <ImageWithFallback src={ing.img} alt={`${ing.name} macro`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${ing.tone} 45%, transparent), rgba(22,48,31,0.5))` }} />
                <div className="absolute right-3 top-3 rounded-xl bg-[var(--forest)]/60 p-1.5 backdrop-blur"><Molecule color={ing.tone} /></div>
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg" style={{ fontWeight: 400 }}>{ing.name}</h3>
                <p className="mt-1 font-body text-[0.85rem]" style={{ color: ing.tone }}>{ing.benefit}</p>
                <p className="mt-3 font-body text-[0.8rem] leading-relaxed text-[var(--cream)]/60">{ing.note}</p>
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
