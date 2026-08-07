export default function EmotionSkeleton() {
  return (
    <div className="emotion-result">
      <div className="loading-skeleton loading-badge">
        <div style={{ width: '60px', height: '60px', borderRadius: '8px' }} />
        <div style={{ width: '80px', height: '20px', borderRadius: '4px' }} />
      </div>

      <div className="confidence-section">
        <label className="confidence-label">Confidence</label>
        <div className="confidence-bar">
          <div className="loading-skeleton" style={{ height: '8px', width: '100%' }} />
        </div>
      </div>

      <div className="loading-skeleton" style={{ width: '100%', height: '60px' }} />
    </div>
  );
}
