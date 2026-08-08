interface LogoProps {
  variant?: 'horizontal' | 'stacked' | 'mark';
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}

// MIRACLE — botanical leaf fused with scientific geometry (molecular nodes).
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* geometric containment ring */}
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      {/* leaf body */}
      <path
        d="M24 8 C33 14 34 30 24 40 C14 30 15 14 24 8 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* central vein / stem */}
      <path d="M24 12 L24 38" stroke="currentColor" strokeWidth="1.2" />
      {/* symmetric veins */}
      <path d="M24 20 L18.5 16 M24 20 L29.5 16 M24 27 L18 22.5 M24 27 L30 22.5" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      {/* molecular nodes */}
      <circle cx="24" cy="8" r="1.9" fill="currentColor" />
      <circle cx="18.5" cy="16" r="1.4" fill="currentColor" />
      <circle cx="29.5" cy="16" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function Logo({ variant = 'horizontal', className = '', markClassName = '', wordClassName = '' }: LogoProps) {
  if (variant === 'mark') return <LogoMark className={markClassName || 'w-8 h-8'} />;

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <LogoMark className={markClassName || 'w-10 h-10'} />
        <span className={`font-display tracking-[0.42em] pl-[0.42em] ${wordClassName}`} style={{ fontSize: '1.1rem' }}>
          MIRACLE
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName || 'w-7 h-7'} />
      <span className={`font-display tracking-[0.34em] pl-[0.34em] ${wordClassName}`} style={{ fontSize: '1.15rem' }}>
        MIRACLE
      </span>
    </div>
  );
}
