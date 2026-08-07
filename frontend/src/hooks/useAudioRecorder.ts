import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingState = 'idle' | 'recording' | 'encoding' | 'done' | 'error';

export interface UseAudioRecorderReturn {
  state: RecordingState;
  statusMessage: string;
  elapsedSeconds: number;
  audioBlob: Blob | null;
  /** AnalyserNode for live waveform drawing – only non-null while recording. */
  analyserRef: React.RefObject<AnalyserNode | null>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  reset: () => void;
  cleanup: () => void;
}

/** 30 s matches the backend's processing cap. */
const RECORDING_TIMEOUT_MS = 30_000;

/**
 * Pick the best MIME type for MediaRecorder.
 * OGG is preferred because libsndfile (soundfile) supports it natively.
 * WebM is used as a fallback (backend can convert via ffmpeg).
 */
const PREFERRED_MIME_TYPES = [
  'audio/ogg;codecs=opus',
  'audio/webm;codecs=opus',
  'audio/webm',
];

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready to record');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef     = useRef<number>(0);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);

  // ------------------------------------------------------------------ //
  //  Internal helpers                                                    //
  // ------------------------------------------------------------------ //

  const _clearTimers = () => {
    if (timerRef.current)   clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timerRef.current   = null;
    timeoutRef.current = null;
  };

  const _closeAudioCtx = () => {
    analyserRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
  };

  const _stopStream = () => {
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
  };

  // ------------------------------------------------------------------ //
  //  Public API                                                          //
  // ------------------------------------------------------------------ //

  const cleanup = useCallback(() => {
    _clearTimers();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    _stopStream();
    _closeAudioCtx();
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setStatusMessage('Ready to record');
    setElapsedSeconds(0);
    setAudioBlob(null);
    chunksRef.current = [];
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      cleanup();
      chunksRef.current    = [];
      startTimeRef.current = Date.now();

      setState('recording');
      setStatusMessage('Recording…');
      setElapsedSeconds(0);

      // Request microphone with audio-quality constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount:     { ideal: 1 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
        },
      });

      // Set up AnalyserNode for live waveform visualization
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize               = 512;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Create MediaRecorder with the best supported MIME type
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(200); // collect a chunk every 200 ms

      // Elapsed-time counter (updated every 100 ms for smooth display)
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);

      // Hard stop at 30 s
      timeoutRef.current = setTimeout(() => {
        setStatusMessage('Maximum recording length reached (30 s)');
        stopRecording();
      }, RECORDING_TIMEOUT_MS);

    } catch (err) {
      setState('error');
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission|denied|notallowed/i.test(msg)) {
        setStatusMessage('Microphone permission denied – please allow access and try again.');
      } else {
        setStatusMessage(`Recording failed: ${msg}`);
      }
    }
  // stopRecording is defined below; eslint disable avoids circular dep warning
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setState('error');
        setStatusMessage('No active recording');
        resolve(null);
        return;
      }

      _clearTimers();
      setState('encoding');
      setStatusMessage('Processing recording…');

      // Safety net: if onstop never fires (rare browser bug), resolve after 8 s
      // to prevent the caller from hanging indefinitely.
      const safetyTimer = setTimeout(() => {
        console.warn('useAudioRecorder: onstop did not fire within 8 s — resolving null');
        setState('error');
        setStatusMessage('Recording timed out. Please try again.');
        resolve(null);
      }, 8_000);

      recorder.onstop = () => {
        clearTimeout(safetyTimer);
        _stopStream();
        _closeAudioCtx();

        if (chunksRef.current.length === 0) {
          setState('error');
          setStatusMessage('No audio data captured');
          resolve(null);
          return;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size === 0) {
          setState('error');
          setStatusMessage('Recording was empty');
          resolve(null);
          return;
        }

        setAudioBlob(blob);
        setState('done');
        setStatusMessage('Recording complete');
        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  return {
    state,
    statusMessage,
    elapsedSeconds,
    audioBlob,
    analyserRef,
    startRecording,
    stopRecording,
    reset,
    cleanup,
  };
}
