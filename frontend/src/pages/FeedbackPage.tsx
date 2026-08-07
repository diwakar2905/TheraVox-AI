import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitFeedback, type FeedbackCategory } from '../lib/feedbackApi';
import HeroSection from '../components/shared/HeroSection';

type FormMode = 'feedback' | 'contact';

const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string; icon: string; desc: string }[] = [
  { value: 'bug',        label: 'Bug Report',  icon: '🐛', desc: 'Something is broken or not working' },
  { value: 'suggestion', label: 'Suggestion',  icon: '💡', desc: "Idea or feature you'd like to see" },
  { value: 'general',    label: 'General',     icon: '💬', desc: 'Other thoughts or comments' },
  { value: 'compliment', label: 'Compliment',  icon: '🌟', desc: 'Tell us what you love!' },
];

const CONTACT_CATEGORIES: { value: FeedbackCategory; label: string; icon: string; desc: string }[] = [
  { value: 'general',    label: 'General Inquiry', icon: '📬', desc: 'Questions about TheraVox AI' },
  { value: 'suggestion', label: 'Partnership',     icon: '🤝', desc: 'Collaboration or business inquiry' },
  { value: 'bug',        label: 'Technical Help',  icon: '🔧', desc: 'Need help with the platform' },
  { value: 'compliment', label: 'Press / Media',   icon: '📰', desc: 'Press kit or media requests' },
];

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

const CONTACT_INFO = [
  { icon: '📧', label: 'Email us',      value: 'support.theravox.in' },
  { icon: '⚡', label: 'Response time', value: 'Usually within 72 hours' },
  { icon: '🇮🇳', label: 'Based ',      value: 'India team' },
];

