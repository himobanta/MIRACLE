import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Check, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
];

/* Premium glass dropdown language switcher for the auth header. */
export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(LANGUAGES[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-2 font-body text-[0.82rem] text-[var(--forest)] backdrop-blur-md transition-all hover:border-[var(--emerald)]/50 hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.06] dark:text-foreground"
      >
        <Globe className="h-4 w-4 text-[var(--emerald)]" strokeWidth={1.6} />
        {active.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-white/60 bg-[rgba(255,253,248,0.85)] p-1.5 shadow-[0_30px_60px_-25px_rgba(22,48,31,0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(20,33,26,0.9)]"
          >
            {LANGUAGES.map((l) => (
              <li key={l.code}>
                <button
                  onClick={() => { setActive(l); setOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-body text-[0.85rem] transition-colors ${
                    active.code === l.code ? 'bg-[var(--emerald)]/12 text-[var(--emerald)]' : 'text-[var(--forest)]/80 hover:bg-[var(--emerald)]/8 dark:text-foreground/80'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[0.78rem] text-muted-foreground">{l.native}</span>
                    {l.label}
                  </span>
                  {active.code === l.code && <Check className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
