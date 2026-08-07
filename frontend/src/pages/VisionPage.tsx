import { useState, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { analyzeFrame, saveScreenshot } from '../lib/api';
import HeroSection from '../components/shared/HeroSection';
import EmotionDisplay from '../components/shared/EmotionDisplay';
import EmotionPostcard from '../components/shared/EmotionPostcard';

interface Face {
  x: number;
  y: number;
  w: number;
  h: number;
  emotion: string;
  confidence: number;
  emoji?: string;
  description?: string;
}

interface FaceResult extends Face {
  id: string;
}

export default function VisionPage() {
  const { videoRef, canvasRef, isInitialized, error, initCamera, captureFrame } = useCamera();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isContinuous, setIsContinuous] = useState(false);
  const [analysisInterval, setAnalysisInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [faces, setFaces] = useState<FaceResult[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    initCamera();
  }, [initCamera]);

  useEffect(() => {
    if (!isContinuous || !isInitialized) return;

    const interval = setInterval(async () => {
      const frameData = captureFrame();
      if (frameData) {
        try {
          const result = await analyzeFrame(frameData);
          if (result.faces && result.faces.length > 0) {
            const newFaces: FaceResult[] = (result.faces as Face[]).map((face, i) => ({
              ...face,
              id: `face-${i}-${Date.now()}`,
            }));
            setFaces(newFaces);
            setAnalysisError(null);
          }
        } catch (err) {
          setAnalysisError((err as Error).message);
        }
      }
    }, 1000);

    setAnalysisInterval(interval);

    return () => clearInterval(interval);
  }, [isContinuous, isInitialized, captureFrame]);

  const handleToggleContinuous = async () => {
    if (!isContinuous) {
      setIsContinuous(true);
      setAnalysisError(null);
    } else {
      setIsContinuous(false);
      if (analysisInterval) {
        clearInterval(analysisInterval);
        setAnalysisInterval(null);
      }
    }
  };

  const handleSnapFrame = async () => {
    const frameData = captureFrame();
    if (!frameData) {
      setAnalysisError('Failed to capture frame');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await analyzeFrame(frameData);
      if (result.faces && result.faces.length > 0) {
        const newFaces: FaceResult[] = (result.faces as Face[]).map((face, i) => ({
          ...face,
          id: `face-${i}-${Date.now()}`,
        }));
        setFaces(newFaces);
      }
    } catch (err) {
      setAnalysisError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveScreenshot = async () => {
    const frameData = captureFrame();
    if (!frameData) {
      setAnalysisError('Failed to capture screenshot');
      return;
    }

    try {
      await saveScreenshot(frameData);
      setAnalysisError(null);
      setSavedMessage('Screenshot saved successfully!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      setAnalysisError(`Failed to save screenshot: ${(err as Error).message}`);
    }
  };

  return (
    <>
      <HeroSection title="Vision Analysis" subtitle="Real-time emotion detection from your face" />

      <div className="container">
        {/* Two-column layout: camera + controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
          marginBottom: '0',
        }}>
          {/* Camera Feed Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '600' }}>Camera Feed</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                Allow camera access and position your face in the frame
              </p>
            </div>

            {/* Video area */}
            <div style={{ position: 'relative', flex: '1', minHeight: '240px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  backgroundColor: '#000',
                  display: isInitialized ? 'block' : 'none',
                  aspectRatio: '4/3',
                  objectFit: 'cover',
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Continuous analysis overlay badge */}
              {isContinuous && isInitialized && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.9)',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backdropFilter: 'blur(4px)',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    animation: 'pulse 1.2s infinite',
                    display: 'inline-block',
                  }} />
                  Live
                </div>
              )}

              {!isInitialized && error && (
                <div style={{
                  padding: '32px 24px',
                  backgroundColor: '#fee2e2',
                  borderRadius: '12px',
                  color: '#991b1b',
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>📵</div>
                  <p style={{ margin: '0 0 6px', fontWeight: '600' }}>Camera access denied</p>
                  <p style={{ margin: 0, fontSize: '13px' }}>{error.message}</p>
                  <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
                    Please allow camera access in your browser settings.
                  </p>
                </div>
              )}

              {!isInitialized && !error && (
                <div style={{
                  padding: '32px 24px',
                  backgroundColor: 'var(--surface-secondary)',
                  borderRadius: '12px',
                  color: 'var(--muted)',
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}>
                  <div style={{ fontSize: '36px' }}>📷</div>
                  <p style={{ margin: 0, fontSize: '14px' }}>Initializing camera...</p>
                </div>
              )}
            </div>
          </div>

          {/* Controls Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '600' }}>Analysis Controls</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                Start continuous analysis or capture a single frame
              </p>
            </div>

            {/* Status indicator */}
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              border: `1px solid ${isContinuous ? 'var(--emotion-happy, #10b981)' : isAnalyzing ? '#f59e0b' : '#e5e0d8'}`,
              backgroundColor: isContinuous ? '#f0fdf4' : isAnalyzing ? '#fffbeb' : 'var(--surface-secondary)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ fontSize: '28px' }}>
                {isContinuous ? '👁️' : isAnalyzing ? '⏳' : '😶'}
              </div>
              <div>
                <p style={{
                  margin: '0 0 2px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isContinuous ? '#10b981' : isAnalyzing ? '#d97706' : 'var(--text)',
                }}>
                  {isContinuous
                    ? 'Analyzing frames in real-time'
                    : isAnalyzing
                    ? 'Analyzing frame...'
                    : 'Ready to analyze'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                  {isContinuous
                    ? 'Results update every second'
                    : 'Choose continuous or single-shot mode below'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <button
                className={`btn ${isContinuous ? 'btn-danger' : 'btn-primary'}`}
                onClick={handleToggleContinuous}
                disabled={!isInitialized}
                style={{ width: '100%' }}
              >
                {isContinuous ? '⏹ Stop Continuous Analysis' : '▶ Start Continuous Analysis'}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleSnapFrame}
                  disabled={!isInitialized || isAnalyzing}
                  style={{ fontSize: '14px' }}
                >
                  {isAnalyzing ? 'Analyzing...' : '📸 Snap Frame'}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleSaveScreenshot}
                  disabled={!isInitialized}
                  style={{ fontSize: '14px' }}
                >
                  💾 Save Shot
                </button>
              </div>
            </div>

            {/* Feedback messages */}
            {savedMessage && (
              <div style={{
                padding: '12px',
                backgroundColor: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '14px',
              }}>
                ✅ {savedMessage}
              </div>
            )}

            {analysisError && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '14px',
              }}>
                {analysisError}
              </div>
            )}

            {/* Tips */}
            <div style={{
              padding: '14px',
              backgroundColor: 'var(--surface-tertiary)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              marginTop: 'auto',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                Tips for best results
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7' }}>
                <li>Face the camera in good lighting</li>
                <li>Keep your face centered in the frame</li>
                <li>Bring your face a little closer to the camera</li>
                <li>Use continuous mode for live tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Results */}
        {faces.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h2 style={{ marginBottom: '16px' }}>
              {faces.length === 1 ? 'Detected Emotion' : `Detected Emotions (${faces.length} faces)`}
            </h2>

            {faces.length > 1 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                marginBottom: '16px',
              }}>
                {faces.map((face, i) => (
                  <div key={face.id} className="card">
                    <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Face {i + 1}
                    </p>
                    <EmotionDisplay
                      emotion={face.emotion}
                      emoji={face.emoji || '😊'}
                      confidence={face.confidence}
                      description={face.description || 'Face detected'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ marginBottom: '16px' }}>
                <EmotionDisplay
                  emotion={faces[0].emotion}
                  emoji={faces[0].emoji || '😊'}
                  confidence={faces[0].confidence}
                  description={faces[0].description || 'Face detected'}
                />
              </div>
            )}

            <div className="card">
              <EmotionPostcard
                emotion={faces[0].emotion}
                emoji={faces[0].emoji || '😊'}
                confidence={faces[0].confidence}
              />
            </div>
          </div>
        )}

        {/* About section */}
        <div className="card" style={{ marginTop: '32px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>About Vision Analysis</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
            Our facial emotion recognition uses DeepFace with MediaPipe for fast, accurate detection. CLAHE preprocessing improves low-light performance, and temporal smoothing reduces jitter during live analysis.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}>
            {[
              { icon: '🧠', label: 'DeepFace model', desc: 'State-of-the-art facial analysis' },
              { icon: '🎯', label: '7 emotion labels', desc: 'Anger, fear, happy, sad, neutral & more' },
              { icon: '⚡', label: 'Real-time', desc: 'Continuous frame analysis at 1 fps' },
              { icon: '🔒', label: 'Private', desc: 'Frames are not stored after analysis' },
            ].map(({ icon, label, desc }) => (
              <div key={label} style={{
                padding: '14px',
                backgroundColor: 'var(--surface-secondary)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{icon}</div>
                <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
