import { useState } from 'react';
import { motion } from 'framer-motion';
import type { WellnessAction } from '../../../hooks/useWellnessStore';

interface GratitudeBoxProps {
  dispatch: React.Dispatch<WellnessAction>;
}

export default function GratitudeBox({ dispatch }: GratitudeBoxProps) {
  const [text, setText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    dispatch({
      type: 'ADD_GRATITUDE',
      payload: text.trim(),
    });
    
    setIsSubmitted(true);
    setText('');

    setTimeout(() => {
      setIsSubmitted(false);
    }, 3000);
  };

  return (
    <motion.div 
      className="card" 
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gridColumn: '1 / -1' }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>
        🙏 Daily Gratitude
      </h3>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
        What are you grateful for today? Cultivating gratitude can profoundly impact your overall wellness.
      </p>

      {isSubmitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            padding: '24px',
            backgroundColor: '#FDF4F1',
            borderRadius: '12px',
            border: '1px solid #d97757',
            textAlign: 'center',
            color: '#d97757',
            fontWeight: '600'
          }}
        >
          ✨ Your gratitude has been recorded!
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="I am grateful for..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-secondary)',
              fontSize: '15px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#d97757'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!text.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            Add
          </button>
        </form>
      )}
    </motion.div>
  );
}