export default function FeedbackPage() {
  const [mode, setMode] = useState<FormMode>('feedback');
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const isContact = mode === 'contact';
  const categories = isContact ? CONTACT_CATEGORIES : FEEDBACK_CATEGORIES;
  const isValid =
    subject.trim().length >= 3 &&
    message.trim().length >= 10 &&
    (!isContact || (name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())));

  const handleModeChange = (m: FormMode) => {
    setMode(m);
    setCategory('general');
    setError('');
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const messageBody = isContact
        ? `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}`
        : message.trim();
      await submitFeedback({ category, subject: subject.trim(), message: messageBody, rating });
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setCategory('general');
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setRating(null);
    setError('');
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
  };

  return (
    <>
      <HeroSection
        title={isContact ? 'Get in Touch' : 'Share Your Feedback'}
        subtitle={
          isContact
            ? "Have a question or inquiry? We'd love to hear from you."
            : 'Help us improve TheraVox AI — every message is read by the team'
        }
      />

      <motion.div
        className="feedback-wrapper"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* ── Tab bar ── */}
        <div className="feedback-tabs" role="tablist">
          <button
            role="tab"
            type="button"
            aria-selected={mode === 'feedback'}
            className={`feedback-tab ${mode === 'feedback' ? 'active' : ''}`}
            onClick={() => handleModeChange('feedback')}
          >
            <span className="feedback-tab__icon">📝</span>
            Share Feedback
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={mode === 'contact'}
            className={`feedback-tab ${mode === 'contact' ? 'active' : ''}`}
            onClick={() => handleModeChange('contact')}
          >
            <span className="feedback-tab__icon">✉️</span>
            Get in Touch
          </button>
        </div>

        {/* ── Form card ── */}
        <div className="feedback-form-panel">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                className="feedback-success"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ border: 'none', background: 'transparent', padding: '48px 0' }}
              >
                <div className="feedback-success__icon">🎉</div>
                <h2 className="feedback-success__title">Thank you!</h2>
                <p className="feedback-success__text">
                  {isContact
                    ? "We've received your message and will get back to you within 48 hours."
                    : "Your feedback has been submitted. We genuinely appreciate you taking the time — it helps us make TheraVox better for everyone."}
                </p>
                <button
                  className="feedback-submit-btn"
                  onClick={handleReset}
                  style={{ maxWidth: '260px', margin: '0 auto' }}
                >
                  {isContact ? 'Send another message' : 'Submit more feedback'}
                </button>
              </motion.div>
            ) : (
              <motion.form
                key={mode}
                onSubmit={handleSubmit}
                noValidate
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Contact-only: name + email row */}
                {isContact && (
                  <div className="feedback-contact-row" style={{ marginBottom: '28px' }}>
                    <div>
                      <label className="feedback-label" htmlFor="fb-name">Your name</label>
                      <input
                        id="fb-name"
                        className="feedback-input"
                        type="text"
                        placeholder="Jane Smith"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={120}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="feedback-label" htmlFor="fb-email">Your email</label>
                      <input
                        id="fb-email"
                        className="feedback-input"
                        type="email"
                        placeholder="jane@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        maxLength={254}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>
                )}

                {/* Category cards */}
                <motion.div variants={itemVariants} initial="hidden" animate="visible">
                  <p className="feedback-label">
                    {isContact ? 'What is this about?' : 'What kind of feedback is this?'}
                  </p>
                  <div className="feedback-categories">
                    {categories.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={`feedback-cat-btn ${category === c.value ? 'active' : ''}`}
                        onClick={() => setCategory(c.value)}
                      >
                        <span className="feedback-cat-btn__icon">{c.icon}</span>
                        <span className="feedback-cat-btn__label">{c.label}</span>
                        <span className="feedback-cat-btn__desc">{c.desc}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Star rating — feedback mode only */}
                {!isContact && (
                  <motion.div variants={itemVariants} initial="hidden" animate="visible" style={{ marginTop: '28px' }}>
                    <p className="feedback-label">
                      Overall experience{' '}
                      <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span>
                    </p>
                    <div className="feedback-stars">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = (hoverRating ?? rating ?? 0) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            className={`feedback-star ${active ? 'active' : ''}`}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            onClick={() => setRating(rating === star ? null : star)}
                            aria-label={`Rate ${star} — ${STAR_LABELS[star]}`}
                          >
                            ★
                          </button>
                        );
                      })}
                      {(hoverRating ?? rating) && (
                        <span className="feedback-star-label">
                          {STAR_LABELS[hoverRating ?? rating ?? 0]}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Subject */}
                <motion.div variants={itemVariants} initial="hidden" animate="visible" style={{ marginTop: '28px' }}>
                  <label className="feedback-label" htmlFor="fb-subject">Subject</label>
                  <input
                    id="fb-subject"
                    className="feedback-input"
                    type="text"
                    placeholder={
                      isContact
                        ? 'e.g. "Partnership opportunity" or "Question about pricing"'
                        : "Brief summary (e.g. 'Vision camera freezes on Firefox')"
                    }
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    required
                    disabled={submitting}
                  />
                  <p className="feedback-char-count">{subject.length} / 200</p>
                </motion.div>

                {/* Message */}
                <motion.div variants={itemVariants} initial="hidden" animate="visible" style={{ marginTop: '20px' }}>
                  <label className="feedback-label" htmlFor="fb-message">Message</label>
                  <textarea
                    id="fb-message"
                    className="feedback-textarea"
                    placeholder={
                      isContact
                        ? 'Tell us more about your inquiry…'
                        : 'Describe in detail — include steps to reproduce a bug, or any other context that helps us understand…'
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    maxLength={4000}
                    required
                    disabled={submitting}
                  />
                  <p className="feedback-char-count">{message.length} / 4000</p>
                </motion.div>

                {/* Error */}
                {error && (
                  <motion.div
                    className="feedback-error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    {error}
                  </motion.div>
                )}

                {/* Submit */}
                <motion.div variants={itemVariants} initial="hidden" animate="visible" style={{ marginTop: '28px' }}>
                  <button
                    type="submit"
                    className="feedback-submit-btn"
                    disabled={submitting || !isValid}
                  >
                    {submitting ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <span className="auth-spinner" />
                        Sending…
                      </span>
                    ) : isContact ? (
                      'Send Message'
                    ) : (
                      'Send Feedback'
                    )}
                  </button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* ── Contact info strip ── */}
        <div className="feedback-contact-strip">
          {CONTACT_INFO.map((item) => (
            <div key={item.label} className="feedback-contact-strip__item">
              <span className="feedback-contact-strip__icon">{item.icon}</span>
              <div>
                <div className="feedback-contact-strip__label">{item.label}</div>
                <div className="feedback-contact-strip__value">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
