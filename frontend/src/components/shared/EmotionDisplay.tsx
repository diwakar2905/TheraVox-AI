import { useMemo } from 'react';
import { motion } from 'framer-motion';
import ConfidenceBar from './ConfidenceBar';

const EMOTION_EMOJIS: Record<string, string> = {
  angry:    '😡',
  disgust:  '🤢',
  fear:     '😨',
  happy:    '😄',
  sad:      '😢',
  surprise: '😮',
  neutral:  '😐',
};

const EMOTION_COLORS: Record<string, string> = {
  angry:    '#ef4444',
  disgust:  '#22c55e',
  fear:     '#a855f7',
  happy:    '#eab308',
  sad:      '#3b82f6',
  surprise: '#06b6d4',
  neutral:  '#6b7280',
};

interface EmotionDisplayProps {
  emotion: string;
  emoji: string;
  confidence: number;
  description: string;
  scores?: Record<string, number>;
}

export default function EmotionDisplay({
  emotion,
  emoji,
  confidence,
  description,
  scores,
}: EmotionDisplayProps) {
  const emotionClass = emotion.toLowerCase();

  // Sort scores descending — memoized so it only recomputes when scores change
  const sortedScores = useMemo(
    () => (scores ? Object.entries(scores).sort(([, a], [, b]) => b - a) : null),
    [scores],
  );

  return (
    <motion.div
      className="emotion-result"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className={`emotion-badge ${emotionClass}`}>
        <span className="emotion-badge__emoji">{emoji}</span>
        <span className="emotion-badge__label">{emotion}</span>
      </div>

      <ConfidenceBar confidence={confidence} />

      <p className="emotion-description">{description}</p>

      {sortedScores && sortedScores.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <p style={{
            margin: '0 0 10px',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--text)',
            letterSpacing: '0.02em',
          }}>
            All Emotion Scores
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sortedScores.map(([emo, score], index) => {
              const isTop = emo === emotion.toLowerCase();
              const pct   = Math.round(score * 100);
              const color = EMOTION_COLORS[emo] ?? '#6b7280';
              const emoEmoji = EMOTION_EMOJIS[emo] ?? '•';
              return (
                <motion.div
                  key={emo}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: isTop ? '6px 8px' : '4px 8px',
                    borderRadius: '8px',
                    backgroundColor: isTop ? `${color}12` : 'transparent',
                    border: isTop ? `1px solid ${color}30` : '1px solid transparent',
                  }}
                >
                  <span style={{ fontSize: '14px', width: '18px', textAlign: 'center' }}>{emoEmoji}</span>
                  <span style={{
                    width: '68px',
                    fontSize: '12px',
                    fontWeight: isTop ? '600' : '400',
                    color: isTop ? color : 'var(--muted)',
                    textTransform: 'capitalize',
                    flexShrink: 0,
                  }}>
                    {emo}
                  </span>
                  <div style={{
                    flex: 1,
                    height: '6px',
                    backgroundColor: 'var(--border)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: index * 0.05, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '3px',
                        opacity: isTop ? 1 : 0.55,
                      }}
                    />
                  </div>
                  <span style={{
                    width: '34px',
                    fontSize: '12px',
                    fontWeight: isTop ? '600' : '400',
                    color: isTop ? color : 'var(--muted)',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    {pct}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
