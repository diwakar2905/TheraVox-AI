import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import { useHoverStyle } from '../hooks/useHoverStyle';

// ─── Tilt Card (3D hover effect) ────────────────────────────────────────────
const TILT_LIMIT = 7;

function TiltCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 400, damping: 40 });
  const ySpring = useSpring(y, { stiffness: 400, damping: 40 });
  const transform = useMotionTemplate`perspective(1000px) rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(yPct * TILT_LIMIT * -1);
    y.set(xPct * TILT_LIMIT);
  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        background: 'var(--surface, #FFFFFF)',
        border: '1px solid var(--border, #E3E1DE)',
        borderRadius: '20px',
        padding: '36px',
        boxShadow: '0 4px 6px rgba(29, 27, 24, 0.02)',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...style
      }}
      whileHover={{
        boxShadow: '0 24px 48px rgba(29, 27, 24, 0.08)',
        borderColor: 'var(--brand, #9EACCA)',
        scale: 1.02,
        zIndex: 10
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div style={{ transform: 'translateZ(40px)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </motion.div>
  );
}

// ─── Animation variants ──────────────────────────────────────────────────────
const fadeUpContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } }
};

// ─── Icon box ────────────────────────────────────────────────────────────────
function IconBox({ emoji }: { emoji: string }) {
  return (
    <div style={{
      fontSize: '28px',
      marginBottom: '24px',
      width: '56px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-secondary, #FAF8F5)',
      borderRadius: '14px',
      border: '1px solid var(--border-subtle, #EAE6DF)',
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.02)',
      flexShrink: 0,
    }} aria-hidden="true">
      {emoji}
    </div>
  );
}

// ─── Feature pill ────────────────────────────────────────────────────────────
function FeaturePill({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '14px',
      color: 'var(--text-secondary, #4A4640)',
    }}>
      <span style={{
        display: 'inline-flex',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'var(--brand-light, #E7EDF5)',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: 'var(--brand, #9EACCA)',
        fontWeight: 700,
        flexShrink: 0,
      }}>✓</span>
      {text}
    </div>
  );
}

// ─── Section label ───────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 14px',
      background: 'var(--brand-light, #E7EDF5)',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      color: 'var(--brand, #9EACCA)',
      marginBottom: '20px',
      width: 'fit-content',
    }}>
      {text}
    </div>
  );
}

// ─── Wellness tool mini-card ─────────────────────────────────────────────────
const WELLNESS_TOOLS = [
  { emoji: '🌬️', name: 'Breathing Coach',    desc: 'Guided breathing patterns to calm anxiety and restore balance in minutes.' },
  { emoji: '🎯', name: 'Mood Check',         desc: 'Quick daily mood snapshots that feed your long-term emotional analytics.' },
  { emoji: '📓', name: 'Guided Journal',     desc: 'AI-prompted journaling to surface insights hidden in your daily thoughts.' },
  { emoji: '🙏', name: 'Gratitude Box',      desc: 'Build a gratitude habit that rewires your brain for positivity over time.' },
  { emoji: '⏱️', name: 'Focus Timer',        desc: 'Pomodoro-style sessions with mood check-ins to stay sharp and present.' },
  { emoji: '✨', name: 'Daily Affirmations', desc: 'Personalised affirmations generated to match your current emotional state.' },
];

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ServicesPage() {
  const studioLinkHover = useHoverStyle<HTMLAnchorElement>(
    { background: 'var(--brand, #9EACCA)', color: '#fff' },
    { background: 'var(--brand-light, #E7EDF5)', color: 'var(--brand, #9EACCA)' },
  );
  const brandHover = useHoverStyle<HTMLAnchorElement>(
    { background: 'var(--brand-hover, #8A9ABC)' },
    { background: 'var(--brand, #9EACCA)' },
  );
  const outlineHover = useHoverStyle<HTMLAnchorElement>(
    { borderColor: 'var(--brand, #9EACCA)', color: 'var(--brand, #9EACCA)' },
    { borderColor: 'var(--border-strong, #D1CFC9)', color: 'var(--text, #1D1D1B)' },
  );
  const fullOutlineHover = useHoverStyle<HTMLAnchorElement>(
    { background: 'var(--surface, #FFFFFF)', borderColor: 'var(--brand, #9EACCA)', color: 'var(--brand, #9EACCA)' },
    { background: 'transparent', borderColor: 'var(--border-strong, #D1CFC9)', color: 'var(--text, #1D1D1B)' },
  );

  return (
    <motion.div
      style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '64px 24px 80px',
        fontFamily: 'var(--font-body, "Inter", sans-serif)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.section
        style={{ marginBottom: '96px', marginTop: '48px' }}
        variants={fadeUpContainer}
        initial="hidden"
        animate="show"
        aria-label="Services overview"
      >
        <motion.div variants={fadeUpItem}>
          <SectionLabel text="Our Services" />
        </motion.div>

        <motion.h1 variants={fadeUpItem} style={{
          fontSize: 'clamp(38px, 5.5vw, 62px)',
          fontWeight: 400,
          lineHeight: 1.1,
          marginBottom: '24px',
          fontFamily: "'Charter', 'Georgia', serif",
          color: 'var(--text, #1D1D1B)',
          letterSpacing: '-0.02em',
          maxWidth: '820px',
        }}>
          Every tool you need for emotional clarity
        </motion.h1>

        <motion.p variants={fadeUpItem} style={{
          fontSize: '20px',
          color: 'var(--text-secondary, #4A4640)',
          maxWidth: '680px',
          lineHeight: 1.65,
          marginBottom: '0',
        }}>
          TheraVox AI brings together multimodal emotion intelligence, a personal wellness toolkit,
          an AI companion, and safety-first crisis support — all in one platform, built for your mental well-being.
        </motion.p>
      </motion.section>

      {/* ── Emotion Analysis ─────────────────────────────────────────────── */}
      <motion.section
        style={{ marginBottom: '100px' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpContainer}
        aria-labelledby="emotion-analysis-heading"
      >
        <motion.div variants={fadeUpItem}>
          <SectionLabel text="Emotion Analysis" />
        </motion.div>
        <motion.h2 id="emotion-analysis-heading" variants={fadeUpItem} style={{
          fontSize: '34px',
          fontWeight: 400,
          marginBottom: '12px',
          fontFamily: "'Charter', 'Georgia', serif",
          letterSpacing: '-0.01em',
          color: 'var(--text, #1D1D1B)',
        }}>
          Three dimensions, one picture
        </motion.h2>
        <motion.p variants={fadeUpItem} style={{
          fontSize: '17px',
          color: 'var(--text-secondary, #4A4640)',
          marginBottom: '48px',
          maxWidth: '620px',
          lineHeight: 1.6,
        }}>
          Our AI reads your face, voice, and words simultaneously to build the most complete emotional portrait possible.
        </motion.p>

        <motion.div
          variants={fadeUpItem}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Vision */}
          <TiltCard>
            <IconBox emoji="👁️" />
            <h3 style={{ fontSize: '21px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
              Vision Analysis
            </h3>
            <p style={{ color: 'var(--text-tertiary, #6E6E6A)', fontSize: '15px', lineHeight: 1.65, marginBottom: '28px' }}>
              Your webcam becomes a real-time emotion detector. Our computer vision model tracks micro-expressions
              and muscle movements to identify feelings you may not even consciously notice.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
              {['Real-time face tracking', 'Micro-expression detection', '7 distinct emotions', 'Confidence scoring', 'CLAHE low-light enhancement'].map(f => (
                <FeaturePill key={f} text={f} />
              ))}
            </div>
            <Link to="/vision" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: 'auto',
              padding: '11px 20px',
              background: 'var(--brand-light, #E7EDF5)',
              color: 'var(--brand, #9EACCA)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              width: 'fit-content',
              transition: 'background 0.2s',
            }}
            {...studioLinkHover}
            aria-label="Open Vision Analysis">
              Open Vision Studio →
            </Link>
          </TiltCard>

          {/* Text */}
          <TiltCard>
            <IconBox emoji="📝" />
            <h3 style={{ fontSize: '21px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
              Text Analysis
            </h3>
            <p style={{ color: 'var(--text-tertiary, #6E6E6A)', fontSize: '15px', lineHeight: 1.65, marginBottom: '28px' }}>
              Paste a message, journal entry, or anything you've written. Our NLP model goes beyond
              simple positive/negative to reveal the full emotional spectrum hiding in your words.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
              {['Context-aware sentiment', 'Subtext & nuance parsing', '7 emotion categories', 'Full probability breakdown', 'Crisis keyword detection'].map(f => (
                <FeaturePill key={f} text={f} />
              ))}
            </div>
            <Link to="/text" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: 'auto',
              padding: '11px 20px',
              background: 'var(--brand-light, #E7EDF5)',
              color: 'var(--brand, #9EACCA)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              width: 'fit-content',
              transition: 'background 0.2s',
            }}
            {...studioLinkHover}
            aria-label="Open Text Analysis">
              Open Text Studio →
            </Link>
          </TiltCard>

          {/* Audio */}
          <TiltCard>
            <IconBox emoji="🎤" />
            <h3 style={{ fontSize: '21px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
              Audio Analysis
            </h3>
            <p style={{ color: 'var(--text-tertiary, #6E6E6A)', fontSize: '15px', lineHeight: 1.65, marginBottom: '28px' }}>
              Your voice carries emotions words alone can't. Upload a recording or speak live — our
              model decodes vocal prosody, pitch, and rhythm to surface how you truly feel.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
              {['Live recording + file upload', 'Vocal prosody analysis', '8 vocal emotion labels', 'Stress & tension indicators', 'Real-time processing'].map(f => (
                <FeaturePill key={f} text={f} />
              ))}
            </div>
            <Link to="/audio" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: 'auto',
              padding: '11px 20px',
              background: 'var(--brand-light, #E7EDF5)',
              color: 'var(--brand, #9EACCA)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              width: 'fit-content',
              transition: 'background 0.2s',
            }}
            {...studioLinkHover}
            aria-label="Open Audio Analysis">
              Open Audio Studio →
            </Link>
          </TiltCard>
        </motion.div>
      </motion.section>

      {/* ── AI Companion ─────────────────────────────────────────────────── */}
      <motion.section
        style={{ marginBottom: '100px' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpContainer}
        aria-labelledby="companion-heading"
      >
        <motion.div variants={fadeUpItem}>
          <SectionLabel text="AI Companion" />
        </motion.div>
        <motion.h2 id="companion-heading" variants={fadeUpItem} style={{
          fontSize: '34px',
          fontWeight: 400,
          marginBottom: '40px',
          fontFamily: "'Charter', 'Georgia', serif",
          letterSpacing: '-0.01em',
          color: 'var(--text, #1D1D1B)',
        }}>
          Meet MindfulMind
        </motion.h2>

        <motion.div variants={fadeUpItem}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '0',
            background: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--border, #E3E1DE)',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(29, 27, 24, 0.04)',
          }}>
            {/* Left: content */}
            <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{
                fontSize: '40px',
                marginBottom: '24px',
                width: '70px',
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-secondary, #FAF8F5)',
                borderRadius: '18px',
                border: '1px solid var(--border-subtle, #EAE6DF)',
              }} aria-hidden="true">🧠</div>
              <h3 style={{ fontSize: '26px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)', fontFamily: "'Charter', 'Georgia', serif" }}>
                Your always-on wellness companion
              </h3>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary, #4A4640)', lineHeight: 1.7, marginBottom: '32px', maxWidth: '480px' }}>
                MindfulMind is an AI wellness companion you can talk to any time. Whether you need to vent,
                explore an emotion, or simply want someone to listen — it's here, without judgment.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '36px' }}>
                {[
                  'Empathetic conversation',
                  'Emotion-aware responses',
                  'Coping strategy suggestions',
                  'Available 24/7',
                  'Session memory',
                  'Crisis-aware safety layer',
                ].map(f => (
                  <FeaturePill key={f} text={f} />
                ))}
              </div>
              <Link to="/chat" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                background: 'var(--brand, #9EACCA)',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                width: 'fit-content',
                boxShadow: '0 4px 16px rgba(158, 172, 202, 0.35)',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--brand-hover, #8A9ABC)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--brand, #9EACCA)'; e.currentTarget.style.transform = 'none'; }}
              aria-label="Talk to MindfulMind AI">
                Talk to MindfulMind →
              </Link>
            </div>

            {/* Right: decorative chat bubbles */}
            <div style={{
              padding: '48px 40px',
              background: 'var(--surface-secondary, #FAF8F5)',
              borderLeft: '1px solid var(--border-subtle, #EAE6DF)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '16px',
            }}>
              {[
                { from: 'user', text: "I've been feeling really overwhelmed lately." },
                { from: 'ai',   text: "I hear you. Let's explore what's weighing on you most — can you tell me more about when it started?" },
                { from: 'user', text: "It's mostly work stress. I can't seem to wind down." },
                { from: 'ai',   text: "That's really common. I know a few breathing techniques that can help you decompress in just 2 minutes." },
              ].map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.from === 'user' ? 20 : -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, type: 'spring', stiffness: 300, damping: 26 }}
                  style={{
                    alignSelf: msg.from === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    padding: '12px 16px',
                    borderRadius: msg.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.from === 'user' ? 'var(--brand, #9EACCA)' : 'var(--surface, #FFFFFF)',
                    color: msg.from === 'user' ? '#FFFFFF' : 'var(--text, #1D1D1B)',
                    fontSize: '13.5px',
                    lineHeight: 1.55,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: msg.from === 'user' ? 'none' : '1px solid var(--border, #E3E1DE)',
                  }}
                >
                  {msg.text}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── Wellness Toolkit ─────────────────────────────────────────────── */}
      <motion.section
        style={{ marginBottom: '100px' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpContainer}
        aria-labelledby="wellness-heading"
      >
        <motion.div variants={fadeUpItem}>
          <SectionLabel text="Wellness Toolkit" />
        </motion.div>
        <motion.h2 id="wellness-heading" variants={fadeUpItem} style={{
          fontSize: '34px',
          fontWeight: 400,
          marginBottom: '12px',
          fontFamily: "'Charter', 'Georgia', serif",
          letterSpacing: '-0.01em',
          color: 'var(--text, #1D1D1B)',
        }}>
          Six tools for a healthier mind
        </motion.h2>
        <motion.p variants={fadeUpItem} style={{
          fontSize: '17px',
          color: 'var(--text-secondary, #4A4640)',
          marginBottom: '48px',
          maxWidth: '600px',
          lineHeight: 1.6,
        }}>
          Science-backed mental health tools, accessible in one click. Build habits, track your
          mood over time, and develop a personal wellness practice.
        </motion.p>

        <motion.div
          variants={fadeUpItem}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {WELLNESS_TOOLS.map((tool) => (
            <motion.div
              key={tool.name}
              variants={fadeUpItem}
              whileHover={{ y: -6, scale: 1.015, transition: { type: 'spring', stiffness: 400, damping: 28 } }}
              style={{
                padding: '28px',
                background: 'var(--surface, #FFFFFF)',
                borderRadius: '18px',
                border: '1px solid var(--border, #E3E1DE)',
                boxShadow: '0 4px 12px rgba(29, 27, 24, 0.03)',
                cursor: 'default',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                fontSize: '26px',
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-secondary, #FAF8F5)',
                borderRadius: '14px',
                border: '1px solid var(--border-subtle, #EAE6DF)',
                flexShrink: 0,
              }} aria-hidden="true">
                {tool.emoji}
              </div>
              <div>
                <h4 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)', margin: '0 0 8px 0' }}>
                  {tool.name}
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary, #4A4640)', lineHeight: 1.6, margin: 0 }}>
                  {tool.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fadeUpItem} style={{ marginTop: '36px', textAlign: 'center' }}>
          <Link to="/wellness" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 32px',
            background: 'transparent',
            color: 'var(--text, #1D1D1B)',
            border: '1px solid var(--border-strong, #D1CFC9)',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
          {...fullOutlineHover}
          aria-label="Open Wellness Hub">
            Explore the Wellness Hub →
          </Link>
        </motion.div>
      </motion.section>

      {/* ── Crisis Detection ─────────────────────────────────────────────── */}
      <motion.section
        style={{ marginBottom: '100px' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpContainer}
        aria-labelledby="crisis-heading"
      >
        <motion.div variants={fadeUpItem}>
          <div style={{
            background: 'linear-gradient(135deg, #FEF3F2 0%, #FDF2F8 100%)',
            border: '1px solid #FECDD2',
            borderRadius: '24px',
            padding: '48px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* subtle bg glow */}
            <div style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(251, 113, 133, 0.12) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }} aria-hidden="true" />

            <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '40px', alignItems: 'center' }}>
              <div style={{
                fontSize: '40px',
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '20px',
                border: '1px solid rgba(251,113,133,0.25)',
                flexShrink: 0,
              }} aria-hidden="true">
                🛡️
              </div>
              <div>
                <SectionLabel text="Safety First" />
                <h2 id="crisis-heading" style={{
                  fontSize: '28px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  color: '#991B1B',
                  fontFamily: "'Charter', 'Georgia', serif",
                  letterSpacing: '-0.01em',
                }}>
                  Built-in Crisis Detection
                </h2>
                <p style={{ fontSize: '16px', color: '#6B2D2D', lineHeight: 1.7, marginBottom: '24px', maxWidth: '640px' }}>
                  Across every modality — text, audio, and vision — TheraVox actively monitors for signs
                  of emotional crisis. When distress signals are detected, the platform surfaces immediate
                  mental health resources and connects you with support, automatically.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {[
                    'Automatic crisis keyword detection',
                    'Cross-modal distress monitoring',
                    'Immediate resource surfacing',
                    'Emergency contact guidance',
                    'Private & confidential',
                  ].map(f => (
                    <div key={f} style={{
                      padding: '6px 14px',
                      background: 'rgba(255,255,255,0.8)',
                      border: '1px solid rgba(251,113,133,0.3)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#7F1D1D',
                    }}>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── Developer API ────────────────────────────────────────────────── */}
      <motion.section
        style={{ marginBottom: '100px' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpContainer}
        aria-labelledby="api-heading"
      >
        <motion.div variants={fadeUpItem}>
          <div style={{
            background: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--border, #E3E1DE)',
            borderRadius: '24px',
            padding: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '48px',
            boxShadow: '0 8px 32px rgba(29,27,24,0.03)',
          }}>
            <div>
              <SectionLabel text="Developer API" />
              <h2 id="api-heading" style={{
                fontSize: '28px',
                fontWeight: 600,
                marginBottom: '16px',
                color: 'var(--text)',
                fontFamily: "'Charter', 'Georgia', serif",
                letterSpacing: '-0.01em',
              }}>
                Build with our emotion APIs
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary, #4A4640)', lineHeight: 1.7, marginBottom: '28px' }}>
                Access the same powerful AI models that drive TheraVox through clean REST endpoints.
                Integrate emotion intelligence into your own applications.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                {[
                  'Vision: POST /api/analyze_frame',
                  'Text: POST /api/analyze_text',
                  'Audio: POST /api/analyze_audio',
                  'OpenAPI / Swagger docs included',
                  'Token-based authentication',
                ].map(f => (
                  <FeaturePill key={f} text={f} />
                ))}
              </div>
              <Link to="/developers" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'var(--surface-secondary, #FAF8F5)',
                color: 'var(--text, #1D1D1B)',
                border: '1px solid var(--border, #E3E1DE)',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              {...outlineHover}
              aria-label="Open Developer Documentation">
                View API Docs →
              </Link>
            </div>

            {/* Code snippet decoration */}
            <div style={{
              background: '#1D1D1B',
              borderRadius: '16px',
              padding: '28px',
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: '13px',
              lineHeight: 1.8,
              color: '#A8A29E',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div style={{ color: '#6B7280', marginBottom: '12px', fontSize: '12px' }}>
                # Analyze text emotion
              </div>
              <div><span style={{ color: '#60A5FA' }}>POST</span> <span style={{ color: '#34D399' }}>/api/analyze_text</span></div>
              <div style={{ color: '#6B7280', margin: '12px 0 8px' }}>{'{'}</div>
              <div style={{ paddingLeft: '20px' }}>
                <span style={{ color: '#F472B6' }}>"text"</span>
                <span style={{ color: '#A8A29E' }}>: </span>
                <span style={{ color: '#FCD34D' }}>"I've been feeling anxious lately"</span>
              </div>
              <div style={{ color: '#6B7280', margin: '8px 0 16px' }}>{'}'}</div>
              <div style={{ color: '#6B7280', marginBottom: '8px' }}>{'// Response'}</div>
              <div><span style={{ color: '#6B7280' }}>{'{'}</span></div>
              <div style={{ paddingLeft: '20px' }}>
                <div><span style={{ color: '#F472B6' }}>"emotion"</span><span>: </span><span style={{ color: '#FCD34D' }}>"fear"</span><span>,</span></div>
                <div><span style={{ color: '#F472B6' }}>"confidence"</span><span>: </span><span style={{ color: '#34D399' }}>0.82</span><span>,</span></div>
                <div><span style={{ color: '#F472B6' }}>"emoji"</span><span>: </span><span style={{ color: '#FCD34D' }}>"😰"</span></div>
              </div>
              <div style={{ color: '#6B7280' }}>{'}'}</div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── What makes us different ──────────────────────────────────────── */}
      <motion.section
        style={{ marginBottom: '100px' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpContainer}
        aria-labelledby="differentiators-heading"
      >
        <motion.div variants={fadeUpItem}>
          <SectionLabel text="Why TheraVox" />
        </motion.div>
        <motion.h2 id="differentiators-heading" variants={fadeUpItem} style={{
          fontSize: '34px',
          fontWeight: 400,
          marginBottom: '48px',
          fontFamily: "'Charter', 'Georgia', serif",
          letterSpacing: '-0.01em',
          color: 'var(--text, #1D1D1B)',
        }}>
          Built differently, for a reason
        </motion.h2>

        <motion.div
          variants={fadeUpContainer}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
          }}
        >
          {[
            { emoji: '🎯', title: 'Multi-modal AI',      desc: 'No other platform combines face, voice, and text emotion analysis together.' },
            { emoji: '🔒', title: 'Privacy by design',   desc: 'In-memory token storage, httpOnly cookies, and zero plaintext data at rest.' },
            { emoji: '📊', title: 'Trend tracking',      desc: 'Longitudinal mood analytics show patterns across days, weeks, and months.' },
            { emoji: '⚡', title: 'Real-time speed',     desc: 'Inference runs in under 200ms so insights feel instant and natural.' },
            { emoji: '🧬', title: 'Research-backed',     desc: 'Models trained on peer-reviewed datasets with industry-leading accuracy.' },
            { emoji: '🌐', title: 'Open developer API',  desc: 'Embed emotion intelligence into any product via our clean REST API.' },
          ].map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUpItem}
              whileHover={{ y: -6, scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 28 } }}
              style={{
                padding: '28px',
                background: 'var(--surface, #FFFFFF)',
                borderRadius: '18px',
                border: '1px solid var(--border, #E3E1DE)',
                boxShadow: '0 4px 12px rgba(29,27,24,0.03)',
                cursor: 'default',
              }}
            >
              <motion.div
                style={{ fontSize: '26px', marginBottom: '16px', display: 'inline-block' }}
                whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.2, transition: { duration: 0.5 } }}
                aria-hidden="true"
              >
                {item.emoji}
              </motion.div>
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                {item.title}
              </h4>
              <p style={{ color: 'var(--text-secondary, #4A4640)', fontSize: '14px', lineHeight: 1.65, margin: 0 }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <motion.section
        style={{
          padding: '80px 48px',
          background: 'var(--surface-secondary, #FAF8F5)',
          borderRadius: '28px',
          border: '1px solid var(--border, #E3E1DE)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpContainer}
        aria-labelledby="cta-heading"
      >
        {/* decorative orb */}
        <motion.div
          style={{
            position: 'absolute', top: '-40%', right: '-5%',
            width: '500px', height: '500px',
            background: 'radial-gradient(circle, var(--brand, #9EACCA) 0%, transparent 65%)',
            opacity: 0.07, borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
          }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.07, 0.11, 0.07] }}
          transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
          aria-hidden="true"
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <motion.h2 id="cta-heading" variants={fadeUpItem} style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 400,
            marginBottom: '20px',
            fontFamily: "'Charter', 'Georgia', serif",
            letterSpacing: '-0.01em',
            color: 'var(--text, #1D1D1B)',
          }}>
            Start your journey today
          </motion.h2>
          <motion.p variants={fadeUpItem} style={{
            fontSize: '18px',
            color: 'var(--text-secondary, #4A4640)',
            marginBottom: '40px',
            maxWidth: '560px',
            margin: '0 auto 40px',
            lineHeight: 1.65,
          }}>
            All services above are included. No add-ons, no paywalls — just the full
            TheraVox experience from day one.
          </motion.p>

          <motion.div variants={fadeUpItem} style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Link to="/text" style={{
                padding: '16px 36px',
                background: 'var(--brand, #9EACCA)',
                color: '#FFFFFF',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '16px',
                display: 'inline-block',
                transition: 'background 0.2s ease',
                boxShadow: '0 8px 20px rgba(158,172,202,0.35)',
              }}
              {...brandHover}
              aria-label="Try Text Analysis now">
                Try It Now
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Link to="/wellness" style={{
                padding: '16px 36px',
                background: 'transparent',
                color: 'var(--text, #1D1D1B)',
                border: '1px solid var(--border-strong, #D1CFC9)',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '16px',
                display: 'inline-block',
                transition: 'all 0.2s ease',
              }}
              {...outlineHover}
              aria-label="Explore Wellness tools">
                Explore Wellness
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

    </motion.div>
  );
}
