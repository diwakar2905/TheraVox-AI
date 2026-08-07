import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

// ─── Slot config ────────────────────────────────────────────────────────────

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

interface SlotConfig {
  greeting: string;
  icon: string;
  sub: string;
  /** banner background */
  bg: string;
  /** left-edge accent stripe + speed lines */
  accent: string;
  /** progress-track fill */
  trackFill: string;
  /** icon bubble background */
  iconBg: string;
}

const SLOTS: Record<TimeSlot, SlotConfig> = {
  morning: {
    greeting: 'Good morning',
    icon: '🌅',
    sub: 'Ready to start the day with clarity?',
    bg: 'linear-gradient(105deg, #FEF3EE 0%, #FEF9F7 60%, #FFFDF9 100%)',
    accent: '#D97757',
    trackFill: '#D97757',
    iconBg: 'linear-gradient(135deg, #FEE0D0, #FDF4F1)',
  },
  afternoon: {
    greeting: 'Good afternoon',
    icon: '☀️',
    sub: 'Hope your afternoon is bright!',
    bg: 'linear-gradient(105deg, #FBF6E8 0%, #FDF9F0 60%, #FFFDF7 100%)',
    accent: '#C9A962',
    trackFill: '#C9A962',
    iconBg: 'linear-gradient(135deg, #F5E5B0, #FBF6E8)',
  },
  evening: {
    greeting: 'Good evening',
    icon: '🌆',
    sub: 'Time to reflect and unwind.',
    bg: 'linear-gradient(105deg, #EDE8F4 0%, #F2EEF8 60%, #F9F7FD 100%)',
    accent: '#9B7BB8',
    trackFill: '#9B7BB8',
    iconBg: 'linear-gradient(135deg, #DAD0EE, #EDE8F4)',
  },
  night: {
    greeting: 'Good night',
    icon: '🌙',
    sub: 'Take a moment to wind down.',
    bg: 'linear-gradient(105deg, #E4ECF4 0%, #ECF2F8 60%, #F5F8FC 100%)',
    accent: '#6B9AC4',
    trackFill: '#6B9AC4',
    iconBg: 'linear-gradient(135deg, #BDD3E8, #E4ECF4)',
  },
};

function getSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const sessionKey = (userId: string) => `theravox_greeting_shown_${userId}`;
const DURATION_MS  = 5500;
const TICK_MS      = 40;

// ─── Speed lines data ─────────────────────────────────────────────────────────

const SPEED_LINES = [
  { top: '22%', w: 64, delay: 0,    opacity: 0.55 },
  { top: '38%', w: 44, delay: 0.04, opacity: 0.38 },
  { top: '54%', w: 56, delay: 0.02, opacity: 0.45 },
  { top: '68%', w: 36, delay: 0.06, opacity: 0.28 },
  { top: '80%', w: 28, delay: 0.03, opacity: 0.20 },
];

// ─── Animation variants ───────────────────────────────────────────────────────

/** The entire banner slides in from the left like a train arriving */
const bannerVariants = {
  hidden: {
    x: '-105%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 52,
      damping: 16,
      mass: 1.05,
    },
  },
  exit: {
    x: '108%',
    opacity: 0,
    transition: {
      ease: [0.4, 0, 0.8, 0] as [number, number, number, number],
      duration: 0.38,
    },
  },
};

/** Content items stagger in after the banner settles */
const contentContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.32 },
  },
};

