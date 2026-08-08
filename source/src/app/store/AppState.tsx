import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import { useScroll, useTransform, MotionValue } from 'motion/react';
import type { Product } from '../data/products';

export interface CartLine extends Product {
  qty: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  access_token: string;
}

type Theme = 'light' | 'dark';

interface AppCtx {
  cart: CartLine[];
  addToCart: (p: Product) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setQty: (id: string, qty: number) => void;
  cartCount: number;
  cartTotal: number;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  quizOpen: boolean;
  setQuizOpen: (v: boolean) => void;
  theme: Theme;
  toggleTheme: () => void;

  // Auth
  authUser: AuthUser | null;
  setAuthUser: (user: AuthUser | null) => void;
  logout: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [authUser, setAuthUserState] = useState<AuthUser | null>(null);

  // Restore theme preference
  useEffect(() => {
    const stored = (localStorage.getItem('miracle-theme') as Theme) || 'light';
    setTheme(stored);
  }, []);

  // Restore auth user from localStorage
  useEffect(() => {
    const token = localStorage.getItem('miracle_token');
    const userJson = localStorage.getItem('miracle_user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as AuthUser;
        setAuthUserState({ ...user, access_token: token });
      } catch {
        localStorage.removeItem('miracle_user');
        localStorage.removeItem('miracle_token');
      }
    }
  }, []);

  // Handle 401 unauthorized session expiry events
  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthUserState(null);
      setCart([]);
    };
    window.addEventListener('miracle_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('miracle_unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('miracle-theme', theme);
  }, [theme]);

  const setAuthUser = useCallback((user: AuthUser | null) => {
    setAuthUserState(user);
    if (user) {
      localStorage.setItem('miracle_user', JSON.stringify(user));
      localStorage.setItem('miracle_token', user.access_token);
    } else {
      localStorage.removeItem('miracle_user');
      localStorage.removeItem('miracle_token');
    }
  }, []);

  const logout = useCallback(() => {
    setAuthUser(null);
    setCart([]);
  }, [setAuthUser]);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const found = prev.find((l) => l.id === p.id);
      if (found) return prev.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { ...p, qty: 1 }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  const clearCart = () => setCart([]);
  const setQty = (id: string, qty: number) =>
    setCart((prev) => (qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty } : l))));

  const cartCount = cart.reduce((n, l) => n + l.qty, 0);
  const cartTotal = cart.reduce((n, l) => n + l.qty * l.price, 0);

  const value = useMemo<AppCtx>(
    () => ({
      cart, addToCart, removeFromCart, clearCart, setQty, cartCount, cartTotal,
      cartOpen, setCartOpen, quizOpen, setQuizOpen,
      theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
      authUser, setAuthUser, logout,
    }),
    [cart, cartCount, cartTotal, cartOpen, quizOpen, theme, authUser, setAuthUser, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used within AppProvider');
  return c;
}

/* Parallax helper — maps element scroll progress to a vertical offset. */
export function useParallax(ref: React.RefObject<HTMLElement | null>, distance = 80): MotionValue<number> {
  const { scrollYProgress } = useScroll({ target: ref as any, offset: ['start end', 'end start'] });
  return useTransform(scrollYProgress, [0, 1], [distance, -distance]);
}
