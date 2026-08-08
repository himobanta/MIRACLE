import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { Section, Reveal, Eyebrow } from '../primitives';
import { IMG } from '../../../data/images';

const CONCERNS = [
  { name: 'Acne', desc: 'Breakouts & congestion', img: '/assets/concern-acne.jpg', span: 'md:col-span-2' },
  { name: 'Dark Spots', desc: 'Uneven tone & marks', img: '/assets/concern-darkspots.jpg', span: '' },
  { name: 'Redness', desc: 'Inflammation & rosacea', img: '/assets/concern-redness.jpg', span: '' },
  { name: 'Pigmentation', desc: 'Melasma & uneven tone', img: IMG.skinFreckles, span: '' },
  { name: 'Dullness', desc: 'Low radiance & fatigue', img: IMG.skinFrecklesSoft, span: '' },
  { name: 'Dry Skin', desc: 'Flaky, tight texture', img: IMG.skinManClose, span: '' },
  { name: 'Oily Skin', desc: 'Excess shine & sebum', img: IMG.skinGlowEye, span: 'md:col-span-2' },
  { name: 'Combination', desc: 'Uneven T-zone', img: IMG.skinFrecklesEyes, span: '' },
  { name: 'Sensitive Skin', desc: 'Reactive & delicate', img: IMG.skinDewy, span: '' },
  { name: 'Fine Lines', desc: 'Early expression lines', img: IMG.skinWrinkles, span: '' },
  { name: 'Wrinkles', desc: 'Deeper set creases', img: IMG.skinManFace, span: '' },
  { name: 'Dehydration', desc: 'Water-depleted skin', img: IMG.skinRadiant, span: '' },
];

export function Concerns() {
  return (
    <Section id="concerns" style={{ background: 'var(--soft-bg)' }}>
      <div className="mb-12 max-w-xl">
        <Eyebrow>Shop By Concern</Eyebrow>
        <h2 className="mt-5 font-display text-foreground" style={{ fontSize: 'clamp(2rem,4vw,3.4rem)', lineHeight: 1.05, fontWeight: 400, letterSpacing: '-0.02em' }}>
          Every skin tells
          <span className="italic text-[var(--emerald)]"> a story.</span>
        </h2>
        <p className="mt-5 font-body leading-relaxed text-muted-foreground">
          Tell us your concern — our AI maps it to the exact actives and ritual your skin needs.
        </p>
      </div>

      <div className="grid auto-rows-[230px] grid-cols-2 gap-4 md:grid-cols-4">
        {CONCERNS.map((c, i) => (
          <Reveal key={c.name} delay={(i % 4) * 0.05} className={c.span}>
            <motion.button
              whileHover={{ scale: 0.99 }}
              whileTap={{ scale: 0.97 }}
              className="group relative h-full w-full overflow-hidden rounded-3xl bg-[var(--sage)]/20 text-left shadow-[0_14px_36px_-22px_rgba(22,48,31,0.5)]"
            >
              <ImageWithFallback src={c.img} alt={`${c.name} — ${c.desc}`} className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-110" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(22,48,31,0.05) 25%, rgba(22,48,31,0.78))' }} />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
                <div>
                  <span className="font-display text-xl text-[var(--cream)]" style={{ fontWeight: 400 }}>{c.name}</span>
                  <p className="mt-0.5 max-h-0 overflow-hidden font-body text-[0.78rem] text-[var(--cream)]/75 opacity-0 transition-all duration-300 group-hover:max-h-10 group-hover:opacity-100">
                    {c.desc}
                  </p>
                </div>
                <span className="grid h-9 w-9 shrink-0 translate-y-2 place-items-center rounded-full bg-[var(--cream)]/90 text-primary opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </motion.button>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
