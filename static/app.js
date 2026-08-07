const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const facesDiv = document.getElementById('faces');
const analysisStatus = document.getElementById('analysisStatus');
let ctx = null;
if (canvas) {
  ctx = canvas.getContext('2d');
}
let lastFrameDataUrl = null;

// Continuous analysis variables
let isAnalyzing = false;
let analysisInterval = null;
let analysisFrameCount = 0;
const ANALYSIS_INTERVAL_MS = 1000; // Analyze every 1 second

// Helper function to create enhanced emotion display
function createEmotionDisplay(data) {
  const confidence = Math.round(data.confidence * 100);
  const emotionClass = data.emotion.toLowerCase();
  
  return `
    <div class="emotion-result">
      <div class="emotion-badge ${emotionClass}">
        <span style="font-size: 24px;">${data.emoji}</span>
        <span>${data.emotion.toUpperCase()}</span>
      </div>
      <div class="confidence-meter">
        <div class="confidence-label">
          <span>Confidence Level</span>
          <span>${confidence}%</span>
        </div>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${confidence}%"></div>
        </div>
      </div>
      <div style="margin-top: 16px; color: var(--muted); font-size: 14px;">
        ${data.description}
      </div>
    </div>
  `;
}

async function initCamera() {
  if (!video) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
  } catch (e) {
    if (facesDiv) {
      facesDiv.innerHTML = `<div class="face">Camera access denied: ${e.message}</div>`;
    }
  }
}

function captureFrame() {
  if (!video || !canvas || !ctx) return null;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL('image/png');
}

async function analyzeSingleFrame(showLoading = true) {
  if (!facesDiv) return;
  
  if (showLoading) {
    facesDiv.innerHTML = `
      <div class="emotion-result">
        <div class="loading-skeleton loading-badge"></div>
        <div class="confidence-meter">
          <div class="loading-skeleton loading-text"></div>
          <div class="loading-skeleton confidence-bar"></div>
        </div>
      </div>
    `;
  }
  
  const dataUrl = captureFrame();
  if (!dataUrl) {
    if (showLoading) {
      facesDiv.innerHTML = '<div class="emotion-result"><div class="face">📷 Camera not ready</div></div>';
    }
    return;
  }
  
  lastFrameDataUrl = dataUrl;
  
  try {
    const res = await fetch('/api/analyze_frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
    const json = await res.json();
    
    if (!res.ok) throw new Error(json.error || 'Failed');

    if (!json.faces || json.faces.length === 0) {
      facesDiv.innerHTML = '<div class="emotion-result"><div class="face">👤 No faces detected</div></div>';
      return;
    }

    facesDiv.innerHTML = '';
    json.faces.forEach(f => {
      const emotionDisplay = createEmotionDisplay(f);
      const div = document.createElement('div');
      div.innerHTML = emotionDisplay;
      facesDiv.appendChild(div);
      // Contextual wellness CTA
      const cta = document.createElement('div');
      cta.className = 'muted';
      cta.style.marginTop = '6px';
      cta.innerHTML = 'Need a breather? <a href="/wellness">Open Wellness</a>';
      div.appendChild(cta);
    });
    
    // Update analysis status for continuous mode
    if (isAnalyzing && analysisStatus) {
      analysisFrameCount++;
      analysisStatus.textContent = `Continuous analysis active • Frame ${analysisFrameCount} • ${json.faces.length} face(s) detected`;
    }
    
  } catch (e) {
    if (showLoading) {
      facesDiv.innerHTML = `<div class="emotion-result"><div class="face error">❌ Error: ${e.message}</div></div>`;
    }
    
    // Update analysis status with error
    if (isAnalyzing && analysisStatus) {
      analysisStatus.textContent = `Analysis error: ${e.message}`;
    }
  }
}

function startContinuousAnalysis() {
  if (isAnalyzing) return;
  
  isAnalyzing = true;
  analysisFrameCount = 0;
  
  // Update UI
  const startBtn = document.getElementById('startAnalysis');
  if (startBtn) {
    startBtn.textContent = 'Stop Analyzing';
    startBtn.classList.add('analyzing');
  }
  
  if (analysisStatus) {
    analysisStatus.textContent = 'Starting continuous analysis...';
  }
  
  // Start continuous analysis
  analysisInterval = setInterval(() => {
    analyzeSingleFrame(false); // Don't show loading for continuous mode
  }, ANALYSIS_INTERVAL_MS);
  
  // Analyze first frame immediately
  analyzeSingleFrame(false);
}

function stopContinuousAnalysis() {
  if (!isAnalyzing) return;
  
  isAnalyzing = false;
  
  // Clear interval
  if (analysisInterval) {
    clearInterval(analysisInterval);
    analysisInterval = null;
  }
  
  // Update UI
  const startBtn = document.getElementById('startAnalysis');
  if (startBtn) {
    startBtn.textContent = 'Start Analyzing';
    startBtn.classList.remove('analyzing');
  }
  
  if (analysisStatus) {
    analysisStatus.textContent = `Analysis stopped • Processed ${analysisFrameCount} frames`;
  }
}

function toggleContinuousAnalysis() {
  if (isAnalyzing) {
    stopContinuousAnalysis();
  } else {
    startContinuousAnalysis();
  }
}

// Start/Stop continuous analysis button
const startAnalysisBtn = document.getElementById('startAnalysis');
if (startAnalysisBtn) {
  startAnalysisBtn.addEventListener('click', toggleContinuousAnalysis);
}

// Single frame capture button
const snapBtn = document.getElementById('snap');
if (snapBtn) {
  snapBtn.addEventListener('click', async () => {
    // Stop continuous analysis if running
    if (isAnalyzing) {
      stopContinuousAnalysis();
    }
    
    // Analyze single frame with loading
    await analyzeSingleFrame(true);
    
    if (analysisStatus) {
      analysisStatus.textContent = 'Single frame analyzed';
    }
  });
}

const saveBtn = document.getElementById('saveShot');
if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    if (!lastFrameDataUrl) {
      if (facesDiv) facesDiv.innerHTML = '<div class="face">Capture a frame first (Analyze Frame) before saving.</div>';
      return;
    }
    if (facesDiv) facesDiv.innerHTML = 'Saving screenshot...';
    try {
      const res = await fetch('/api/save_screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: lastFrameDataUrl })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      const link = json.url ? `<a href="${json.url}" target="_blank">Open saved image</a>` : '';
      if (facesDiv) facesDiv.innerHTML = `<div class="face">Saved to ${json.path || 'screenshots'} ${link ? '• ' + link : ''}</div>`;
    } catch (e) {
      if (facesDiv) facesDiv.innerHTML = `<div class="face">Save failed: ${e.message}</div>`;
    }
  });
}

