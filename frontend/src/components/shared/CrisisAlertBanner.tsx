import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// URL safety helper — prevents javascript: / data: XSS in href attributes
// ---------------------------------------------------------------------------

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrisisSignal {
  phrase: string;
  category: string;
  severity: string;
}

export interface CrisisData {
  flagged: boolean;
  severity: string; // none | low | moderate | high | critical
  signals: CrisisSignal[];
  recommended_action: string;
  crisis_resources: Array<{
    name: string;
    phone: string;
    description: string;
    region: string;
  }>;
}

interface CrisisAlertBannerProps {
  crisis: CrisisData;
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; icon: string; label: string }
> = {
  low: {
    color: '#92400e',
    bg: '#fffbeb',
    border: '#fbbf24',
    icon: '⚠️',
    label: 'Mild Distress Detected',
  },
  moderate: {
    color: '#9a3412',
    bg: '#fff7ed',
    border: '#f97316',
    icon: '🟠',
    label: 'Significant Distress Detected',
  },
  high: {
    color: '#991b1b',
    bg: '#fef2f2',
    border: '#ef4444',
    icon: '🔴',
    label: 'High-Risk Language Detected',
  },
  critical: {
    color: '#7f1d1d',
    bg: '#fef2f2',
    border: '#dc2626',
    icon: '🚨',
    label: 'CRISIS — Immediate Support Available',
  },
};

// ---------------------------------------------------------------------------
// CrisisAlertBanner — inline, non-blocking alert shown above results
// ---------------------------------------------------------------------------

export function CrisisAlertBanner({ crisis, onDismiss }: CrisisAlertBannerProps) {
  const config = SEVERITY_CONFIG[crisis.severity] ?? SEVERITY_CONFIG.moderate;
  const isUrgent = crisis.severity === 'high' || crisis.severity === 'critical';

  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      style={{
        background: config.bg,
        border: `2px solid ${config.border}`,
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '20px',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <span style={{ fontSize: '22px' }}>{config.icon}</span>
        <span
          style={{
            fontWeight: 700,
            fontSize: '16px',
            color: config.color,
            letterSpacing: '-0.01em',
          }}
        >
          {config.label}
        </span>
        {onDismiss && !isUrgent && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss alert"
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: config.color,
              opacity: 0.6,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Supportive message */}
      <p
        style={{
          fontSize: '14px',
          lineHeight: 1.6,
          color: config.color,
          margin: '0 0 16px 0',
        }}
      >
        {isUrgent
          ? "We care about your safety. If you're in immediate danger, please reach out to a crisis helpline now. You are not alone."
          : "It sounds like you may be going through a difficult time. Remember, professional support is always available."}
      </p>

      {/* Crisis resources */}
      {crisis.crisis_resources.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: config.color,
              opacity: 0.7,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}
          >
            Crisis Helplines
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {crisis.crisis_resources.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255,255,255,0.7)',
                  border: `1px solid ${config.border}40`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                }}
              >
                <span style={{ fontSize: '18px' }}>📞</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: config.color,
                    }}
                  >
                    {r.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {r.description}
                  </div>
                </div>
                {isSafeUrl(r.phone) && !r.phone.startsWith('tel:') ? (
                  <a
                    href={r.phone}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: config.color,
                      textDecoration: 'underline',
                    }}
                  >
                    Visit ↗
                  </a>
                ) : (
                  <a
                    href={`tel:${r.phone.replace(/[^0-9+]/g, '')}`}
                    style={{
                      fontWeight: 700,
                      fontSize: '14px',
                      color: config.color,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gentle footer */}
      <p
        style={{
          fontSize: '12px',
          color: config.color,
          opacity: 0.7,
          margin: '8px 0 0 0',
          fontStyle: 'italic',
        }}
      >
        {isUrgent
          ? 'This alert was triggered by our safety system. Please reach out for help.'
          : 'This is an automated check. TheraVox AI is not a substitute for professional help.'}
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// CrisisAlertModal — full-screen overlay for CRITICAL severity
// ---------------------------------------------------------------------------

interface CrisisAlertModalProps {
  crisis: CrisisData;
  onClose: () => void;
}

export function CrisisAlertModal({ crisis, onClose }: CrisisAlertModalProps) {
  const config = SEVERITY_CONFIG[crisis.severity] ?? SEVERITY_CONFIG.critical;

  // Auto-focus the modal for accessibility
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            borderTop: `4px solid ${config.border}`,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚨</div>
            <h2
              style={{
                margin: '0 0 8px',
                fontSize: '22px',
                fontWeight: 800,
                color: config.color,
              }}
            >
              You Are Not Alone
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '15px',
                color: '#555',
                lineHeight: 1.6,
              }}
            >
              We detected language that suggests you may be in crisis. Your safety matters most. Please reach out to one of these services now.
            </p>
          </div>

          {/* Resources */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '24px',
            }}
          >
            {crisis.crisis_resources.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: config.bg,
                  border: `1px solid ${config.border}40`,
                  borderRadius: '12px',
                  padding: '12px 16px',
                }}
              >
                <span style={{ fontSize: '20px' }}>📞</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: config.color }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#777' }}>{r.description}</div>
                </div>
                {isSafeUrl(r.phone) && !r.phone.startsWith('tel:') ? (
                  <a
                    href={r.phone}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: config.border,
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Visit ↗
                  </a>
                ) : (
                  <a
                    href={`tel:${r.phone.replace(/[^0-9+]/g, '')}`}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: config.border,
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Call {r.phone}
                  </a>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: `1px solid ${config.border}`,
              background: 'transparent',
              color: config.color,
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            I understand, close this message
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Hook: useCrisisCheck — auto-determine which UI to show
// ---------------------------------------------------------------------------

export function useCrisisCheck() {
  const [crisisData, setCrisisData] = useState<CrisisData | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleCrisisResponse = (data: CrisisData | undefined | null) => {
    if (!data || !data.flagged) {
      setCrisisData(null);
      setShowModal(false);
      return;
    }
    setCrisisData(data);
    // Show full-screen modal only for critical severity
    if (data.severity === 'critical') {
      setShowModal(true);
    }
  };

  const dismissBanner = () => setCrisisData(null);
  const closeModal = () => setShowModal(false);

  return {
    crisisData,
    showModal,
    handleCrisisResponse,
    dismissBanner,
    closeModal,
  };
}

export default CrisisAlertBanner;
