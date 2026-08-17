import React, { useState, useEffect } from 'react';

type Provider = 'google' | 'twitter' | 'facebook' | 'instagram';

const PROVIDER_CONFIG: Record<Provider, {
  name: string;
  color: string;
  bg: string;
  accentBg: string;
  logo: React.ReactNode;
  tagline: string;
  emailPlaceholder: string;
}> = {
  google: {
    name: 'Google',
    color: '#1a73e8',
    bg: '#ffffff',
    accentBg: '#f8f9fa',
    tagline: 'Sign in with your Google Account',
    emailPlaceholder: 'you@gmail.com',
    logo: (
      <svg viewBox="0 0 24 24" style={{ width: '36px', height: '36px' }}>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
      </svg>
    ),
  },
  twitter: {
    name: 'X',
    color: '#000000',
    bg: '#ffffff',
    accentBg: '#f7f9f9',
    tagline: 'Sign in to X to continue to Miracle',
    emailPlaceholder: 'Phone, email, or username',
    logo: (
      <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px' }} fill="#000">
        <path d="M18.9 1.6h3.5l-7.6 8.7L23.7 22h-7l-5.5-7.2L4.9 22H1.4l8.1-9.3L.7 1.6h7.2l5 6.6 5.9-6.6Zm-1.2 18.3h1.9L7.1 3.6H5l12.7 16.3Z" />
      </svg>
    ),
  },
  facebook: {
    name: 'Facebook',
    color: '#1877f2',
    bg: '#ffffff',
    accentBg: '#f0f2f5',
    tagline: 'Log in with Facebook',
    emailPlaceholder: 'Email or phone number',
    logo: (
      <svg viewBox="0 0 36 36" style={{ width: '40px', height: '40px' }}>
        <path fill="#1877f2" d="M36 18C36 8.059 27.941 0 18 0S0 8.059 0 18c0 8.985 6.584 16.424 15.188 17.779V23.25h-4.57V18h4.57v-3.963c0-4.511 2.688-7.007 6.8-7.007 1.97 0 4.03.352 4.03.352v4.43H23.9c-2.236 0-2.932 1.388-2.932 2.811V18h4.992l-.798 5.25H20.97v12.529C29.416 34.424 36 26.985 36 18z"/>
        <path fill="#fff" d="M25.162 23.25l.798-5.25H20.97v-3.414c0-1.423.696-2.811 2.932-2.811h2.117v-4.43s-2.06-.352-4.03-.352c-4.112 0-6.8 2.496-6.8 7.007V18h-4.57v5.25h4.57v12.529a18.147 18.147 0 0 0 5.625 0V23.25h4.348z"/>
      </svg>
    ),
  },
  instagram: {
    name: 'Instagram',
    color: '#833ab4',
    bg: '#ffffff',
    accentBg: '#fafafa',
    tagline: 'Sign in to Instagram',
    emailPlaceholder: 'Phone number, username, or email',
    logo: (
      <svg viewBox="0 0 48 48" style={{ width: '40px', height: '40px' }}>
        <defs>
          <radialGradient id="ig_popup_grad" cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="5%" stopColor="#fdf497" />
            <stop offset="45%" stopColor="#fd5949" />
            <stop offset="60%" stopColor="#d6249f" />
            <stop offset="90%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#ig_popup_grad)" />
        <rect x="13" y="13" width="22" height="22" rx="6" fill="none" stroke="#fff" strokeWidth="2.5" />
        <circle cx="24" cy="24" r="5.5" fill="none" stroke="#fff" strokeWidth="2.5" />
        <circle cx="31.5" cy="16.5" r="1.8" fill="#fff" />
      </svg>
    ),
  },
};

