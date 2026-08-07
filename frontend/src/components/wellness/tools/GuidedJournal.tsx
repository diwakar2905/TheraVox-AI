import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getJournalPrompt, submitJournalEntry, type JournalInsights } from '../../../lib/api';
import type { WellnessAction } from '../../../hooks/useWellnessStore';
import type { MoodLog } from '../../../lib/wellnessStorage';
import { useAuth } from '../../../contexts/AuthContext';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Phase = 'idle' | 'loading-prompt' | 'writing' | 'analyzing' | 'insights';

const EMOTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  happy:   { bg: '#FFF9E6', border: '#F0C040', text: '#A07800' },
  joy:     { bg: '#FFF9E6', border: '#F0C040', text: '#A07800' },
  sad:     { bg: '#EFF4FF', border: '#6B9BD2', text: '#2E5F94' },
  angry:   { bg: '#FFF0EE', border: '#E07060', text: '#B03020' },
  fear:    { bg: '#F5F0FF', border: '#9B7FD4', text: '#5B3FAF' },
  fearful: { bg: '#F5F0FF', border: '#9B7FD4', text: '#5B3FAF' },
  disgust: { bg: '#F0FFF4', border: '#5A9E6E', text: '#2D6B3E' },
  surprise:{ bg: '#FFF4F9', border: '#D47FAE', text: '#9B3E70' },
  neutral: { bg: 'var(--surface-secondary)', border: 'var(--border)', text: 'var(--text)' },
  calm:    { bg: 'var(--surface-secondary)', border: 'var(--border)', text: 'var(--text)' },
};

