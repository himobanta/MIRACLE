import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { BadgeCheck } from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { Section, Reveal, Eyebrow } from '../primitives';

// Canonical before/after assets matching Miracle Landing.dc.html
const CASES = [
  { concern: 'Pigmentation', img: '/assets/result-pigmentation.jpg', weeks: 8, improve: 87 },
  { concern: 'Acne', img: '/assets/result-acne.png', weeks: 12, improve: 92 },
  { concern: 'Dark Spots', img: '/assets/result-darkspots.png', weeks: 10, improve: 79 },
  { concern: 'Fine Lines', img: '/assets/result-finelines.jpg', weeks: 16, improve: 74 },
];

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1200, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{n}{suffix}</span>;
}

// Premium before/after card — shows the full uploaded composite (side-by-side)
// without cropping facial detail. Soft container, uniform sizing, gentle zoom on hover.
function BeforeAfter({ img, concern }: { img: string; concern: string }) {
  return (
    <div className="group/ba relative aspect-[4/3] w-full select-none overflow-hidden rounded-2xl bg-[var(--sage)]/15">
      <ImageWithFallback
        src={img}
        alt={`${concern} — before and after treatment with Miracle`}
        className="h-full w-full object-cover object-center transition-transform duration-[900ms] group-hover/ba:scale-[1.04]"
        draggable={false}
      />
      {/* centre divider hinting the split */}
      <div className="pointer-events-none absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-white/50" />
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 font-body text-[0.6rem] uppercase tracking-widest text-white backdrop-blur">Before</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[var(--emerald)]/90 px-2.5 py-1 font-body text-[0.6rem] uppercase tracking-widest text-white backdrop-blur">After</span>
    </div>
  );
}

export function Results() {
  return (
    <Section id="results" style={{ background: 'var(--soft-bg)' }}>
      <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <Eyebrow>Visible Results</Eyebrow>
          <h2 className="mt-5 font-display text-foreground" style={{ fontSize: 'clamp(2rem,4vw,3.4rem)', lineHeight: 1.05, fontWeight: 400, letterSpacing: '-0.02em' }}>
            Transformations,
            <span className="italic text-[var(--emerald)]"> measured.</span>
          </h2>
        </div>
        <p className="max-w-sm font-body leading-relaxed text-muted-foreground">
          Real, AI-tracked progress across our community — every transformation independently verified by dermatologists.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {CASES.map((c, i) => (
          <Reveal key={c.concern} delay={i * 0.06}>
            <motion.div whileHover={{ y: -6 }} className="overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-[0_16px_40px_-24px_rgba(22,48,31,0.45)]">
              <BeforeAfter img={c.img} concern={c.concern} />
              <div className="flex items-center justify-between px-2 pb-2 pt-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-[var(--emerald)]" />
                    <h3 className="font-display text-lg text-foreground" style={{ fontWeight: 400 }}>{c.concern}</h3>
                  </div>
                  <p className="mt-0.5 font-body text-[0.78rem] text-muted-foreground">Over {c.weeks} weeks</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end font-display text-2xl text-[var(--emerald)]">
                    <CountUp to={c.improve} suffix="%" />
                  </div>
                  <p className="font-body text-[0.7rem] text-muted-foreground">improvement</p>
                </div>
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
