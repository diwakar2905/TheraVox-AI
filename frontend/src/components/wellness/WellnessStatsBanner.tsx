import { useMemo } from 'react';
import type { WellnessState } from '../../hooks/useWellnessStore';

interface WellnessStatsBannerProps {
  state: WellnessState;
}

export default function WellnessStatsBanner({ state }: WellnessStatsBannerProps) {
  const avgMood = useMemo(() => {
    if (state.moodLogs.length === 0) return 0;
    const moodValues: Record<string, number> = {
      happy: 5,
      calm: 4,
      neutral: 3,
      sad: 2,
      angry: 1,
      fear: 1,
      surprise: 3,
    };
    const sum = state.moodLogs
      .slice(0, 7)
      .reduce((acc, log) => acc + (moodValues[log.mood.toLowerCase()] || 3), 0);
    return (sum / Math.min(state.moodLogs.length, 7)).toFixed(1);
  }, [state.moodLogs]);

  const stats = [
    {
      label: 'Day Streak',
      value: state.streak.count,
      id: 'streakCount',
    },
    {
      label: 'Journal Entries',
      value: state.journalEntries.length,
      id: 'journalCount',
    },
    {
      label: 'Minutes Breathed',
      value: state.breathingMinutes,
      id: 'breathingMinutes',
    },
    {
      label: 'Avg Mood',
      value: avgMood,
      id: 'avgMoodDisplay',
    },
  ];

  const statIcons = {
    'streakCount': '🔥',
    'journalCount': '📝',
    'breathingMinutes': '🌬️',
    'avgMoodDisplay': '😊'
  } as const;

  return (
    <div className="wellness-stats-banner" style={{ marginBottom: '32px' }}>
      {stats.map((stat) => (
        <div
          key={stat.id}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '16px',
            padding: '20px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            textAlign: 'left',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#d97757';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(217, 119, 87, 0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            fontSize: '32px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #FDF4F1, #FAF8F5)',
            borderRadius: '14px',
            border: '2px solid rgba(217, 119, 87, 0.2)'
          }}>
            {statIcons[stat.id as keyof typeof statIcons]}
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '700', background: 'linear-gradient(135deg, #d97757, #c9a962)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: '1.2' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: '#8a857b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
