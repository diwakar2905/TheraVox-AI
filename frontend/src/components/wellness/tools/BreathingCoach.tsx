import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WellnessAction } from '../../../hooks/useWellnessStore';

/* ── Breathing patterns ─────────────────────────────────────────────── */
const PATTERNS = {
  calm: {
    name: 'Calm',
    label: '4-4-4',
    description: 'A gentle rhythm to ease anxiety',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Hold', duration: 4 },
      { name: 'Exhale', duration: 4 },
    ],
    total: 12,
  },
  box: {
    name: 'Box',
    label: '4-4-4-4',
    description: 'Used by Navy SEALs — equal sides, total control',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Hold', duration: 4 },
      { name: 'Exhale', duration: 4 },
      { name: 'Hold', duration: 4 },
    ],
    total: 16,
  },
  '478': {
    name: '4-7-8 Sleep',
    label: '4-7-8',
    description: 'Dr. Weil\'s technique for deep relaxation',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Hold', duration: 7 },
      { name: 'Exhale', duration: 8 },
    ],
    total: 19,
  },
  energize: {
    name: 'Energize',
    label: '2-1-2',
    description: 'Quick, invigorating breaths to boost energy',
    phases: [
      { name: 'Inhale', duration: 2 },
      { name: 'Hold', duration: 1 },
      { name: 'Exhale', duration: 2 },
    ],
    total: 5,
  },
};

type PatternKey = keyof typeof PATTERNS;

/* ── Phase colours & icons ──────────────────────────────────────────── */
const PHASE_META: Record<string, { color: string; icon: string; instruction: string }> = {
  Inhale:  { color: '#9EACCA', icon: '🌬️', instruction: 'Breathe in slowly through your nose' },
  Hold:    { color: '#B4C0D8', icon: '⏸️', instruction: 'Hold gently — stay relaxed' },
  Exhale:  { color: '#7A9A8C', icon: '🍃', instruction: 'Release slowly through your mouth' },
};

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/* ── Component ──────────────────────────────────────────────────────── */
interface BreathingCoachProps {
  dispatch: React.Dispatch<WellnessAction>;
}

