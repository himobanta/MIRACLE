import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Menu, X, ShoppingBag, UserRound } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './primitives';
import { ThemeToggle } from './ThemeToggle';
import { useApp } from '../../store/AppState';

const LINKS = ['Home', 'Products', 'Concerns', 'Ingredients', 'Routine', 'About', 'Journal', 'Contact'];
const IDS: Record<string, string> = {
  Home: 'hero',
  Products: 'products',
  Concerns: 'concerns',
  Ingredients: 'ingredients',
  Routine: 'routine',
  About: 'about',
  Journal: 'journal',
  Contact: 'contact',
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { cartCount, setCartOpen } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (label: string) => {
    setOpen(false);
    document.getElementById(IDS[label])?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full max-w-[1400px] items-center justify-between rounded-full px-5 py-3 transition-all duration-500"
        style={scrolled ? {
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 12px 40px -18px rgba(22,48,31,0.35)',
          border: '1px solid var(--nav-border)',
        } : {
          background: 'transparent',
          border: '1px solid transparent',
        }}
      >
        <button onClick={() => go('Home')} className="text-primary">
          <Logo />
        </button>

        <ul className="hidden lg:flex items-center gap-7">
          {LINKS.map((l) => (
            <li key={l}>
              <button
                onClick={() => go(l)}
                className="font-body text-[0.82rem] tracking-wide transition-colors relative after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-[var(--gold)] after:transition-all hover:after:w-full"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nav-link)', fontFamily: 'inherit' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nav-link)')}
              >
                {l}
              </button>
            </li>
          ))}
        </ul>

        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => setCartOpen(true)} aria-label="Cart" className="relative text-primary hover:opacity-70 transition-opacity">
            <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)] text-[0.6rem] text-primary">{cartCount}</span>
            )}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 font-body text-[0.82rem] tracking-wide transition-colors hover:text-primary"
            style={{ color: 'var(--nav-link)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nav-link)')}
          >
            <UserRound className="h-4 w-4" strokeWidth={1.6} /> Sign In
          </button>
          <button
            onClick={() => go('Products')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              borderRadius: '999px', border: 'none', cursor: 'pointer',
              background: '#16301f', color: '#f6f1e6',
              padding: '11px 22px', fontFamily: 'inherit', fontSize: '0.9rem',
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
        </div>

        <button className="lg:hidden text-primary" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="lg:hidden fixed inset-x-4 top-24 z-40 rounded-3xl border p-6 backdrop-blur-xl shadow-2xl"
            style={{ background: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
          >
            <ul className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <li key={l}>
                  <button
                    onClick={() => go(l)}
                    className="w-full py-2.5 text-left font-display text-lg"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Fraunces', serif", color: 'var(--nav-link)' }}
                  >
                    {l}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => { setOpen(false); navigate('/login'); }}
              className="mt-2 flex w-full items-center gap-2 py-2.5 text-left font-display text-lg"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nav-link)' }}
            >
              <UserRound className="h-5 w-5" strokeWidth={1.6} /> Sign In
            </button>
            <div className="mt-4 flex items-center gap-3">
              <Button size="lg" icon className="flex-1" onClick={() => go('Products')}>Shop Now</Button>
              <button onClick={() => { setOpen(false); setCartOpen(true); }} aria-label="Cart" className="relative grid h-12 w-12 place-items-center rounded-full border border-primary/20 text-primary">
                <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
                {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)] text-[0.6rem] text-primary">{cartCount}</span>}
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-primary/10 pt-4">
              <span className="font-body text-[0.85rem] text-muted-foreground">Appearance</span>
              <ThemeToggle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
