import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import { useHoverStyle } from '../hooks/useHoverStyle';

const TILT_LIMIT = 8; // Max degrees of rotation

function TiltCard({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const xSpring = useSpring(x, { stiffness: 400, damping: 40 });
  const ySpring = useSpring(y, { stiffness: 400, damping: 40 });
  
  const transform = useMotionTemplate`perspective(1000px) rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Values from -0.5 to 0.5
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(yPct * TILT_LIMIT * -1); // rotateX
    y.set(xPct * TILT_LIMIT); // rotateY
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 8px 32px rgba(29, 27, 24, 0.04)',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...style
      }}
      whileHover={{ 
        boxShadow: '0 24px 48px rgba(29, 27, 24, 0.08)',
        borderColor: 'var(--border-strong, #D1CFC9)',
        scale: 1.02,
        zIndex: 10
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      role="article"
      tabIndex={0}
      aria-labelledby="card-title"
    >
      <div style={{ transform: 'translateZ(40px)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </motion.div>
  );
}

// Stagger variants for smoother entry
const fadeUpContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const brandHover = useHoverStyle<HTMLAnchorElement>(
    { background: 'var(--brand-hover, #8A9ABC)' },
    { background: 'var(--brand, #9EACCA)' },
  );
  const outlineHover = useHoverStyle<HTMLAnchorElement>(
    { background: 'var(--surface, #FFFFFF)', borderColor: 'var(--brand, #9EACCA)', color: 'var(--brand, #9EACCA)' },
    { background: 'transparent', borderColor: 'var(--border-strong, #D1CFC9)', color: 'var(--text, #1D1D1B)' },
  );

  return (
    <motion.div 
      className="home-page" 
      style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', fontFamily: 'var(--font-body, "Inter", sans-serif)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Soft Animated Background Blobs */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <motion.div
          animate={{ x: [0, 50, -30, 0], y: [0, -50, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '-10%', left: '-5%', width: '50vw', height: '50vw', background: 'var(--brand, #9EACCA)', filter: 'blur(120px)', opacity: 0.15, borderRadius: '50%' }}
        />
        <motion.div
          animate={{ x: [0, -40, 30, 0], y: [0, 60, -20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ position: 'absolute', top: '20%', right: '-10%', width: '40vw', height: '40vw', background: '#E2A899', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}
        />
        <motion.div
          animate={{ x: [0, 30, -40, 0], y: [0, -30, 50, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          style={{ position: 'absolute', bottom: '-10%', left: '20%', width: '45vw', height: '45vw', background: 'var(--brand-hover, #8A9ABC)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}
        />
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '64px 24px', position: 'relative', zIndex: 1 }}>
      {/* Hero Section */}
      <motion.section 
        style={{ marginBottom: '100px', marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
        variants={fadeUpContainer}
        initial="hidden"
        animate="show"
        aria-label="Welcome Section"
      >
        <motion.div variants={fadeUpItem} style={{ marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', backdropFilter: 'blur(10px)' }}>
          <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand, #9EACCA)' }}></span>
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>A safe space for your mind</span>
        </motion.div>

        <motion.h1 style={{ 
          fontSize: 'clamp(44px, 7vw, 72px)', 
          fontWeight: '400', 
          lineHeight: '1.05', 
          marginBottom: '24px',
          fontFamily: "'Charter', 'Georgia', serif",
          color: 'var(--text, #1D1D1B)',
          letterSpacing: '-0.02em',
          maxWidth: '900px'
        }} variants={fadeUpItem}>
          Understand Emotions, <br/><span style={{ fontStyle: 'italic', color: 'var(--brand-hover, #8A9ABC)' }}>Transform Lives.</span>
        </motion.h1>

        <motion.p style={{ 
          fontSize: '22px', 
          color: 'var(--text-secondary, #4A4640)', 
          maxWidth: '680px', 
          marginBottom: '48px',
          lineHeight: '1.6',
          fontWeight: '300'
        }} variants={fadeUpItem}>
          TheraVox AI uses compassionate and advanced multimodal analysis to help you understand yourself better. Discover patterns in your mental well-being in real-time.
        </motion.p>

        <motion.div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }} variants={fadeUpItem}>
          {!isAuthenticated && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/register" style={{ 
                padding: '16px 36px', 
                background: 'var(--brand, #9EACCA)', 
                color: '#FFFFFF', 
                borderRadius: '30px', 
                textDecoration: 'none', 
                fontWeight: '500', 
                fontSize: '16px', 
                display: 'inline-block',
                transition: 'background 0.2s ease',
                border: 'none',
                boxShadow: '0 8px 16px rgba(158, 172, 202, 0.3)',
                cursor: 'pointer'
              }}
              {...brandHover}
              aria-label="Get Started with TheraVox">
                Start Your Journey
              </Link>
            </motion.div>
          )}
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        style={{ marginBottom: '100px' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpContainer}
        aria-labelledby="features-heading"
      >
        <motion.h2 id="features-heading" style={{ fontSize: '36px', fontWeight: '400', marginBottom: '16px', fontFamily: "'Charter', 'Georgia', serif", letterSpacing: '-0.01em', color: 'var(--text, #1D1D1B)' }} variants={fadeUpItem}>
          Three Powerful Dimensions
        </motion.h2>
        <motion.p style={{ fontSize: '20px', color: 'var(--text-secondary, #4A4640)', marginBottom: '48px', maxWidth: '600px' }} variants={fadeUpItem}>
          Interact with our cutting-edge modalities. Accurate, secure, and fast.
        </motion.p>

        <motion.div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '32px' 
        }} variants={fadeUpItem}>
          
          {/* Vision Card */}
          <TiltCard style={{ padding: '40px' }}>
            <div className="dimension-card-content" style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center' }}>
              <div style={{
                fontSize: '48px',
                width: '100px',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-secondary, #FAF8F5)',
                borderRadius: '24px',
                border: '1px solid var(--border-subtle, #EAE6DF)',
                color: 'var(--brand, #9EACCA)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.02)',
                flexShrink: 0
              }} aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h3 id="card-title-vision" style={{ fontSize: '26px', fontWeight: '600', marginBottom: '16px', color: 'var(--text)' }}>Vision Analysis</h3>
                <p style={{ color: 'var(--text-tertiary, #6E6E6A)', fontSize: '18px', lineHeight: '1.6', margin: 0 }}>
                  Real-time emotion detection from facial expressions using live webcam processing.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0, padding: '16px 24px', background: 'var(--surface-secondary, #FAF8F5)', borderRadius: '16px', border: '1px solid var(--border-subtle, #EAE6DF)' }}>
                {['Live detection', 'Micro-expressions', 'Confidence metrics'].map(feature => (
                  <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--brand, #9EACCA)' }} aria-hidden="true">✓</span> <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </TiltCard>

          {/* Text Card */}
          <TiltCard style={{ padding: '40px' }}>
            <div className="dimension-card-content" style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center' }}>
              <div style={{
                fontSize: '48px',
                width: '100px',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-secondary, #FAF8F5)',
                borderRadius: '24px',
                border: '1px solid var(--border-subtle, #EAE6DF)',
                color: 'var(--brand, #9EACCA)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.02)',
                flexShrink: 0
              }} aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h3 id="card-title-text" style={{ fontSize: '26px', fontWeight: '600', marginBottom: '16px', color: 'var(--text)' }}>Text Analysis</h3>
                <p style={{ color: 'var(--text-tertiary, #6E6E6A)', fontSize: '18px', lineHeight: '1.6', margin: 0 }}>
                  Advanced NLP sentiment analysis extracting nuanced emotions from written text.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0, padding: '16px 24px', background: 'var(--surface-secondary, #FAF8F5)', borderRadius: '16px', border: '1px solid var(--border-subtle, #EAE6DF)' }}>
                {['Context awareness', 'Subtext parsing', 'Tone mapping'].map(feature => (
                  <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--brand, #9EACCA)' }} aria-hidden="true">✓</span> <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </TiltCard>

          {/* Audio Card */}
          <TiltCard style={{ padding: '40px' }}>
            <div className="dimension-card-content" style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center' }}>
              <div style={{
                fontSize: '48px',
                width: '100px',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-secondary, #FAF8F5)',
                borderRadius: '24px',
                border: '1px solid var(--border-subtle, #EAE6DF)',
                color: 'var(--brand, #9EACCA)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.02)',
                flexShrink: 0
              }} aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h3 id="card-title-audio" style={{ fontSize: '26px', fontWeight: '600', marginBottom: '16px', color: 'var(--text)' }}>Audio Analysis</h3>
                <p style={{ color: 'var(--text-tertiary, #6E6E6A)', fontSize: '18px', lineHeight: '1.6', margin: 0 }}>
                  Deep voice emotion recognition analyzing speech patterns, prosody, and tone.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0, padding: '16px 24px', background: 'var(--surface-secondary, #FAF8F5)', borderRadius: '16px', border: '1px solid var(--border-subtle, #EAE6DF)' }}>
                {['Vocal prosody', 'Stress indicators', 'Real-time processing'].map(feature => (
                  <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--brand, #9EACCA)' }} aria-hidden="true">✓</span> <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </TiltCard>
        </motion.div>
      </motion.section>

      {/* Why Choose Section */}
      <motion.section 
        style={{ marginBottom: '100px' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpContainer}
        aria-labelledby="why-choose-heading"
      >
        <motion.h2 id="why-choose-heading" style={{ fontSize: '36px', fontWeight: '400', marginBottom: '40px', fontFamily: "'Charter', 'Georgia', serif", letterSpacing: '-0.01em', color: 'var(--text, #1D1D1B)' }} variants={fadeUpItem}>
          Why Choose TheraVox?
        </motion.h2>
        <motion.div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          gap: '24px',
          overflowX: 'auto',
          paddingBottom: '24px',
          paddingTop: '8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }} variants={fadeUpContainer}>
          <style dangerouslySetInnerHTML={{__html: `
            .train-scroll::-webkit-scrollbar { display: none; }
          `}} />
          {[
            { 
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, 
              title: 'Accurate Detection', 
              desc: 'Industry-leading AI models.' 
            },
            { 
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, 
              title: 'Privacy First', 
              desc: 'Your data stays completely secure.' 
            },
            { 
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>, 
              title: 'Deep Analytics', 
              desc: 'Track trends in well-being.' 
            },
            { 
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5-4 5-4"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 4-5 4-5"/></svg>, 
              title: 'Fast & Efficient', 
              desc: 'Real-time analysis.' 
            },
          ].map((item, idx) => (
            <motion.div key={idx} variants={fadeUpItem} whileHover={{ y: -8, scale: 1.02, backgroundColor: 'var(--surface-secondary, #FAF8F5)', transition: { type: 'spring', stiffness: 400, damping: 25 } }} style={{
              padding: '32px 24px',
              background: 'var(--surface, #FFFFFF)',
              borderRadius: '24px',
              border: '1px solid var(--border, #EAE6DF)',
              boxShadow: '0 4px 12px rgba(29, 27, 24, 0.03)',
              cursor: 'default',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '20px',
              minWidth: '260px',
              flex: '1 0 0'
            }} className="train-scroll">
              <motion.div 
                style={{ fontSize: '28px', color: 'var(--brand, #9EACCA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '56px', height: '56px', background: 'var(--surface, #FFFFFF)', borderRadius: '16px', border: '1px solid var(--border-subtle, #EAE6DF)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1, transition: { duration: 0.5 } }}
                aria-hidden="true"
              >
                {item.icon}
              </motion.div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h4 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>{item.title}</h4>
                <p style={{ color: 'var(--text-secondary, #4A4640)', fontSize: '16px', margin: 0, lineHeight: '1.6' }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        style={{ 
          padding: '100px 48px', 
          background: 'rgba(255, 255, 255, 0.5)', 
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '32px',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(29, 27, 24, 0.05)'
        }}
        whileHover={{
          boxShadow: '0 32px 64px rgba(29, 27, 24, 0.08)'
        }}
        transition={{ duration: 0.4 }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpContainer}
        aria-labelledby="cta-heading"
      >
        {/* Animated Background Orbs */}
        <motion.div 
          style={{
            position: 'absolute',
            top: '-30%',
            left: '-10%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, #E2A899 0%, transparent 65%)',
            opacity: 0.15,
            zIndex: 0,
            pointerEvents: 'none',
            borderRadius: '50%'
          }} 
          animate={{ x: [0, 30, 0], y: [0, 40, 0], scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          aria-hidden="true" 
        />
        <motion.div 
          style={{
            position: 'absolute',
            bottom: '-40%',
            right: '-10%',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, var(--brand, #9EACCA) 0%, transparent 65%)',
            opacity: 0.15,
            zIndex: 0,
            pointerEvents: 'none',
            borderRadius: '50%'
          }} 
          animate={{ x: [0, -30, 0], y: [0, -40, 0], scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ repeat: Infinity, duration: 15, ease: "easeInOut", delay: 1 }}
          aria-hidden="true" 
        />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <motion.h2 id="cta-heading" style={{ fontSize: '48px', fontWeight: '400', marginBottom: '24px', fontFamily: "'Charter', 'Georgia', serif", letterSpacing: '-0.01em', color: 'var(--text, #1D1D1B)' }} variants={fadeUpItem}>
            Embark on Your Wellness Journey
          </motion.h2>
          <motion.p style={{ fontSize: '22px', color: 'var(--text-secondary, #4A4640)', marginBottom: '48px', maxWidth: '650px', margin: '0 auto 48px', lineHeight: '1.6', fontWeight: '300' }} variants={fadeUpItem}>
            Join thousands using TheraVox AI to decode their emotions and unlock better mental clarity.
          </motion.p>
          {!isAuthenticated && (
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.div variants={fadeUpItem} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/register" style={{ 
                  padding: '18px 42px', 
                  background: 'var(--brand, #9EACCA)', 
                  color: '#FFFFFF', 
                  borderRadius: '30px', 
                  textDecoration: 'none', 
                  fontWeight: '500', 
                  fontSize: '18px', 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.2s ease',
                  boxShadow: '0 12px 24px rgba(158, 172, 202, 0.4)',
                }}
                {...brandHover}
                aria-label="Create an Account with TheraVox">
                  Create Account
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </motion.div>
              <motion.div variants={fadeUpItem} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/text" style={{ 
                  padding: '18px 42px', 
                  background: 'rgba(255, 255, 255, 0.8)', 
                  color: 'var(--text, #1D1D1B)', 
                  border: '1px solid var(--border-strong, #D1CFC9)',
                  borderRadius: '30px', 
                  textDecoration: 'none', 
                  fontWeight: '500', 
                  fontSize: '18px', 
                  display: 'inline-block',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)'
                }}
                {...outlineHover}
                aria-label="Try Text Analysis Modality">
                  Get Started
                </Link>
              </motion.div>
            </div>
          )}
          {isAuthenticated && (
            <motion.div variants={fadeUpItem} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/text" style={{ 
                padding: '18px 42px', 
                background: 'var(--brand, #9EACCA)', 
                color: '#FFFFFF', 
                borderRadius: '30px', 
                textDecoration: 'none', 
                fontWeight: '500', 
                fontSize: '18px', 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s ease',
                boxShadow: '0 12px 24px rgba(158, 172, 202, 0.4)',
              }}
              {...brandHover}
              aria-label="Try Text Analysis Modality">
                Get Started
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </motion.div>
          )}
        </div>
      </motion.section>

      </div>
    </motion.div>
  );
}