export default function BreathingCoach({ dispatch }: BreathingCoachProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [pattern, setPattern] = useState<PatternKey>('calm');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [phaseCountdown, setPhaseCountdown] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhaseRef = useRef<number>(0);

  const patternData = PATTERNS[pattern];

  /* Compute phase info from elapsed seconds */
  const computePhase = useCallback(
    (elapsedMs: number) => {
      const phases = PATTERNS[pattern].phases;
      const total = PATTERNS[pattern].total;
      const elapsedSec = elapsedMs / 1000;

      const cycles = Math.floor(elapsedSec / total);
      const remainder = elapsedSec % total;

      let accumulated = 0;
      let idx = 0;
      for (let i = 0; i < phases.length; i++) {
        if (accumulated + phases[i].duration > remainder) {
          idx = i;
          break;
        }
        accumulated += phases[i].duration;
      }

      const phaseElapsed = remainder - accumulated;
      const phaseDuration = phases[idx].duration;
      const progress = Math.min(phaseElapsed / phaseDuration, 1);
      const countdown = Math.ceil(phaseDuration - phaseElapsed);

      return { idx, progress, cycles, countdown, totalSec: Math.floor(elapsedSec) };
    },
    [pattern],
  );

  useEffect(() => {
    if (!isRunning) return;

    startTimeRef.current = Date.now();
    prevPhaseRef.current = 0;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const info = computePhase(elapsed);

      setSessionSeconds(info.totalSec);
      setCurrentPhase(info.idx);
      setPhaseProgress(info.progress);
      setCycleCount(info.cycles);
      setPhaseCountdown(info.countdown);
      prevPhaseRef.current = info.idx;
    }, 50); // 50ms for smooth animation

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, computePhase]);

  const handleStart = () => {
    setShowSummary(false);
    setIsRunning(true);
    setSessionSeconds(0);
    setCurrentPhase(0);
    setPhaseProgress(0);
    setCycleCount(0);
    setPhaseCountdown(patternData.phases[0].duration);
  };

  const handleStop = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const minutes = Math.max(1, Math.round(sessionSeconds / 60));
    if (sessionSeconds >= 30) {
      dispatch({ type: 'ADD_BREATHING_MINUTES', payload: minutes });
    }
    if (sessionSeconds >= 10) {
      setShowSummary(true);
    }
  };

  const handleDismissSummary = () => {
    setShowSummary(false);
    setSessionSeconds(0);
    setCycleCount(0);
  };

  const currentPhaseName = patternData.phases[currentPhase]?.name ?? 'Inhale';
  const meta = PHASE_META[currentPhaseName];

  /* Compute breathing orb scale with easing */
  const computeScale = () => {
    const eased = easeInOutSine(phaseProgress);
    if (currentPhaseName === 'Inhale') return 0.6 + 0.4 * eased;     // 0.6 → 1.0
    if (currentPhaseName === 'Exhale') return 1.0 - 0.4 * eased;     // 1.0 → 0.6
    return currentPhase === 0 ? 0.6 : 1.0;                           // Hold: stay where last phase ended
  };

  const orbScale = isRunning ? computeScale() : 0.8;

  /* Ring circumference for SVG progress */
  const RING_R = 72;
  const RING_C = 2 * Math.PI * RING_R;

  return (
    <div className="card" style={{ gridColumn: '1 / -1', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>🫁 Breathing Coach</h3>
        {isRunning && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px', color: 'var(--muted)' }}>
            <span>⏱ {formatTime(sessionSeconds)}</span>
            <span>🔄 {cycleCount} {cycleCount === 1 ? 'cycle' : 'cycles'}</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Session summary ────────────────────────── */}
        {showSummary && !isRunning && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              textAlign: 'center',
              padding: '32px 24px',
              background: 'linear-gradient(135deg, var(--surface-secondary), var(--surface))',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🧘</div>
            <h4 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>Session Complete</h4>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', margin: '20px 0' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--brand, #9EACCA)' }}>{formatTime(sessionSeconds)}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Duration</div>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--brand, #9EACCA)' }}>{cycleCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Cycles</div>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--brand, #9EACCA)' }}>{patternData.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Pattern</div>
              </div>
            </div>
            <button
              onClick={handleDismissSummary}
              style={{
                marginTop: '8px',
                padding: '10px 28px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Done
            </button>
          </motion.div>
        )}

        {/* ── Main interface ─────────────────────────── */}
        {!showSummary && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}
          >
            {/* Left: breathing orb */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              {/* Orb container */}
              <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                {/* SVG ring progress */}
                <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                  {/* Track */}
                  <circle cx="90" cy="90" r={RING_R} fill="none" stroke="var(--border-subtle, #EAE6DF)" strokeWidth="4" />
                  {/* Progress */}
                  {isRunning && (
                    <motion.circle
                      cx="90"
                      cy="90"
                      r={RING_R}
                      fill="none"
                      stroke={meta.color}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      animate={{ strokeDashoffset: RING_C * (1 - phaseProgress) }}
                      transition={{ duration: 0.05, ease: 'linear' }}
                      style={{ opacity: 0.7 }}
                    />
                  )}
                </svg>

                {/* Breathing orb */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <motion.div
                    animate={{ scale: orbScale }}
                    transition={{ type: 'tween', duration: 0.08, ease: 'linear' }}
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: isRunning
                        ? `radial-gradient(circle at 40% 35%, ${meta.color}88, ${meta.color})`
                        : 'radial-gradient(circle at 40% 35%, #B4C0D888, #9EACCA)',
                      boxShadow: isRunning
                        ? `0 0 40px ${meta.color}44, 0 0 80px ${meta.color}22`
                        : '0 0 30px rgba(158,172,202,0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.8s ease, box-shadow 0.8s ease',
                    }}
                  >
                    {isRunning ? (
                      <>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          {currentPhaseName}
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                          {phaseCountdown}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', opacity: 0.9 }}>
                        Ready
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Phase instruction */}
              <AnimatePresence mode="wait">
                {isRunning && (
                  <motion.p
                    key={currentPhaseName}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center', margin: 0, minHeight: '20px' }}
                  >
                    {meta.instruction}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Phase step indicators */}
              {isRunning && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {patternData.phases.map((phase, i) => {
                    const pMeta = PHASE_META[phase.name];
                    const isActive = i === currentPhase;
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: isActive ? '700' : '500',
                          color: isActive ? pMeta.color : 'var(--muted)',
                          background: isActive ? `${pMeta.color}15` : 'transparent',
                          border: `1px solid ${isActive ? `${pMeta.color}40` : 'transparent'}`,
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {phase.name} <span style={{ opacity: 0.7 }}>{phase.duration}s</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Start / Stop */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {!isRunning ? (
                  <button
                    onClick={handleStart}
                    style={{
                      padding: '10px 32px',
                      backgroundColor: 'var(--brand, #9EACCA)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    Start Session
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    style={{
                      padding: '10px 32px',
                      backgroundColor: '#d97757',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    End Session
                  </button>
                )}
              </div>
            </div>

            {/* Right: pattern picker */}
            <div style={{ paddingLeft: '24px', borderLeft: '1px solid var(--border-subtle, #EAE6DF)' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>
                Choose a Technique
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(Object.entries(PATTERNS) as [PatternKey, typeof PATTERNS[PatternKey]][]).map(([key, data]) => {
                  const isSelected = pattern === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (isRunning) return;
                        setPattern(key);
                        setCurrentPhase(0);
                        setPhaseProgress(0);
                      }}
                      disabled={isRunning}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '4px',
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--brand, #9EACCA)' : '1px solid var(--border-subtle, #EAE6DF)',
                        backgroundColor: isSelected ? 'rgba(158,172,202,0.08)' : 'var(--surface, #fff)',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        opacity: isRunning && !isSelected ? 0.5 : 1,
                        transition: 'all 0.25s',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: isSelected ? '700' : '600',
                          color: isSelected ? 'var(--brand, #9EACCA)' : 'var(--text)',
                        }}>
                          {data.name}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: isSelected ? 'var(--brand, #9EACCA)' : 'var(--muted)',
                          background: isSelected ? 'rgba(158,172,202,0.12)' : 'var(--surface-secondary, #FAF8F5)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}>
                          {data.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.4' }}>
                        {data.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Pattern phase preview */}
              {!isRunning && (
                <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '10px', background: 'var(--surface-secondary, #FAF8F5)', border: '1px solid var(--border-subtle, #EAE6DF)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Cycle preview
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {patternData.phases.map((phase, i) => {
                      const pMeta = PHASE_META[phase.name];
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{
                            width: `${Math.max(24, phase.duration * 8)}px`,
                            height: '6px',
                            borderRadius: '3px',
                            background: pMeta.color,
                            opacity: 0.7,
                          }} />
                          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{phase.duration}s</span>
                          {i < patternData.phases.length - 1 && (
                            <span style={{ fontSize: '10px', color: 'var(--border-subtle)', margin: '0 2px' }}>→</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                    {patternData.total}s per cycle
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
