import { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { analyzeAudio } from '../lib/api';
import HeroSection from '../components/shared/HeroSection';
import EmotionDisplay from '../components/shared/EmotionDisplay';
import EmotionSkeleton from '../components/shared/EmotionSkeleton';
import EmotionPostcard from '../components/shared/EmotionPostcard';
import ErrorAlert from '../components/shared/ErrorAlert';
import type { EmotionAnalysisResponse } from '../lib/api';

/** Audio file extensions accepted by the backend. */
const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'webm', 'aiff', 'au',
]);

function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true;
  // Fallback: check extension (OS-dragged files sometimes have blank MIME type)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_EXTENSIONS.has(ext);
}

function getExtFromMime(mimeType: string): string {
  if (mimeType.includes('ogg'))  return 'ogg';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4'))  return 'm4a';
  return 'audio';
}

export default function AudioPage() {
  const { state, statusMessage, elapsedSeconds, analyserRef, startRecording, stopRecording, reset } =
    useAudioRecorder();

  const fileInputRef      = useRef<HTMLInputElement>(null);
  const audioPreviewRef   = useRef<HTMLAudioElement>(null);
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const animFrameRef      = useRef<number | null>(null);
  const objectUrlRef      = useRef<string | null>(null);

  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [result, setResult]               = useState<EmotionAnalysisResponse | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  // ------------------------------------------------------------------ //
  //  File helpers                                                        //
  // ------------------------------------------------------------------ //

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setResult(null);
    if (audioPreviewRef.current) {
      // Revoke the previous object URL to avoid memory leaks
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      audioPreviewRef.current.src = url;
    }
  };

  // Revoke the object URL when the component unmounts
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleAnalyzeFile = async () => {
    if (!selectedFile) {
      setError('Please select or record an audio file first');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await analyzeAudio(selectedFile);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ------------------------------------------------------------------ //
  //  Drag & drop                                                         //
  // ------------------------------------------------------------------ //

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear when leaving the zone itself, not a child element
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(isAudioFile);
    if (audioFile) {
      handleFileSelect(audioFile);
    } else if (files.length > 0) {
      setError('Please drop an audio file (MP3, WAV, OGG, M4A, FLAC …)');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) handleFileSelect(file);
  };

  // ------------------------------------------------------------------ //
  //  Recording                                                           //
  // ------------------------------------------------------------------ //

  const handleStopRecording = async () => {
    const blob = await stopRecording();
    if (blob) {
      const ext = getExtFromMime(blob.type);
      const file = new File([blob], `recording.${ext}`, { type: blob.type });
      handleFileSelect(file);
      // Auto-analyze after recording stops
      setIsAnalyzing(true);
      setError(null);
      try {
        const response = await analyzeAudio(file);
        setResult(response);
        // Scroll to results
        setTimeout(() => {
          document.getElementById('audioResult')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleReRecord = () => {
    reset();
    setSelectedFile(null);
    setResult(null);
    setError(null);
    if (audioPreviewRef.current) audioPreviewRef.current.src = '';
  };

  // ------------------------------------------------------------------ //
  //  Waveform canvas                                                     //
  // ------------------------------------------------------------------ //

  const drawWaveform = useCallback(() => {
    const canvas  = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx         = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLen   = analyser.frequencyBinCount;
    const dataArray   = new Uint8Array(bufferLen);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = '#fff0f0';
      ctx.fillRect(0, 0, width, height);

      // Centre line
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Waveform
      ctx.lineWidth   = 2;
      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();

      const sliceWidth = width / bufferLen;
      let x = 0;
      for (let i = 0; i < bufferLen; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else         ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();
  }, [analyserRef]);

  useEffect(() => {
    if (state === 'recording') {
      drawWaveform();
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      // Clear canvas when not recording
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [state, drawWaveform]);

  // ------------------------------------------------------------------ //
  //  Formatting                                                          //
  // ------------------------------------------------------------------ //

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ------------------------------------------------------------------ //
  //  Render                                                              //
  // ------------------------------------------------------------------ //

  return (
    <>
      <HeroSection title="Audio Analysis" subtitle="Detect emotions from voice and speech" />

      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
          marginBottom: '0',
        }}>
          {/* ── Upload Card ─────────────────────────────────────────── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '600' }}>Upload Audio File</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                Supports MP3, WAV, M4A, OGG, FLAC and other audio formats
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: '1',
                padding: '40px 24px',
                border: `2px dashed ${isDragging ? 'var(--brand)' : '#e5e0d8'}`,
                borderRadius: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: isDragging ? 'rgba(var(--brand-rgb, 99,102,241), 0.06)' : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '160px',
                marginBottom: '16px',
                transform: isDragging ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>
                {isDragging ? '📂' : '🎙️'}
              </div>
              <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 4px', color: 'var(--text)' }}>
                {isDragging ? 'Drop your audio file here' : 'Drag & drop your audio file here'}
              </p>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
                or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* File preview */}
            {selectedFile && (
              <div style={{
                marginBottom: '16px',
                padding: '14px',
                backgroundColor: 'var(--surface-secondary)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '20px' }}>🎵</span>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedFile.name}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <audio ref={audioPreviewRef} controls style={{ width: '100%', height: '36px' }} />
              </div>
            )}

            {error && <ErrorAlert message={error} />}

            <button
              onClick={handleAnalyzeFile}
              disabled={isAnalyzing || !selectedFile}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'auto' }}
            >
              {isAnalyzing ? 'Analyzing…' : 'Analyze Audio'}
            </button>
          </div>

          {/* ── Record Card ─────────────────────────────────────────── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '600' }}>Record Your Voice</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                Use your microphone to capture speech in real time
              </p>
            </div>

            {/* Record zone */}
            <div style={{
              flex: '1',
              padding: state === 'recording' ? '24px' : '40px 24px',
              border: `1px solid ${state === 'recording' ? '#fca5a5' : '#e5e0d8'}`,
              borderRadius: '12px',
              backgroundColor: state === 'recording' ? '#fff5f5' : 'var(--surface-secondary)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '160px',
              marginBottom: '16px',
              transition: 'all 0.3s ease',
            }}>
              {state === 'idle' && (
                <>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎤</div>
                  <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 16px', color: 'var(--text)' }}>
                    Tap to start recording
                  </p>
                  <button onClick={startRecording} className="btn btn-primary">
                    Start Recording
                  </button>
                </>
              )}

              {state === 'recording' && (
                <>
                  {/* Live waveform */}
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={64}
                    style={{
                      width: '100%',
                      height: '64px',
                      borderRadius: '8px',
                      marginBottom: '12px',
                    }}
                  />

                  <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', color: '#dc2626' }}>
                    Recording in progress
                  </p>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#dc2626',
                    margin: '0 0 4px',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatTime(elapsedSeconds)}
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '3px',
                    margin: '0 0 4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((elapsedSeconds / 30) * 100, 100)}%`,
                      backgroundColor: elapsedSeconds >= 25 ? '#b91c1c' : '#dc2626',
                      borderRadius: '3px',
                      transition: 'width 0.5s linear',
                    }} />
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px' }}>
                    {30 - elapsedSeconds}s remaining
                  </p>
                  <button
                    onClick={handleStopRecording}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                  >
                    ⏹ Stop Recording
                  </button>
                </>
              )}

              {state === 'encoding' && (
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>{statusMessage}</p>
              )}

              {state === 'done' && (
                <>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px', color: 'var(--text)' }}>
                    {statusMessage}
                  </p>
                  <button
                    onClick={handleReRecord}
                    style={{
                      background: 'transparent',
                      color: 'var(--muted)',
                      border: '1px solid var(--border)',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    🔄 Record Again
                  </button>
                </>
              )}

              {state === 'error' && (
                <>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚠️</div>
                  <p style={{ fontSize: '13px', color: '#dc2626', margin: '0 0 12px', maxWidth: '260px' }}>
                    {statusMessage}
                  </p>
                  <button
                    onClick={handleReRecord}
                    className="btn btn-primary"
                    style={{ fontSize: '13px', padding: '8px 18px' }}
                  >
                    Try Again
                  </button>
                </>
              )}
            </div>

            {/* Recording tips */}
            <div style={{
              padding: '14px',
              backgroundColor: 'var(--surface-tertiary)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              marginBottom: '16px',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                Tips for best results
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7' }}>
                <li>Speak in a quiet environment</li>
                <li>Keep clips under 30 seconds</li>
                <li>Enunciate clearly and naturally</li>
              </ul>
            </div>

            <button
              onClick={handleAnalyzeFile}
              disabled={isAnalyzing || !selectedFile || state === 'recording'}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'auto' }}
            >
              {isAnalyzing ? 'Analyzing…' : state === 'done' ? 'Re-analyze Recording' : 'Analyze Recording'}
            </button>
          </div>
        </div>

        {/* Results */}
        {isAnalyzing && (
          <div id="audioResult" style={{ marginTop: '32px' }}>
            <h2 style={{ marginBottom: '16px' }}>Analyzing…</h2>
            <EmotionSkeleton />
          </div>
        )}

        {result && (
          <div id="audioResult" style={{ marginTop: '32px' }}>
            <h2 style={{ marginBottom: '16px' }}>Result</h2>
            <div className="card">
              <EmotionDisplay
                emotion={result.emotion}
                emoji={result.emoji}
                confidence={result.confidence}
                description={result.description}
                scores={result.scores}
              />
            </div>
            <div className="card" style={{ marginTop: '16px' }}>
              <EmotionPostcard
                emotion={result.emotion}
                emoji={result.emoji}
                confidence={result.confidence}
              />
            </div>
          </div>
        )}

        {/* About section */}
        <div className="card" style={{ marginTop: '32px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>About Audio Analysis</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
            Our speech emotion recognition model analyzes vocal features — including tone, pitch, tempo, and rhythm — to detect emotional states from spoken audio.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}>
            {[
              { icon: '🧠', label: 'Deep learning model',   desc: 'Wav2Vec2 XLS-R fine-tuned on RAVDESS' },
              { icon: '🎯', label: '7 emotion labels',       desc: 'Angry, happy, sad, fearful, disgust, surprise & neutral' },
              { icon: '⚡', label: 'Sliding-window analysis', desc: 'Aggregates predictions across the full clip' },
              { icon: '🔒', label: 'Private',                desc: 'Audio is deleted immediately after analysis' },
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
