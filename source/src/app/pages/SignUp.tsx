import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSocialAuth } from '../hooks/useSocialAuth';

const TINT: Record<string, string> = {
  emerald: '#2f6b4c',
  champagne: '#ece1c9',
  sage: '#9caf92',
  gold: '#c3a468',
  sky: '#a9c9d6',
};

const BUBBLE_SPEC = [
  { id: 1, x: '6%', y: '18%', size: 150, tint: 'emerald', depth: 0.9, blur: 1, opacity: 0.5, dur: 11 },
  { id: 2, x: '78%', y: '10%', size: 96, tint: 'champagne', depth: 0.65, blur: 0.5, opacity: 0.6, dur: 9 },
  { id: 3, x: '86%', y: '62%', size: 190, tint: 'sage', depth: 1, blur: 2, opacity: 0.42, dur: 13 },
  { id: 4, x: '14%', y: '72%', size: 74, tint: 'gold', depth: 0.5, blur: 0.5, opacity: 0.55, dur: 8 },
  { id: 5, x: '46%', y: '6%', size: 44, tint: 'sky', depth: 0.35, blur: 0, opacity: 0.6, dur: 7 },
  { id: 6, x: '32%', y: '40%', size: 30, tint: 'gold', depth: 0.28, blur: 0, opacity: 0.7, dur: 6 },
  { id: 7, x: '64%', y: '82%', size: 58, tint: 'emerald', depth: 0.55, blur: 0.5, opacity: 0.5, dur: 10 },
  { id: 8, x: '92%', y: '34%', size: 26, tint: 'champagne', depth: 0.3, blur: 0, opacity: 0.65, dur: 7.5 },
  { id: 9, x: '2%', y: '48%', size: 40, tint: 'sage', depth: 0.4, blur: 0, opacity: 0.55, dur: 8.5 },
  { id: 10, x: '54%', y: '58%', size: 22, tint: 'sky', depth: 0.24, blur: 0, opacity: 0.7, dur: 6.5 },
  { id: 11, x: '70%', y: '44%', size: 118, tint: 'champagne', depth: 0.75, blur: 1.5, opacity: 0.4, dur: 12 },
  { id: 12, x: '22%', y: '12%', size: 34, tint: 'emerald', depth: 0.32, blur: 0, opacity: 0.6, dur: 7 },
];



type RoleType = 'User' | 'Consultant' | 'Dermatologist';

