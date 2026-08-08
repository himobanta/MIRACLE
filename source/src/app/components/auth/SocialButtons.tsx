import { motion } from 'motion/react';
import { ReactNode } from 'react';

/* Inline brand marks so we don't depend on brand icons being present in lucide. */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem] fill-current" aria-hidden="true">
    <path d="M18.9 1.6h3.5l-7.6 8.7L23.7 22h-7l-5.5-7.2L4.9 22H1.4l8.1-9.3L.7 1.6h7.2l5 6.6 5.9-6.6Zm-1.2 18.3h1.9L7.1 3.6H5l12.7 16.3Z" />
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.5c-1.49 0-1.96.93-1.96 1.87V12h3.33l-.53 3.47h-2.8v8.38A12 12 0 0 0 24 12Z" />
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <defs>
      <radialGradient id="ig" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497" />
        <stop offset="5%" stopColor="#fdf497" />
        <stop offset="45%" stopColor="#fd5949" />
        <stop offset="60%" stopColor="#d6249f" />
        <stop offset="90%" stopColor="#285AEB" />
      </radialGradient>
    </defs>
    <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="url(#ig)" />
    <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.6" />
    <circle cx="17.4" cy="6.6" r="1.2" fill="#fff" />
  </svg>
);

const PROVIDERS: { name: string; icon: ReactNode }[] = [
  { name: 'Google', icon: <GoogleIcon /> },
  { name: 'X', icon: <XIcon /> },
  { name: 'Facebook', icon: <FacebookIcon /> },
  { name: 'Instagram', icon: <InstagramIcon /> },
];

export function SocialButtons() {
  return (
    <div className="flex items-center justify-center gap-3">
      {PROVIDERS.map((p) => (
        <motion.button
          key={p.name}
          type="button"
          aria-label={`Continue with ${p.name}`}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="grid h-12 w-12 place-items-center rounded-full border border-white/60 bg-white/55 text-[var(--forest)] backdrop-blur-md transition-shadow hover:shadow-[0_12px_28px_-10px_rgba(22,48,31,0.4)] dark:border-white/10 dark:bg-white/[0.06] dark:text-foreground"
        >
          {p.icon}
        </motion.button>
      ))}
    </div>
  );
}
