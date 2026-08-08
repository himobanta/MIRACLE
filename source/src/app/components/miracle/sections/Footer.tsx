import { Instagram, Facebook, Youtube, Linkedin, Send, Globe, ChevronDown } from 'lucide-react';
import { Logo } from '../Logo';

const COLS = [
  { title: 'Shop', links: ['Products', 'Best Sellers', 'Bundles', 'Gift Cards'] },
  { title: 'About', links: ['Our Story', 'Science', 'Mission', 'Press'] },
  { title: 'Ingredients', links: ['Vitamin C', 'Niacinamide', 'Retinol', 'Ceramides'] },
  { title: 'Support', links: ['Contact', 'Orders', 'Shipping', 'Privacy', 'Terms'] },
];

function TikTok({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.5 3c.3 2 1.5 3.6 3.5 3.9v2.5c-1.3.1-2.5-.3-3.6-1v6.1c0 3.3-2.4 5.5-5.4 5.5-2.9 0-5-2.1-5-4.9 0-2.9 2.3-5 5.3-4.7v2.6c-.4-.1-.9-.2-1.3-.1-1.2.2-2 1.1-1.9 2.4.1 1.2 1 2 2.2 2 1.3 0 2.1-1 2.1-2.5V3h3.6Z" />
    </svg>
  );
}

const SOCIAL = [
  { icon: Instagram, label: 'Instagram' },
  { icon: Facebook, label: 'Facebook' },
  { icon: TikTok, label: 'TikTok' },
  { icon: Youtube, label: 'YouTube' },
  { icon: Linkedin, label: 'LinkedIn' },
];

function Selector({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 font-body text-[0.8rem] text-[var(--cream)]/75 transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]">
      <Icon className="h-3.5 w-3.5" /> {label} <ChevronDown className="h-3 w-3 opacity-60" />
    </button>
  );
}

export function Footer() {
  return (
    <footer className="w-full px-6 pb-10 pt-20 md:px-10 lg:px-16" style={{ background: 'var(--sec-forest)', color: 'var(--forest-fg)' }}>
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <div className="text-[var(--cream)]"><Logo /></div>
            <p className="mt-5 max-w-xs font-body leading-relaxed text-[var(--cream)]/60">
              Intelligent skincare, naturally perfect. Where botanical science meets machine precision.
            </p>
            <div className="mt-7">
              <p className="font-body text-[0.72rem] uppercase tracking-[0.24em] text-[var(--sage)]">Newsletter</p>
              <form onSubmit={(e) => e.preventDefault()} className="mt-3 flex max-w-sm items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1.5 pl-5">
                <input type="email" placeholder="Your email" className="flex-1 bg-transparent font-body text-[0.85rem] text-white placeholder:text-white/40 outline-none" />
                <button aria-label="Subscribe" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--gold)] text-primary transition hover:scale-105">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLS.map((c) => (
              <div key={c.title}>
                <p className="font-body text-[0.72rem] uppercase tracking-[0.24em] text-[var(--sage)]">{c.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="font-body text-[0.9rem] text-[var(--cream)]/70 transition-colors hover:text-[var(--gold)]">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-white/10 pt-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              {SOCIAL.map(({ icon: Icon, label }) => (
                <a key={label} href="#" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-[var(--cream)]/70 transition-all hover:-translate-y-0.5 hover:border-[var(--gold)] hover:text-[var(--gold)]">
                  <Icon className="h-4 w-4" strokeWidth={1.6} />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Selector icon={Globe} label="English" />
              <Selector icon={Globe} label="United States" />
            </div>
          </div>
          <p className="font-body text-[0.8rem] text-[var(--cream)]/50">© {new Date().getFullYear()} Miracle Skincare Intelligence. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