const analyzeTextBtn = document.getElementById('analyzeText');
if (analyzeTextBtn) {
  analyzeTextBtn.addEventListener('click', async () => {
    const textEl = document.getElementById('text');
    const textResult = document.getElementById('textResult');
    if (!textEl || !textResult) return;
    const text = textEl.value;
    
    // Show loading state with skeleton
    textResult.innerHTML = `
      <div class="emotion-result">
        <div class="loading-skeleton loading-badge"></div>
        <div class="confidence-meter">
          <div class="loading-skeleton loading-text"></div>
          <div class="loading-skeleton confidence-bar"></div>
        </div>
      </div>
    `;
    
    try {
      const res = await fetch('/api/analyze_text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      
      // Create enhanced emotion display
      textResult.innerHTML = createEmotionDisplay(json) + '<div class="muted" style="margin-top:6px;">Need a breather? <a href="/wellness">Open Wellness</a></div>';
    } catch (e) {
      textResult.innerHTML = `<div class="emotion-result"><div class="face">❌ Error: ${e.message}</div></div>`;
    }
  });
}

// Audio drag & drop functionality
const audioDropZone = document.getElementById('audioDropZone');
const audioFileInput = document.getElementById('audioFile');
const audioPreview = document.getElementById('audioPreview');

if (audioDropZone && audioFileInput) {
  // Click to browse
  audioDropZone.addEventListener('click', () => {
    audioFileInput.click();
  });

  // File input change
  audioFileInput.addEventListener('change', handleAudioFileSelect);

  // Drag & drop events
  audioDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    audioDropZone.classList.add('drag-over');
  });

  audioDropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    audioDropZone.classList.remove('drag-over');
  });

  audioDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    audioDropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('audio/')) {
      // Simulate file input selection
      const dt = new DataTransfer();
      dt.items.add(files[0]);
      audioFileInput.files = dt.files;
      updateAudioDropZone(files[0]);
      const analyzeBtn = document.getElementById('analyzeAudio');
      if (analyzeBtn) analyzeBtn.disabled = false;
    }
  });
}

function handleAudioFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    updateAudioDropZone(file);
    const analyzeBtn = document.getElementById('analyzeAudio');
    if (analyzeBtn) analyzeBtn.disabled = false;
  }
}

