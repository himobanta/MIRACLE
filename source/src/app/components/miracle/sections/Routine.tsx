import { Droplets, Waves, Sparkles, Sun, Moon, FlaskConical } from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { Section, Reveal, Eyebrow } from '../primitives';
import { IMG } from '../../../data/images';

const STEPS = [
  // Steps 01-02 use canonical assets/ images matching Miracle Landing.dc.html
  { n: '01', title: 'Cleanse', icon: Droplets, desc: 'Sweep away impurities with a pH-balanced gel that never strips.', img: '/assets/ritual-cleanse.png', tone: '#7bab5a' },
  { n: '02', title: 'Tone', icon: Waves, desc: 'Rebalance and prep skin to absorb every active that follows.', img: '/assets/ritual-tone.png', tone: '#a9c9d6' },
  { n: '03', title: 'Treat', icon: FlaskConical, desc: 'Target concerns with AI-matched Vitamin C or Niacinamide serums.', img: IMG.serumAmber, tone: '#e7c65a' },
  { n: '04', title: 'Moisturize', icon: Sparkles, desc: 'Lock in hydration with a ceramide-rich barrier repair cream.', img: IMG.jarGold, tone: '#2f6b4c' },
  { n: '05', title: 'Protect', icon: Sun, desc: 'Shield with weightless mineral SPF50 — the anti-ageing essential.', img: IMG.jarWhite, tone: '#e08a4a' },
  { n: '06', title: 'Night Repair', icon: Moon, desc: 'Renew overnight with encapsulated retinol and peptides.', img: IMG.serumSand, tone: '#c3a468' },
];

export function Routine() {
  return (
    <Section id="routine">
      <div className="mb-14 max-w-xl">
        <Eyebrow>The Complete Ritual</Eyebrow>
        <h2 className="mt-5 font-display text-foreground" style={{ fontSize: 'clamp(2rem,4vw,3.4rem)', lineHeight: 1.05, fontWeight: 400, letterSpacing: '-0.02em' }}>
          Six steps to
          <span className="italic text-[var(--emerald)]"> luminous skin.</span>
        </h2>
      </div>

      <div className="relative">
        <div className="flex flex-col gap-6">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={0.04 * i}>
              <div className="group grid items-center gap-6 rounded-3xl border border-border bg-card p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(22,48,31,0.4)] md:grid-cols-[auto_1fr_260px]">
                <div className="grid h-12 w-12 place-items-center rounded-full text-[var(--cream)] shadow-lg" style={{ background: s.tone }}>
                  <s.icon className="h-5 w-5" strokeWidth={1.6} />
                </div>
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-sm text-muted-foreground">{s.n}</span>
                    <h3 className="font-display text-2xl text-foreground" style={{ fontWeight: 400 }}>{s.title}</h3>
                  </div>
                  <p className="mt-2 max-w-md font-body leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
                <div className="h-40 overflow-hidden rounded-2xl bg-[var(--sage)]/15 md:h-32">
                  <ImageWithFallback src={s.img} alt={`${s.title} product`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