function getEmotionColor(emotion: string) {
  return EMOTION_COLORS[emotion.toLowerCase()] ?? EMOTION_COLORS.neutral;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Spinner({ size = 24, color = '#d97757' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EmotionChip({ emotion, emoji, confidence }: { emotion: string; emoji: string; confidence: number }) {
  const colors = getEmotionColor(emotion);
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '999px',
        backgroundColor: colors.bg,
        border: `1.5px solid ${colors.border}`,
        color: colors.text,
        fontWeight: '600',
        fontSize: '15px',
      }}
    >
      <span style={{ fontSize: '20px' }}>{emoji}</span>
      <span style={{ textTransform: 'capitalize' }}>{emotion}</span>
      <span style={{ opacity: 0.65, fontSize: '13px', fontWeight: '500' }}>
        {Math.round(confidence * 100)}%
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------

function ConfidenceBar({ value, emotion }: { value: number; emotion: string }) {
  const colors = getEmotionColor(emotion);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '12px', color: 'var(--muted)', width: '80px' }}>Confidence</span>
      <div
        style={{
          flex: 1,
          height: '6px',
          borderRadius: '999px',
          backgroundColor: 'var(--border)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: '999px', backgroundColor: colors.border }}
        />
      </div>
      <span style={{ fontSize: '12px', color: 'var(--muted)', width: '36px', textAlign: 'right' }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface GuidedJournalProps {
  dispatch: React.Dispatch<WellnessAction>;
  moodLogs: MoodLog[];
}

export default function GuidedJournal({ dispatch, moodLogs }: GuidedJournalProps) {
  const { isAuthenticated } = useAuth();

  const [phase, setPhase] = useState<Phase>('idle');
  const [prompt, setPrompt] = useState('');
  const [entryText, setEntryText] = useState('');
  const [insights, setInsights] = useState<JournalInsights | null>(null);
  const [error, setError] = useState('');

  // Derive recent mood context from the wellness store
  const recentMood = moodLogs[0]?.mood;
  const moodHistory = moodLogs.slice(0, 7).map((m) => m.mood);

  // Auto-fetch prompt once when the component mounts (if authenticated)
  useEffect(() => {
    if (isAuthenticated && phase === 'idle') {
      fetchPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  async function fetchPrompt() {
    setError('');
    setPhase('loading-prompt');
    setEntryText('');
    setInsights(null);
    try {
      const data = await getJournalPrompt(recentMood, moodHistory);
      setPrompt(data.prompt);
      setPhase('writing');
    } catch (err) {
      setError((err as Error).message || 'Could not load a prompt. Please try again.');
      setPhase('idle');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entryText.trim()) return;

    setError('');
    setPhase('analyzing');

    try {
      const result = await submitJournalEntry(entryText.trim(), prompt);
      setInsights(result);
      setPhase('insights');

      // Save to local wellness store
      dispatch({
        type: 'ADD_JOURNAL_ENTRY',
        payload: {
          type: 'reflection',
          title: prompt ? prompt.slice(0, 60) + (prompt.length > 60 ? '…' : '') : 'Guided Journal',
          content: entryText.trim(),
          tags: [result.emotion],
        },
      });
      dispatch({ type: 'ADD_ACTIVITY', payload: { type: 'journal', description: 'Completed guided journal entry' } });
    } catch (err) {
      setError((err as Error).message || 'Analysis failed. Please try again.');
      setPhase('writing');
    }
  }

  function handleWriteAnother() {
    setEntryText('');
    setInsights(null);
    fetchPrompt();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!isAuthenticated) {
    return (
      <motion.div
        className="card"
        style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 24px' }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>✍️</div>
        <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>Guided Journaling</h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 16px' }}>
          Sign in to get AI-generated prompts and emotion insights from your journal entries.
        </p>
        <a href="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Sign In
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="card"
      style={{ gridColumn: '1 / -1' }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>
            ✍️ Guided Journal
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
            AI-tailored prompts · emotion analysis · personal reflections
          </p>
        </div>
        {(phase === 'writing' || phase === 'insights') && (
          <button
            onClick={fetchPrompt}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--surface-secondary)',
              cursor: 'pointer',
              color: 'var(--muted)',
            }}
          >
            New Prompt ↺
          </button>
        )}
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#FFF0EE',
              border: '1px solid #E07060',
              color: '#B03020',
              fontSize: '14px',
            }}
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase: idle — show a "Get Prompt" button (fallback if auto-fetch fails) */}
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '32px 0' }}
          >
            <p style={{ color: 'var(--muted)', marginBottom: '20px', fontSize: '15px' }}>
              Ready to reflect? Let the AI suggest a journaling prompt based on your recent mood.
            </p>
            <button className="btn btn-primary" onClick={fetchPrompt}>
              Get My Prompt
            </button>
          </motion.div>
        )}

        {/* Phase: loading-prompt */}
        {phase === 'loading-prompt' && (
          <motion.div
            key="loading-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0' }}
          >
            <Spinner size={32} />
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Crafting your personal prompt…</p>
          </motion.div>
        )}

        {/* Phase: writing */}
        {phase === 'writing' && (
          <motion.form
            key="writing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Prompt card */}
            <div
              style={{
                padding: '20px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FDF4F1, var(--surface))',
                border: '1.5px solid #e8c5b5',
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '20px',
                  background: '#d97757',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                }}
              >
                Today's Prompt
              </span>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: '16px',
                  lineHeight: '1.65',
                  color: 'var(--text)',
                  fontStyle: 'italic',
                }}
              >
                "{prompt}"
              </p>
            </div>

            {/* Textarea */}
            <div style={{ position: 'relative' }}>
              <textarea
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="Start writing here… there's no right or wrong way to journal."
                rows={8}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border)',
                  backgroundColor: 'var(--surface-secondary)',
                  fontSize: '15px',
                  lineHeight: '1.7',
                  resize: 'vertical',
                  outline: 'none',
                  color: 'var(--text)',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#d97757')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '14px',
                  fontSize: '11px',
                  color: 'var(--muted)',
                  pointerEvents: 'none',
                }}
              >
                {entryText.length} / 4000
              </span>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!entryText.trim() || entryText.length > 4000}
                style={{ padding: '10px 28px', fontSize: '15px' }}
              >
                Analyze My Entry →
              </button>
            </div>
          </motion.form>
        )}

        {/* Phase: analyzing */}
        {phase === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0' }}
          >
            <Spinner size={36} />
            <p style={{ color: 'var(--muted)', fontSize: '15px', fontWeight: '500' }}>
              Analyzing your words…
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
              Running emotion analysis and crafting your reflection
            </p>
          </motion.div>
        )}

        {/* Phase: insights */}
        {phase === 'insights' && insights && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Prompt recap */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '14px',
                color: 'var(--muted)',
                fontStyle: 'italic',
              }}
            >
              Prompt: "{prompt}"
            </div>

            {/* Emotion section */}
            <div
              style={{
                padding: '20px 24px',
                borderRadius: '12px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Emotion Detected
                </span>
                <EmotionChip
                  emotion={insights.emotion}
                  emoji={insights.emoji}
                  confidence={insights.confidence}
                />
              </div>
              <ConfidenceBar value={insights.confidence} emotion={insights.emotion} />
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>{insights.description}</p>
            </div>

            {/* AI Reflection */}
            <div
              style={{
                padding: '24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FDF4F1, var(--surface))',
                border: '1.5px solid #e8c5b5',
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '20px',
                  background: '#d97757',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                }}
              >
                ✨ AI Reflection
              </span>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: '15px',
                  lineHeight: '1.75',
                  color: 'var(--text)',
                }}
              >
                {insights.reflection}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleWriteAnother}
                style={{ flex: 1, minWidth: '180px' }}
              >
                ✍️ Write Another Entry
              </button>
              <button
                className="btn"
                onClick={() => { setPhase('writing'); setEntryText(''); setInsights(null); }}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  background: 'var(--surface-secondary)',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontSize: '14px',
                }}
              >
                Edit Entry
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
              ✅ Entry saved to your journal
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
