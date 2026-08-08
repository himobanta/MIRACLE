import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Logo } from '../miracle/Logo';
import { Bubbles } from './Bubbles';
import { LanguageSelector } from './LanguageSelector';

interface AuthShellProps {
  image: string;
  imageAlt: string;
  quote: string;
  quoteMeta: string;
  children: ReactNode;
  /** flip the split so alternate pages feel distinct yet consistent */
  reverse?: boolean;
}

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Full-screen, immersive split-screen scaffold shared by Login & Sign Up.
 * Left: cinematic editorial photography + floating bubbles + emotional quote.
 * Right: floating glass card (passed as children).
 */
export function AuthShell({ image, imageAlt, quote, quoteMeta, children, reverse = false }: AuthShellProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-body text-foreground">
      {/* soft ambient wash so the whole page glows */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 12% 8%, color-mix(in srgb, var(--sage) 24%, transparent), transparent 60%), radial-gradient(120% 80% at 92% 92%, color-mix(in srgb, var(--champagne) 40%, transparent), transparent 55%)',
        }}
      />

      <div className={`grid min-h-screen lg:grid-cols-2 ${reverse ? 'lg:[direction:rtl]' : ''}`}>
        {/* ── Editorial visual panel ── */}
        <motion.aside
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease }}
          className="relative hidden overflow-hidden lg:block lg:[direction:ltr]"
        >
          <ImageWithFallback src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
          {/* forest cinematic grade */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(22,48,31,0.35) 0%, rgba(10,19,13,0.15) 40%, rgba(10,19,13,0.82) 100%)' }}
          />
          <Bubbles className="mix-blend-screen opacity-90" />

          {/* logo */}
          <div className="absolute left-10 top-9 z-10">
            <Link to="/" className="text-white/95 transition-opacity hover:opacity-80">
              <Logo wordClassName="text-white" />
            </Link>
          </div>

          {/* emotional editorial quote */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.35, ease }}
            className="absolute inset-x-10 bottom-12 z-10"
          >
            <span className="font-body text-[0.68rem] uppercase tracking-[0.32em] text-[var(--gold)]">Miracle · AI Skincare</span>
            <p className="mt-4 max-w-md font-display text-white" style={{ fontSize: 'clamp(1.6rem,2.6vw,2.4rem)', lineHeight: 1.2, fontWeight: 400, letterSpacing: '-0.01em' }}>
              “{quote}”
            </p>
            <p className="mt-3 font-body text-[0.82rem] text-white/70">{quoteMeta}</p>
          </motion.div>
        </motion.aside>

        {/* ── Form panel ── */}
        <div className="relative flex min-h-screen flex-col lg:[direction:ltr]">
          {/* bubbles on mobile / behind the card */}
          <Bubbles className="lg:opacity-60" />

          {/* header: mobile logo + language selector */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-7 md:px-10">
            <Link to="/" className="text-[var(--forest)] dark:text-foreground lg:invisible">
              <Logo />
            </Link>
            <LanguageSelector />
          </div>

          {/* the glass card */}
          <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-10 md:px-10">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease }}
              className="w-full max-w-md rounded-[28px] border border-white/60 bg-[rgba(255,253,248,0.55)] p-8 shadow-[0_40px_100px_-40px_rgba(22,48,31,0.55)] backdrop-blur-2xl md:p-10 dark:border-white/10 dark:bg-[rgba(20,33,26,0.55)]"
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
