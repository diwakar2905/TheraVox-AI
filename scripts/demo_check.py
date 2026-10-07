"""Pre-demo check: exercises every feature against a running TheraVox server.

    python main.py                      # in one terminal
    python scripts/demo_check.py        # in another (default http://127.0.0.1:8000)
"""

import base64
import io
import math
import struct
import sys
import time
import wave

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
results = []


def check(name, fn):
    try:
        ok, detail = fn()
    except Exception as exc:
        ok, detail = False, f"{type(exc).__name__}: {exc}"
    results.append(ok)
    print(f"[{'PASS' if ok else 'FAIL'}] {name:28} {detail}")


def _sine_wav() -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(i / 10))) for i in range(32000)))
    return buf.getvalue()


def main():
    c = httpx.Client(base_url=BASE, timeout=120)
    try:
        health = c.get("/api/health").json()
    except httpx.HTTPError:
        print(f"Server not reachable at {BASE}. Start it with: python main.py")
        sys.exit(1)

    email = f"democheck{int(time.time())}@example.com"
    reg = c.post("/api/auth/register", json={"email": email, "password": "DemoCheck123!", "full_name": "Demo Check"})
    token = reg.json().get("access_token", "")
    h = {"Authorization": f"Bearer {token}"}

    check("Server health", lambda: (health.get("status") == "ok", str(health)))
    check("Sign up / login", lambda: (reg.status_code == 201 and bool(token), f"HTTP {reg.status_code}"))
    check("Session restore", lambda: (c.post("/api/auth/refresh").status_code == 200, "refresh cookie"))

    def text():
        r = c.post("/api/analyze_text", json={"text": "I am so happy and excited today!"})
        d = r.json()
        return r.status_code == 200 and d.get("emotion") == "happy", f"{d.get('emotion')} ({d.get('confidence')})"

    check("Text emotion analysis", text)

    def crisis():
        d = c.post("/api/analyze_text", json={"text": "I want to kill myself"}).json()
        return "crisis" in d, "crisis banner shown" if "crisis" in d else "not flagged"

    check("Crisis detection", crisis)

    def audio():
        r = c.post("/api/analyze_audio", files={"file": ("demo.wav", _sine_wav(), "audio/wav")})
        status = c.get("/api/audio_status").json()
        engine = "Wav2Vec2 model" if status.get("hf_loaded") else "acoustic fallback (run warmup_models.py)"
        return r.status_code == 200 and "emotion" in r.json(), f"{r.json().get('emotion')} via {engine}"

    check("Voice emotion analysis", audio)

    def vision():
        # 1x1 PNG: verifies the pipeline (decode + model) runs; no face is expected
        png = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        r = c.post("/api/analyze_frame", json={"image": "data:image/png;base64," + png})
        d = r.json()
        return r.status_code == 200 and "faces" in d and "error" not in d, d.get("error", "pipeline OK")

    check("Face emotion pipeline", vision)

    def chat():
        r = c.post("/api/chat", json={"messages": [{"role": "user", "content": "I feel stressed"}]}, headers=h)
        d = r.json()
        mode = "OFFLINE fallback (set GROQ_API_KEY for full AI)" if d.get("model") == "offline-companion" else "Groq AI"
        return r.status_code == 200 and bool(d.get("reply")), mode

    check("AI companion chat", chat)

    for name, method, path, body in [
        ("Journal prompt", "post", "/api/journal/prompt", {"recent_mood": "calm"}),
        ("Journal insights", "post", "/api/journal/submit", {"text": "Today I felt calm and grateful."}),
        ("Emotion postcard", "post", "/api/postcard", {"emotion": "happy", "emoji": "😄", "confidence": 0.9}),
        ("Wellness entries", "post", "/api/wellness/entries", {"entry_type": "journal", "content": "demo"}),
        ("Feedback", "post", "/api/feedback", {"category": "general", "subject": "Demo", "message": "Works"}),
        ("CBT programs", "get", "/api/programs", None),
        ("Recommendations", "get", "/api/recommendations", None),
        ("Profile stats", "get", "/api/auth/me/stats", None),
        ("Data export", "get", "/api/auth/me/data", None),
    ]:
        def call(method=method, path=path, body=body):
            r = getattr(c, method)(path, json=body, headers=h) if body else getattr(c, method)(path, headers=h)
            return r.status_code in (200, 201), f"HTTP {r.status_code}"

        check(name, call)

    check("Web UI", lambda: ('id="root"' in c.get("/").text, "served at " + BASE))

    print(f"\n{sum(results)}/{len(results)} checks passed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
