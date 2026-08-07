import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function FocusTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Switch modes automatically
      if (mode === 'focus') {
        setMode('break');
        setTimeLeft(5 * 60); // 5 min break
        setIsActive(false);
      } else {
        setMode('focus');
        setTimeLeft(25 * 60); // back to 25 min focus
        setIsActive(false);
      }
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const setTimerMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = mode === 'focus' 
    ? ((25 * 60 - timeLeft) / (25 * 60)) * 100
    : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', gridColumn: 'span 1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>⏱️ Focus Timer</h3>
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--surface-secondary)', padding: '4px', borderRadius: '8px' }}>
          <button 
            onClick={() => setTimerMode('focus')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: mode === 'focus' ? 'var(--surface)' : 'transparent',
              boxShadow: mode === 'focus' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              color: mode === 'focus' ? 'var(--text)' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Focus
          </button>
          <button 
            onClick={() => setTimerMode('break')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: mode === 'break' ? 'var(--surface)' : 'transparent',
              boxShadow: mode === 'break' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              color: mode === 'break' ? 'var(--text)' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Break
          </button>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '160px', height: '160px', marginBottom: '24px' }}>
          {/* Background circle */}
          <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="var(--surface-secondary)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <motion.circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={mode === 'focus' ? '#d97757' : '#7A9A8C'}
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDasharray: '439.8', strokeDashoffset: '439.8' }}
              animate={{ strokeDashoffset: `${439.8 - (439.8 * progress) / 100}` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </svg>
          
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <span style={{ fontSize: '36px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--text)', letterSpacing: '-1px' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={toggleTimer}
            className="btn btn-primary"
            style={{ 
              width: '100px', 
              backgroundColor: mode === 'focus' ? '' : '#7A9A8C',
              borderColor: mode === 'focus' ? '' : '#7A9A8C'
            }}
          >
            {isActive ? 'Pause' : 'Start'}
          </button>
          <button 
            onClick={resetTimer}
            className="btn"
            style={{ width: '100px' }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
