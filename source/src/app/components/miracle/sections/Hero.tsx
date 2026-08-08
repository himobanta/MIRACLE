import { useRef } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { IMG } from '../../../data/images';
import { useApp, useParallax } from '../../../store/AppState';

const float = (dur: number, dist = 18) => ({
  animate: { y: [0, -dist, 0] },
  transition: { duration: dur, repeat: Infinity, ease: 'easeInOut' as const },
});

// Promote an animated element to its own GPU layer so blurred surfaces stay smooth.
// (Motion drives `transform` via `y`, so we only hint will-change here — no literal transform.)
const gpu = { willChange: 'transform', backfaceVisibility: 'hidden' as const };

/* Translucent glass sphere with light refraction + highlight. */
function Orb({ size, className, tint = 'rgba(123,171,90,0.5)', dur = 8, dist = 24 }: { size: number; className?: string; tint?: string; dur?: number; dist?: number }) {
  return (
    <motion.div
      {...float(dur, dist)}
      className={`pointer-events-none absolute rounded-full ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), ${tint} 42%, rgba(255,255,255,0.06) 72%)`,
        boxShadow: `inset 0 -8px 20px rgba(255,255,255,0.35), inset 0 6px 16px ${tint}, 0 20px 40px -18px rgba(22,48,31,0.4)`,
        border: '1px solid rgba(255,255,255,0.4)',
        backdropFilter: 'blur(2px)',
        ...gpu,
      }}
    >
      <span className="absolute left-[22%] top-[16%] h-[26%] w-[26%] rounded-full bg-white/70 blur-[3px]" />
    </motion.div>
  );
}

