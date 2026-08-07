import { motion } from 'framer-motion';

interface ConfidenceBarProps {
  confidence: number;
}

export default function ConfidenceBar({ confidence }: ConfidenceBarProps) {
  const percentage = Math.round(confidence * 100);

  return (
    <div className="confidence-section">
      <label className="confidence-label">Confidence</label>
      <div className="confidence-bar">
        <motion.div
          className="confidence-fill"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      <span className="confidence-percent">{percentage}%</span>
    </div>
  );
}
