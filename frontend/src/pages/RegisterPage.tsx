import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { IconAlert, IconCheck, IconEmail, IconEye, IconEyeOff, IconGitHub, IconGoogle, IconLock, IconUser, IconX } from '../components/shared/Icons';
import { getPasswordStrength } from '../utils/passwordUtils';
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
      staggerChildren: 0.07,
      delayChildren: 0.15
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

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [acceptTerms, setAcceptTerms]         = useState(false);
  const [error, setError]                     = useState('');
  const [submitting, setSubmitting]           = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location.state]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptTerms) {
      setError('You must accept the terms and conditions.');
      return;
    }

    setSubmitting(true);
    try {
      await register(fullName.trim(), email.trim(), password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message ?? 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = getPasswordStrength(password);
  const isFormValid = fullName.trim() && email && password.length >= 8 && confirmPassword && acceptTerms;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

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
          
          <div className="auth-info-content">
            <motion.h2 variants={itemVariants}>Your journey to emotional wellness starts here.</motion.h2>
            <motion.p variants={itemVariants}>TheraVox uses advanced AI to analyze sentiment, provide insights, and foster personal growth through reflective journaling and voice analysis.</motion.p>
            
            <motion.ul className="auth-features" variants={staggerContainer}>
              {[
                { icon: '✨', text: 'Advanced emotional insights' },
                { icon: '🎙️', text: 'Voice and text journal analysis' },
                { icon: '🔒', text: 'Secure and private entries' },
                { icon: '🌱', text: 'Personalized wellness journey' }
              ].map((feature, i) => (
                <motion.li 
                  key={i} 
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.05, 
                    x: 10, 
                    backgroundColor: 'rgba(255, 255, 255, 1)', 
                    boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
                    borderColor: 'var(--brand)'
                  }}
                  whileTap={{ scale: 0.98 }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="auth-feature-icon">{feature.icon}</span> 
                  {feature.text}
                </motion.li>
              ))}
            </motion.ul>

            {/* Testimonial */}
            <motion.div
              variants={itemVariants}
              style={{
                marginTop: '2rem',
                background: 'rgba(255, 255, 255, 0.35)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                padding: '1.25rem 1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.55)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ fontSize: '2.5rem', lineHeight: 1, color: '#9EACCA', marginBottom: '0.5rem', fontFamily: 'Georgia, serif', userSelect: 'none' }}>&ldquo;</div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--text)', fontStyle: 'italic' }}>
                TheraVox AI has transformed how I understand my clients&apos; emotional states. The multimodal analysis gives me insights that would take weeks to uncover in traditional sessions.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#9EACCA', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                  SM
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>Dr. Sarah Mitchell</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light, #6B6862)' }}>Licensed Mental Health Coach, Clarity Wellness Practice</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              style={{
                marginTop: '2rem',
                background: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                padding: '1.25rem 1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                textDecoration: 'none'
              }}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderColor: 'var(--brand)' }}
            >
              <Link to="/services" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textDecoration: 'none', color: 'inherit' }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem', fontWeight: 600 }}>Explore our Services</h4>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-light)', fontSize: '0.85rem' }}>Discover how TheraVox can help you</p>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand-light)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  →
                </div>
              </Link>
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
                Create account
              </motion.h1>
          <motion.p variants={itemVariants} className="auth-subtitle">
            Join TheraVox for your emotional wellness journey
          </motion.p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="reg-error"
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
              <label htmlFor="reg-fullname">Full Name</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><IconUser /></span>
                <input
                  id="reg-fullname"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="auth-field">
              <label htmlFor="reg-email">Email Address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><IconEmail /></span>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="auth-field">
              <label htmlFor="reg-password">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><IconLock /></span>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
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
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>

              <AnimatePresence>
                {password && (
                  <motion.div
                    className="auth-strength"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="auth-strength__bars">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className="auth-strength__bar"
                          style={{ 
                            background: i <= strength.score ? strength.color : undefined,
                            boxShadow: i <= strength.score ? `0 0 8px ${strength.color}40` : 'none'
                          }}
                        />
                      ))}
                    </div>
                    <span className="auth-strength__label" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemVariants} className="auth-field">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><IconLock /></span>
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  disabled={submitting}
                  className="auth-input--password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="auth-password-toggle"
                >
                  {showConfirm ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>

              <AnimatePresence>
                {(passwordsMatch || passwordsMismatch) && (
                  <motion.div
                    className={`auth-match-indicator ${passwordsMatch ? 'auth-match-indicator--ok' : 'auth-match-indicator--no'}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {passwordsMatch ? (
                      <><IconCheck /> Passwords match</>
                    ) : (
                      <><IconX /> Passwords don't match</>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemVariants} className="auth-actions">
              <label className="auth-remember">
                <input 
                  type="checkbox" 
                  checked={acceptTerms} 
                  onChange={e => setAcceptTerms(e.target.checked)}
                />
                <span>I accept the <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms</Link> & <a href="#" onClick={e => e.preventDefault()}>Privacy</a></span>
              </label>
            </motion.div>

            <motion.div variants={itemVariants}>
              <button
                type="submit"
                className="auth-btn"
                disabled={submitting || !isFormValid}
              >
                {submitting ? (
                  <>
                    <div className="auth-spinner" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </motion.div>
          </form>

          <motion.div variants={itemVariants} className="auth-social">
            <div className="auth-social-title">Or sign up with</div>
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
            Already have an account?{' '}
            <Link to="/login" state={location.state}>Sign in</Link>
          </motion.p>

        </motion.div>
      </motion.div>
        </div>
      </div>
    </div>
  );
}