export function SocialLoginPopup() {
  const params = new URLSearchParams(window.location.search);
  const provider = (params.get('provider') || 'google') as Provider;
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.google;

  const [step, setStep] = useState<'email' | 'name' | 'loading' | 'error'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  // Set window title to match provider
  useEffect(() => {
    document.title = `Sign in with ${config.name}`;
  }, [config.name]);

  const isGoogle = provider === 'google';
  const isTwitter = provider === 'twitter';
  const isFacebook = provider === 'facebook';
  const isInstagram = provider === 'instagram';

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStep('name');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep('loading');

    try {
      // Generate a stable provider_id from the email (deterministic)
      const providerId = btoa(`${provider}:${email.toLowerCase().trim()}`).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);

      const res = await fetch(`${getApiBase()}/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          provider_id: providerId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || 'Sign-in failed. Please try again.');
      }

      const data = await res.json();

      // Post success back to opener
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'MIRACLE_SOCIAL_SUCCESS',
            provider,
            token: data.access_token,
            userId: data.user_id,
            role: data.role,
            name: data.name,
            email: email.toLowerCase().trim(),
          },
          window.location.origin
        );
      }

      window.close();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStep('error');
    }
  };

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px 16px',
    fontSize: '1rem',
    borderRadius: isGoogle ? '4px' : isFacebook || isInstagram ? '6px' : '4px',
    border: focused
      ? `2px solid ${config.color}`
      : `1.5px solid ${isGoogle ? '#dadce0' : '#dbdbdb'}`,
    outline: 'none',
    fontFamily: 'inherit',
    color: '#1c1c1c',
    background: '#fff',
    transition: 'border .15s',
    letterSpacing: '0.01em',
  });

  const btnStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: isGoogle ? '4px' : isFacebook ? '6px' : isInstagram ? '6px' : '4px',
    border: 'none',
    background: config.color,
    color: '#fff',
    fontSize: isGoogle ? '0.95rem' : '1rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: isGoogle ? '0.02em' : '0',
    transition: 'filter .15s, transform .1s',
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: config.accentBg,
    fontFamily: isGoogle
      ? "'Google Sans', Roboto, Arial, sans-serif"
      : isTwitter
      ? "'Chirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      : isFacebook
      ? "Helvetica, Arial, sans-serif"
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: '24px',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .social-card { animation: fadeIn 0.25s ease both; }
        .social-btn:hover { filter: brightness(0.92); }
        .social-btn:active { transform: scale(0.98); }
        .social-link { color: ${config.color}; text-decoration: none; font-size: 0.88rem; cursor: pointer; background: none; border: none; padding: 0; font-family: inherit; }
        .social-link:hover { text-decoration: underline; }
      `}</style>

      {/* ── GOOGLE STYLE ── */}
      {isGoogle && (
        <div className="social-card" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', padding: '48px 40px', width: '100%', maxWidth: '400px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', gap: '16px' }}>
            {config.logo}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 400, color: '#202124' }}>Sign in</h1>
              <p style={{ margin: '8px 0 0', fontSize: '0.95rem', color: '#5f6368' }}>to continue to Miracle</p>
            </div>
          </div>

          {step === 'email' && (
            <form onSubmit={handleEmailNext} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <input
                type="email"
                autoFocus
                placeholder="Email or phone"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                required
                style={inputStyle(emailFocused)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="social-link" onClick={() => {}}>Forgot email?</button>
                <button type="submit" className="social-btn" style={{ ...btnStyle, width: 'auto', padding: '10px 24px' }}>Next</button>
              </div>
            </form>
          )}

          {step === 'name' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '24px', border: '1px solid #dadce0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#3c4043' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '16px', height: '16px', flexShrink: 0 }}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                <button type="button" className="social-link" onClick={() => setStep('email')} style={{ flexShrink: 0 }}>✎</button>
              </div>
              <input
                type="text"
                autoFocus
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                required
                style={inputStyle(nameFocused)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="social-link" onClick={() => setStep('email')}>Back</button>
                <button type="submit" className="social-btn" style={{ ...btnStyle, width: 'auto', padding: '10px 24px' }}>Continue</button>
              </div>
            </form>
          )}

          {step === 'loading' && <LoadingSpinner color={config.color} />}
          {step === 'error' && <ErrorView message={error} color={config.color} onRetry={() => { setStep('email'); setError(''); }} />}
        </div>
      )}

      {/* ── TWITTER / X STYLE ── */}
      {isTwitter && (
        <div className="social-card" style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: '48px 40px', width: '100%', maxWidth: '380px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
            {config.logo}
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f1419', letterSpacing: '-0.03em' }}>Sign in to X</h1>
          </div>

          {step === 'email' && (
            <form onSubmit={handleEmailNext} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input
                type="email"
                autoFocus
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                required
                style={inputStyle(emailFocused)}
              />
              <button type="submit" className="social-btn" style={btnStyle}>Next</button>
              <button type="button" className="social-link" onClick={() => {}} style={{ textAlign: 'center', color: '#1d9bf0', fontSize: '0.9rem' }}>Forgot password?</button>
            </form>
          )}

          {step === 'name' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#536471' }}>Signing in as <strong style={{ color: '#0f1419' }}>{email}</strong></p>
              <input
                type="text"
                autoFocus
                placeholder="Your display name"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                required
                style={inputStyle(nameFocused)}
              />
              <button type="submit" className="social-btn" style={btnStyle}>Sign in</button>
              <button type="button" className="social-link" onClick={() => setStep('email')} style={{ textAlign: 'center', color: '#536471', fontSize: '0.88rem' }}>← Back</button>
            </form>
          )}

          {step === 'loading' && <LoadingSpinner color="#000" />}
          {step === 'error' && <ErrorView message={error} color="#1d9bf0" onRetry={() => { setStep('email'); setError(''); }} />}
        </div>
      )}

      {/* ── FACEBOOK STYLE ── */}
      {isFacebook && (
        <div className="social-card" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', padding: '0', width: '100%', maxWidth: '400px', overflow: 'hidden' }}>
          <div style={{ background: '#1877f2', padding: '24px 32px', textAlign: 'center' }}>
            {config.logo}
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>Connect with friends and the world</p>
          </div>

          <div style={{ padding: '24px 32px 32px' }}>
            {step === 'email' && (
              <form onSubmit={handleEmailNext} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input
                  type="email"
                  autoFocus
                  placeholder="Email or phone number"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  required
                  style={inputStyle(emailFocused)}
                />
                <button type="submit" className="social-btn" style={btnStyle}>Next</button>
                <div style={{ textAlign: 'center' }}><button type="button" className="social-link" onClick={() => {}} style={{ color: '#1877f2' }}>Forgotten password?</button></div>
                <hr style={{ border: 'none', borderTop: '1px solid #dadde1', margin: '8px 0' }} />
                <button type="button" className="social-btn" style={{ ...btnStyle, background: '#42b72a' }}>Create new account</button>
              </form>
            )}

            {step === 'name' && (
              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#606770' }}>Continuing as: <strong style={{ color: '#1c1e21' }}>{email}</strong></p>
                <input
                  type="text"
                  autoFocus
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  required
                  style={inputStyle(nameFocused)}
                />
                <button type="submit" className="social-btn" style={btnStyle}>Log In</button>
                <div style={{ textAlign: 'center' }}><button type="button" className="social-link" onClick={() => setStep('email')} style={{ color: '#1877f2' }}>← Back</button></div>
              </form>
            )}

            {step === 'loading' && <LoadingSpinner color="#1877f2" />}
            {step === 'error' && <ErrorView message={error} color="#1877f2" onRetry={() => { setStep('email'); setError(''); }} />}
          </div>
        </div>
      )}

      {/* ── INSTAGRAM STYLE ── */}
      {isInstagram && (
        <div className="social-card" style={{ background: '#fff', border: '1px solid #dbdbdb', borderRadius: '4px', padding: '40px 40px 24px', width: '100%', maxWidth: '360px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', gap: '16px' }}>
            {config.logo}
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#737373', textAlign: 'center', lineHeight: 1.4 }}>Sign in to see photos and videos from your friends.</p>
          </div>

          {step === 'email' && (
            <form onSubmit={handleEmailNext} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="email"
                autoFocus
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                required
                style={{ ...inputStyle(emailFocused), fontSize: '0.85rem', background: '#fafafa' }}
              />
              <button type="submit" className="social-btn" style={{ ...btnStyle, background: email ? '#0095f6' : '#b2dffc', fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px', padding: '10px 16px' }}>Next</button>
              <div style={{ textAlign: 'center', marginTop: '8px' }}><button type="button" className="social-link" onClick={() => {}} style={{ color: '#00376b', fontSize: '0.82rem' }}>Forgot password?</button></div>
            </form>
          )}

          {step === 'name' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#737373' }}>Signing in as <strong style={{ color: '#262626' }}>{email}</strong></p>
              <input
                type="text"
                autoFocus
                placeholder="Full name"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                required
                style={{ ...inputStyle(nameFocused), fontSize: '0.85rem', background: '#fafafa' }}
              />
              <button type="submit" className="social-btn" style={{ ...btnStyle, background: name ? '#0095f6' : '#b2dffc', fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px', padding: '10px 16px' }}>Log In</button>
              <div style={{ textAlign: 'center', marginTop: '8px' }}><button type="button" className="social-link" onClick={() => setStep('email')} style={{ color: '#00376b', fontSize: '0.82rem' }}>← Back</button></div>
            </form>
          )}

          {step === 'loading' && <LoadingSpinner color="#0095f6" />}
          {step === 'error' && <ErrorView message={error} color="#0095f6" onRetry={() => { setStep('email'); setError(''); }} />}

          <div style={{ borderTop: '1px solid #dbdbdb', marginTop: '24px', paddingTop: '16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#262626' }}>Don't have an account? <button className="social-link" style={{ color: '#0095f6', fontWeight: 600 }} onClick={() => {}}>Sign up</button></p>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSpinner({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0' }}>
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
        style={{ width: '36px', height: '36px', animation: 'spin 0.8s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <p style={{ margin: 0, fontSize: '0.9rem', color: '#5f6368' }}>Signing you in…</p>
    </div>
  );
}

function ErrorView({ message, color, onRetry }: { message: string; color: string; onRetry: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
      <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(234,67,53,0.08)', border: '1px solid rgba(234,67,53,0.25)', color: '#c5221f', fontSize: '0.88rem', width: '100%', textAlign: 'center' }}>
        {message}
      </div>
      <button
        onClick={onRetry}
        style={{ padding: '10px 24px', borderRadius: '4px', border: `1px solid ${color}`, background: 'transparent', color, fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Try again
      </button>
    </div>
  );
}

function getApiBase(): string {
  // Read from Vite env, fallback to local backend
  try {
    const envUrl = (window as any).__VITE_API_URL__ || 'http://127.0.0.1:8000/api/v1';
    return envUrl.replace(/\/+$/, '');
  } catch {
    return 'http://127.0.0.1:8000/api/v1';
  }
}
