import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSessionSummary, getSessionSummary } from '../../lib/api';
import type { SessionSummary } from '../../lib/api';

// ---------------------------------------------------------------------------
// Mood arc badge config
// ---------------------------------------------------------------------------

const MOOD_ARC_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  improving: { emoji: '📈', color: '#16a34a', bg: '#dcfce7' },
  stable:    { emoji: '➡️', color: '#2563eb', bg: '#dbeafe' },
  declining: { emoji: '📉', color: '#dc2626', bg: '#fee2e2' },
  mixed:     { emoji: '🔀', color: '#d97706', bg: '#fef3c7' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SessionSummaryPanelProps {
  sessionId: string;
  messageCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionSummaryPanel({ sessionId, messageCount }: SessionSummaryPanelProps) {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const canGenerate = messageCount >= 2;

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // Try to get existing first
      const existing = await getSessionSummary(sessionId);
      if (existing) {
        if (isMountedRef.current) { setSummary(existing); setLoading(false); }
        return;
      }
    } catch {
      // No existing summary — generate one
    }
    try {
      const result = await generateSessionSummary(sessionId);
      if (isMountedRef.current) setSummary(result);
    } catch (err) {
      if (isMountedRef.current) setError((err as Error).message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const moodConfig = summary?.mood_arc
    ? MOOD_ARC_CONFIG[summary.mood_arc.toLowerCase()] ?? MOOD_ARC_CONFIG.mixed
    : null;

  // ── Not yet generated — show trigger button ──
  if (!summary && !loading && !error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 0',
        }}
      >
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          title={canGenerate ? 'Generate AI summary & action plan' : 'Need at least one exchange first'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '20px',
            border: '1.5px solid var(--border)',
            background: canGenerate
              ? 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))'
              : 'var(--bg-secondary)',
            color: canGenerate ? 'var(--brand-dark)' : 'var(--muted)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (canGenerate) {
              e.currentTarget.style.borderColor = 'var(--brand)';
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(139,92,246,0.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span style={{ fontSize: '16px' }}>✨</span>
          Generate Session Summary
        </button>
      </motion.div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.06))',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          margin: '12px 0',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{ fontSize: '24px' }}
        >
          ✨
        </motion.div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
          Generating summary & action plan…
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          Analyzing your conversation with AI
        </div>
      </motion.div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          fontSize: '13px',
          margin: '12px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span>⚠</span>
        <span style={{ flex: 1 }}>{error}</span>
        <button
          onClick={handleGenerate}
          style={{
            padding: '4px 12px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            background: 'white',
            color: '#dc2626',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </motion.div>
    );
  }

  // ── Summary rendered ──
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          margin: '12px 0',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.04), rgba(59,130,246,0.04))',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))',
            border: 'none',
            borderBottom: expanded ? '1px solid var(--border)' : 'none',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <span style={{ fontSize: '18px' }}>📋</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: '14px',
              color: 'var(--text)',
              letterSpacing: '-0.01em',
            }}
          >
            Session Summary & Action Plan
          </span>
          {moodConfig && (
            <span
              style={{
                marginLeft: '8px',
                padding: '2px 10px',
                borderRadius: '12px',
                background: moodConfig.bg,
                color: moodConfig.color,
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {moodConfig.emoji} {summary!.mood_arc}
            </span>
          )}
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '12px',
              color: 'var(--muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            ▼
          </span>
        </button>

        {/* Body */}
        <AnimatePresence>
          {expanded && summary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '18px' }}>
                {/* Summary */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={sectionLabelStyle}>Summary</div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      lineHeight: 1.7,
                      color: 'var(--text)',
                    }}
                  >
                    {summary.summary}
                  </p>
                </div>

                {/* Key Themes */}
                {summary.key_themes.length > 0 && (
                  <div style={{ marginBottom: '18px' }}>
                    <div style={sectionLabelStyle}>Key Themes</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {summary.key_themes.map((theme, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {summary.action_items.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={sectionLabelStyle}>Action Plan</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {summary.action_items.map((item, i) => (
                        <ActionItem key={i} index={i} text={item} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '14px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border)',
                    fontSize: '11px',
                    color: 'var(--muted)',
                  }}
                >
                  <span>Generated by {summary.model_used}</span>
                  <span>{new Date(summary.created_at).toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '8px',
};

const ACTION_COLORS = ['#8b5cf6', '#3b82f6', '#10b981'];

function ActionItem({ index, text }: { index: number; text: string }) {
  const color = ACTION_COLORS[index % ACTION_COLORS.length];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: color,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 800,
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        {index + 1}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'var(--text)',
        }}
      >
        {text}
      </p>
    </div>
  );
}
