import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { count: 5, sense: 'See', emoji: '👁️', prompt: 'things you can see', color: '#9EACCA' },
  { count: 4, sense: 'Touch', emoji: '✋', prompt: 'things you can touch', color: '#B4C0D8' },
  { count: 3, sense: 'Hear', emoji: '👂', prompt: 'things you can hear', color: '#8A9ABC' },
  { count: 2, sense: 'Smell', emoji: '👃', prompt: 'things you can smell', color: '#7A9A8C' },
  { count: 1, sense: 'Taste', emoji: '👅', prompt: 'thing you can taste', color: '#d97757' },
];

export default function GroundingExercise() {
  const [stepIndex, setStepIndex] = useState(-1); // -1 = intro, 0-4 = steps, 5 = done
  const isActive = stepIndex >= 0 && stepIndex < STEPS.length;
  const isDone = stepIndex >= STEPS.length;
  const step = isActive ? STEPS[stepIndex] : null;

  const handleStart = () => setStepIndex(0);
  const handleNext = () => setStepIndex((prev) => prev + 1);
  const handleReset = () => setStepIndex(-1);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', gridColumn: 'span 1' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>
        🌿 Grounding (5-4-3-2-1)
      </h3>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '180px',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          {/* Intro state */}
          {stepIndex === -1 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px', maxWidth: '280px' }}>
                A quick sensory exercise to bring you back to the present moment.
              </p>
              <button
                onClick={handleStart}
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'var(--brand, #9EACCA)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Begin
              </button>
            </motion.div>
          )}

          {/* Active step */}
          {isActive && step && (
            <motion.div
              key={`step-${stepIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, type: 'spring', stiffness: 300, damping: 25 }}
              style={{ textAlign: 'center', width: '100%' }}
            >
              {/* Progress dots */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                {STEPS.map((s, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      backgroundColor: i <= stepIndex ? s.color : 'var(--border-subtle, #EAE6DF)',
                      scale: i === stepIndex ? 1.3 : 1,
                    }}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      transition: 'background-color 0.3s',
                    }}
                  />
                ))}
              </div>

              <motion.div
                style={{ fontSize: '40px', marginBottom: '8px' }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {step.emoji}
              </motion.div>

              <p style={{ fontSize: '32px', fontWeight: '700', color: step.color, margin: '0 0 4px' }}>
                {step.count}
              </p>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                {step.prompt}
              </p>

              <button
                onClick={handleNext}
                style={{
                  padding: '8px 20px',
                  backgroundColor: step.color,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                {stepIndex < STEPS.length - 1 ? 'Next' : 'Finish'}
              </button>
            </motion.div>
          )}

          {/* Done state */}
          {isDone && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, type: 'spring' }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1, delay: 0.3 }}
                style={{ fontSize: '36px', marginBottom: '12px' }}
              >
                🧘
              </motion.div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                You're grounded.
              </p>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
                Take a deep breath and carry on.
              </p>
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 20px',
                  backgroundColor: 'transparent',
                  color: 'var(--brand, #9EACCA)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Start Over
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
