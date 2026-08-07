import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { generatePostcard, type PostcardData } from '../../lib/api';

interface EmotionPostcardProps {
  emotion: string;
  emoji: string;
  confidence: number;
}

/** SVG pattern renderers for postcard backgrounds. */
function PatternOverlay({ pattern, accent }: { pattern: string; accent: string }) {
  switch (pattern) {
    case 'sunburst':
      return (
        <svg className="postcard__pattern" viewBox="0 0 400 240" preserveAspectRatio="none">
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="200"
              y1="120"
              x2={200 + 220 * Math.cos((i * 30 * Math.PI) / 180)}
              y2={120 + 140 * Math.sin((i * 30 * Math.PI) / 180)}
              stroke={accent}
              strokeWidth="0.5"
              opacity="0.15"
            />
          ))}
        </svg>
      );
    case 'rain':
      return (
        <svg className="postcard__pattern" viewBox="0 0 400 240" preserveAspectRatio="none">
          {[...Array(20)].map((_, i) => (
            <line
              key={i}
              x1={20 + i * 20}
              y1={10 + (i % 3) * 15}
              x2={15 + i * 20}
              y2={30 + (i % 3) * 15}
              stroke={accent}
              strokeWidth="1"
              opacity="0.12"
              strokeLinecap="round"
            />
          ))}
        </svg>
      );
    case 'fire':
      return (
        <svg className="postcard__pattern" viewBox="0 0 400 240" preserveAspectRatio="none">
          {[...Array(8)].map((_, i) => (
            <circle
              key={i}
              cx={50 + i * 50}
              cy={200 - i * 10}
              r={15 + (i % 3) * 8}
              fill={accent}
              opacity="0.06"
            />
          ))}
        </svg>
      );
    case 'sparkle':
      return (
        <svg className="postcard__pattern" viewBox="0 0 400 240" preserveAspectRatio="none">
          {[...Array(15)].map((_, i) => (
            <g key={i}>
              <circle
                cx={30 + ((i * 97) % 360)}
                cy={20 + ((i * 53) % 200)}
                r={1.5 + (i % 3)}
                fill={accent}
                opacity={0.15 + (i % 4) * 0.05}
              />
            </g>
          ))}
        </svg>
      );
    case 'mist':
      return (
        <svg className="postcard__pattern" viewBox="0 0 400 240" preserveAspectRatio="none">
          {[...Array(5)].map((_, i) => (
            <ellipse
              key={i}
              cx={80 + i * 70}
              cy={120 + (i % 2 ? 40 : -20)}
              rx={60 + i * 10}
              ry={20}
              fill={accent}
              opacity="0.05"
            />
          ))}
        </svg>
      );
    case 'waves':
      return (
        <svg className="postcard__pattern" viewBox="0 0 400 240" preserveAspectRatio="none">
          {[...Array(4)].map((_, i) => (
            <path
              key={i}
              d={`M0 ${180 + i * 15} Q100 ${170 + i * 15} 200 ${180 + i * 15} T400 ${180 + i * 15}`}
              fill="none"
              stroke={accent}
              strokeWidth="1"
              opacity="0.1"
            />
          ))}
        </svg>
      );
    case 'dots':
    default:
      return (
        <svg className="postcard__pattern" viewBox="0 0 400 240" preserveAspectRatio="none">
          {[...Array(30)].map((_, i) => (
            <circle
              key={i}
              cx={20 + ((i * 47) % 370)}
              cy={15 + ((i * 31) % 220)}
              r="1.5"
              fill={accent}
              opacity="0.1"
            />
          ))}
        </svg>
      );
  }
}

