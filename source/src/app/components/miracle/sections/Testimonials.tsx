import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { Section, Reveal, Eyebrow } from '../primitives';
import { IMG } from '../../../data/images';

const REVIEWS = [
  { name: 'Amara Okafor', flag: '🇳🇬', type: 'Combination · Acne-prone', avatar: IMG.faceAfro, thumb: IMG.faceThought, text: 'Miracle read my skin better than I ever could. Twelve weeks in, my breakouts are gone and my glow is undeniable.' },
  { name: 'Sofia Lindqvist', flag: '🇸🇪', type: 'Dry · Sensitive', avatar: IMG.faceBlonde, thumb: IMG.portraitSoft, text: 'The barrier cream saved my winter skin. It feels like a spa ritual crafted precisely for me — completely obsessed.' },
  { name: 'Mei Tanaka', flag: '🇯🇵', type: 'Normal · Dullness', avatar: IMG.faceSide, thumb: IMG.portraitGlow, text: 'The AI routine is genius. My tone is even, my texture is smooth, and my dermatologist actually asked what I was using.' },
  { name: 'Daniel Rivera', flag: '🇪🇸', type: 'Oily · Pigmentation', avatar: IMG.faceMan, thumb: IMG.faceShoulder, text: 'I was skeptical about skincare, but the results speak for themselves. Simple, effective, and genuinely luxurious.' },
  { name: 'Priya Nair', flag: '🇮🇳', type: 'Combination · Dark spots', avatar: IMG.faceDark1, thumb: IMG.skinFrecklesSoft, text: 'My dark spots faded in two months. The whole experience feels premium — from the app to the packaging.' },
];

export function Testimonials() {
  const [i, setI] = useState(0);
  const r = REVIEWS[i];
  const move = (d: number) => setI((v) => (v + d + REVIEWS.length) % REVIEWS.length);

  return (
    <Section id="contact">
      <div className="mb-12 text-center">
        <Reveal>
          <Eyebrow className="justify-center !text-[var(--forest)]/70 dark:!text-[var(--sage)]">Real People · Real Results</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-2xl font-display text-[var(--forest)] dark:text-foreground" style={{ fontSize: 'clamp(2rem,4vw,3.4rem)', lineHeight: 1.05, fontWeight: 400, letterSpacing: '-0.02em' }}>
            Loved in over 100
            <span className="italic text-[var(--emerald)]"> countries.</span>
          </h2>
        </Reveal>
      </div>

      <Reveal>
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2.2rem] border border-border bg-card p-3 shadow-[0_30px_70px_-40px_rgba(22,48,31,0.5)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="grid items-stretch gap-6 md:grid-cols-[260px_1fr]"
            >
              <div className="relative h-64 overflow-hidden rounded-[1.6rem] bg-[var(--sage)]/20 md:h-auto">
                <ImageWithFallback src={r.thumb} alt={`${r.name} result`} className="h-full w-full object-cover" />
                <span className="absolute bottom-3 left-3 rounded-full bg-[var(--emerald)]/90 px-3 py-1 font-body text-[0.62rem] uppercase tracking-widest text-white">Verified transformation</span>
              </div>
              <div className="flex flex-col justify-center p-4 md:p-8">
                <div className="flex items-center gap-1 text-[var(--gold)]">
                  {[...Array(5)].map((_, s) => <Star key={s} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-5 font-display text-[var(--forest)] dark:text-foreground" style={{ fontSize: 'clamp(1.2rem,2vw,1.7rem)', lineHeight: 1.35, fontWeight: 400 }}>
                  “{r.text}”
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-[var(--gold)]/40">
                    <ImageWithFallback src={r.avatar} alt={r.name} className="h-full w-full object-cover" />
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 font-body text-[0.95rem] text-[var(--forest)] dark:text-foreground">
                      {r.name} <span>{r.flag}</span> <BadgeCheck className="h-4 w-4 text-[var(--emerald)]" />
                    </div>
                    <p className="font-body text-[0.78rem] text-muted-foreground">{r.type}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>

      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={() => move(-1)}
          aria-label="Previous"
          style={{
            display: 'grid', height: '44px', width: '44px', placeItems: 'center',
            borderRadius: '999px', cursor: 'pointer', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--fg)', transition: 'transform .25s, background .25s, color .25s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#16301f'; e.currentTarget.style.color = '#f6f1e6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg)'; }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
            <path d="m15 6-6 6 6 6"/>
          </svg>
        </button>
        <div className="flex gap-2">
          {REVIEWS.map((_, d) => (
            <button key={d} onClick={() => setI(d)} aria-label={`Review ${d + 1}`} className={`h-2 rounded-full transition-all ${d === i ? 'w-7 bg-[var(--emerald)]' : 'w-2 bg-border'}`} />
          ))}
        </div>
        <button
          onClick={() => move(1)}
          aria-label="Next"
          style={{
            display: 'grid', height: '44px', width: '44px', placeItems: 'center',
            borderRadius: '999px', cursor: 'pointer', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--fg)', transition: 'transform .25s, background .25s, color .25s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#16301f'; e.currentTarget.style.color = '#f6f1e6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg)'; }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
            <path d="m9 6 6 6-6 6"/>
          </svg>
        </button>
      </div>
    </Section>
  );
}
