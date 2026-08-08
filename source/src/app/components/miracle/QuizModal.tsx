import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, ArrowLeft, Sparkles, Check } from 'lucide-react';
import { useApp } from '../../store/AppState';
import { PRODUCTS, inr } from '../../data/products';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Button } from './primitives';

const STEPS = [
  { key: 'type', q: 'How does your skin usually feel?', a: ['Dry & tight', 'Oily & shiny', 'Combination', 'Balanced'] },
  { key: 'concern', q: 'What’s your primary concern?', a: ['Acne & breakouts', 'Dark spots', 'Fine lines', 'Dullness'] },
  { key: 'age', q: 'Which age range fits you?', a: ['Under 25', '25–34', '35–44', '45+'] },
  { key: 'goal', q: 'What matters most to you?', a: ['Clear skin', 'Even tone', 'Anti-ageing', 'Deep hydration'] },
];

// Deterministic “AI” routine mapping for the demo.
function recommend(answers: Record<string, string>) {
  const pick = (id: string) => PRODUCTS.find((p) => p.id === id)!;
  const base = [pick('cleanser'), pick('moisturizer'), pick('spf')];
  const c = answers.concern || '';
  if (c.includes('Acne')) base.splice(1, 0, pick('niacinamide'));
  else if (c.includes('Dark')) base.splice(1, 0, pick('vit-c'));
  else if (c.includes('lines')) base.splice(1, 0, pick('retinol'));
  else base.splice(1, 0, pick('vit-c'));
  return base;
}

export function QuizModal() {
  const { quizOpen, setQuizOpen, addToCart } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const done = step >= STEPS.length;
  const routine = done ? recommend(answers) : [];

  const close = () => {
    setQuizOpen(false);
    setTimeout(() => { setStep(0); setAnswers({}); }, 300);
  };

  const choose = (v: string) => {
    setAnswers((a) => ({ ...a, [STEPS[step].key]: v }));
    setTimeout(() => setStep((s) => s + 1), 220);
  };

  return (
    <AnimatePresence>
      {quizOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="absolute inset-0 bg-[rgba(10,19,13,0.6)] backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl"
          >
            {/* progress */}
            <div className="h-1 w-full bg-muted">
              <motion.div className="h-full bg-[var(--emerald)]" animate={{ width: `${(Math.min(step, STEPS.length) / STEPS.length) * 100}%` }} />
            </div>

            <button onClick={close} aria-label="Close" className="absolute right-4 top-5 z-10 text-foreground hover:opacity-60"><X className="h-5 w-5" /></button>

            <div className="p-8">
              <span className="inline-flex items-center gap-2 font-body text-[0.7rem] uppercase tracking-[0.24em] text-[var(--emerald)]">
                <Sparkles className="h-3.5 w-3.5" /> AI Skin Analysis
              </span>

              <AnimatePresence mode="wait">
                {!done ? (
                  <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
                    <h3 className="mt-4 font-display text-2xl leading-snug" style={{ fontWeight: 400 }}>{STEPS[step].q}</h3>
                    <p className="mt-1 font-body text-[0.82rem] text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
                    <div className="mt-6 grid gap-3">
                      {STEPS[step].a.map((opt) => {
                        const active = answers[STEPS[step].key] === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => choose(opt)}
                            className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left font-body transition-all ${active ? 'border-[var(--emerald)] bg-[var(--emerald)]/10' : 'border-border hover:border-[var(--emerald)]/50 hover:bg-muted/40'}`}
                          >
                            {opt}
                            <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? 'border-[var(--emerald)] bg-[var(--emerald)] text-white' : 'border-border'}`}>{active && <Check className="h-3 w-3" />}</span>
                          </button>
                        );
                      })}
                    </div>
                    {step > 0 && (
                      <button onClick={() => setStep((s) => s - 1)} className="mt-6 inline-flex items-center gap-1.5 font-body text-[0.85rem] text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Back
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h3 className="mt-4 font-display text-2xl leading-snug" style={{ fontWeight: 400 }}>
                      Your personalised ritual is ready
                    </h3>
                    <p className="mt-1 font-body text-[0.85rem] text-muted-foreground">
                      Composed for {answers.type?.toLowerCase()} skin, targeting {answers.concern?.toLowerCase()}.
                    </p>
                    <ul className="mt-5 space-y-3">
                      {routine.map((p, i) => (
                        <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--emerald)] font-body text-[0.7rem] text-white">{i + 1}</span>
                          <span className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--sage)]/15"><ImageWithFallback src={p.img} alt={p.name} className="h-full w-full object-cover" /></span>
                          <div className="flex-1"><p className="font-body text-[0.9rem]">{p.name}</p><p className="font-body text-[0.75rem] text-muted-foreground">{inr(p.price)}</p></div>
                        </li>
                      ))}
                    </ul>
                    <Button size="lg" icon className="mt-6 w-full" onClick={() => { routine.forEach(addToCart); close(); }}>
                      Add Ritual to Bag <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