export function Hero() {
  const { setQuizOpen } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const imgY = useParallax(ref, 50);
  const orbsY = useParallax(ref, 90);

  return (
    <section id="hero" ref={ref} style={{ position: 'relative', background: 'var(--hero-bg)' }} className="relative min-h-screen w-full overflow-hidden">
      <div className="dark:hidden absolute -z-10 top-[-10%] right-[-8%] h-[560px] w-[560px] rounded-full opacity-50 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(123,171,90,0.4), transparent 70%)' }} />
      <div className="dark:hidden absolute -z-10 bottom-[-12%] left-[-6%] h-[480px] w-[480px] rounded-full opacity-45 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(195,164,104,0.4), transparent 70%)' }} />

      {/* ambient glass bubbles across the whole hero — behind content, edges only, never over the copy */}
      <motion.div style={{ y: orbsY, ...gpu }} className="pointer-events-none absolute inset-0 z-0 hidden opacity-70 lg:block">
        <Orb size={132} className="left-[1%] top-[34%] opacity-60 blur-[1px]" tint="rgba(123,171,90,0.4)" dur={12} dist={30} />
        <Orb size={60} className="left-[7%] bottom-[9%]" tint="rgba(195,164,104,0.45)" dur={9} dist={20} />
        <Orb size={30} className="left-[41%] top-[9%]" tint="rgba(169,201,214,0.5)" dur={7} dist={14} />
        <Orb size={46} className="left-[38%] bottom-[7%] opacity-80" tint="rgba(231,198,90,0.45)" dur={10} dist={18} />
        <Orb size={84} className="right-[2%] top-[54%] opacity-70 blur-[1px]" tint="rgba(169,201,214,0.4)" dur={11} dist={26} />
        <Orb size={24} className="right-[33%] top-[7%]" tint="rgba(123,171,90,0.55)" dur={6.5} dist={12} />
      </motion.div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col justify-center px-6 pt-32 pb-16 md:px-10 lg:px-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
          {/* Copy */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-foreground"
              style={{ fontSize: 'clamp(3rem, 6.6vw, 6rem)', lineHeight: 1.0, fontWeight: 400, letterSpacing: '-0.025em' }}
            >
              AI Powered
              <br />
              Skincare
              <span className="italic text-[var(--emerald)]"> Intelligence</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.22 }}
              className="mt-8 max-w-md font-body text-[1.08rem] leading-relaxed text-muted-foreground"
            >
              Miracle analyses your skin, decodes your concerns and composes a dermatologist-approved
              ritual — where botanical science meets machine precision.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.36 }}
              style={{ marginTop: '40px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}
            >
              {/* Shop Now — DC HTML exact: bg #16301f, color #f6f1e6, padding 16px 32px */}
              <button
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  borderRadius: '999px', border: 'none', cursor: 'pointer',
                  background: '#16301f', color: '#f6f1e6',
                  padding: '16px 32px', fontFamily: 'inherit', fontSize: '0.95rem',
                  transition: 'transform .25s, box-shadow .3s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 18px 40px -12px rgba(22,48,31,0.55)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                Shop Now
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
                  <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
                </svg>
              </button>
              {/* Analyse My Skin — DC HTML exact: transparent bg, var(--fg) text, var(--border) border, padding 16px 30px */}
              <button
                onClick={() => setQuizOpen(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  borderRadius: '999px', cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--fg)',
                  padding: '16px 30px', fontFamily: 'inherit', fontSize: '0.95rem',
                  transition: 'transform .25s, border-color .25s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--muted)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                  <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/>
                </svg>
                Analyse My Skin
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mt-14 flex items-center gap-6"
            >
              <div className="flex -space-x-3">
                {[IMG.faceAfro, IMG.faceMan, IMG.faceBlonde, IMG.faceDark1].map((s, i) => (
                  <span key={i} className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-background">
                    <ImageWithFallback src={s} alt="Miracle customer" className="h-full w-full object-cover" />
                  </span>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-[var(--gold)]">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                </div>
                <p className="font-body text-[0.82rem] text-muted-foreground">Loved by 5M+ people worldwide</p>
              </div>
            </motion.div>
          </div>

          {/* Visual composition */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto aspect-[4/5] w-full max-w-[600px]"
          >
            <motion.div style={{ y: imgY, ...gpu }} className="absolute inset-0 overflow-hidden rounded-[2.6rem] bg-[var(--sage)]/20 shadow-[0_50px_110px_-35px_rgba(22,48,31,0.55)]">
              <ImageWithFallback src={IMG.heroPortrait} alt="Woman with radiant, healthy skin in editorial studio light" className="h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 58%, rgba(22,48,31,0.32))' }} />
            </motion.div>

            {/* floating glass orbs */}
            <motion.div style={{ y: orbsY, ...gpu }} className="absolute inset-0">
              <Orb size={92} className="-left-8 top-16" tint="rgba(123,171,90,0.5)" dur={7} dist={26} />
              <Orb size={54} className="left-6 bottom-10" tint="rgba(169,201,214,0.5)" dur={9} dist={20} />
              <Orb size={68} className="-right-7 bottom-24" tint="rgba(195,164,104,0.5)" dur={8} dist={24} />
              <Orb size={34} className="right-10 top-24" tint="rgba(231,198,90,0.55)" dur={6} dist={16} />
              <Orb size={22} className="right-24 bottom-8" tint="rgba(123,171,90,0.55)" dur={7.5} dist={14} />
            </motion.div>

            {/* enhanced glass Skin Score card */}
            <motion.div
              {...float(9, 14)}
              className="absolute -right-4 top-8 rounded-[1.4rem] border border-white/60 bg-white/40 px-5 py-4 shadow-[0_20px_50px_-20px_rgba(22,48,31,0.5)]"
              style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', ...gpu }}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)]" />
                <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-[#3d5443]">Skin Score</p>
              </div>
              <p className="mt-1 font-display text-3xl text-[var(--emerald)]" style={{ fontWeight: 400 }}>94<span className="text-lg text-[#3d5443]/60">/100</span></p>
              <div className="mt-2 h-1 w-28 overflow-hidden rounded-full bg-[#3d5443]/15">
                <motion.div initial={{ width: 0 }} animate={{ width: '94%' }} transition={{ duration: 1.4, delay: 0.8, ease: 'easeOut' }} className="h-full rounded-full bg-[var(--emerald)]" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