export default function EmotionPostcard({ emotion, emoji, confidence }: EmotionPostcardProps) {
  const [postcard, setPostcard] = useState<PostcardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await generatePostcard(emotion, emoji, confidence);
      setPostcard(data);
      setShowCard(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [emotion, emoji, confidence]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `theravox-${emotion.toLowerCase()}-postcard.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [emotion]);

  const handleShareTwitter = useCallback(() => {
    if (!postcard) return;
    const text = encodeURIComponent(
      `"${postcard.quote_text}" — ${postcard.quote_author}\n\nI'm feeling ${postcard.emoji} ${postcard.emotion} today.\n\n#TheraVoxAI #MentalWellness #EmotionPostcard`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  }, [postcard]);

  const handleCopyQuote = useCallback(async () => {
    if (!postcard) return;
    try {
      await navigator.clipboard.writeText(
        `"${postcard.quote_text}" — ${postcard.quote_author}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [postcard]);

  const handleNewQuote = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await generatePostcard(emotion, emoji, confidence);
      setPostcard(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [emotion, emoji, confidence]);

  return (
    <div className="postcard-wrapper">
      {/* Generate Button */}
      {!showCard && (
        <motion.button
          className="postcard-generate-btn"
          onClick={handleGenerate}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <span className="postcard-generate-btn__loading">
              <span className="postcard-spinner" />
              Creating your postcard...
            </span>
          ) : (
            <>
              <span className="postcard-generate-btn__icon">🎨</span>
              <span>Create Emotion Postcard</span>
            </>
          )}
        </motion.button>
      )}

      {error && (
        <div className="postcard-error">{error}</div>
      )}

      {/* Postcard Display */}
      <AnimatePresence>
        {showCard && postcard && (
          <motion.div
            className="postcard-container"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* The actual card (rendered to image) */}
            <div
              ref={cardRef}
              className="postcard-card"
              style={{
                background: `linear-gradient(135deg, ${postcard.gradient[0]}, ${postcard.gradient[1]}, ${postcard.gradient[2]})`,
                color: postcard.text_color,
              }}
            >
              <PatternOverlay pattern={postcard.pattern} accent={postcard.accent} />

              <div className="postcard-card__content">
                {/* Top: Emotion badge */}
                <div className="postcard-card__header">
                  <div
                    className="postcard-card__emotion-orb"
                    style={{ boxShadow: `0 0 30px ${postcard.glow}, 0 0 60px ${postcard.glow}` }}
                  >
                    <span className="postcard-card__emoji">{postcard.emoji}</span>
                  </div>
                  <div className="postcard-card__emotion-label">
                    <span className="postcard-card__emotion-text">{postcard.emotion}</span>
                    <span
                      className="postcard-card__confidence"
                      style={{ color: postcard.accent }}
                    >
                      {Math.round(postcard.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>

                {/* Quote */}
                <div className="postcard-card__quote">
                  <svg className="postcard-card__quote-mark" width="24" height="18" viewBox="0 0 24 18" fill={postcard.accent} opacity="0.3">
                    <path d="M0 18V10.5C0 4.5 3.6 1.2 10.8 0l1.2 2.4C7.2 3.6 5.4 6 5.4 9H10v9H0zm13.2 0V10.5c0-6 3.6-9.3 10.8-10.5L25.2 2.4C20.4 3.6 18.6 6 18.6 9H23.2v9h-10z" />
                  </svg>
                  <p className="postcard-card__quote-text">{postcard.quote_text}</p>
                  <p className="postcard-card__quote-author">— {postcard.quote_author}</p>
                </div>

                {/* Footer */}
                <div className="postcard-card__footer">
                  <span className="postcard-card__brand" style={{ color: postcard.accent }}>
                    TheraVox AI
                  </span>
                  <span className="postcard-card__date">
                    {new Date().toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="postcard-actions">
              <motion.button
                className="postcard-action-btn postcard-action-btn--download"
                onClick={handleDownload}
                disabled={isExporting}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                {isExporting ? (
                  <span className="postcard-spinner postcard-spinner--sm" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
                <span>{isExporting ? 'Saving...' : 'Download'}</span>
              </motion.button>

              <motion.button
                className="postcard-action-btn postcard-action-btn--twitter"
                onClick={handleShareTwitter}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Share on X</span>
              </motion.button>

              <motion.button
                className="postcard-action-btn postcard-action-btn--copy"
                onClick={handleCopyQuote}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                {copied ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
                <span>{copied ? 'Copied!' : 'Copy Quote'}</span>
              </motion.button>

              <motion.button
                className="postcard-action-btn postcard-action-btn--refresh"
                onClick={handleNewQuote}
                disabled={isLoading}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoading ? 'postcard-spin' : ''}>
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
                <span>New Quote</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
