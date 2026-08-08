import { useRef } from 'react';
import { motion } from 'motion/react';
import { HeartHandshake, Stethoscope, Flower2, BrainCircuit, Leaf, FlaskConical, Recycle, Sparkles, LineChart, Gem } from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { Section, Reveal, Eyebrow } from '../primitives';
import { IMG } from '../../../data/images';
import { useParallax } from '../../../store/AppState';

const CARDS = [
  { icon: HeartHandshake, title: 'Made for Real Skin', tone: '#2f6b4c' },
  { icon: Stethoscope, title: 'Dermatologist Approved', tone: '#7fa8c9' },
  { icon: Flower2, title: 'Spa-Grade Rituals', tone: '#c3a468' },
  { icon: BrainCircuit, title: 'AI Intelligence', tone: '#a9c9d6' },
  { icon: Leaf, title: 'Cruelty Free', tone: '#7bab5a' },
  { icon: FlaskConical, title: 'Clinically Proven', tone: '#e08a4a' },
  { icon: Recycle, title: 'Sustainable Packaging', tone: '#2f6b4c' },
  { icon: Sparkles, title: 'Science + Nature', tone: '#e7c65a' },
  { icon: LineChart, title: 'Real Results', tone: '#7fa8c9' },
  { icon: Gem, title: 'Luxury Experience', tone: '#c3a468' },
];

export function WhyCare() {
  const ref = useRef<HTMLDivElement>(null);
  const y = useParallax(ref, 40);
  return (
    <Section>
      <div ref={ref} style={{ position: 'relative' }} className="relative grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.4rem] shadow-[0_40px_90px_-40px_rgba(22,48,31,0.6)]">
            <motion.div style={{ y, willChange: 'transform', backfaceVisibility: 'hidden' }} className="aspect-[4/5] w-full">
              <ImageWithFallback src={IMG.editorialTouch} alt="Woman touching radiant skin" className="h-[112%] w-full object-cover" />
            </motion.div>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(22,48,31,0.5))' }} />
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/30 bg-white/15 p-5 backdrop-blur-md">
              <p className="font-display text-xl text-white" style={{ fontWeight: 400 }}>“My skin has never felt more itself.”</p>
              <p className="mt-1 font-body text-[0.8rem] text-white/80">— Verified Miracle member, 6 months</p>
            </div>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <Eyebrow>Skincare That Truly Cares</Eyebrow>
            <h2 className="mt-5 font-display text-foreground" style={{ fontSize: 'clamp(2rem,4vw,3.4rem)', lineHeight: 1.04, fontWeight: 400, letterSpacing: '-0.02em' }}>
              Care, engineered
              <span className="italic text-[var(--emerald)]"> with intention.</span>
            </h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3.5">
            {CARDS.map((c, i) => (
              <Reveal key={c.title} delay={(i % 2) * 0.05}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${c.tone} 16%, white)`, color: c.tone }}>
                    <c.icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <span className="font-body text-[0.9rem] leading-tight text-foreground">{c.title}</span>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
