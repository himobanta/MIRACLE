import { useState, ReactNode, InputHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  /* Optional trailing control, e.g. a show/hide password toggle. */
  trailing?: ReactNode;
}

/**
 * Glassmorphism input with a floating label, leading icon and focus glow.
 * Matches the Miracle luxury design language.
 */
export function AuthField({ label, icon: Icon, trailing, id, value, ...rest }: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const filled = value !== undefined && value !== '';
  const floated = focused || filled;

  return (
    <div
      className={`group relative rounded-2xl border bg-white/40 backdrop-blur-md transition-all duration-300 dark:bg-white/[0.04] ${
        focused
          ? 'border-[var(--emerald)]/70 shadow-[0_0_0_4px_color-mix(in_srgb,var(--emerald)_16%,transparent)]'
          : 'border-white/50 dark:border-white/10'
      }`}
    >
      <div className="flex items-center gap-3 px-4">
        {Icon && (
          <Icon
            className={`h-[1.15rem] w-[1.15rem] shrink-0 transition-colors ${focused ? 'text-[var(--emerald)]' : 'text-[var(--forest)]/45 dark:text-[var(--sage)]/60'}`}
            strokeWidth={1.6}
          />
        )}
        <div className="relative flex-1">
          <label
            htmlFor={id}
            className={`pointer-events-none absolute left-0 font-body transition-all duration-200 ${
              floated
                ? 'top-2 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--emerald)]'
                : 'top-1/2 -translate-y-1/2 text-[0.92rem] text-[var(--forest)]/50 dark:text-[var(--sage)]/60'
            }`}
          >
            {label}
          </label>
          <input
            id={id}
            value={value}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent pb-2.5 pt-6 font-body text-[0.95rem] text-[var(--forest)] outline-none placeholder:text-transparent dark:text-foreground"
            {...rest}
          />
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    </div>
  );
}