export function SignUp() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleType>('User');
  const [focus, setFocus] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { socialState, triggerSocialLogin, clearSocialError } = useSocialAuth();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let nx = 0;
    let ny = 0;

    const applyParallax = () => {
      raf = 0;
      if (!containerRef.current) return;
      const bubbles = containerRef.current.querySelectorAll('[data-bubble]');
      bubbles.forEach((el) => {
        const d = parseFloat(el.getAttribute('data-depth') || '0.4');
        (el as HTMLElement).style.transform = `translate3d(${(nx * d * 26).toFixed(1)}px, ${(ny * d * 26).toFixed(1)}px, 0)`;
      });
    };

    const onMove = (e: MouseEvent) => {
      nx = (e.clientX / window.innerWidth - 0.5) * 2;
      ny = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(applyParallax);
    };

    window.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { api, setAuthToken } = await import('../services/api');
      const apiRole = role === 'Consultant' ? 'Skincare Consultant' : role === 'Dermatologist' ? 'Dermatologist' : 'User';
      const data = await api.register({ name, email, password, role: apiRole });
      setAuthToken(data.access_token);
      const rolePath = role === 'Consultant' ? 'consultant' : role === 'Dermatologist' ? 'derma' : 'user';
      nav(`/dashboard/${rolePath}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFieldProps = (id: string, value: string) => {
    const focused = focus === id;
    const filled = !!value;
    const floated = focused || filled;
    return {
      wrap: {
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'border-color .3s, box-shadow .3s',
        border: focused ? '1px solid rgba(47,107,76,0.7)' : '1px solid rgba(255,255,255,0.5)',
        boxShadow: focused ? '0 0 0 4px rgba(47,107,76,0.16)' : 'none',
      },
      iconColor: focused ? '#2f6b4c' : 'var(--muted)',
      label: floated
        ? {
            pointerEvents: 'none' as const,
            position: 'absolute' as const,
            left: 0,
            top: '8px',
            fontSize: '0.62rem',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.18em',
            color: '#2f6b4c',
            transition: 'all .2s',
          }
        : {
            pointerEvents: 'none' as const,
            position: 'absolute' as const,
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.92rem',
            color: 'rgba(22,48,31,0.5)',
            transition: 'all .2s',
          },
    };
  };

  const nameProps = getFieldProps('name', name);
  const emailProps = getFieldProps('email', email);
  const pwProps = getFieldProps('password', password);

  const renderBubbles = () => (
    <>
      {BUBBLE_SPEC.map((b) => {
        const tint = TINT[b.tint];
        return (
          <span
            key={b.id}
            data-bubble
            data-depth={b.depth}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: `${b.size}px`,
              height: `${b.size}px`,
              willChange: 'transform',
              transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <span
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                position: 'relative',
                display: 'block',
                filter: `blur(${b.blur}px)`,
                opacity: b.opacity,
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                background: `radial-gradient(35% 32% at 32% 28%, rgba(255,255,255,0.9), rgba(255,255,255,0) 60%), radial-gradient(120% 120% at 70% 78%, color-mix(in srgb, ${tint} 62%, transparent), color-mix(in srgb, ${tint} 12%, transparent) 72%)`,
                boxShadow: `inset 0 2px 8px rgba(255,255,255,0.6), inset 0 -10px 20px color-mix(in srgb, ${tint} 45%, transparent), 0 18px 40px -12px color-mix(in srgb, ${tint} 55%, transparent)`,
                border: '1px solid rgba(255,255,255,0.35)',
                animation: `floatB ${b.dur}s ease-in-out ${-b.id}s infinite`,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  width: '22%',
                  height: '22%',
                  left: '24%',
                  top: '20%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)',
                }}
              />
            </span>
          </span>
        );
      })}
    </>
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        background: 'var(--bg, #f6f1e6)',
        color: 'var(--fg, #16301f)',
        transition: 'background .4s, color .4s',
        fontFamily: "'Inter',ui-sans-serif,system-ui,sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <style>{`
        @keyframes floatB { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-22px); } }
        @keyframes asideIn { from { opacity: 0; transform: scale(1.04); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardIn { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .auth-grid { display: grid; min-height: 100vh; height: auto; grid-template-columns: 1fr; align-items: stretch; }
        .auth-aside { display: none; }
        .auth-mobilelogo { display: flex; }
        @media (min-width: 1024px) {
          .auth-grid { grid-template-columns: 1fr 1fr; }
          .auth-aside { display: flex; flex-direction: column; justify-content: flex-end; }
          .auth-mobilelogo { display: none; }
        }
      `}</style>

      {/* Background Gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(120% 80% at 12% 8%, rgba(156,175,146,0.24), transparent 60%), radial-gradient(120% 80% at 92% 92%, rgba(236,225,201,0.5), transparent 55%)',
        }}
      />



      <div className="auth-grid">
        {/* Form Panel (Left on SignUp) */}
        <div style={{ position: 'relative', display: 'flex', minHeight: '100vh', flexDirection: 'column', height: 'auto', order: 1 }}>
          <div data-bubbles style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.6, pointerEvents: 'none' }}>
            {renderBubbles()}
          </div>
          <div className="auth-mobilelogo" style={{ position: 'relative', zIndex: 10, alignItems: 'center', padding: '28px 24px 0' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--fg, #16301f)' }}>
              <svg viewBox="0 0 48 48" fill="none" style={{ width: '26px', height: '26px' }} stroke="currentColor">
                <circle cx="24" cy="24" r="22" strokeWidth="1" opacity="0.35" />
                <path d="M24 8 C33 14 34 30 24 40 C14 30 15 14 24 8 Z" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M24 12 L24 38" strokeWidth="1.2" />
                <circle cx="24" cy="8" r="1.9" fill="currentColor" />
              </svg>
              <span style={{ fontFamily: "'Fraunces',serif", letterSpacing: '0.34em', paddingLeft: '0.34em', fontSize: '1.1rem' }}>MIRACLE</span>
            </Link>
          </div>
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '448px',
                borderRadius: '28px',
                border: '1px solid rgba(255,255,255,0.6)',
                background: 'var(--card-bg, rgba(255,253,248,0.55))',
                padding: '40px',
                boxShadow: '0 40px 100px -40px rgba(22,48,31,0.55)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                animation: 'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both',
              }}
            >
              <div style={{ marginBottom: '28px' }}>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#2f6b4c' }}>Get Started</span>
                <h1 style={{ margin: '12px 0 0', fontFamily: "'Fraunces',serif", fontWeight: 400, color: 'var(--fg, #16301f)', fontSize: 'clamp(1.9rem,3vw,2.5rem)', lineHeight: 1.08, letterSpacing: '-0.02em' }}>
                  Create Your Account
                </h1>
                <p style={{ margin: '10px 0 0', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--muted, rgba(22,48,31,0.6))' }}>
                  Start your personalized skincare journey with Miracle.
                </p>
              </div>

              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={nameProps.wrap}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.15rem', height: '1.15rem', flexShrink: 0, color: nameProps.iconColor, transition: 'color .3s' }}>
                      <path d="M20 21a8 8 0 0 0-16 0" />
                      <circle cx="12" cy="8" r="4" />
                    </svg>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <label htmlFor="su_name" style={nameProps.label}>
                        Full Name
                      </label>
                      <input
                        id="su_name"
                        type="text"
                        autoComplete="name"
                        required
                        value={name}
                        onFocus={() => setFocus('name')}
                        onBlur={() => setFocus(null)}
                        onChange={(e) => setName(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '24px 0 10px', fontFamily: 'inherit', fontSize: '0.95rem', color: 'var(--fg, #16301f)' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={emailProps.wrap}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.15rem', height: '1.15rem', flexShrink: 0, color: emailProps.iconColor, transition: 'color .3s' }}>
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m2 7 10 6 10-6" />
                    </svg>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <label htmlFor="su_email" style={emailProps.label}>
                        Email Address
                      </label>
                      <input
                        id="su_email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onFocus={() => setFocus('email')}
                        onBlur={() => setFocus(null)}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '24px 0 10px', fontFamily: 'inherit', fontSize: '0.95rem', color: 'var(--fg, #16301f)' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={pwProps.wrap}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.15rem', height: '1.15rem', flexShrink: 0, color: pwProps.iconColor, transition: 'color .3s' }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <label htmlFor="su_password" style={pwProps.label}>
                        Password
                      </label>
                      <input
                        id="su_password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onFocus={() => setFocus('password')}
                        onBlur={() => setFocus(null)}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '24px 0 10px', fontFamily: 'inherit', fontSize: '0.95rem', color: 'var(--fg, #16301f)' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label="Toggle password"
                      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted, rgba(22,48,31,0.6))', display: 'flex', padding: 0 }}
                    >
                      {showPw ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.15rem', height: '1.15rem' }}>
                          <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13 13 0 0 1-1.67 2.68" />
                          <path d="M6.06 6.06A13 13 0 0 0 2 12s3.5 7 10 7a9 9 0 0 0 4-.94" />
                          <path d="m2 2 20 20" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.15rem', height: '1.15rem' }}>
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Role selection */}
                <div>
                  <span style={{ display: 'block', marginBottom: '10px', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(22,48,31,0.55)' }}>
                    I am joining as
                  </span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3,1fr)',
                      gap: '8px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.5)',
                      background: 'rgba(255,255,255,0.4)',
                      padding: '6px',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    {(['User', 'Consultant', 'Dermatologist'] as RoleType[]).map((rKey) => {
                      const active = role === rKey;
                      return (
                        <button
                          key={rKey}
                          type="button"
                          onClick={() => setRole(rKey)}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '12px',
                            padding: '12px 8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: '0.75rem',
                            background: active ? '#2f6b4c' : 'transparent',
                            color: active ? '#ffffff' : 'rgba(22,48,31,0.7)',
                            boxShadow: active ? '0 10px 24px -10px rgba(22,48,31,0.6)' : 'none',
                            transition: 'background .25s, color .25s, box-shadow .25s',
                          }}
                        >
                          <span style={{ position: 'relative', zIndex: 10, display: 'flex', color: active ? '#ffffff' : 'var(--muted, rgba(22,48,31,0.6))' }}>
                            {rKey === 'User' && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.15rem', height: '1.15rem' }}>
                                <path d="M20 21a8 8 0 0 0-16 0" />
                                <circle cx="12" cy="8" r="4" />
                              </svg>
                            )}
                            {rKey === 'Consultant' && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.15rem', height: '1.15rem' }}>
                                <path d="M8 2v4" />
                                <path d="M12 2v4" />
                                <path d="M16 2v4" />
                                <rect width="16" height="18" x="4" y="4" rx="2" />
                                <path d="M8 10h6" />
                                <path d="M8 14h8" />
                                <path d="M8 18h5" />
                              </svg>
                            )}
                            {rKey === 'Dermatologist' && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.15rem', height: '1.15rem' }}>
                                <path d="M11 2v2" />
                                <path d="M5 2v2" />
                                <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
                                <path d="M8 15a6 6 0 0 0 12 0v-3" />
                                <circle cx="20" cy="10" r="2" />
                              </svg>
                            )}
                          </span>
                          <span style={{ position: 'relative', zIndex: 10 }}>{rKey}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {errorMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#e11d48', fontSize: '0.84rem' }}>
                    {errorMsg}
                  </div>
                )}

                {socialState.error && (
                  <div
                    style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#e11d48', fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}
                  >
                    <span>{socialState.error}</span>
                    <button type="button" onClick={clearSocialError} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e11d48', flexShrink: 0, padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    overflow: 'hidden',
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    background: '#16301f',
                    padding: '16px 32px',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem',
                    letterSpacing: '0.02em',
                    color: '#f6f1e6',
                    boxShadow: '0 18px 40px -12px rgba(22,48,31,0.55)',
                    transition: 'transform .25s, box-shadow .3s',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {loading ? 'Creating…' : 'Create Account'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </span>
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '28px 0' }}>
                <span style={{ height: '1px', flex: 1, background: 'var(--border, rgba(22,48,31,0.12))' }} />
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--muted, rgba(22,48,31,0.6))' }}>or continue with</span>
                <span style={{ height: '1px', flex: 1, background: 'var(--border, rgba(22,48,31,0.12))' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                {/* Google */}
                <button
                  type="button"
                  id="su_google_btn"
                  aria-label="Continue with Google"
                  disabled={socialState.loading}
                  onClick={() => triggerSocialLogin('google')}
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    height: '48px',
                    width: '48px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.6)',
                    background: socialState.loading && socialState.provider === 'google' ? 'rgba(66,133,244,0.12)' : 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    cursor: socialState.loading ? 'wait' : 'pointer',
                    transition: 'transform .2s, box-shadow .2s, background .2s',
                    opacity: socialState.loading && socialState.provider !== 'google' ? 0.5 : 1,
                  }}
                >
                  {socialState.loading && socialState.provider === 'google' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
                    </svg>
                  )}
                </button>

                {/* X (Twitter) */}
                <button
                  type="button"
                  id="su_twitter_btn"
                  aria-label="Continue with X"
                  disabled={socialState.loading}
                  onClick={() => triggerSocialLogin('twitter')}
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    height: '48px',
                    width: '48px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.6)',
                    background: socialState.loading && socialState.provider === 'twitter' ? 'rgba(22,48,31,0.1)' : 'rgba(255,255,255,0.55)',
                    color: 'var(--fg, #16301f)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    cursor: socialState.loading ? 'wait' : 'pointer',
                    transition: 'transform .2s, box-shadow .2s',
                    opacity: socialState.loading && socialState.provider !== 'twitter' ? 0.5 : 1,
                  }}
                >
                  {socialState.loading && socialState.provider === 'twitter' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16301f" strokeWidth="2" strokeLinecap="round" style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ width: '1.1rem', height: '1.1rem' }} fill="#16301f" aria-hidden="true">
                      <path d="M18.9 1.6h3.5l-7.6 8.7L23.7 22h-7l-5.5-7.2L4.9 22H1.4l8.1-9.3L.7 1.6h7.2l5 6.6 5.9-6.6Zm-1.2 18.3h1.9L7.1 3.6H5l12.7 16.3Z" />
                    </svg>
                  )}
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  id="su_facebook_btn"
                  aria-label="Continue with Facebook"
                  disabled={socialState.loading}
                  onClick={() => triggerSocialLogin('facebook')}
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    height: '48px',
                    width: '48px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.6)',
                    background: socialState.loading && socialState.provider === 'facebook' ? 'rgba(24,119,242,0.1)' : 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    cursor: socialState.loading ? 'wait' : 'pointer',
                    transition: 'transform .2s, box-shadow .2s',
                    opacity: socialState.loading && socialState.provider !== 'facebook' ? 0.5 : 1,
                  }}
                >
                  {socialState.loading && socialState.provider === 'facebook' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1877F2" strokeWidth="2" strokeLinecap="round" style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} aria-hidden="true">
                      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.5c-1.49 0-1.96.93-1.96 1.87V12h3.33l-.53 3.47h-2.8v8.38A12 12 0 0 0 24 12Z" />
                    </svg>
                  )}
                </button>

                {/* Instagram */}
                <button
                  type="button"
                  id="su_instagram_btn"
                  aria-label="Continue with Instagram"
                  disabled={socialState.loading}
                  onClick={() => triggerSocialLogin('instagram')}
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    height: '48px',
                    width: '48px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.6)',
                    background: socialState.loading && socialState.provider === 'instagram' ? 'rgba(214,36,159,0.1)' : 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    cursor: socialState.loading ? 'wait' : 'pointer',
                    transition: 'transform .2s, box-shadow .2s',
                    opacity: socialState.loading && socialState.provider !== 'instagram' ? 0.5 : 1,
                  }}
                >
                  {socialState.loading && socialState.provider === 'instagram' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d6249f" strokeWidth="2" strokeLinecap="round" style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} aria-hidden="true">
                      <defs>
                        <radialGradient id="igGrad_su" cx="30%" cy="107%" r="150%">
                          <stop offset="0%" stopColor="#fdf497" />
                          <stop offset="5%" stopColor="#fdf497" />
                          <stop offset="45%" stopColor="#fd5949" />
                          <stop offset="60%" stopColor="#d6249f" />
                          <stop offset="90%" stopColor="#285AEB" />
                        </radialGradient>
                      </defs>
                      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="url(#igGrad_su)" />
                      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.6" />
                      <circle cx="17.4" cy="6.6" r="1.2" fill="#fff" />
                    </svg>
                  )}
                </button>
              </div>

              <p style={{ margin: '32px 0 0', textAlign: 'center', fontSize: '0.88rem', color: 'var(--muted, rgba(22,48,31,0.6))' }}>
                Already Registered?{' '}
                <Link to="/login" style={{ color: '#2f6b4c' }}>
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Editorial Visual Panel (Right on SignUp) */}
        <aside className="auth-aside" style={{ position: 'relative', overflow: 'hidden', order: 2, animation: 'asideIn 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
          <img
            src="https://images.unsplash.com/photo-1639689413026-68b7f99a0920?w=760&h=950&fit=crop&auto=format&q=80"
            alt="Editorial portrait celebrating natural skin texture"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(22,48,31,0.35) 0%, rgba(10,19,13,0.15) 40%, rgba(10,19,13,0.82) 100%)' }} />
          <div data-bubbles style={{ position: 'absolute', inset: 0, overflow: 'hidden', mixBlendMode: 'screen', opacity: 0.9, pointerEvents: 'none' }}>
            {renderBubbles()}
          </div>
          <div style={{ position: 'absolute', left: '40px', top: '36px', zIndex: 10 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffffff' }}>
              <svg viewBox="0 0 48 48" fill="none" style={{ width: '28px', height: '28px' }} stroke="currentColor">
                <circle cx="24" cy="24" r="22" strokeWidth="1" opacity="0.35" />
                <path d="M24 8 C33 14 34 30 24 40 C14 30 15 14 24 8 Z" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M24 12 L24 38" strokeWidth="1.2" />
                <path d="M24 20 L18.5 16 M24 20 L29.5 16 M24 27 L18 22.5 M24 27 L30 22.5" strokeWidth="1" opacity="0.7" />
                <circle cx="24" cy="8" r="1.9" fill="currentColor" />
                <circle cx="18.5" cy="16" r="1.4" fill="currentColor" />
                <circle cx="29.5" cy="16" r="1.4" fill="currentColor" />
              </svg>
              <span style={{ fontFamily: "'Fraunces',serif", letterSpacing: '0.34em', paddingLeft: '0.34em', fontSize: '1.15rem', color: '#ffffff' }}>MIRACLE</span>
            </Link>
          </div>
          <div style={{ position: 'relative', zIndex: 10, padding: '0 44px 60px', animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.32em', color: '#c3a468' }}>Miracle · AI Skincare</span>
            <span style={{ display: 'block', marginTop: '14px', fontFamily: "'Fraunces',serif", fontWeight: 300, fontSize: 'clamp(1.35rem,2.1vw,1.85rem)', color: 'rgba(246,241,230,0.9)', lineHeight: 1.1 }}>
              Design your
            </span>
            <span
              style={{
                display: 'block',
                marginTop: '2px',
                fontFamily: "'Fraunces',serif",
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(3rem,5.6vw,5rem)',
                lineHeight: 1.02,
                paddingBottom: '0.18em',
                overflow: 'visible',
                letterSpacing: '-0.02em',
                background: 'linear-gradient(102deg,#fffdf8 6%,#ece1c9 34%,#c3a468 60%,#9caf92 82%,#2f6b4c 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                filter: 'drop-shadow(0 14px 38px rgba(10,19,13,0.55)) drop-shadow(0 2px 12px rgba(195,164,104,0.4))',
              }}
            >
              glow,
            </span>
            <span
              style={{
                display: 'block',
                marginTop: '-2px',
                fontFamily: "'Fraunces',serif",
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(1.55rem,2.5vw,2.15rem)',
                lineHeight: 1.08,
                paddingBottom: '0.16em',
                overflow: 'visible',
                letterSpacing: '-0.01em',
                background: 'linear-gradient(96deg,#f6f1e6,#9caf92 70%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                textShadow: '0 2px 22px rgba(10,19,13,0.4)',
              }}
            >
              your way.
            </span>
            <p style={{ margin: '12px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>Join a world-class AI skincare platform</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
