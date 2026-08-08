import { ShieldCheck, Leaf, FlaskConical, Sparkles, Heart, Globe } from 'lucide-react';
import { Section, Reveal, Eyebrow } from '../primitives';

const STATS = [
  { value: '100+', label: 'Countries Available', tone: '#2f6b4c' },
  { value: '5M+', label: 'Happy Customers', tone: '#c3a468' },
  { value: '98%', label: 'Routine Success', tone: '#7fa8c9' },
  { value: '100%', label: 'Clean Ingredients', tone: '#7bab5a' },
];

const BADGES = [
  { icon: ShieldCheck, label: 'Dermatologist Approved' },
  { icon: Heart, label: 'Cruelty Free' },
  { icon: Leaf, label: 'Vegan Formulas' },
  { icon: FlaskConical, label: 'Clinically Tested' },
  { icon: Sparkles, label: 'AI Powered' },
  { icon: Globe, label: 'Carbon Neutral' },
];

export function Stats() {
  return (
    <Section id="about" style={{ background: 'var(--sec-forest)', color: 'var(--forest-fg)', borderRadius: '48px 48px 0 0' }}>
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <Reveal>
          <Eyebrow className="!text-[var(--sage)]">Why Miracle</Eyebrow>
          <h2 className="mt-5 font-display" style={{ fontSize: 'clamp(2rem,4vw,3.4rem)', lineHeight: 1.05, fontWeight: 400, letterSpacing: '-0.02em' }}>
            The intelligence behind
            <span className="italic text-[var(--gold)]"> radiant skin.</span>
          </h2>
          <p className="mt-6 max-w-md font-body leading-relaxed text-[var(--cream)]/70">
            A decade of dermatological research, distilled into an engine that learns your skin and
            evolves your ritual — trusted across the globe.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1.5 hover:bg-white/[0.08]">
                <div className="font-display" style={{ fontSize: 'clamp(2rem,3.4vw,2.9rem)', color: s.tone, fontWeight: 400 }}>
                  {s.value}
                </div>
                <p className="mt-2 font-body text-[0.85rem] leading-snug text-[var(--cream)]/70">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal delay={0.1}>
        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-8">
          {BADGES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-[var(--cream)]/80">
              <Icon className="h-5 w-5 text-[var(--sage)]" strokeWidth={1.4} />
              <span className="font-body text-[0.85rem] tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
