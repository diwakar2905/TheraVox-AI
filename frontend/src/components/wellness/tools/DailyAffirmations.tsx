import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AFFIRMATIONS = [
  "I am capable of achieving my goals.",
  "I choose peace over perfection.",
  "My potential to succeed is limitless.",
  "I am worthy of respect and acceptance.",
  "Every day is a fresh start.",
  "I trust the process of life.",
  "I am becoming the best version of myself."
];

export default function DailyAffirmations() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % AFFIRMATIONS.length);
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', gridColumn: 'span 1' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>✨ Daily Affirmation</h3>
      
      <div 
        style={{ 
          flex: 1,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-start',
          backgroundColor: '#f9f7f4',
          borderRadius: '12px',
          border: '2px dashed var(--border-subtle)',
          padding: '24px',
          position: 'relative',
          minHeight: '140px',
          cursor: 'pointer',
          overflow: 'hidden'
        }}
        onClick={handleNext}
      >
        <AnimatePresence mode="wait" onExitComplete={() => setIsAnimating(false)}>
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, type: 'spring' }}
            style={{ textAlign: 'left' }}
          >
            <p style={{
              fontSize: '20px',
              fontStyle: 'italic',
              color: 'var(--brand)',
              fontWeight: '500',
              lineHeight: '1.5',
              margin: 0
            }}>
              "{AFFIRMATIONS[currentIndex]}"
            </p>
          </motion.div>
        </AnimatePresence>
        
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '16px',
          fontSize: '12px',
          color: 'var(--muted)',
          fontWeight: '500'
        }}>
          Click for another
        </div>
      </div>
    </div>
  );
}
