import { useState, useMemo } from 'react';
import { analyzeText } from '../lib/api';
import HeroSection from '../components/shared/HeroSection';
import EmotionDisplay from '../components/shared/EmotionDisplay';
import EmotionSkeleton from '../components/shared/EmotionSkeleton';
import EmotionPostcard from '../components/shared/EmotionPostcard';
import ErrorAlert from '../components/shared/ErrorAlert';
import {
  CrisisAlertBanner,
  CrisisAlertModal,
  useCrisisCheck,
} from '../components/shared/CrisisAlertBanner';
import type { EmotionAnalysisResponse } from '../lib/api';

const EXAMPLE_TEXTS = [
  {
    text: "I'm so happy and joyful! Today is absolutely amazing, I feel elated and grateful for everything in my life!",
  },
  {
    text: "I feel so sad and depressed. I've been crying and feeling hopeless, heartbroken, and deeply lonely.",
  },
  {
    text: "I am furious and outraged! I hate this, I'm so angry and frustrated, absolutely livid about what happened!",
  },
  {
    text: "I'm terrified and so scared. The anxiety and dread are overwhelming, I'm worried and nervous about everything.",
  },
  {
    text: "This is utterly disgusting and revolting. I'm completely repulsed and sickened, it's absolutely gross.",
  },
  {
    text: "I'm completely shocked and astonished! This is so unexpected and unbelievable — wow, I'm truly amazed!",
  },
  {
    text: "The meeting is scheduled for 3pm tomorrow. I need to prepare the report and review the documents beforehand.",
  },
];

export default function TextPage() {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<EmotionAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { crisisData, showModal, handleCrisisResponse, dismissBanner, closeModal } =
    useCrisisCheck();

  const counts = useMemo(() => {
    return {
      words: text
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length,
      characters: text.length,
    };
  }, [text]);

  const handleExample = (exampleText: string) => {
    setText(exampleText);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    handleCrisisResponse(null);

    try {
      const response = await analyzeText(text);
      setResult(response);
      // The response may contain a crisis key when risk signals are found
      handleCrisisResponse(response.crisis);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <HeroSection title="Text Analysis" subtitle="Analyze emotions in written text" />

      <div className="container">
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
              Choose an example or write your own:
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleExample(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e0d8',
                fontSize: '16px',
                fontFamily: 'inherit',
              }}
            >
              <option value="">Select an example...</option>
              {EXAMPLE_TEXTS.map((example, i) => (
                <option key={i} value={example.text}>
                  {example.text.length > 65 ? example.text.substring(0, 65) + '...' : example.text}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#6b665c' }}>
            {counts.words} words • {counts.characters} characters
          </div>

          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Enter text here to analyze emotions..."
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e0d8',
              fontSize: '16px',
              fontFamily: 'inherit',
              marginBottom: '24px',
              resize: 'vertical',
            }}
          />

          {error && <ErrorAlert message={error} />}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !text.trim()}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Text'}
          </button>
        </div>

        {isAnalyzing && (
          <div id="textResult" style={{ gridColumn: '1 / -1' }}>
            <h2>Analyzing...</h2>
            <EmotionSkeleton />
          </div>
        )}

        {/* Crisis alert banner (shown when risk signals detected) */}
        {crisisData && (
          <div style={{ gridColumn: '1 / -1' }}>
            <CrisisAlertBanner
              crisis={crisisData}
              onDismiss={crisisData.severity !== 'critical' ? dismissBanner : undefined}
            />
          </div>
        )}

        {/* Full-screen crisis modal for CRITICAL severity */}
        {showModal && crisisData && (
          <CrisisAlertModal crisis={crisisData} onClose={closeModal} />
        )}

        {result && (
          <div id="textResult" style={{ gridColumn: '1 / -1' }}>
            <h2>Result</h2>
            <div className="card">
              <EmotionDisplay
                emotion={result.emotion}
                emoji={result.emoji}
                confidence={result.confidence}
                description={result.description}
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

        <div className="card" style={{ gridColumn: '1 / -1', marginTop: '32px' }}>
          <h3>About Text Analysis</h3>
          <p>
            Our dual-engine text analysis uses transformer models with fallback lexicon-based
            analysis. Features include negation handling, intensity modifiers, emotion priority
            system, and confidence calibration for accurate emotion detection.
          </p>
        </div>
      </div>
    </>
  );
}
