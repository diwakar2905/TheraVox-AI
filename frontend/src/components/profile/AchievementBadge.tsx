import { motion } from 'framer-motion';
import type { Achievement } from '../../lib/achievements';

interface AchievementBadgeProps {
  achievement: Achievement;
  index: number;
}

export default function AchievementBadge({ achievement, index }: AchievementBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '16px 12px',
        borderRadius: 'var(--radius-lg)',
        border: achievement.unlocked
          ? '1px solid var(--brand-light)'
          : '1px dashed var(--border)',
        background: achievement.unlocked ? 'var(--surface)' : 'var(--bg-secondary)',
        filter: achievement.unlocked ? 'none' : 'grayscale(1)',
        opacity: achievement.unlocked ? 1 : 0.45,
        transition: 'var(--transition-smooth)',
        cursor: 'default',
        position: 'relative',
        textAlign: 'center',
      }}
      whileHover={achievement.unlocked ? { translateY: -2, boxShadow: 'var(--shadow-md)' } : undefined}
    >
      <span style={{ fontSize: '28px', lineHeight: 1 }}>{achievement.emoji}</span>
      <strong
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
        }}
      >
        {achievement.title}
      </strong>
      <p
        style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        {achievement.description}
      </p>
      {achievement.unlocked && (
        <span
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--accent-sage)',
            background: 'var(--accent-sage-light)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 6px',
          }}
        >
          ✓
        </span>
      )}
    </motion.div>
  );
}
