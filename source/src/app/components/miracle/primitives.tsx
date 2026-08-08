import { motion, useInView } from 'motion/react';
import { useRef, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

/* Scroll-triggered reveal wrapper — every section has movement. */
export function Reveal({
  children,
  className = '',
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* Small eyebrow label used across sections. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`font-body inline-flex items-center gap-2 uppercase tracking-[0.32em] text-[0.7rem] text-muted-foreground ${className}`}
    >
      <span className="inline-block w-6 h-px bg-current opacity-60" />
      {children}
    </span>
  );
}

type BtnProps = {
  children: ReactNode;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'md' | 'lg';
  className?: string;
  icon?: boolean;
  onClick?: () => void;
  href?: string;
};

/* Luxury button with magnetic-feel hover glow. */
export function Button({ children, variant = 'solid', size = 'md', className = '', icon = false, onClick, href }: BtnProps) {
  const base =
    'group relative inline-flex items-center justify-center gap-2 rounded-full font-body tracking-wide transition-all duration-300 will-change-transform';
  const sizes = size === 'lg' ? 'px-8 py-4 text-[0.95rem]' : 'px-6 py-3 text-[0.9rem]';
  const variants: Record<string, string> = {
    solid:
      'bg-[#16301f] text-[#f6f1e6] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgba(22,48,31,0.55)]',
    outline:
      'border border-[var(--border)] text-[var(--fg)] hover:border-[var(--muted)] hover:-translate-y-0.5 bg-transparent',
    ghost: 'text-[var(--fg)] hover:opacity-70',
  };
  const Comp: any = href ? 'a' : 'button';
  return (
    <Comp href={href} onClick={onClick} className={`${base} ${sizes} ${variants[variant]} ${className}`}>
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
        {icon && <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
      </span>
      {variant === 'solid' && (
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[var(--gold)] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-25" />
      )}
    </Comp>
  );
}

/* Section shell — consistent generous spacing. */
export function Section({
  children,
  id,
  className = '',
  style,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section id={id} className={`relative w-full px-6 md:px-10 lg:px-16 py-24 md:py-32 ${className}`} style={style}>
      <div className="mx-auto w-full max-w-[1400px]">{children}</div>
    </section>
  );
}
