import { useState } from 'react';
import { motion } from 'motion/react';
import { Star, Heart, Eye, ShoppingBag } from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { Section, Reveal, Eyebrow, Button } from '../primitives';
import { PRODUCTS, Product, inr } from '../../../data/products';
import { useApp } from '../../../store/AppState';

function ProductCard({ p, i }: { p: Product; i: number }) {
  const [wish, setWish] = useState(false);
  const { addToCart } = useApp();
  return (
    <Reveal delay={(i % 4) * 0.06}>
      <motion.article
        whileHover={{ y: -8 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[0_10px_30px_-18px_rgba(22,48,31,0.35)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden" style={{ background: `color-mix(in srgb, ${p.tone} 14%, white)` }}>
          <ImageWithFallback src={p.img} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <span className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 font-body text-[0.65rem] uppercase tracking-[0.14em] text-primary backdrop-blur">
            {p.tag}
          </span>
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
            <button onClick={() => setWish((v) => !v)} aria-label="Wishlist" className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary shadow-md hover:bg-white">
              <Heart className={`h-4 w-4 ${wish ? 'fill-[var(--destructive)] text-[var(--destructive)]' : ''}`} strokeWidth={1.6} />
            </button>
            <button onClick={() => addToCart(p)} aria-label="Quick view" className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary shadow-md hover:bg-white">
              <Eye className="h-4 w-4" strokeWidth={1.6} />
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center gap-1.5 text-[var(--gold)]">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="font-body text-[0.8rem] text-foreground">{p.rating}</span>
            <span className="font-body text-[0.75rem] text-muted-foreground">({p.reviews.toLocaleString()})</span>
          </div>
          <h3 className="mt-2 font-display text-lg text-foreground" style={{ fontWeight: 400 }}>{p.name}</h3>
          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="font-display text-xl text-foreground">{inr(p.price)}</span>
            <button
              onClick={() => addToCart(p)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                borderRadius: '999px', border: 'none', cursor: 'pointer',
                background: '#16301f', color: '#f6f1e6',
                padding: '8px 16px', fontFamily: 'inherit', fontSize: '0.78rem',
                transition: 'transform .25s, box-shadow .3s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 26px -12px rgba(22,48,31,0.6)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Add
            </button>
          </div>
        </div>
      </motion.article>
    </Reveal>
  );
}

export function Products() {
  return (
    <Section id="products">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Featured Products</Eyebrow>
          <h2 className="mt-5 max-w-xl font-display text-foreground" style={{ fontSize: 'clamp(2rem,4vw,3.4rem)', lineHeight: 1.05, fontWeight: 400, letterSpacing: '-0.02em' }}>
            Formulated by science.
            <span className="italic text-[var(--emerald)]"> Perfected by nature.</span>
          </h2>
        </div>
        <button
          onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            borderRadius: '999px', cursor: 'pointer',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--fg)', padding: '13px 24px', fontFamily: 'inherit', fontSize: '0.9rem',
            transition: 'border-color .25s, transform .25s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--muted)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
        >
          View All Products
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
            <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p, i) => <ProductCard key={p.name} p={p} i={i} />)}
      </div>
    </Section>
  );
}
