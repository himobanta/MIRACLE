import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, ShoppingBag, Trash2, Lock } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useApp } from '../../store/AppState';
import { Button } from './primitives';
import { inr } from '../../data/products';

const FREE_SHIPPING = 1499;

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, setQty, removeFromCart, clearCart, cartTotal, cartCount } = useApp();
  const shipping = cartTotal > 0 && cartTotal < FREE_SHIPPING ? 99 : 0;

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 z-[60] bg-[rgba(10,19,13,0.5)] backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-md flex-col bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b px-6 py-6" style={{ borderColor: 'rgba(22,48,31,0.1)' }}>
              <h3 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: '1.35rem', color: 'var(--fg)' }}>Your Cart</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '0.78rem',
                      color: 'var(--muted)', transition: 'color .2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#b4432f')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                    aria-label="Clear all cart items"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
                      <path d="M3 6h18"/>
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                      <path d="M10 11v6M14 11v6"/>
                    </svg>
                    Clear all
                  </button>
                )}
                <button onClick={() => setCartOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)', display: 'flex' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: '22px', height: '22px' }}>
                    <path d="M6 6 18 18M18 6 6 18"/>
                  </svg>
                </button>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground">
                  <ShoppingBag className="h-7 w-7" strokeWidth={1.3} />
                </div>
                <p className="font-display text-lg" style={{ fontWeight: 400 }}>Your bag is empty</p>
                <p className="font-body text-[0.88rem] text-muted-foreground">Discover the ritual composed for your skin.</p>
                <Button onClick={() => setCartOpen(false)}>Explore Products</Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {cartTotal < FREE_SHIPPING && (
                    <div className="mb-5 rounded-2xl bg-[var(--emerald)]/10 px-4 py-3 font-body text-[0.8rem] text-[var(--emerald)]">
                      You’re {inr(FREE_SHIPPING - cartTotal)} away from free shipping ✦
                    </div>
                  )}
                  <ul className="space-y-4">
                    {cart.map((l) => (
                      <li key={l.id} className="flex gap-4">
                        <span className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--sage)]/15">
                          <ImageWithFallback src={l.img} alt={l.name} className="h-full w-full object-cover" />
                        </span>
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-body text-[0.92rem] leading-tight text-foreground">{l.name}</p>
                            <button onClick={() => removeFromCart(l.id)} aria-label="Remove" className="text-muted-foreground hover:text-[var(--destructive)]">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="font-body text-[0.78rem] text-muted-foreground">{l.tag}</p>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2 rounded-full border border-border">
                              <button onClick={() => setQty(l.id, l.qty - 1)} aria-label="Decrease" className="grid h-7 w-7 place-items-center text-foreground hover:opacity-60"><Minus className="h-3.5 w-3.5" /></button>
                              <span className="min-w-4 text-center font-body text-[0.85rem]">{l.qty}</span>
                              <button onClick={() => setQty(l.id, l.qty + 1)} aria-label="Increase" className="grid h-7 w-7 place-items-center text-foreground hover:opacity-60"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                            <span className="font-display text-[1.05rem]">{inr(l.price * l.qty)}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border px-6 py-5">
                  <div className="space-y-1.5 font-body text-[0.9rem]">
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="text-foreground">{inr(cartTotal)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span className="text-foreground">{shipping === 0 ? 'Free' : inr(shipping)}</span></div>
                    <div className="flex justify-between pt-2 font-display text-lg text-foreground"><span>Total</span><span>{inr(cartTotal + shipping)}</span></div>
                  </div>
                  <Button size="lg" className="mt-4 w-full" icon>Secure Checkout</Button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 font-body text-[0.72rem] text-muted-foreground"><Lock className="h-3 w-3" /> Encrypted & secure payment</p>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