function updateAudioDropZone(file) {
  if (audioDropZone) {
    audioDropZone.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
      <p style="margin: 8px 0; font-size: 16px; color: var(--accent1);">${file.name}</p>
      <p style="margin: 4px 0; color: var(--muted);">Ready to analyze</p>
    `;
  }
  // Preview selected audio
  if (audioPreview && file) {
    const url = URL.createObjectURL(file);
    audioPreview.src = url;
    try { audioPreview.load(); } catch {}
  }
}

const analyzeAudioBtn = document.getElementById('analyzeAudio');
if (analyzeAudioBtn) {
  analyzeAudioBtn.addEventListener('click', async () => {
    const fileInput = document.getElementById('audioFile');
    const audioResult = document.getElementById('audioResult');
    if (!fileInput || !audioResult) return;
    if (!fileInput.files.length) {
      audioResult.innerHTML = '<div class="emotion-result"><div class="face">🎵 Choose an audio file first.</div></div>';
      return;
    }
    
    // Show loading state
    audioResult.innerHTML = `
      <div class="emotion-result">
        <div class="loading-skeleton loading-badge"></div>
        <div class="confidence-meter">
          <div class="loading-skeleton loading-text"></div>
          <div class="loading-skeleton confidence-bar"></div>
        </div>
      </div>
    `;
    
    const form = new FormData();
    form.append('file', fileInput.files[0]);
    try {
      const res = await fetch('/api/analyze_audio', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      
      // Create enhanced emotion display
      audioResult.innerHTML = createEmotionDisplay(json) + '<div class="muted" style="margin-top:6px;">Need a breather? <a href="/wellness">Open Wellness</a></div>';
    } catch (e) {
      audioResult.innerHTML = `<div class="emotion-result"><div class="face">❌ Error: ${e.message}</div></div>`;
    }
  });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (isAnalyzing) {
    stopContinuousAnalysis();
  }
});

// Handle visibility change (tab switching)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isAnalyzing) {
    // Pause analysis when tab is not visible to save resources
    if (analysisInterval) {
      clearInterval(analysisInterval);
      analysisInterval = null;
    }
    if (analysisStatus) {
      analysisStatus.textContent = 'Analysis paused (tab not visible)';
    }
  } else if (!document.hidden && isAnalyzing && !analysisInterval) {
    // Resume analysis when tab becomes visible
    analysisInterval = setInterval(() => {
      analyzeSingleFrame(false);
    }, ANALYSIS_INTERVAL_MS);
    if (analysisStatus) {
      analysisStatus.textContent = 'Analysis resumed';
    }
  }
});

if (video) {
  initCamera();
}

// --- Audio Recording (WAV) and Analyze ---
const recordBtn = document.getElementById('recordAudio');
const stopBtn = document.getElementById('stopRecording');
const recordStatus = document.getElementById('recordStatus');

let audioCtx = null;
let mediaStream = null;
let mediaSource = null;
let processor = null;
let recordedBuffers = [];
let recording = false;
let recordStartTs = 0;
let recordTimer = null;
const MAX_RECORD_MS = 15000; // auto-stop after 15s

function updateRecordUI(state, message) {
  if (recordBtn) recordBtn.disabled = state === 'recording';
  if (stopBtn) stopBtn.disabled = state !== 'recording';
  if (recordStatus) recordStatus.textContent = message || '';
}

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return view;
}

function writeWavHeader(view, sampleRate, numSamples, numChannels = 1) {
  function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);        // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);         // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);// NumChannels
  view.setUint32(24, sampleRate, true);// SampleRate
  view.setUint32(28, byteRate, true);  // ByteRate
  view.setUint16(32, blockAlign, true);// BlockAlign
  view.setUint16(34, 16, true);        // BitsPerSample
  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
}

function encodeWav(buffers, sampleRate) {
  // Merge mono buffers
  const length = buffers.reduce((sum, b) => sum + b.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const b of buffers) { merged.set(b, offset); offset += b.length; }

  const pcmView = floatTo16BitPCM(merged);
  const wavBuffer = new ArrayBuffer(44 + pcmView.byteLength);
  const view = new DataView(wavBuffer);
  writeWavHeader(view, sampleRate, merged.length, 1);
  // PCM data
  const bytes = new Uint8Array(wavBuffer, 44);
  for (let i = 0; i < pcmView.byteLength; i++) bytes[i] = pcmView.getUint8(i);
  // Return Blob from the underlying ArrayBuffer to avoid DataView compatibility quirks
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

async function startRecording() {
  if (recording) return;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    updateRecordUI('idle', `Microphone access denied: ${e.message}`);
    return;
  }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  mediaSource = audioCtx.createMediaStreamSource(mediaStream);
  // Use ScriptProcessor (deprecated but widely supported) for simplicity
  const bufferSize = 4096;
  processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
  recordedBuffers = [];
  processor.onaudioprocess = (e) => {
    const channel = e.inputBuffer.getChannelData(0);
    recordedBuffers.push(new Float32Array(channel));
  };
  mediaSource.connect(processor);
  processor.connect(audioCtx.destination);
  recording = true;
  recordStartTs = Date.now();
  updateRecordUI('recording', 'Recording… click Stop to analyze');
  // Start UI timer and auto-stop
  if (recordTimer) clearInterval(recordTimer);
  recordTimer = setInterval(() => {
    const elapsed = Date.now() - recordStartTs;
    const sec = Math.floor(elapsed / 1000);
    if (recordStatus) recordStatus.textContent = `Recording… ${sec}s (auto-stops at ${Math.floor(MAX_RECORD_MS/1000)}s)`;
    if (elapsed >= MAX_RECORD_MS) {
      stopRecordingAndAnalyze();
    }
  }, 250);
}

async function stopRecordingAndAnalyze() {
  if (!recording) return;
  recording = false;
  try {
    mediaSource && mediaSource.disconnect();
    processor && processor.disconnect();
  } catch {}
  try {
    mediaStream && mediaStream.getTracks().forEach(t => t.stop());
  } catch {}
  if (recordTimer) { clearInterval(recordTimer); recordTimer = null; }
  const sampleRate = audioCtx ? audioCtx.sampleRate : 44100;
  if (audioCtx) { try { await audioCtx.close(); } catch {} }

  updateRecordUI('idle', 'Encoding…');
  // Encode WAV and send to server
  try {
    if (!recordedBuffers || recordedBuffers.length === 0) {
      updateRecordUI('idle', 'No audio captured. Please try again.');
      return;
    }
    const wavBlob = encodeWav(recordedBuffers, sampleRate);
    // Preview recorded audio
    if (audioPreview) {
      const url = URL.createObjectURL(wavBlob);
      audioPreview.src = url;
      try { audioPreview.load(); } catch {}
    }
    const form = new FormData();
    form.append('file', wavBlob, 'recording.wav');
    const audioResult = document.getElementById('audioResult');
    if (audioResult) audioResult.innerHTML = 'Analyzing recorded audio...';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const res = await fetch('/api/analyze_audio', { method: 'POST', body: form, signal: controller.signal });
    clearTimeout(timeout);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed');
    if (audioResult) {
      audioResult.innerHTML = createEmotionDisplay(json);
    }
    updateRecordUI('idle', 'Ready');
  } catch (e) {
    const audioResult = document.getElementById('audioResult');
    if (audioResult) audioResult.innerHTML = `<div class="face">Record analyze error: ${e.name === 'AbortError' ? 'Request timed out' : e.message}</div>`;
    updateRecordUI('idle', `Record analyze error: ${e.name === 'AbortError' ? 'Request timed out' : e.message}`);
  }
}

if (recordBtn && stopBtn) {
  updateRecordUI('idle', 'Ready');
  recordBtn.addEventListener('click', startRecording);
  stopBtn.addEventListener('click', stopRecordingAndAnalyze);
}

// Initialize enhancements on page load
document.addEventListener('DOMContentLoaded', function() {
  // Add page transition class to main content
  const main = document.querySelector('main');
  if (main) {
    main.classList.add('page-transition');
  }
  
  // Initialize camera on vision page
  if (video) {
    initCamera();
  }
  
  // Add smooth scrolling to navigation links
  const navLinks = document.querySelectorAll('.nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Add loading effect
      this.style.opacity = '0.7';
      setTimeout(() => {
        this.style.opacity = '1';
      }, 300);
    });
  });
  
  // Add hover effects to cards
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-8px)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });
  
  // Enhanced dropdown interactions
  const selectElements = document.querySelectorAll('select');
  selectElements.forEach(select => {
    // Add smooth transitions for select elements
    select.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    select.addEventListener('mouseenter', function() {
      this.style.borderColor = 'var(--accent1)';
      this.style.boxShadow = '0 4px 12px rgba(0, 188, 212, 0.15)';
    });
    
    select.addEventListener('mouseleave', function() {
      if (!this.matches(':focus')) {
        this.style.borderColor = 'var(--border)';
        this.style.boxShadow = 'none';
      }
    });
    
    select.addEventListener('focus', function() {
      this.style.borderColor = 'var(--accent1)';
      this.style.boxShadow = '0 0 0 3px rgba(0, 188, 212, 0.2)';
    });
    
    select.addEventListener('blur', function() {
      this.style.borderColor = 'var(--border)';
      this.style.boxShadow = 'none';
    });
  });
  
  // Add ripple effect to dropdown selections
  window.addRippleEffect = function(element) {
    element.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(0, 188, 212, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
      `;
      
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  };

  // ===== Scroll Reveal (IntersectionObserver) =====
  try {
    const revealEls = document.querySelectorAll('[data-reveal], [data-stagger]');
    if (revealEls.length) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReduced && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              io.unobserve(entry.target);
            }
          });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

        revealEls.forEach((el) => {
          if (el.hasAttribute('data-stagger')) {
            const children = Array.from(el.children);
            children.forEach((child, idx) => {
              child.style.setProperty('--stagger-index', idx.toString());
            });
          }
          io.observe(el);
        });
      } else {
        // immediately reveal when motion is reduced or IO unsupported
        revealEls.forEach((el) => el.classList.add('is-revealed'));
      }
    }
  } catch {}

  // ===== Subtle Parallax for hero blobs and header brand =====
  try {
    const parallaxTargets = [
      ...document.querySelectorAll('.blob'),
      ...document.querySelectorAll('.brand__logo')
    ];
    parallaxTargets.forEach((el) => el.classList.add('parallax-layer'));

    let rafId = null;
    const onMove = (evt) => {
      if (rafId) cancelAnimationFrame(rafId);
      const { clientX, clientY } = evt.touches ? evt.touches[0] : evt;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (clientX - cx) / cx; // -1..1
      const dy = (clientY - cy) / cy;
      rafId = requestAnimationFrame(() => {
        parallaxTargets.forEach((el, i) => {
          const depth = (i % 3 + 1) * 3; // 3,6,9 px range
          el.style.setProperty('--px', `${dx * depth}px`);
          el.style.setProperty('--py', `${dy * depth}px`);
        });
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
  } catch {}

  // ===== Enable ripple on primary buttons =====
  try {
    const rippleButtons = document.querySelectorAll('.btn, button');
    rippleButtons.forEach((btn) => {
      btn.classList.add('ripple-enabled');
      btn.addEventListener('click', (e) => {
        const host = e.currentTarget;
        const rect = host.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left}px`;
        ripple.style.top = `${e.clientY - rect.top}px`;
        host.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  } catch {}

  // ===== Wellness page JS =====
  try {
    // ==========================================
    // WELLNESS DATA STORAGE (localStorage)
    // ==========================================
    const WellnessStorage = {
      get(key, defaultValue = null) {
        try {
          const data = localStorage.getItem(`wellness_${key}`);
          return data ? JSON.parse(data) : defaultValue;
        } catch { return defaultValue; }
      },
      set(key, value) {
        try {
          localStorage.setItem(`wellness_${key}`, JSON.stringify(value));
        } catch {}
      },
      getJournalEntries() {
        return this.get('journal', []);
      },
      addJournalEntry(entry) {
        const entries = this.getJournalEntries();
        entry.id = Date.now();
        entry.createdAt = new Date().toISOString();
        entries.unshift(entry);
        this.set('journal', entries);
        return entry;
      },
      deleteJournalEntry(id) {
        const entries = this.getJournalEntries().filter(e => e.id !== id);
        this.set('journal', entries);
      },
      getMoodLogs() {
        return this.get('moodLogs', []);
      },
      addMoodLog(mood, emoji) {
        const logs = this.getMoodLogs();
        logs.unshift({ mood, emoji, date: new Date().toISOString() });
        this.set('moodLogs', logs.slice(0, 365)); // Keep 1 year
      },
      getGratitude() {
        return this.get('gratitude', []);
      },
      addGratitude(text) {
        const items = this.getGratitude();
        items.unshift({ text, date: new Date().toISOString() });
        this.set('gratitude', items.slice(0, 100));
      },
      getActivities() {
        return this.get('activities', []);
      },
      addActivity(type, description) {
        const activities = this.getActivities();
        activities.unshift({ type, description, date: new Date().toISOString() });
        this.set('activities', activities.slice(0, 50));
      },
      getBreathingMinutes() {
        return this.get('breathingMinutes', 0);
      },
      addBreathingMinutes(mins) {
        this.set('breathingMinutes', this.getBreathingMinutes() + mins);
      },
      getHabits() {
        return this.get('habits', {});
      },
      toggleHabit(habit, dayIndex) {
        const habits = this.getHabits();
        const week = getCurrentWeek();
        if (!habits[week]) habits[week] = {};
        if (!habits[week][habit]) habits[week][habit] = [];
        const idx = habits[week][habit].indexOf(dayIndex);
        if (idx === -1) {
          habits[week][habit].push(dayIndex);
        } else {
          habits[week][habit].splice(idx, 1);
        }
        this.set('habits', habits);
        return habits[week][habit].includes(dayIndex);
      },
      getStreak() {
        return this.get('streak', { count: 0, lastDate: null });
      },
      updateStreak() {
        const streak = this.getStreak();
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (streak.lastDate === today) return streak.count;
        if (streak.lastDate === yesterday) {
          streak.count++;
        } else if (streak.lastDate !== today) {
          streak.count = 1;
        }
        streak.lastDate = today;
        this.set('streak', streak);
        return streak.count;
      }
    };

    function getCurrentWeek() {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const diff = now - start;
      const week = Math.ceil(diff / 604800000);
      return `${now.getFullYear()}-W${week}`;
    }

    // ==========================================
    // WELLNESS TABS
    // ==========================================
    const tabButtons = document.querySelectorAll('.wellness-tab');
    const tabContents = document.querySelectorAll('.wellness-tab-content');
    
    function switchToTab(tabId) {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      const tabBtn = document.querySelector(`.wellness-tab[data-tab="${tabId}"]`);
      if (tabBtn) tabBtn.classList.add('active');
      const content = document.getElementById(`tab-${tabId}`);
      if (content) content.classList.add('active');
    }
    
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        switchToTab(btn.dataset.tab);
      });
    });

    // Handle hero button clicks for Journal and Mood Tracker
    document.querySelectorAll('.hero__cta a[href="#journal"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchToTab('journal');
        const journalSection = document.getElementById('journal');
        if (journalSection) {
          journalSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    document.querySelectorAll('.hero__cta a[href="#mood-tracker"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchToTab('tracker');
        const trackerSection = document.getElementById('mood-tracker');
        if (trackerSection) {
          setTimeout(() => {
            trackerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      });
    });

    // ==========================================
    // STATS BANNER
    // ==========================================
    function updateStatsBanner() {
      const streakEl = document.getElementById('streakCount');
      const journalEl = document.getElementById('journalCount');
      const breathingEl = document.getElementById('breathingMinutes');
      const avgMoodEl = document.getElementById('avgMoodDisplay');
      
      if (streakEl) streakEl.textContent = WellnessStorage.getStreak().count;
      if (journalEl) journalEl.textContent = WellnessStorage.getJournalEntries().length;
      if (breathingEl) breathingEl.textContent = WellnessStorage.getBreathingMinutes();
      
      // Calculate avg mood
      const moodLogs = WellnessStorage.getMoodLogs().slice(0, 7);
      if (moodLogs.length && avgMoodEl) {
        const moodValues = { happy: 5, calm: 4, sad: 2, anxious: 2, stressed: 2, angry: 1 };
        const avg = moodLogs.reduce((sum, m) => sum + (moodValues[m.mood] || 3), 0) / moodLogs.length;
        const emojis = ['😢', '😕', '😐', '🙂', '😊'];
        avgMoodEl.textContent = emojis[Math.round(avg) - 1] || '😐';
      }
    }
    updateStatsBanner();

    // ==========================================
    // ENHANCED BREATHING COACH
    // ==========================================
    const circle = document.getElementById('breathCircle');
    const toggle = document.getElementById('breathToggle');
    const pattern = document.getElementById('breathPattern');
    const label = document.getElementById('breathLabel');
    const phaseText = document.getElementById('breathPhaseText');
    const breathTimer = document.getElementById('breathTimer');
    const progressBar = document.getElementById('breathProgressBar');
    
    let breathRunning = false;
    let breathInterval = null;
    let breathStartTime = null;
    let breathPhase = 0;
    let breathSessionSeconds = 0;
    
    const patterns = {
      calm: { phases: ['Inhale', 'Exhale'], durations: [4, 4], total: 8 },
      box: { phases: ['Inhale', 'Hold', 'Exhale', 'Hold'], durations: [4, 4, 4, 4], total: 16 },
      '478': { phases: ['Inhale', 'Hold', 'Exhale'], durations: [4, 7, 8], total: 19 },
      energize: { phases: ['Inhale', 'Exhale'], durations: [2, 2], total: 4 }
    };

    function updateBreathUI() {
      const patternName = pattern ? pattern.value : 'calm';
      const p = patterns[patternName];
      if (label) {
        const desc = p.phases.map((ph, i) => `${ph} ${p.durations[i]}s`).join(' • ');
        label.textContent = desc;
      }
    }

    function animateBreath() {
      if (!breathRunning) return;
      const patternName = pattern ? pattern.value : 'calm';
      const p = patterns[patternName];
      
      const now = Date.now();
      const elapsed = (now - breathStartTime) / 1000;
      breathSessionSeconds = Math.floor(elapsed);
      
      // Update timer display
      if (breathTimer) {
        const mins = Math.floor(elapsed / 60);
        const secs = Math.floor(elapsed % 60);
        breathTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }

      // Calculate phase
      const cycleTime = elapsed % p.total;
      let accumulated = 0;
      let currentPhase = 0;
      let phaseProgress = 0;
      
      for (let i = 0; i < p.durations.length; i++) {
        if (cycleTime < accumulated + p.durations[i]) {
          currentPhase = i;
          phaseProgress = (cycleTime - accumulated) / p.durations[i];
          break;
        }
        accumulated += p.durations[i];
      }

      // Update phase text
      if (phaseText) {
        phaseText.textContent = p.phases[currentPhase];
      }

      // Animate circle
      if (circle) {
        const isInhale = p.phases[currentPhase].toLowerCase() === 'inhale';
        const isExhale = p.phases[currentPhase].toLowerCase() === 'exhale';
        let scale = 1;
        
        if (isInhale) {
          scale = 0.9 + (phaseProgress * 0.2);
        } else if (isExhale) {
          scale = 1.1 - (phaseProgress * 0.2);
        } else {
          scale = currentPhase === 1 ? 1.1 : 0.9;
        }
        
        circle.style.transform = `scale(${scale})`;
      }

      // Update progress bar
      if (progressBar) {
        progressBar.style.width = `${(cycleTime / p.total) * 100}%`;
      }

      breathInterval = requestAnimationFrame(animateBreath);
    }

    function startBreathing() {
      breathRunning = true;
      breathStartTime = Date.now();
      if (toggle) {
        toggle.innerHTML = '<span class="btn-icon">⏸</span> Pause';
      }
      updateBreathUI();
      animateBreath();
      WellnessStorage.updateStreak();
      WellnessStorage.addActivity('breathing', 'Started breathing exercise');
    }

    function stopBreathing() {
      breathRunning = false;
      if (breathInterval) {
        cancelAnimationFrame(breathInterval);
        breathInterval = null;
      }
      if (toggle) {
        toggle.innerHTML = '<span class="btn-icon">▶</span> Start';
      }
      if (phaseText) phaseText.textContent = 'Paused';
      if (circle) circle.style.transform = 'scale(1)';
      
      // Save breathing minutes
      if (breathSessionSeconds > 30) {
        const mins = Math.round(breathSessionSeconds / 60);
        if (mins > 0) {
          WellnessStorage.addBreathingMinutes(mins);
          updateStatsBanner();
        }
      }
    }

    if (toggle && circle) {
      toggle.addEventListener('click', () => {
        if (breathRunning) {
          stopBreathing();
        } else {
          startBreathing();
        }
      });
    }

    if (pattern) {
      updateBreathUI();
      pattern.addEventListener('change', () => {
        updateBreathUI();
        if (breathRunning) {
          breathStartTime = Date.now(); // Reset cycle
        }
      });
    }

    // ==========================================
    // ENHANCED GROUNDING EXERCISE
    // ==========================================
    const groundingStart = document.getElementById('groundingStart');
    const groundingReset = document.getElementById('groundingReset');
    const groundingPrompt = document.getElementById('groundingPrompt');
    const groundingInputArea = document.getElementById('groundingInputArea');
    const groundingInput = document.getElementById('groundingInput');
    const groundingNext = document.getElementById('groundingNext');
    const groundingProgress = document.querySelectorAll('.grounding-step');
    const groundingCircles = document.querySelectorAll('.grounding-circle');
    
    let groundingStep = 5;
    let groundingResponses = [];
    
    const groundingPrompts = {
      5: { text: 'Look around and name 5 things you can SEE 👁️', sense: 'see', examples: 'a plant, your hands, a book...' },
      4: { text: 'Notice 4 things you can TOUCH ✋', sense: 'touch', examples: 'your clothes, the chair, your phone...' },
      3: { text: 'Listen for 3 sounds you can HEAR 👂', sense: 'hear', examples: 'birds, traffic, your breath...' },
      2: { text: 'Identify 2 things you can SMELL 👃', sense: 'smell', examples: 'coffee, fresh air, soap...' },
      1: { text: 'Notice 1 thing you can TASTE 👅', sense: 'taste', examples: 'toothpaste, coffee, just your mouth...' }
    };

    function updateGroundingUI() {
      // Update progress dots
      groundingProgress.forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        if (stepNum === groundingStep) {
          step.classList.add('active');
        } else if (stepNum > groundingStep) {
          step.classList.add('completed');
        }
      });
      
      // Update circles
      groundingCircles.forEach(circle => {
        const stepNum = parseInt(circle.dataset.step);
        circle.classList.remove('active', 'completed');
        if (stepNum === groundingStep) {
          circle.classList.add('active');
        } else if (stepNum > groundingStep) {
          circle.classList.add('completed');
        }
      });
    }

    function startGrounding() {
      groundingStep = 5;
      groundingResponses = [];
      if (groundingPrompt) {
        groundingPrompt.textContent = groundingPrompts[5].text;
      }
      if (groundingInputArea) groundingInputArea.classList.remove('hidden');
      if (groundingInput) {
        groundingInput.value = '';
        groundingInput.placeholder = groundingPrompts[5].examples;
        groundingInput.focus();
      }
      if (groundingStart) groundingStart.disabled = true;
      if (groundingReset) groundingReset.disabled = false;
      updateGroundingUI();
      WellnessStorage.addActivity('grounding', 'Started 5-4-3-2-1 grounding');
    }

    function nextGroundingStep() {
      if (groundingInput && groundingInput.value.trim()) {
        groundingResponses.push({
          step: groundingStep,
          sense: groundingPrompts[groundingStep].sense,
          response: groundingInput.value.trim()
        });
      }
      
      groundingStep--;
      
      if (groundingStep < 1) {
        // Complete!
        if (groundingPrompt) {
          groundingPrompt.innerHTML = '✨ <strong>Well done!</strong> You are grounded in the present moment.';
        }
        if (groundingInputArea) groundingInputArea.classList.add('hidden');
        if (groundingStart) {
          groundingStart.disabled = false;
          groundingStart.textContent = '🔄 Do Again';
        }
        WellnessStorage.updateStreak();
        updateStatsBanner();
        return;
      }
      
      if (groundingPrompt) {
        groundingPrompt.textContent = groundingPrompts[groundingStep].text;
      }
      if (groundingInput) {
        groundingInput.value = '';
        groundingInput.placeholder = groundingPrompts[groundingStep].examples;
        groundingInput.focus();
      }
      updateGroundingUI();
    }

    function resetGrounding() {
      groundingStep = 5;
      groundingResponses = [];
      if (groundingPrompt) {
        groundingPrompt.textContent = 'Press Start to begin the guided grounding exercise';
      }
      if (groundingInputArea) groundingInputArea.classList.add('hidden');
      if (groundingStart) {
        groundingStart.disabled = false;
        groundingStart.textContent = '🌿 Start Exercise';
      }
      if (groundingReset) groundingReset.disabled = true;
      groundingProgress.forEach(step => step.classList.remove('active', 'completed'));
      groundingCircles.forEach(circle => circle.classList.remove('active', 'completed'));
    }

    if (groundingStart) groundingStart.addEventListener('click', startGrounding);
    if (groundingReset) groundingReset.addEventListener('click', resetGrounding);
    if (groundingNext) groundingNext.addEventListener('click', nextGroundingStep);
    if (groundingInput) {
      groundingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') nextGroundingStep();
      });
    }

    // ==========================================
    // MOOD CHECK WITH TIPS
    // ==========================================
    const moodButtons = document.querySelectorAll('.mood-btn');
    const moodTipCard = document.getElementById('moodTipCard');
    const moodTip = document.getElementById('moodTip');
    const moodTipEmoji = document.getElementById('moodTipEmoji');
    const moodTipTitle = document.getElementById('moodTipTitle');
    const moodDoBreathing = document.getElementById('moodDoBreathing');
    const moodLogIt = document.getElementById('moodLogIt');
    
    const moodTips = {
      stressed: {
        emoji: '😰',
        title: 'Feeling stressed?',
        tip: 'Try box breathing (4-4-4-4) for 1 minute. Unclench your jaw, drop your shoulders, and take a deep breath. This too shall pass.'
      },
      anxious: {
        emoji: '😟',
        title: 'Feeling anxious?',
        tip: 'Use the 5-4-3-2-1 grounding technique to anchor yourself in the present. Focus on what you can control right now.'
      },
      sad: {
        emoji: '😢',
        title: 'Feeling sad?',
        tip: 'It\'s okay to feel this way. Consider reaching out to someone you trust, or write about your feelings in your journal.'
      },
      angry: {
        emoji: '😤',
        title: 'Feeling angry?',
        tip: 'Take slow, deep breaths. Exhale longer than you inhale. Consider a short walk or physical movement to release the tension.'
      },
      calm: {
        emoji: '😌',
        title: 'Feeling calm',
        tip: 'Wonderful! This is a great time to reflect on what\'s working well. Consider journaling about this peaceful moment.'
      },
      happy: {
        emoji: '😊',
        title: 'Feeling happy!',
        tip: 'That\'s great! Savor this moment. You might want to write in your gratitude journal about what\'s bringing you joy.'
      }
    };

    let selectedMood = null;

    moodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        const emoji = btn.dataset.emoji;
        
        moodButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        selectedMood = { mood, emoji };
        
        const tipData = moodTips[mood];
        if (tipData && moodTipCard) {
          moodTipCard.classList.remove('hidden');
          if (moodTipEmoji) moodTipEmoji.textContent = tipData.emoji;
          if (moodTipTitle) moodTipTitle.textContent = tipData.title;
          if (moodTip) moodTip.textContent = tipData.tip;
        }
      });
    });

    if (moodDoBreathing) {
      moodDoBreathing.addEventListener('click', () => {
        document.getElementById('breathe')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (moodLogIt) {
      moodLogIt.addEventListener('click', () => {
        if (selectedMood) {
          WellnessStorage.addMoodLog(selectedMood.mood, selectedMood.emoji);
          WellnessStorage.addActivity('mood', `Logged mood: ${selectedMood.emoji} ${selectedMood.mood}`);
          updateStatsBanner();
          if (moodTip) moodTip.textContent = '✅ Mood logged! Check your tracker to see patterns over time.';
        }
      });
    }

    // ==========================================
    // 3-MINUTE RESET TIMER
    // ==========================================
    const rStart = document.getElementById('routineStart');
    const rStop = document.getElementById('routineStop');
    const rStatus = document.getElementById('routineStatus');
    const rTimerText = document.getElementById('routineTimerText');
    const rTimerProgress = document.getElementById('routineTimerProgress');
    const routineSteps = document.querySelectorAll('.routine-step');
    
    let routineTimer = null;
    let routineEndTime = 0;
    const ROUTINE_DURATION = 180; // 3 minutes in seconds
    const circumference = 2 * Math.PI * 45;

    function updateRoutineTimer() {
      const remaining = Math.max(0, (routineEndTime - Date.now()) / 1000);
      const elapsed = ROUTINE_DURATION - remaining;
      
      if (remaining <= 0) {
        clearInterval(routineTimer);
        routineTimer = null;
        if (rStatus) rStatus.textContent = '✨ Reset complete! Great job.';
        if (rStart) rStart.disabled = false;
        if (rStop) rStop.disabled = true;
        WellnessStorage.updateStreak();
        WellnessStorage.addActivity('routine', 'Completed 3-minute reset');
        updateStatsBanner();
        return;
      }
      
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      if (rTimerText) rTimerText.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      
      // Update progress circle
      if (rTimerProgress) {
        const progress = remaining / ROUTINE_DURATION;
        rTimerProgress.style.strokeDashoffset = circumference * (1 - progress);
      }
      
      // Highlight current step
      routineSteps.forEach(step => {
        const stepTime = parseInt(step.dataset.time);
        step.classList.remove('active', 'completed');
        if (elapsed >= stepTime && elapsed < stepTime + 45) {
          step.classList.add('active');
        } else if (elapsed >= stepTime + 45) {
          step.classList.add('completed');
        }
      });

      // Update status message
      if (elapsed < 45) {
        if (rStatus) rStatus.textContent = '🌬️ Focus on slow, deep breaths...';
      } else if (elapsed < 90) {
        if (rStatus) rStatus.textContent = '🌿 Ground yourself with your senses...';
      } else if (elapsed < 120) {
        if (rStatus) rStatus.textContent = '🧘 Gently stretch your shoulders and neck...';
      } else {
        if (rStatus) rStatus.textContent = '💭 Think of one small, doable next step...';
      }
    }

    if (rStart && rStop) {
      // Set initial progress circle
      if (rTimerProgress) {
        rTimerProgress.style.strokeDasharray = circumference;
        rTimerProgress.style.strokeDashoffset = 0;
      }
      
      rStart.addEventListener('click', () => {
        routineEndTime = Date.now() + (ROUTINE_DURATION * 1000);
        if (routineTimer) clearInterval(routineTimer);
        routineTimer = setInterval(updateRoutineTimer, 250);
        rStart.disabled = true;
        rStop.disabled = false;
        WellnessStorage.addActivity('routine', 'Started 3-minute reset');
        updateRoutineTimer();
      });
      
      rStop.addEventListener('click', () => {
        if (routineTimer) {
          clearInterval(routineTimer);
          routineTimer = null;
        }
        if (rStatus) rStatus.textContent = 'Stopped';
        if (rTimerText) rTimerText.textContent = '3:00';
        if (rTimerProgress) rTimerProgress.style.strokeDashoffset = 0;
        routineSteps.forEach(step => step.classList.remove('active', 'completed'));
        rStart.disabled = false;
        rStop.disabled = true;
      });
    }

    // ==========================================
    // AFFIRMATIONS
    // ==========================================
    const affirmation = document.getElementById('affirmation');
    const affirmationCategory = document.getElementById('affirmationCategory');
    const nextAff = document.getElementById('nextAffirmation');
    const saveAff = document.getElementById('saveAffirmation');
    
    const affirmations = [
      { text: 'You are doing your best with the tools you have.', category: 'Self-compassion' },
      { text: 'This feeling is temporary. You are more than this moment.', category: 'Perspective' },
      { text: 'Small steps count. Progress, not perfection.', category: 'Growth' },
      { text: 'You deserve care and patience from yourself.', category: 'Self-love' },
      { text: 'Breathe in calm, breathe out tension.', category: 'Mindfulness' },
      { text: 'You are worthy of rest and recovery.', category: 'Self-care' },
      { text: 'Your feelings are valid, even the difficult ones.', category: 'Acceptance' },
      { text: 'You have overcome challenges before. You can do it again.', category: 'Resilience' },
      { text: 'It\'s okay to ask for help. That takes strength.', category: 'Connection' },
      { text: 'You are enough, exactly as you are right now.', category: 'Self-worth' },
      { text: 'Today is a new opportunity. Start fresh.', category: 'Hope' },
      { text: 'Your thoughts are not facts. You can question them.', category: 'Mindfulness' },
      { text: 'Be gentle with yourself. You\'re doing better than you think.', category: 'Self-compassion' },
      { text: 'You bring value to the world just by being you.', category: 'Self-worth' }
    ];

    let currentAffirmation = affirmations[0];

    if (nextAff) {
      nextAff.addEventListener('click', () => {
        const idx = Math.floor(Math.random() * affirmations.length);
        currentAffirmation = affirmations[idx];
        if (affirmation) affirmation.textContent = currentAffirmation.text;
        if (affirmationCategory) affirmationCategory.textContent = currentAffirmation.category;
      });
    }

    if (saveAff) {
      saveAff.addEventListener('click', () => {
        WellnessStorage.addJournalEntry({
          type: 'affirmation',
          title: 'Saved Affirmation',
          content: currentAffirmation.text,
          tags: ['affirmation', currentAffirmation.category.toLowerCase()]
        });
        WellnessStorage.addActivity('journal', 'Saved an affirmation');
        updateStatsBanner();
        renderJournalEntries();
        saveAff.textContent = '✅ Saved!';
        setTimeout(() => { saveAff.textContent = '💾 Save to Journal'; }, 2000);
      });
    }

    // ==========================================
    // GRATITUDE
    // ==========================================
    const gratitudeText = document.getElementById('gratitudeText');
    const saveGratitude = document.getElementById('saveGratitude');
    const gratitudeList = document.getElementById('gratitudeList');

    function renderGratitudeList() {
      if (!gratitudeList) return;
      const items = WellnessStorage.getGratitude().slice(0, 5);
      if (items.length === 0) {
        gratitudeList.innerHTML = '<p class="muted" style="text-align:center;">No gratitude entries yet. Start with something small!</p>';
        return;
      }
      gratitudeList.innerHTML = items.map(item => {
        const date = new Date(item.date);
        return `
          <div class="gratitude-item">
            <span class="gratitude-item-icon">💜</span>
            <span class="gratitude-item-text">${item.text}</span>
            <span class="gratitude-item-date">${date.toLocaleDateString()}</span>
          </div>
        `;
      }).join('');
    }

    if (saveGratitude && gratitudeText) {
      saveGratitude.addEventListener('click', () => {
        const text = gratitudeText.value.trim();
        if (!text) return;
        WellnessStorage.addGratitude(text);
        WellnessStorage.addJournalEntry({
          type: 'gratitude',
          title: 'Gratitude',
          content: text,
          tags: ['gratitude']
        });
        WellnessStorage.updateStreak();
        WellnessStorage.addActivity('gratitude', 'Added gratitude entry');
        gratitudeText.value = '';
        renderGratitudeList();
        updateStatsBanner();
        renderJournalEntries();
      });
    }
    renderGratitudeList();

    // ==========================================
    // JOURNAL
    // ==========================================
    const journalForm = document.getElementById('journalEntryForm');
    const newJournalBtn = document.getElementById('newJournalEntry');
    const closeJournalBtn = document.getElementById('closeJournalForm');
    const cancelJournalBtn = document.getElementById('cancelJournalEntry');
    const saveJournalBtn = document.getElementById('saveJournalEntry');
    const startJournalingBtn = document.getElementById('startJournaling');
    const journalEntries = document.getElementById('journalEntries');
    const journalEmptyState = document.getElementById('journalEmptyState');
    const journalFilter = document.getElementById('journalFilter');
    const journalTypeBtns = document.querySelectorAll('.journal-type-btn');
    const journalMoodBtns = document.querySelectorAll('.mood-scale-btn');
    const journalMoodSelector = document.getElementById('journalMoodSelector');
    const journalMoodValue = document.getElementById('journalMoodValue');
    const promptChips = document.querySelectorAll('.prompt-chip');
    const journalContent = document.getElementById('journalContent');
    const journalTitle = document.getElementById('journalTitle');
    const journalTagInput = document.getElementById('journalTagInput');
    const journalTags = document.getElementById('journalTags');

    let currentJournalType = 'reflection';
    let currentJournalTags = [];

    function showJournalForm() {
      if (journalForm) {
        journalForm.classList.remove('hidden');
        journalForm.scrollIntoView({ behavior: 'smooth' });
      }
    }

    function hideJournalForm() {
      if (journalForm) journalForm.classList.add('hidden');
      // Reset form
      if (journalTitle) journalTitle.value = '';
      if (journalContent) journalContent.value = '';
      currentJournalTags = [];
      renderJournalTags();
      journalTypeBtns.forEach(b => b.classList.remove('active'));
      journalTypeBtns[0]?.classList.add('active');
      currentJournalType = 'reflection';
      journalMoodBtns.forEach(b => b.classList.remove('selected'));
    }

    function renderJournalTags() {
      if (!journalTags) return;
      journalTags.innerHTML = currentJournalTags.map(tag => 
        `<span class="journal-tag">${tag}<span class="journal-tag-remove" data-tag="${tag}">×</span></span>`
      ).join('');
      
      // Add remove listeners
      journalTags.querySelectorAll('.journal-tag-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const tag = btn.dataset.tag;
          currentJournalTags = currentJournalTags.filter(t => t !== tag);
          renderJournalTags();
        });
      });
    }

    function renderJournalEntries() {
      if (!journalEntries) return;
      const filter = journalFilter ? journalFilter.value : 'all';
      let entries = WellnessStorage.getJournalEntries();
      
      if (filter !== 'all') {
        entries = entries.filter(e => e.type === filter);
      }

      if (entries.length === 0) {
        if (journalEmptyState) journalEmptyState.classList.remove('hidden');
        journalEntries.innerHTML = '';
        journalEntries.appendChild(journalEmptyState);
        return;
      }

      if (journalEmptyState) journalEmptyState.classList.add('hidden');
      
      const typeIcons = {
        reflection: '💭',
        mood: '🎭',
        gratitude: '🙏',
        goals: '🎯',
        affirmation: '✨'
      };

      const moodEmojis = ['', '😢', '😕', '😐', '🙂', '😄'];

      journalEntries.innerHTML = entries.map(entry => {
        const date = new Date(entry.createdAt);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        return `
          <div class="journal-entry-card" data-id="${entry.id}">
            <div class="journal-entry-header">
              <div class="journal-entry-meta">
                <span class="journal-entry-type">
                  ${typeIcons[entry.type] || '📝'} ${entry.type}
                </span>
                <span class="journal-entry-date">${dateStr} at ${timeStr}</span>
              </div>
              <div class="journal-entry-actions">
                <button class="journal-action-btn delete" data-id="${entry.id}">🗑️</button>
              </div>
            </div>
            ${entry.title ? `<h4 class="journal-entry-title">${entry.title}</h4>` : ''}
            ${entry.mood ? `<div class="journal-entry-mood">${moodEmojis[entry.mood]} Mood: ${entry.mood}/5</div>` : ''}
            <p class="journal-entry-content">${entry.content}</p>
            ${entry.tags && entry.tags.length ? `
              <div class="journal-entry-tags">
                ${entry.tags.map(t => `<span class="journal-entry-tag">#${t}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      // Add delete listeners
      journalEntries.querySelectorAll('.journal-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.id);
          if (confirm('Delete this journal entry?')) {
            WellnessStorage.deleteJournalEntry(id);
            renderJournalEntries();
            updateStatsBanner();
          }
        });
      });
    }

    // Journal event listeners
    if (newJournalBtn) newJournalBtn.addEventListener('click', showJournalForm);
    if (startJournalingBtn) startJournalingBtn.addEventListener('click', showJournalForm);
    if (closeJournalBtn) closeJournalBtn.addEventListener('click', hideJournalForm);
    if (cancelJournalBtn) cancelJournalBtn.addEventListener('click', hideJournalForm);
    if (journalFilter) journalFilter.addEventListener('change', renderJournalEntries);

    journalTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        journalTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentJournalType = btn.dataset.type;
        
        // Show/hide mood selector
        if (journalMoodSelector) {
          journalMoodSelector.style.display = currentJournalType === 'mood' ? 'block' : 'none';
        }
      });
    });

    journalMoodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        journalMoodBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (journalMoodValue) journalMoodValue.value = btn.dataset.value;
      });
    });

    promptChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (journalContent) {
          journalContent.value = chip.dataset.prompt + '\n\n';
          journalContent.focus();
        }
      });
    });

    if (journalTagInput) {
      journalTagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const tag = journalTagInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (tag && !currentJournalTags.includes(tag)) {
            currentJournalTags.push(tag);
            renderJournalTags();
          }
          journalTagInput.value = '';
        }
      });
    }

    if (saveJournalBtn) {
      saveJournalBtn.addEventListener('click', () => {
        const content = journalContent?.value.trim();
        if (!content) {
          alert('Please write something in your journal entry.');
          return;
        }

        const entry = {
          type: currentJournalType,
          title: journalTitle?.value.trim() || '',
          content: content,
          tags: currentJournalTags,
          mood: currentJournalType === 'mood' ? parseInt(journalMoodValue?.value || 3) : null
        };

        WellnessStorage.addJournalEntry(entry);
        WellnessStorage.updateStreak();
        WellnessStorage.addActivity('journal', `Added ${currentJournalType} entry`);
        
        if (currentJournalType === 'mood' && entry.mood) {
          const moodNames = ['', 'sad', 'low', 'neutral', 'good', 'happy'];
          const moodEmojis = ['', '😢', '😕', '😐', '🙂', '😄'];
          WellnessStorage.addMoodLog(moodNames[entry.mood], moodEmojis[entry.mood]);
        }

        hideJournalForm();
        renderJournalEntries();
        updateStatsBanner();
      });
    }

    renderJournalEntries();

    // ==========================================
    // MOOD TRACKER & CHART
    // ==========================================
    const moodChart = document.getElementById('moodChart');
    const periodBtns = document.querySelectorAll('.period-btn');
    const insightBestDay = document.getElementById('insightBestDay');
    const insightMostCommon = document.getElementById('insightMostCommon');
    const insightTrend = document.getElementById('insightTrend');

    let currentPeriod = 'week';

    function renderMoodChart() {
      if (!moodChart) return;
      const logs = WellnessStorage.getMoodLogs();
      
      const moodValues = { happy: 5, calm: 4, good: 4, neutral: 3, low: 2, sad: 2, anxious: 2, stressed: 2, angry: 1 };
      const moodColors = {
        5: '#FFD700', 4: '#90EE90', 3: '#87CEEB', 2: '#DDA0DD', 1: '#F08080'
      };

      let days = 7;
      if (currentPeriod === 'month') days = 30;
      if (currentPeriod === 'year') days = 365;

      // Get data for period
      const now = new Date();
      const periodData = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now - i * 86400000);
        const dateStr = date.toDateString();
        const dayLogs = logs.filter(l => new Date(l.date).toDateString() === dateStr);
        
        if (dayLogs.length) {
          const avgValue = dayLogs.reduce((sum, l) => sum + (moodValues[l.mood] || 3), 0) / dayLogs.length;
          periodData.push({ date, value: Math.round(avgValue), logs: dayLogs });
        } else {
          periodData.push({ date, value: null, logs: [] });
        }
      }

      // Render chart bars
      const maxBarHeight = 150;
      moodChart.innerHTML = periodData.map((d, i) => {
        if (d.value === null) {
          return `<div class="mood-chart-bar" style="height: 20px; background: var(--surface);" data-tooltip="${d.date.toLocaleDateString()}: No data"></div>`;
        }
        const height = (d.value / 5) * maxBarHeight;
        const color = moodColors[d.value] || '#87CEEB';
        const dayLabel = d.date.toLocaleDateString('en-US', { weekday: 'short' });
        return `<div class="mood-chart-bar" style="height: ${height}px; background: ${color};" data-tooltip="${dayLabel}: ${d.value}/5"></div>`;
      }).join('');

      // Calculate insights
      const validData = periodData.filter(d => d.value !== null);
      if (validData.length > 0) {
        // Best day
        const best = validData.reduce((max, d) => d.value > max.value ? d : max);
        if (insightBestDay) insightBestDay.textContent = best.date.toLocaleDateString('en-US', { weekday: 'short' });
        
        // Most common mood
        const moodCounts = {};
        validData.forEach(d => {
          const mood = ['😢', '😕', '😐', '🙂', '😊'][d.value - 1];
          moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
        const mostCommon = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
        if (insightMostCommon && mostCommon) insightMostCommon.textContent = mostCommon[0];
        
        // Trend
        if (validData.length >= 3) {
          const recent = validData.slice(-3);
          const older = validData.slice(0, Math.min(3, validData.length - 3));
          if (older.length > 0) {
            const recentAvg = recent.reduce((s, d) => s + d.value, 0) / recent.length;
            const olderAvg = older.reduce((s, d) => s + d.value, 0) / older.length;
            if (insightTrend) {
              insightTrend.textContent = recentAvg > olderAvg ? '📈 Up' : recentAvg < olderAvg ? '📉 Down' : '➡️ Stable';
            }
          }
        }
      }
    }

    periodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        periodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPeriod = btn.dataset.period;
        renderMoodChart();
      });
    });

    renderMoodChart();

    // ==========================================
    // HABIT TRACKER
    // ==========================================
    const habitDays = document.querySelectorAll('.habit-day');
    
    function renderHabits() {
      const habits = WellnessStorage.getHabits();
      const week = getCurrentWeek();
      const today = new Date().getDay();
      const dayMap = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun to day index
      
      document.querySelectorAll('.habit-item').forEach(item => {
        const habit = item.dataset.habit;
        const weekData = habits[week]?.[habit] || [];
        
        item.querySelectorAll('.habit-day').forEach(day => {
          const dayIdx = parseInt(day.dataset.day);
          day.classList.remove('completed', 'today');
          if (weekData.includes(dayIdx)) {
            day.classList.add('completed');
          }
          if (dayMap[dayIdx] === today) {
            day.classList.add('today');
          }
        });
      });
    }

    habitDays.forEach(day => {
      day.addEventListener('click', () => {
        const habitItem = day.closest('.habit-item');
        const habit = habitItem.dataset.habit;
        const dayIdx = parseInt(day.dataset.day);
        const completed = WellnessStorage.toggleHabit(habit, dayIdx);
        
        if (completed) {
          day.classList.add('completed');
          WellnessStorage.addActivity('habit', `Completed ${habit}`);
        } else {
          day.classList.remove('completed');
        }
        updateStatsBanner();
      });
    });

    renderHabits();

    // ==========================================
    // ACTIVITY TIMELINE
    // ==========================================
    const activityTimeline = document.getElementById('activityTimeline');

    function renderActivityTimeline() {
      if (!activityTimeline) return;
      const activities = WellnessStorage.getActivities().slice(0, 10);
      
      if (activities.length === 0) {
        activityTimeline.innerHTML = '<p class="muted" style="text-align:center;">No activity yet. Start your wellness journey!</p>';
        return;
      }

      const icons = {
        breathing: '🌬️',
        grounding: '🌿',
        mood: '🎭',
        journal: '📝',
        gratitude: '🙏',
        routine: '⏱️',
        habit: '✅'
      };

      activityTimeline.innerHTML = activities.map(a => {
        const date = new Date(a.date);
        const timeAgo = getTimeAgo(date);
        return `
          <div class="activity-item">
            <span class="activity-icon">${icons[a.type] || '📌'}</span>
            <div class="activity-content">
              <span class="activity-text">${a.description}</span>
              <span class="activity-time">${timeAgo}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    function getTimeAgo(date) {
      const seconds = Math.floor((new Date() - date) / 1000);
      if (seconds < 60) return 'Just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    }

    renderActivityTimeline();

  } catch (e) {
    console.error('Wellness initialization error:', e);
  }
});
