import { useState } from 'react';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { IMG } from '../../../data/images';

const float = (dur: number, dist = 20) => ({
  animate: { y: [0, -dist, 0] },
  transition: { duration: dur, repeat: Infinity, ease: 'easeInOut' as const },
});

function Orb({ size, className, tint, dur, dist }: { size: number; className: string; tint: string; dur: number; dist: number }) {
  return (
    <motion.span
      {...float(dur, dist)}
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{
        width: size, height: size,
        background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), ${tint} 45%, rgba(255,255,255,0.04) 74%)`,
        boxShadow: `inset 0 -8px 20px rgba(255,255,255,0.25), inset 0 6px 16px ${tint}`,
        border: '1px solid rgba(255,255,255,0.25)',
      }}
    >
      <span style={{ position: 'absolute', left: '24%', top: '18%', height: '24%', width: '24%', borderRadius: '999px', background: 'rgba(255,255,255,0.6)', filter: 'blur(3px)' }} />
    </motion.span>
  );
}

const TRUST = [
  {
    label: 'Dermatologist Approved',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#9caf92" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  },
  {
    label: 'AI-Powered Analysis',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#9caf92" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/></svg>,
  },
  {
    label: '5M+ Users',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#9caf92" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><circle cx="9" cy="8" r="3"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 5a3 3 0 0 1 0 6"/></svg>,
  },
  {
    label: 'Secure Login',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#9caf92" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  },
  {
    label: '100% Clean Ingredients',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#9caf92" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 9-4 16-9 16z"/><path d="M4 20 20 4"/></svg>,
  },
];

export function FinalCTA() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <section style={{ position: 'relative', width: '100%', overflow: 'hidden', padding: '112px 24px', background: 'var(--sec-forest)' }}>
      {/* background image + overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'var(--sec-forest)', overflow: 'hidden' }}>
        <ImageWithFallback src={IMG.leafDark} alt="Lush botanical backdrop" className="h-full w-full object-cover" />
        <div style={{ position: 'absolute', inset: 0, background: 'var(--cta-overlay)' }} />
      </div>

      {/* botanical accents — desktop only */}
      <motion.div {...float(11, 18)} style={{ position: 'absolute', left: '-40px', top: '12%', width: '208px', height: '208px', transform: 'rotate(18deg)', opacity: 0.25, filter: 'blur(1px)' }} className="hidden lg:block">
        <ImageWithFallback src={IMG.leafMacro} alt="" className="h-full w-full rounded-full object-cover" />
      </motion.div>
      <motion.div {...float(13, 22)} style={{ position: 'absolute', right: '-32px', bottom: '10%', width: '176px', height: '176px', transform: 'rotate(-12deg)', opacity: 0.25, filter: 'blur(1px)' }} className="hidden lg:block">
        <ImageWithFallback src={IMG.plantDrops} alt="" className="h-full w-full rounded-full object-cover" />
      </motion.div>

      {/* glass orbs — desktop only */}
      <Orb size={90} className="left-[10%] top-[22%] hidden lg:block" tint="rgba(123,171,90,0.5)" dur={8} dist={26} />
      <Orb size={56} className="right-[14%] top-[26%] hidden lg:block" tint="rgba(195,164,104,0.5)" dur={9} dist={20} />
      <Orb size={38} className="left-[18%] bottom-[20%] hidden lg:block" tint="rgba(169,201,214,0.5)" dur={7} dist={16} />

      {/* content */}
      <div style={{ position: 'relative', zIndex: 10, margin: '0 auto', maxWidth: '48rem', textAlign: 'center', color: '#f6f1e6' }}>
        <motion.span
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.34em', color: '#9caf92' }}
        >
          Join 5 Million+ Users
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ margin: '24px auto 0', maxWidth: '40rem', fontFamily: "'Fraunces', serif", fontSize: 'clamp(2.6rem,6vw,5rem)', lineHeight: 1, fontWeight: 400, letterSpacing: '-0.025em' }}
        >
          Begin your personalized
          <span style={{ fontStyle: 'italic', color: '#c3a468' }}> skincare journey.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          style={{ margin: '24px auto 0', maxWidth: '32rem', fontSize: '1.05rem', lineHeight: 1.6, color: 'rgba(246,241,230,0.75)' }}
        >
          Take the 2-minute AI skin analysis and receive a ritual composed entirely for you — free, forever personalised.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          onSubmit={(e) => { e.preventDefault(); if (email) setDone(true); }}
          style={{ margin: '40px auto 0', display: 'flex', maxWidth: '32rem', flexWrap: 'wrap', gap: '12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', padding: '8px', backdropFilter: 'blur(12px)' }}
        >
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            style={{ flex: 1, minWidth: '180px', borderRadius: '999px', border: 'none', background: 'transparent', padding: '14px 24px', fontFamily: 'inherit', fontSize: '0.98rem', color: '#fff', outline: 'none' }}
          />
          <button
            type="submit"
            className="group"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: '#c3a468', color: '#16301f', padding: '14px 32px', fontFamily: 'inherit', fontSize: '0.98rem', transition: 'transform .25s, box-shadow .3s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px -12px rgba(195,164,104,0.75)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            {done ? 'You\'re in ✓' : (
              <>
                Get Started
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
              </>
            )}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.45 }}
          style={{ margin: '40px auto 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '12px 28px' }}
        >
          {TRUST.map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'rgba(246,241,230,0.8)' }}>
              {icon} {label}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
