import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

/* One decorative bubble spec: position, size, tint and parallax depth. */
interface Bubble {
  id: number;
  x: string;
  y: string;
  size: number;
  tint: string;
  depth: number; // 0..1 — higher = moves more with mouse & drifts more
  blur: number;
  opacity: number;
  dur: number;
}

// A curated, layered composition of frosted glass / crystal spheres.
const BUBBLES: Bubble[] = [
  { id: 1, x: '6%', y: '18%', size: 150, tint: 'var(--emerald)', depth: 0.9, blur: 1, opacity: 0.5, dur: 11 },
  { id: 2, x: '78%', y: '10%', size: 96, tint: 'var(--champagne)', depth: 0.65, blur: 0.5, opacity: 0.6, dur: 9 },
  { id: 3, x: '86%', y: '62%', size: 190, tint: 'var(--sage)', depth: 1, blur: 2, opacity: 0.42, dur: 13 },
  { id: 4, x: '14%', y: '72%', size: 74, tint: 'var(--gold)', depth: 0.5, blur: 0.5, opacity: 0.55, dur: 8 },
  { id: 5, x: '46%', y: '6%', size: 44, tint: 'var(--sky)', depth: 0.35, blur: 0, opacity: 0.6, dur: 7 },
  { id: 6, x: '32%', y: '40%', size: 30, tint: 'var(--gold)', depth: 0.28, blur: 0, opacity: 0.7, dur: 6 },
  { id: 7, x: '64%', y: '82%', size: 58, tint: 'var(--emerald)', depth: 0.55, blur: 0.5, opacity: 0.5, dur: 10 },
  { id: 8, x: '92%', y: '34%', size: 26, tint: 'var(--champagne)', depth: 0.3, blur: 0, opacity: 0.65, dur: 7.5 },
  { id: 9, x: '2%', y: '48%', size: 40, tint: 'var(--sage)', depth: 0.4, blur: 0, opacity: 0.55, dur: 8.5 },
  { id: 10, x: '54%', y: '58%', size: 22, tint: 'var(--sky)', depth: 0.24, blur: 0, opacity: 0.7, dur: 6.5 },
  { id: 11, x: '70%', y: '44%', size: 118, tint: 'var(--champagne)', depth: 0.75, blur: 1.5, opacity: 0.4, dur: 12 },
  { id: 12, x: '22%', y: '12%', size: 34, tint: 'var(--emerald)', depth: 0.32, blur: 0, opacity: 0.6, dur: 7 },
];

/**
 * Floating 3D glass bubble field with gentle vertical drift, soft glow and
 * mouse parallax. Purely decorative — sits behind content and ignores pointer.
 */
export function Bubbles({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      // -1..1 relative to the field centre
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      setMouse({ x: nx, y: ny });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div ref={ref} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {BUBBLES.map((b) => (
        <motion.span
          key={b.id}
          className="absolute rounded-full"
          style={{
            left: b.x,
            top: b.y,
            width: b.size,
            height: b.size,
            filter: `blur(${b.blur}px)`,
            opacity: b.opacity,
            backfaceVisibility: 'hidden',
            willChange: 'transform',
            // glossy pearl-like sphere: highlight + tinted body + soft ring
            background: `radial-gradient(35% 32% at 32% 28%, rgba(255,255,255,0.9), rgba(255,255,255,0) 60%), radial-gradient(120% 120% at 70% 78%, color-mix(in srgb, ${b.tint} 62%, transparent), color-mix(in srgb, ${b.tint} 12%, transparent) 72%)`,
            boxShadow: `inset 0 2px 8px rgba(255,255,255,0.6), inset 0 -10px 20px color-mix(in srgb, ${b.tint} 45%, transparent), 0 18px 40px -12px color-mix(in srgb, ${b.tint} 55%, transparent)`,
            border: '1px solid rgba(255,255,255,0.35)',
          }}
          animate={{
            y: [0, -18 * b.depth - 6, 0],
            x: mouse.x * 26 * b.depth,
          }}
          transition={{
            y: { duration: b.dur, repeat: Infinity, ease: 'easeInOut' },
            x: { type: 'spring', stiffness: 40, damping: 18 },
          }}
        >
          {/* crisp specular highlight */}
          <span
            className="absolute rounded-full"
            style={{
              width: '22%',
              height: '22%',
              left: '24%',
              top: '20%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)',
            }}
          />
        </motion.span>
      ))}
    </div>
  );
}
