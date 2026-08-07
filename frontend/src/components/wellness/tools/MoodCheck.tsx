import { useState } from 'react';
import { motion } from 'framer-motion';
import type { WellnessAction } from '../../../hooks/useWellnessStore';

const MOODS = [
  { emoji: '😊', label: 'Happy', color: '#E6B84D', tips: 'Enjoy this wonderful moment!' },
  { emoji: '😌', label: 'Calm', color: '#7A9A8C', tips: 'You are peaceful and centered.' },
  { emoji: '😢', label: 'Sad', color: '#6B9AC4', tips: 'It\'s okay to feel. Reach out to someone.' },
  { emoji: '😠', label: 'Angry', color: '#D66B6B', tips: 'Take deep breaths. Your feelings are valid.' },
  { emoji: '😨', label: 'Fearful', color: '#9B7BB8', tips: 'You are safe. One step at a time.' },
  { emoji: '😲', label: 'Surprised', color: '#D97757', tips: 'Embrace the unexpected!' },
];

interface MoodCheckProps {
  dispatch: React.Dispatch<WellnessAction>;
}

export default function MoodCheck({ dispatch }: MoodCheckProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(false);

  const handleMoodClick = (mood: (typeof MOODS)[0]) => {
    setSelectedMood(mood.label);
    setShowTip(true);

    dispatch({
      type: 'ADD_MOOD_LOG',
      payload: {
        mood: mood.label,
        emoji: mood.emoji,
      },
    });
  };

  const selectedMoodData = MOODS.find((m) => m.label === selectedMood);

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <h2>Quick Mood Check</h2>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ marginBottom: '16px', color: '#6b665c' }}>How are you feeling right now?</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '12px' }}>
          {MOODS.map((mood) => (
            <motion.button
              key={mood.label}
              onClick={() => handleMoodClick(mood)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: selectedMood === mood.label ? `3px solid ${mood.color}` : '2px solid #e5e0d8',
                backgroundColor: selectedMood === mood.label ? mood.color + '20' : '#f9f7f4',
                cursor: 'pointer',
                fontSize: '32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{mood.emoji}</span>
              <span style={{ fontSize: '12px', color: '#1d1b18', fontWeight: '600' }}>
                {mood.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {showTip && selectedMoodData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '16px',
            backgroundColor: selectedMoodData.color + '15',
            borderLeft: `4px solid ${selectedMoodData.color}`,
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <p style={{ margin: 0, color: '#1d1b18' }}>💬 {selectedMoodData.tips}</p>
        </motion.div>
      )}

      {selectedMood && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}
        >
          <button
            onClick={() => {
              dispatch({
                type: 'ADD_ACTIVITY',
                payload: {
                  type: 'mood-check',
                  description: `Logged mood: ${selectedMood}`,
                },
              });
              alert('Mood logged! Keep tracking your emotional patterns.');
              setSelectedMood(null);
              setShowTip(false);
            }}
            className="btn btn-primary"
          >
            ✓ Log This Mood
          </button>
        </motion.div>
      )}
    </div>
  );
}
