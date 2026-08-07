import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { IconAlert, IconEmail, IconEye, IconEyeOff, IconGitHub, IconGoogle, IconLock } from '../components/shared/Icons';
import '../styles/auth.css';
import { DottedSurface } from '../components/shared/DottedSurface';

// --- Animation Variants ---
const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: { 
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, y: 0, 
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } 
  }
};

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location.state]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message ?? 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page auth-page--split">
      <div className="auth-bg">
        <div className="auth-orb auth-orb--1" />
        <div className="auth-orb auth-orb--2" />
        <div className="auth-orb auth-orb--3" />
      </div>
      <DottedSurface />

      <div className="auth-split-wrapper">
        <motion.div 
          className="auth-info-panel"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Link to="/" className="auth-brand auth-brand--large" style={{ textDecoration: 'none' }}>
              <motion.div 
                className="auth-brand__icon-wrap"
                whileHover={{ rotate: [0, -10, 10, -5, 5, 0], scale: 1.05 }}
                transition={{ duration: 0.5 }}
              >
                <img src="/logo.png" alt="TheraVox logo" className="auth-brand__logo" />
              </motion.div>
              <span className="auth-brand__text">TheraVox AI</span>
            </Link>
          </motion.div>
          
          <div className="auth-info-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', flex: 1, paddingBottom: '2rem' }}>
            <motion.div 
              variants={itemVariants} 
              style={{
                background: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                padding: '2.5rem',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <span style={{ position: 'absolute', top: '10px', left: '20px', fontSize: '100px', color: 'rgba(0,0,0,0.03)', fontFamily: 'serif', lineHeight: 1, userSelect: 'none' }}>"</span>
              <motion.h3 
                variants={itemVariants}
                style={{ fontSize: '1.6rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.5, marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}
              >
                Emotional wellness is not the absence of stress, but the ability to manage it with grace and discover strength within.
              </motion.h3>
              <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '30px', height: '2px', background: 'var(--brand)', borderRadius: '2px' }}></div>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Daily Reflection</span>
              </motion.div>
            </motion.div>

            <motion.div variants={staggerContainer} style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -5, background: 'rgba(255,255,255,0.8)', borderColor: 'var(--brand)' }}
                style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'default', transition: 'all 0.3s ease' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--brand-light)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', paddingBottom: '2px' }}>
                  🌿
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>Pause & Breathe</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: 1.4 }}>Take a moment for yourself before checking in.</span>
              </motion.div>
              
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -5, background: 'rgba(255,255,255,0.8)', borderColor: 'var(--brand)' }}
                style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'default', transition: 'all 0.3s ease' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--brand-light)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', paddingBottom: '2px' }}>
                  📝
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>Reflect Freely</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: 1.4 }}>Express your feelings without any judgment.</span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        <div className="auth-form-panel">
          <motion.div
            className="auth-card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="auth-card-accent" />

            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              <motion.div variants={itemVariants} className="auth-card-brand">
                <Link to="/" className="auth-brand">
                  <div className="auth-brand__icon-wrap">
                    <img src="/logo.png" alt="TheraVox logo" className="auth-brand__logo" />
                  </div>
                  <span className="auth-brand__text">TheraVox AI</span>
                </Link>
              </motion.div>

              <motion.h1 variants={itemVariants} className="auth-heading">
                Welcome back
              </motion.h1>
              <motion.p variants={itemVariants} className="auth-subtitle">
                Enter your details to access your account
              </motion.p>

              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      key="login-error"
                      className="auth-error"
                      role="alert"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <IconAlert />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={itemVariants} className="auth-field">
                  <label htmlFor="login-email">Email Address</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><IconEmail /></span>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="auth-field">
                  <label htmlFor="login-password">Password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><IconLock /></span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={submitting}
                      className="auth-input--password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="auth-password-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="auth-actions">
                </motion.div>

                <motion.div variants={itemVariants}>
                  <button
                    type="submit"
                    className="auth-btn"
                    disabled={submitting || !email || !password}
                  >
                    {submitting ? (
                      <>
                        <div className="auth-spinner" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </motion.div>
              </form>

              <motion.div variants={itemVariants} className="auth-social">
                <div className="auth-social-title">Or continue with</div>
                <div className="auth-social-grid">
                  <button
                    type="button"
                    className="auth-social-btn"
                    onClick={() => { window.location.href = '/api/auth/google/authorize'; }}
                  >
                    <IconGoogle />
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    className="auth-social-btn"
                    onClick={() => { window.location.href = '/api/auth/github/authorize'; }}
                  >
                    <IconGitHub />
                    <span>GitHub</span>
                  </button>
                </div>
              </motion.div>

              <motion.p variants={itemVariants} className="auth-footer">
                Don't have an account?{' '}
                <Link to="/register" state={location.state}>Create an account</Link>
              </motion.p>

              <motion.p variants={itemVariants} className="auth-footer" style={{ marginTop: '8px' }}>
                <Link to="/services">View our Services</Link>
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