const contentItem = {
  hidden: { opacity: 0, x: -14 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 26 },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GreetingBanner() {
  const { user, isAuthenticated } = useAuth();
  const [visible, setVisible]     = useState(false);
  const [progress, setProgress]   = useState(100);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const [iconScope, animateIcon]  = useAnimate();

  /* Show once per session when authenticated */
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const key = sessionKey(user.id);
    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, '1');
    setVisible(true);

    /* Tick progress bar */
    const dec = (TICK_MS / DURATION_MS) * 100;
    timerRef.current = setInterval(
      () => setProgress(p => Math.max(0, p - dec)),
      TICK_MS,
    );

    timeoutRef.current = setTimeout(dismiss, DURATION_MS);

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  /* Pulse the icon once the banner is settled */
  useEffect(() => {
    if (!visible || !iconScope.current) return;
    const id = setTimeout(async () => {
      await animateIcon(iconScope.current, { scale: [1, 1.22, 0.92, 1.08, 1] }, { duration: 0.55, ease: 'easeInOut' });
    }, 750);
    return () => clearTimeout(id);
  }, [visible, iconScope, animateIcon]);

  function cleanup() {
    if (timerRef.current)   clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }

  function dismiss() {
    cleanup();
    setVisible(false);
  }

  if (!isAuthenticated || !user) return null;

  const slot      = getSlot();
  const cfg       = SLOTS[slot];
  const firstName = user.full_name.split(' ')[0];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="greeting-banner"
          variants={bannerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="status"
          aria-live="polite"
          style={{
            position: 'relative',
            margin: '18px 0 2px',
            borderRadius: '16px',
            background: cfg.bg,
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            willChange: 'transform',
          }}
        >

          {/* ── Left accent stripe (train livery) ── */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, bottom: 0,
            width: '4px',
            background: cfg.accent,
            borderRadius: '16px 0 0 16px',
          }} />

          {/* ── Speed-line streaks (fade-out on settle) ── */}
          {SPEED_LINES.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: l.opacity, scaleX: 1, x: 0 }}
              animate={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: 0.45, delay: l.delay, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: '12px',
                top: l.top,
                width: l.w,
                height: '1.5px',
                background: cfg.accent,
                borderRadius: '2px',
                transformOrigin: 'left center',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* ── Main content row ── */}
          <motion.div
            variants={contentContainer}
            initial="hidden"
            animate="visible"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(10px, 2vw, 16px)',
              padding: 'clamp(14px, 2.5vw, 20px) clamp(14px, 2.5vw, 20px) clamp(16px, 2.5vw, 22px) 20px',
            }}
          >

            {/* Icon bubble */}
            <motion.div
              variants={contentItem}
              style={{ flexShrink: 0 }}
            >
              <div
                ref={iconScope}
                style={{
                  width: 'clamp(44px, 6vw, 56px)',
                  height: 'clamp(44px, 6vw, 56px)',
                  borderRadius: '50%',
                  background: cfg.iconBg,
                  border: `1.5px solid ${cfg.accent}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'clamp(22px, 3.5vw, 28px)',
                  boxShadow: `0 2px 10px ${cfg.accent}22`,
                  flexShrink: 0,
                }}
              >
                {cfg.icon}
              </div>
            </motion.div>

            {/* Text block */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <motion.p
                variants={contentItem}
                style={{
                  margin: 0,
                  fontSize: 'clamp(15px, 2.2vw, 19px)',
                  fontWeight: 700,
                  color: '#1D1B18',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {cfg.greeting}, {firstName}!
              </motion.p>
              <motion.p
                variants={contentItem}
                style={{
                  margin: '3px 0 0',
                  fontSize: 'clamp(12px, 1.6vw, 13.5px)',
                  color: '#4A4640',
                  lineHeight: 1.45,
                }}
              >
                {cfg.sub}
              </motion.p>
            </div>

            {/* Dismiss button */}
            <motion.button
              variants={contentItem}
              onClick={dismiss}
              aria-label="Dismiss greeting"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              style={{
                flexShrink: 0,
                width: '28px',
                height: '28px',
                border: 'none',
                background: 'rgba(0,0,0,0.055)',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#6B665C',
                lineHeight: 1,
              }}
            >
              ✕
            </motion.button>
          </motion.div>

          {/* ── Railway track progress ── */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '4px',   /* start after the accent stripe */
            right: 0,
            height: '7px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.5px 0',
            pointerEvents: 'none',
          }}>
            {/* Rail 1 */}
            <div style={{ height: '1.5px', background: 'rgba(0,0,0,0.08)', borderRadius: 1 }} />
            {/* Rail 2 */}
            <div style={{ height: '1.5px', background: 'rgba(0,0,0,0.08)', borderRadius: 1 }} />

            {/* The "train" — colored fill that drains left */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, bottom: 0,
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${cfg.trackFill}BB, ${cfg.trackFill}55)`,
              transition: `width ${TICK_MS}ms linear`,
              borderRadius: '0 2px 2px 0',
            }} />
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
