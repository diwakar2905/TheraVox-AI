"""Download and load every AI model ahead of time so nothing downloads mid-demo.

Run once (needs internet) from the project root:

    python scripts/warmup_models.py

Models are cached (~/.cache/huggingface and ~/.deepface), so later runs are instant.
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("ENVIRONMENT", "development")


def _step(name, fn):
    start = time.time()
    print(f"→ {name} ...", flush=True)
    try:
        ok, detail = fn()
    except Exception as exc:  # report and keep going so one failure doesn't hide the others
        ok, detail = False, f"{type(exc).__name__}: {exc}"
    mark = "OK  " if ok else "FAIL"
    print(f"  [{mark}] {name} ({time.time() - start:.1f}s) {detail}", flush=True)
    return ok


def warm_text():
    from app.services.text_analyzer import HF_AVAILABLE, TextAnalyzerService

    if not HF_AVAILABLE:
        return False, "transformers/torch not installed — text uses the lexicon fallback"
    analyzer = TextAnalyzerService()
    if not analyzer._ensure_hf_model():
        return False, "could not load the transformer model — text uses the lexicon fallback"
    emotion, confidence, _ = analyzer.analyze("I am so happy and grateful today!")
    return True, f"sample → {emotion} ({confidence:.0%})"


def warm_audio():
    from app.services.audio_analyzer import AudioAnalyzerService

    analyzer = AudioAnalyzerService()
    if not analyzer._ensure_hf_model():
        return False, "speech model unavailable — audio uses the acoustic fallback"
    return True, f"loaded {analyzer._hf_model_id}"


def warm_vision():
    import numpy as np

    from app.services.vision_analyzer import _DETECTOR_BACKENDS, _get_deepface, _run_deepface

    deepface, available = _get_deepface()
    if not available:
        return False, "deepface not installed — vision analysis will not detect emotions"
    blank = np.zeros((224, 224, 3), dtype=np.uint8)
    loaded = []
    for backend in _DETECTOR_BACKENDS:
        try:
            _run_deepface(blank, backend)  # downloads emotion weights + detector on first call
            loaded.append(backend)
        except Exception as exc:
            print(f"    detector '{backend}' failed: {exc}")
    if not loaded:
        return False, "no face detector backend could run"
    return True, f"emotion model ready (detectors: {', '.join(loaded)})"


if __name__ == "__main__":
    results = [
        _step("Text emotion model (DistilRoBERTa)", warm_text),
        _step("Speech emotion model (Wav2Vec2)", warm_audio),
        _step("Facial emotion model (DeepFace)", warm_vision),
    ]
    print()
    if all(results):
        print("All models are downloaded and ready for the demo.")
    else:
        print("Some models are not ready — see FAIL lines above. Those features will use fallbacks.")
    sys.exit(0 if all(results) else 1)
