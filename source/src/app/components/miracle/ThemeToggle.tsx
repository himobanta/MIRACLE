import { motion } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import { useApp } from '../../store/AppState';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useApp();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle colour theme"
      className={`relative flex h-9 w-16 items-center rounded-full border border-border bg-muted/60 px-1 transition-colors ${className}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="grid h-7 w-7 place-items-center rounded-full bg-card text-foreground shadow-sm"
        style={{ marginLeft: dark ? 'auto' : 0 }}
      >
        {dark ? <Moon className="h-4 w-4" strokeWidth={1.6} /> : <Sun className="h-4 w-4" strokeWidth={1.6} />}
      </motion.span>
    </button>
  );
}
