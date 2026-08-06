# Login, Camera, and Skin Model Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local nickname profile, real browser camera capture, Keras skin-risk inference, and risk-aware product recommendations as one tested application flow.

**Architecture:** Keep the existing `/recommend` endpoint for home-screen environment recommendations and add a multipart `/analyze` endpoint that performs image validation, model inference, environmental lookup, and risk-aware recommendation composition in one server operation. The React app stores only the nickname locally, captures or selects an image, submits it to `/analyze`, and renders the five real model probabilities; the backend returns deterministic ranking signals that reorder the existing frontend product catalog.

**Tech Stack:** React 19, Vite 8, Vitest, Testing Library, Playwright, FastAPI 0.115, Pydantic 2.9, TensorFlow 2.17.1 with Keras 3.14.1 compatibility validation, NumPy, Pillow, pytest.

## Global Constraints

- The approved design is `docs/superpowers/specs/2026-08-06-login-camera-skin-model-design.md`.
- `C:\Users\sunny\Downloads\backend_package.zip` is the only model source of truth.
- Model checksum must be `E835BB5686FF5C3DDF83BA92D52EB7CB4D2E100D1097178775B08A68F313EB15`.
- Model input is one RGB float32 tensor named `image` with shape `(None, 260, 260, 3)` and external pixel range `0~255`.
- Do not apply external `/255`, `preprocess_input`, or another `Rescaling`; the model includes internal EfficientNet rescaling.
- Output order is exactly `pigmentation`, `dryness`, `pore`, `wrinkle`, `sensitivity`.
- Threshold `0.20` is used only for badges; continuous probabilities drive ranking.
- Captured and uploaded images stay in memory and are never written to the application filesystem or logs.
- The model file and face test images remain local and ignored by normal Git.
- Nicknames are trimmed, 1–12 characters, stored only under `localStorage['dbc.nickname']`, and are not authentication credentials.
- Existing uncommitted phone-frame removal, API-proxy, location, and fallback UI changes are relevant baseline work. Preserve them exactly unless a task explicitly extends the same code path; never reset or discard them.
- Stage only files listed by the current task. Before every commit, run `git diff --cached --name-only` and confirm no unrelated file is staged.
- Product ranking weights are fixed: risk rank multipliers `1.0`, `0.75`, `0.35`; category weight `18`; ingredient weight `12` capped at 24 per target; environment match `10` capped at 20; avoid penalty `100`.
- Camera and model copy must say that the image is sent to the backend, processed in memory, immediately discarded, and is not a medical diagnosis.

## File Structure

### Backend files

- Create `backend/model/skin_multitask/README.md`: local model placement, checksum, and privacy-safe validation instructions.
- Create `backend/model/skin_multitask/inference_config.json`: tracked runtime contract copied from the ZIP.
- Create `backend/model/skin_multitask/expected_predictions.json`: tracked expected values; sample images stay ignored.
- Local-only `backend/model/skin_multitask/final_model.keras`: ignored model artifact.
- Local-only `backend/model/skin_multitask/test_images/`: ignored face fixtures.
- Create `backend/app/skin_analyzer.py`: model lifecycle, image preprocessing, prediction parsing.
- Create `backend/app/image_upload.py`: MIME, byte-size, and image-decode validation.
- Create `backend/data/skin_risk_rules.json`: risk-to-category, ingredient, and avoid mapping.
- Modify `backend/app/config.py`: model paths, checksum, upload limit, risk-rules path.
- Modify `backend/app/recommender.py`: risk signals, personalized message, enriched recommendation response.
- Modify `backend/app/schemas.py`: skin metrics, ranking signals, and analyze response schemas.
- Modify `backend/app/main.py`: model startup state, model health, multipart `/analyze` endpoint.
- Modify `backend/requirements.txt`: inference, multipart, image, and test dependencies.
- Create `backend/tests/conftest.py`: import path and shared fixtures.
- Create `backend/tests/test_model_package.py`: package path and checksum contract.
- Create `backend/tests/test_skin_analyzer.py`: preprocessing, parsing, and real sample contract.
- Create `backend/tests/test_image_upload.py`: upload policy.
- Create `backend/tests/test_risk_recommender.py`: deterministic risk-aware recommendation behavior.
- Create `backend/tests/test_analyze_api.py`: endpoint success and error responses.

### Frontend files

- Create `frontend/vitest.config.js`: jsdom test environment.
- Create `frontend/src/test/setup.js`: jest-dom setup and cleanup.
- Create `frontend/src/profile.js`: nickname normalization and storage boundary.
- Create `frontend/src/profile.test.js`: nickname storage contract.
- Create `frontend/src/screens-login.jsx`: local profile entry screen.
- Create `frontend/src/screens-login.test.jsx`: login validation and submit behavior.
- Create `frontend/src/camera.js`: media request, stream cleanup, video capture, image-file checks.
- Create `frontend/src/camera.test.js`: camera helper behavior.
- Create `frontend/src/api/client.test.js`: JSON and multipart API contract.
- Create `frontend/src/api/adapters.test.js`: analysis response mapping.
- Create `frontend/src/recommendation-ranking.js`: deterministic product scoring and sorting.
- Create `frontend/src/recommendation-ranking.test.js`: risk and avoid reordering tests.
- Modify `frontend/src/App.jsx`: login routing, user state, camera permission, real analysis lifecycle.
- Modify `frontend/src/screens-1-4.jsx`: nickname greeting, real camera, file fallback, upload initiation.
- Modify `frontend/src/screens-5-9.jsx`: request-driven progress, real result screen, ranked products, logout.
- Modify `frontend/src/api/client.js`: `/analyze` multipart client and structured errors.
- Modify `frontend/src/api/adapters.js`: map backend skin-analysis response to view data.
- Modify `frontend/src/data.jsx`: export product data only; stop using mock analysis for result routes.
- Modify `frontend/src/tokens.css`: login, camera, error, and risk-state styling where inline styles would duplicate.
- Modify `frontend/package.json` and `frontend/package-lock.json`: test and browser-test tooling.
- Create `frontend/playwright.config.js`: local backend/frontend web servers and fake camera options.
- Create `frontend/e2e/app-flow.spec.js`: login-to-analysis-to-recommendation-to-logout flow.
- Modify `README.md`: model installation and local execution steps.

---

### Task 1: Bootstrap the Backend Test Harness and Local Model Package

**Files:**
- Modify: `.gitignore`
- Modify: `backend/requirements.txt`
- Modify: `backend/app/config.py`
- Create: `backend/model/skin_multitask/README.md`
- Create: `backend/model/skin_multitask/inference_config.json`
- Create: `backend/model/skin_multitask/expected_predictions.json`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_model_package.py`
- Local-only: `backend/model/skin_multitask/final_model.keras`
- Local-only: `backend/model/skin_multitask/test_images/sample_01.jpg`
- Local-only: `backend/model/skin_multitask/test_images/sample_02.jpg`

**Interfaces:**
- Consumes: `backend_package.zip` and SHA-256 from Global Constraints.
- Produces: `settings.MODEL_DIR`, `settings.MODEL_PATH`, `settings.MODEL_CONFIG_PATH`, `settings.MODEL_EXPECTED_PATH`, `settings.MODEL_SHA256`, `settings.RISK_RULES_PATH`, and `settings.MAX_IMAGE_BYTES` for all backend tasks.

- [ ] **Step 1: Add a failing package-contract test**

```python
# backend/tests/conftest.py
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
APP_DIR = BACKEND_DIR / "app"
sys.path.insert(0, str(APP_DIR))
```

```python
# backend/tests/test_model_package.py
import hashlib
import json

from config import settings


def test_model_package_paths_and_checksum():
    assert settings.MODEL_PATH.exists()
    digest = hashlib.sha256(settings.MODEL_PATH.read_bytes()).hexdigest().upper()
    assert digest == settings.MODEL_SHA256

    config = json.loads(settings.MODEL_CONFIG_PATH.read_text(encoding="utf-8"))
    assert config["input_size"] == [260, 260]
    assert config["normalization"] == "none"
    assert config["target_columns"] == [
        "pigmentation", "dryness", "pore", "wrinkle", "sensitivity"
    ]
```

- [ ] **Step 2: Run the package-contract test and verify it fails**

Run from the repository root:

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests/test_model_package.py -q
```

Expected: FAIL because pytest and model settings/package files do not yet exist.

- [ ] **Step 3: Add exact runtime and test dependencies**

Append these requirements while preserving existing pinned packages:

```text
tensorflow==2.17.1
keras==3.14.1
numpy>=1.24,<2.0
Pillow>=10.4,<12.0
python-multipart>=0.0.9,<1.0
pytest>=8.3,<9.0
httpx>=0.27,<1.0
```

Install them:

```powershell
& ".\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
```

- [ ] **Step 4: Extract the model package into the runtime directory**

Use a temporary extraction directory, then copy only the declared package files:

```powershell
$packageZip = 'C:\Users\sunny\Downloads\backend_package.zip'
$extractDir = Join-Path $env:TEMP 'dbc_backend_package_install'
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
Expand-Archive -LiteralPath $packageZip -DestinationPath $extractDir -Force
New-Item -ItemType Directory -Force -Path 'backend\model\skin_multitask' | Out-Null
Copy-Item -LiteralPath "$extractDir\backend_package\final_model.keras" -Destination 'backend\model\skin_multitask\final_model.keras'
Copy-Item -LiteralPath "$extractDir\backend_package\inference_config.json" -Destination 'backend\model\skin_multitask\inference_config.json'
Copy-Item -LiteralPath "$extractDir\backend_package\expected_predictions.json" -Destination 'backend\model\skin_multitask\expected_predictions.json'
Copy-Item -LiteralPath "$extractDir\backend_package\test_images" -Destination 'backend\model\skin_multitask\test_images' -Recurse
```

Add only these ignore rules, preserving existing `.gitignore` edits:

```gitignore
backend/model/skin_multitask/final_model.keras
backend/model/skin_multitask/test_images/
```

- [ ] **Step 5: Add model settings and the package README**

Add to `Settings`:

```python
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BACKEND_DIR / "model" / "skin_multitask"
MODEL_PATH = MODEL_DIR / "final_model.keras"
MODEL_CONFIG_PATH = MODEL_DIR / "inference_config.json"
MODEL_EXPECTED_PATH = MODEL_DIR / "expected_predictions.json"
MODEL_SHA256 = "E835BB5686FF5C3DDF83BA92D52EB7CB4D2E100D1097178775B08A68F313EB15"
RISK_RULES_PATH = BACKEND_DIR / "data" / "skin_risk_rules.json"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
```

The README must include the ZIP source path, checksum command, ignored-file policy, and the exact `260×260 RGB`, raw `0~255`, five-output contract.

- [ ] **Step 6: Run the package test and full existing backend import smoke test**

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests/test_model_package.py -q
& ".\.venv\Scripts\python.exe" -c "import sys; sys.path.insert(0, r'backend/app'); import main; print([r.path for r in main.app.routes])"
```

Expected: package test PASS; existing `/` and `/recommend` still import.

- [ ] **Step 7: Commit only Task 1 files**

```powershell
git add .gitignore backend/requirements.txt backend/app/config.py backend/model/skin_multitask/README.md backend/model/skin_multitask/inference_config.json backend/model/skin_multitask/expected_predictions.json backend/tests/conftest.py backend/tests/test_model_package.py
git diff --cached --name-only
git commit -m "build: add local skin model runtime contract"
```

Do not stage `final_model.keras` or `test_images`.

---

### Task 2: Implement and Validate the Skin Analyzer

**Files:**
- Create: `backend/app/skin_analyzer.py`
- Create: `backend/tests/test_skin_analyzer.py`

**Interfaces:**
- Consumes: model/config paths from Task 1.
- Produces: `SkinAnalyzer.load() -> None`, `SkinAnalyzer.ready -> bool`, `SkinAnalyzer.predict_bytes(image_bytes: bytes) -> dict`, `initialize_skin_analyzer() -> None`, `get_skin_analyzer() -> SkinAnalyzer`, `analyze_image(image_bytes: bytes) -> dict`, and `model_status() -> dict`.

- [ ] **Step 1: Write failing preprocessing and output-mapping tests**

```python
from io import BytesIO

import numpy as np
from PIL import Image

from skin_analyzer import SkinAnalyzer, parse_probabilities, preprocess_image_bytes


def make_png() -> bytes:
    image = Image.new("RGB", (32, 16), (255, 128, 0))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_preprocess_keeps_raw_pixel_range():
    batch = preprocess_image_bytes(make_png(), (260, 260))
    assert batch.shape == (1, 260, 260, 3)
    assert batch.dtype == np.float32
    assert float(batch.max()) == 255.0
    assert float(batch.min()) == 0.0


def test_parse_probabilities_preserves_target_order(model_config):
    result = parse_probabilities(
        np.array([0.1, 0.2, 0.3, 0.4, 0.5], dtype=np.float32),
        model_config,
    )
    assert list(result["skin_analysis"]) == [
        "pigmentation", "dryness", "pore", "wrinkle", "sensitivity"
    ]
    assert result["main_risk"] == "sensitivity"
    assert result["focus_risks"] == ["sensitivity", "wrinkle"]
```

Add `model_config` in `conftest.py` by loading `settings.MODEL_CONFIG_PATH`.

- [ ] **Step 2: Run the unit tests and verify they fail**

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests/test_skin_analyzer.py -q
```

Expected: FAIL because `skin_analyzer` does not exist.

- [ ] **Step 3: Implement preprocessing and probability parsing**

```python
TARGET_COUNT = 5


def preprocess_image_bytes(image_bytes: bytes, input_size: tuple[int, int]) -> np.ndarray:
    with Image.open(BytesIO(image_bytes)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image = image.resize(input_size, Image.Resampling.BILINEAR)
        array = np.asarray(image, dtype=np.float32)
    return np.expand_dims(array, axis=0)


def parse_probabilities(probabilities: np.ndarray, config: dict) -> dict:
    values = np.asarray(probabilities, dtype=np.float32).reshape(-1)
    if values.shape != (TARGET_COUNT,) or not np.isfinite(values).all():
        raise InvalidModelOutputError("Expected five finite probabilities")
    if ((values < 0) | (values > 1)).any():
        raise InvalidModelOutputError("Probabilities must be in [0, 1]")
    metrics = {}
    for target, value in zip(config["target_columns"], values):
        probability = float(value)
        threshold = float(config["selected_thresholds"][target])
        metrics[target] = {
            "label_ko": config["target_labels_ko"][target],
            "probability": round(probability, 6),
            "risk_score": int(round(probability * 100)),
            "threshold": threshold,
            "risk_label": "high" if probability >= threshold else "low",
        }
    ordered = sorted(metrics, key=lambda key: metrics[key]["probability"], reverse=True)
    return {
        "skin_analysis": metrics,
        "focus_risks": ordered[:2],
        "main_risk": ordered[0],
        "main_risk_score": metrics[ordered[0]]["risk_score"],
    }
```

- [ ] **Step 4: Implement the model lifecycle**

`SkinAnalyzer.load()` must verify the checksum, load JSON, then call `keras.models.load_model(path, compile=False)`. `predict_bytes()` must require `ready`, call `model.predict(batch, verbose=0)[0]` under a `threading.Lock`, then call `parse_probabilities`.

```python
class SkinAnalyzer:
    def __init__(self, model_path: Path, config_path: Path, expected_sha256: str):
        self.model_path = model_path
        self.config_path = config_path
        self.expected_sha256 = expected_sha256
        self.config = None
        self.model = None
        self.error = None
        self._predict_lock = Lock()

    @property
    def ready(self) -> bool:
        return self.model is not None and self.error is None

    def predict_bytes(self, image_bytes: bytes) -> dict:
        if not self.ready:
            raise ModelUnavailableError("Skin model is unavailable")
        batch = preprocess_image_bytes(image_bytes, tuple(self.config["input_size"]))
        with self._predict_lock:
            probabilities = self.model.predict(batch, verbose=0)[0]
        return parse_probabilities(probabilities, self.config)
```

Complete lifecycle methods and module wrappers with these exact semantics:

```python
    def load(self) -> None:
        try:
            digest = hashlib.sha256(self.model_path.read_bytes()).hexdigest().upper()
            if digest != self.expected_sha256:
                raise ModelUnavailableError("Skin model checksum mismatch")
            self.config = json.loads(self.config_path.read_text(encoding="utf-8"))
            self.model = keras.models.load_model(self.model_path, compile=False)
            self.error = None
        except Exception as exc:
            self.model = None
            self.error = str(exc)
            raise ModelUnavailableError("Skin model failed to load") from exc


_skin_analyzer = SkinAnalyzer(
    settings.MODEL_PATH,
    settings.MODEL_CONFIG_PATH,
    settings.MODEL_SHA256,
)


def initialize_skin_analyzer() -> None:
    try:
        _skin_analyzer.load()
    except ModelUnavailableError:
        pass


def get_skin_analyzer() -> SkinAnalyzer:
    return _skin_analyzer


def analyze_image(image_bytes: bytes) -> dict:
    return _skin_analyzer.predict_bytes(image_bytes)


def model_status() -> dict:
    return {
        "ready": _skin_analyzer.ready,
        "name": (_skin_analyzer.config or {}).get("model_name", "efficientnetb2_skin_multitask"),
        "version": settings.MODEL_SHA256[:12].lower(),
        "error": None if _skin_analyzer.ready else "model_unavailable",
    }
```

- [ ] **Step 5: Add and run the real ZIP sample contract test**

```python
import json

from config import settings
from skin_analyzer import SkinAnalyzer


def test_real_model_matches_package_predictions():
    analyzer = SkinAnalyzer(
        settings.MODEL_PATH,
        settings.MODEL_CONFIG_PATH,
        settings.MODEL_SHA256,
    )
    analyzer.load()
    expected = json.loads(settings.MODEL_EXPECTED_PATH.read_text(encoding="utf-8"))
    for sample in expected["samples"]:
        image_path = settings.MODEL_DIR / sample["image_file"]
        actual = analyzer.predict_bytes(image_path.read_bytes())
        expected_metrics = sample["prediction"]["skin_analysis"]
        for target, metric in actual["skin_analysis"].items():
            assert abs(metric["probability"] - expected_metrics[target]["probability"]) <= 1e-4
```

Run:

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests/test_skin_analyzer.py -q
```

Expected: all unit and real model contract tests PASS. If model loading fails, adjust only TensorFlow/Keras package pins until this exact test passes; do not alter preprocessing or expected values.

- [ ] **Step 6: Commit Task 2**

```powershell
git add backend/app/skin_analyzer.py backend/tests/test_skin_analyzer.py backend/tests/conftest.py backend/requirements.txt
git diff --cached --name-only
git commit -m "feat: add validated skin model inference"
```

---

### Task 3: Implement Image Upload Validation

**Files:**
- Create: `backend/app/image_upload.py`
- Create: `backend/tests/test_image_upload.py`

**Interfaces:**
- Consumes: `settings.MAX_IMAGE_BYTES`.
- Produces: `validate_content_type(content_type: str | None) -> None`, `read_limited_upload(upload: UploadFile, max_bytes: int) -> bytes`, and `validate_decodable_image(image_bytes: bytes) -> None`.

- [ ] **Step 1: Write failing policy tests**

```python
import pytest
from fastapi import HTTPException

from image_upload import validate_content_type, validate_decodable_image


def test_rejects_non_image_content_type():
    with pytest.raises(HTTPException) as exc:
        validate_content_type("application/pdf")
    assert exc.value.status_code == 415


def test_rejects_undecodable_bytes():
    with pytest.raises(HTTPException) as exc:
        validate_decodable_image(b"not-an-image")
    assert exc.value.status_code == 400
```

- [ ] **Step 2: Run and observe the missing-module failure**

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests/test_image_upload.py -q
```

- [ ] **Step 3: Implement the exact validation policy**

```python
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def validate_content_type(content_type: str | None) -> None:
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="JPG, PNG, WEBP 이미지만 사용할 수 있습니다.")


async def read_limited_upload(upload: UploadFile, max_bytes: int) -> bytes:
    data = await upload.read(max_bytes + 1)
    if not data:
        raise HTTPException(status_code=400, detail="이미지 파일이 비어 있습니다.")
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="이미지는 10MB 이하여야 합니다.")
    return data


def validate_decodable_image(image_bytes: bytes) -> None:
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=400, detail="이미지를 읽을 수 없습니다.") from exc
```

Treat `Image.DecompressionBombWarning` as an error in this function using `warnings.catch_warnings()` and `simplefilter("error", Image.DecompressionBombWarning)`.

- [ ] **Step 4: Add async byte-limit tests and run all upload tests**

Use an in-memory `UploadFile` with `SpooledTemporaryFile`, assert 413 for `MAX_IMAGE_BYTES + 1`, and assert the exact bytes are returned below the limit.

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests/test_image_upload.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```powershell
git add backend/app/image_upload.py backend/tests/test_image_upload.py
git diff --cached --name-only
git commit -m "feat: validate in-memory analysis images"
```

---

### Task 4: Add Risk-Aware Recommendation Signals and Messages

**Files:**
- Create: `backend/data/skin_risk_rules.json`
- Modify: `backend/app/recommender.py`
- Create: `backend/tests/test_risk_recommender.py`

**Interfaces:**
- Consumes: analyzer `skin_analysis` mapping and existing environment/rulebook data.
- Produces: `build_ranking_signals(skin_analysis: dict, env: dict) -> list[dict]`, `build_personalized_message(nickname: str, skin_analysis: dict, env: dict, signals: list[dict]) -> str`, and extended `recommend(..., nickname: str | None = None, skin_analysis: dict | None = None) -> dict`.

- [ ] **Step 1: Write failing risk-signal tests**

```python
from recommender import build_personalized_message, build_ranking_signals


def metric(probability):
    return {"probability": probability, "risk_score": round(probability * 100)}


def sample_analysis():
    return {
        "pigmentation": metric(0.10),
        "dryness": metric(0.90),
        "pore": metric(0.20),
        "wrinkle": metric(0.30),
        "sensitivity": metric(0.80),
    }


def sample_env():
    return {"region": "조치원읍", "pm25_grade": "보통", "uv_grade": "높음", "water": "양호"}


def test_dryness_and_sensitivity_create_weighted_signals():
    analysis = sample_analysis()
    env = sample_env()
    signals = build_ranking_signals(analysis, env)
    assert signals[0]["source"] == "risk:dryness"
    assert any(s["value"] == "세라마이드" and s["weight"] > 0 for s in signals)
    assert any(s["kind"] == "avoid" and s["weight"] == -100 for s in signals)


def test_message_contains_nickname_top_risks_and_environment():
    analysis = sample_analysis()
    env = sample_env()
    signals = build_ranking_signals(analysis, env)
    message = build_personalized_message("민지", analysis, env, signals)
    assert "민지님" in message
    assert "건조" in message and "민감" in message
    assert "자외선" in message
```

- [ ] **Step 2: Run and verify failures**

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests/test_risk_recommender.py -q
```

- [ ] **Step 3: Create the explicit risk rules JSON**

The JSON must define all five targets with Korean label, categories, ingredients, and avoids. Use these exact ingredient lists:

```json
{
  "pigmentation": {"label_ko":"색소침착","categories":["선케어"],"ingredients":["나이아신아마이드","비타민C"],"avoid":[]},
  "dryness": {"label_ko":"건조","categories":["보습","에센스"],"ingredients":["히알루론산","세라마이드","판테놀"],"avoid":[]},
  "pore": {"label_ko":"모공","categories":["클렌징"],"ingredients":["BHA","나이아신아마이드"],"avoid":[]},
  "wrinkle": {"label_ko":"주름","categories":["에센스","진정·보습"],"ingredients":["펩타이드","아데노신","세라마이드"],"avoid":[]},
  "sensitivity": {"label_ko":"민감","categories":["진정·보습","미스트"],"ingredients":["센텔라","판테놀"],"avoid":["향료","에센셜오일","고농도 AHA"]}
}
```

- [ ] **Step 4: Implement deterministic signal weights**

Sort targets by probability descending. Apply multipliers `[1.0, 0.75, 0.35, 0.35, 0.35]`. Emit category signals at `18 * probability * multiplier`; emit at most two ingredient signals per target at `12 * probability * multiplier`. Emit UV/PM environment signals at weight 10 with total environment weight capped at 20. Emit avoid signals at `-100`.

Round positive signal weights to four decimals and sort by descending weight, with avoid signals last in API order. Preserve the negative value for frontend scoring.

```python
RANK_MULTIPLIERS = [1.0, 0.75, 0.35, 0.35, 0.35]


def build_ranking_signals(skin_analysis: dict, env: dict) -> list[dict]:
    ordered = sorted(
        skin_analysis,
        key=lambda target: skin_analysis[target]["probability"],
        reverse=True,
    )
    positive = []
    avoids = []
    for rank, target in enumerate(ordered):
        probability = float(skin_analysis[target]["probability"])
        multiplier = RANK_MULTIPLIERS[rank]
        rule = _RISK_RULES[target]
        reason = f"{rule['label_ko']} 위험도 {round(probability * 100)}"
        for category in rule["categories"]:
            positive.append({"kind":"category","value":category,"weight":round(18 * probability * multiplier, 4),"source":f"risk:{target}","reason":reason})
        for ingredient in rule["ingredients"][:2]:
            positive.append({"kind":"ingredient","value":ingredient,"weight":round(12 * probability * multiplier, 4),"source":f"risk:{target}","reason":reason})
        if probability >= float(skin_analysis[target].get("threshold", 0.2)):
            for value in rule["avoid"]:
                avoids.append({"kind":"avoid","value":value,"weight":-100.0,"source":f"risk:{target}","reason":reason})

    environment = []
    if env["uv_grade"] in {"높음", "매우높음"}:
        environment.append({"kind":"category","value":"선케어","weight":10.0,"source":"environment:uv","reason":f"자외선 {env['uv_grade']}"})
        avoids.extend([
            {"kind":"avoid","value":"고농도 AHA","weight":-100.0,"source":"environment:uv","reason":f"자외선 {env['uv_grade']}"},
            {"kind":"avoid","value":"레티놀","weight":-100.0,"source":"environment:uv","reason":f"자외선 {env['uv_grade']}"},
        ])
    if env["pm25_grade"] in {"나쁨", "매우나쁨"}:
        environment.extend([
            {"kind":"category","value":"클렌징","weight":10.0,"source":"environment:pm25","reason":f"미세먼지 {env['pm25_grade']}"},
            {"kind":"ingredient","value":"센텔라","weight":10.0,"source":"environment:pm25","reason":f"미세먼지 {env['pm25_grade']}"},
        ])

    deduplicated_avoids = list({(s["kind"], s["value"]): s for s in avoids}.values())
    return sorted(positive, key=lambda signal: signal["weight"], reverse=True) + environment[:2] + deduplicated_avoids
```

- [ ] **Step 5: Extend recommendation assembly without breaking `/recommend`**

```python
def recommend(
    lat: float,
    lng: float,
    skin_type: str,
    nickname: str | None = None,
    skin_analysis: dict | None = None,
) -> dict:
    env, is_fallback = get_env_data(lat, lng)
    rule = match_rule(skin_type, env["pm25_grade"], env["uv_grade"])
    signals = build_ranking_signals(skin_analysis, env) if skin_analysis else []
    message = (
        build_personalized_message(nickname or "고객", skin_analysis, env, signals)
        if skin_analysis
        else build_message(env, rule)
    )
    return {
        "message": message,
        "env_data": build_env_response(env),
        "recommendations": merge_recommendations(rule, signals),
        "avoid": merge_avoid(rule, signals),
        "ranking_signals": signals,
        "rule_id": rule.get("rule_id", "unknown"),
        "is_fallback": is_fallback,
    }
```

Define every helper referenced above in the same task:

```python
def build_env_response(env: dict) -> dict:
    return {
        "region": env["region"],
        "pm25": env["pm25"],
        "pm25_grade": env["pm25_grade"],
        "uv": env["uv"],
        "uv_grade": env["uv_grade"],
        "water": env["water"],
    }


def merge_recommendations(rule: dict, signals: list[dict]) -> list[dict]:
    items = []
    seen = set()
    positive = [signal for signal in signals if signal["kind"] in {"category", "ingredient"}]
    for category_signal in [s for s in positive if s["kind"] == "category"]:
        ingredients = [s for s in positive if s["kind"] == "ingredient" and s["source"] == category_signal["source"]]
        ingredient = ingredients[0]["value"] if ingredients else category_signal["value"]
        key = (category_signal["value"], ingredient)
        if key not in seen:
            seen.add(key)
            items.append({"step": len(items) + 1, "category": key[0], "ingredient": key[1]})
    for original in rule.get("recommendations", []):
        key = (original["category"], original["ingredient"])
        if key not in seen:
            seen.add(key)
            items.append({**original, "step": len(items) + 1})
    return items


def merge_avoid(rule: dict, signals: list[dict]) -> list[str]:
    values = [*rule.get("avoid", []), *[s["value"] for s in signals if s["kind"] == "avoid"]]
    return list(dict.fromkeys(values))
```

`build_personalized_message` derives the two highest-probability labels directly from `skin_analysis`, mentions only environment conditions that are actually elevated, and selects the first two positive signal values for the final recommendation phrase.

- [ ] **Step 6: Run legacy and new recommender tests**

Add a test that `recommend(..., skin_analysis=None)` retains an empty `ranking_signals` list and the old environment message style. Mock `get_env_data` so tests never call the network.

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests/test_risk_recommender.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```powershell
git add backend/data/skin_risk_rules.json backend/app/recommender.py backend/tests/test_risk_recommender.py backend/app/config.py
git diff --cached --name-only
git commit -m "feat: personalize recommendations from skin risks"
```

---

### Task 5: Add the Multipart Analyze API

**Files:**
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_analyze_api.py`

**Interfaces:**
- Consumes: Task 2 analyzer, Task 3 upload validation, Task 4 extended recommender.
- Produces: `POST /analyze`, model state in `GET /`, and typed `AnalyzeResponse`.

- [ ] **Step 1: Write failing endpoint tests with a fake analyzer**

```python
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

import main


def png_bytes():
    output = BytesIO()
    Image.new("RGB", (260, 260), "peachpuff").save(output, format="PNG")
    return output.getvalue()


def test_analyze_returns_model_and_personalized_recommendation(monkeypatch):
    fake_analysis = {
        "skin_analysis": {
            target: {"label_ko": target, "probability": value, "risk_score": round(value * 100), "threshold": 0.2, "risk_label": "high"}
            for target, value in zip(
                ["pigmentation", "dryness", "pore", "wrinkle", "sensitivity"],
                [0.1, 0.9, 0.2, 0.3, 0.8],
            )
        },
        "focus_risks": ["dryness", "sensitivity"],
        "main_risk": "dryness",
        "main_risk_score": 90,
    }
    monkeypatch.setattr(main, "initialize_skin_analyzer", lambda: None)
    monkeypatch.setattr(main, "analyze_image", lambda _: fake_analysis)
    monkeypatch.setattr(main.recommender, "recommend", lambda **kwargs: {
        "message": "민지님은 건조와 민감 관리가 필요해요.",
        "env_data": {"region":"조치원읍","pm25":20,"pm25_grade":"좋음","uv":6,"uv_grade":"높음","water":"양호"},
        "recommendations": [], "avoid": [], "ranking_signals": [], "rule_id":"default_basic", "is_fallback": True,
    })
    with TestClient(main.app) as client:
        response = client.post(
            "/analyze",
            data={"nickname":"민지","lat":"36.62","lng":"127.29","skin_type":"dry_sensitive"},
            files={"image": ("face.png", png_bytes(), "image/png")},
        )
    assert response.status_code == 200
    assert response.json()["main_risk"] == "dryness"
    assert "민지님" in response.json()["message"]
```

- [ ] **Step 2: Run and verify the route is missing**

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests/test_analyze_api.py -q
```

Expected: FAIL with 404 or missing schema/import.

- [ ] **Step 3: Add exact Pydantic response models**

Create `SkinMetric`, `RankingSignal`, and `AnalyzeResponse`. `AnalyzeResponse.skin_analysis` is `Dict[str, SkinMetric]`; `focus_risks` is `List[str]`; include `analyzed_at`, model name/version, main risk fields, message, env data, recommendations, avoid, ranking signals, rule ID, and fallback flag.

```python
class SkinMetric(BaseModel):
    label_ko: str
    probability: float = Field(..., ge=0, le=1)
    risk_score: int = Field(..., ge=0, le=100)
    threshold: float = Field(..., ge=0, le=1)
    risk_label: str


class RankingSignal(BaseModel):
    kind: str
    value: str
    weight: float
    source: str
    reason: str


class ModelInfo(BaseModel):
    name: str
    version: str


class AnalyzeResponse(BaseModel):
    analyzed_at: datetime
    model: ModelInfo
    skin_analysis: Dict[str, SkinMetric]
    focus_risks: List[str]
    main_risk: str
    main_risk_score: int = Field(..., ge=0, le=100)
    message: str
    env_data: EnvData
    recommendations: List[RecommendItem]
    avoid: List[str]
    ranking_signals: List[RankingSignal]
    rule_id: str
    is_fallback: bool
```

- [ ] **Step 4: Add startup initialization and model health**

Call `initialize_skin_analyzer()` inside the existing startup handler after `check_keys()`. Catch its exception inside the analyzer initializer so the API can start with status `unavailable`. Extend `/` with:

```python
"model": model_status()
```

- [ ] **Step 5: Implement `/analyze` with in-memory processing**

```python
@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_skin(
    image: UploadFile = File(...),
    nickname: str = Form(..., min_length=1, max_length=12),
    lat: float = Form(...),
    lng: float = Form(...),
    skin_type: str = Form(...),
):
    clean_nickname = nickname.strip()
    if not clean_nickname or len(clean_nickname) > 12:
        raise HTTPException(status_code=422, detail="닉네임은 1~12자로 입력해 주세요.")
    validate_content_type(image.content_type)
    image_bytes = await read_limited_upload(image, settings.MAX_IMAGE_BYTES)
    validate_decodable_image(image_bytes)
    try:
        analysis = await run_in_threadpool(analyze_image, image_bytes)
        recommendation = await run_in_threadpool(
            recommender.recommend,
            lat, lng, skin_type, clean_nickname, analysis["skin_analysis"],
        )
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail="피부 분석 모델을 사용할 수 없습니다.") from exc
    except InvalidModelOutputError as exc:
        raise HTTPException(status_code=500, detail="피부 분석 결과를 확인할 수 없습니다.") from exc
    return assemble_analyze_response(analysis, recommendation)
```

Use keyword arguments via `functools.partial` if `run_in_threadpool` in the installed Starlette version does not forward them.

Define response assembly in `main.py` so the endpoint has no undeclared helper:

```python
def assemble_analyze_response(analysis: dict, recommendation: dict) -> dict:
    status = model_status()
    return {
        "analyzed_at": datetime.now(timezone.utc),
        "model": {"name": status["name"], "version": status["version"]},
        **analysis,
        **recommendation,
    }
```

Import `datetime` and `timezone` from `datetime`. Ensure neither input dictionary can overwrite `analyzed_at` or `model` by constructing those fields after the dictionary expansions in the actual implementation:

```python
return {
    **analysis,
    **recommendation,
    "analyzed_at": datetime.now(timezone.utc),
    "model": {"name": status["name"], "version": status["version"]},
}
```

- [ ] **Step 6: Add error response tests**

Cover 415 for PDF, 413 for oversized bytes, 400 for corrupt image, 422 for blank nickname, and 503 when analyzer is unavailable. Assert error bodies do not contain model paths or raw exception strings.

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests/test_analyze_api.py backend/tests/test_image_upload.py -q
```

Expected: PASS.

- [ ] **Step 7: Run all backend tests**

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests -q
```

Expected: all tests PASS, including real model sample predictions.

- [ ] **Step 8: Commit Task 5**

```powershell
git add backend/app/schemas.py backend/app/main.py backend/tests/test_analyze_api.py
git diff --cached --name-only
git commit -m "feat: add in-memory skin analysis endpoint"
```

---

### Task 6: Add Frontend Test Tooling and the Nickname Login

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/test/setup.js`
- Create: `frontend/src/profile.js`
- Create: `frontend/src/profile.test.js`
- Create: `frontend/src/screens-login.jsx`
- Create: `frontend/src/screens-login.test.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/screens-1-4.jsx`
- Modify: `frontend/src/screens-5-9.jsx`
- Modify: `frontend/src/tokens.css`

**Interfaces:**
- Consumes: existing screen registry and App context.
- Produces: `normalizeNickname`, `readNickname`, `saveNickname`, `clearNickname`, `ScreenLogin`, and context members `user`, `login(nickname)`, `logout()`.

- [ ] **Step 1: Install and configure Vitest**

```powershell
Set-Location frontend
npm.cmd install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create config:

```js
// frontend/vitest.config.js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    clearMocks: true,
  },
})
```

```js
// frontend/src/test/setup.js
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
})
```

- [ ] **Step 2: Write failing nickname storage tests**

```js
import { describe, expect, it } from 'vitest'
import { clearNickname, normalizeNickname, readNickname, saveNickname } from './profile'

describe('local nickname profile', () => {
  it('trims and stores a valid nickname', () => {
    expect(saveNickname('  민지  ')).toBe('민지')
    expect(readNickname()).toBe('민지')
  })

  it('rejects empty and longer-than-12 nicknames', () => {
    expect(() => normalizeNickname('   ')).toThrow('닉네임')
    expect(() => normalizeNickname('1234567890123')).toThrow('12')
  })

  it('clears the stored nickname', () => {
    saveNickname('민지')
    clearNickname()
    expect(readNickname()).toBe('')
  })
})
```

- [ ] **Step 3: Run and verify the profile module is missing**

```powershell
npm.cmd test -- src/profile.test.js
```

- [ ] **Step 4: Implement the storage boundary**

```js
export const PROFILE_STORAGE_KEY = 'dbc.nickname'

export function normalizeNickname(value) {
  const nickname = String(value ?? '').trim()
  if (!nickname) throw new Error('닉네임을 입력해 주세요.')
  if (nickname.length > 12) throw new Error('닉네임은 12자 이하여야 합니다.')
  return nickname
}

export function readNickname(storage = localStorage) {
  return storage.getItem(PROFILE_STORAGE_KEY)?.trim() || ''
}

export function saveNickname(value, storage = localStorage) {
  const nickname = normalizeNickname(value)
  storage.setItem(PROFILE_STORAGE_KEY, nickname)
  return nickname
}

export function clearNickname(storage = localStorage) {
  storage.removeItem(PROFILE_STORAGE_KEY)
}
```

- [ ] **Step 5: Write failing login-screen tests**

Render `ScreenLogin` with `{ login: vi.fn() }`, type `민지`, submit, and assert `login('민지')`. Submit whitespace and assert the Korean validation message is visible. Assert the copy contains `로컬 프로필`.

- [ ] **Step 6: Implement `ScreenLogin` and App routing**

`ScreenLogin` uses the existing `Button`, design tokens, and one text input. In `App`:

```jsx
// frontend/src/screens-login.jsx
import React from 'react'
import { Button } from './ui'
import { normalizeNickname } from './profile'

export function ScreenLogin({ ctx }) {
  const [nickname, setNickname] = React.useState('')
  const [error, setError] = React.useState('')

  const submit = event => {
    event.preventDefault()
    try {
      ctx.login(normalizeNickname(nickname))
    } catch (validationError) {
      setError(validationError.message)
    }
  }

  return (
    <div className="screen login-screen anim-fade">
      <form className="login-card" onSubmit={submit}>
        <div className="t-tiny">DYNAMIC BEAUTY CURATOR</div>
        <h1 className="h-display">어떻게 불러드릴까요?</h1>
        <p className="t-body">닉네임은 이 기기의 로컬 프로필에만 저장됩니다.</p>
        <label htmlFor="nickname">닉네임</label>
        <input id="nickname" value={nickname} maxLength={12} onChange={event => setNickname(event.target.value)} autoComplete="nickname" />
        {error && <p role="alert">{error}</p>}
        <Button type="submit" variant="primary" size="xl" fullWidth>계속하기</Button>
      </form>
    </div>
  )
}
```

Ensure the shared `Button` forwards `type`; if it currently hardcodes or omits the attribute, extend it without changing existing call sites.

In `App`:

```js
const storedNickname = readNickname()
const [route, setRoute] = useState(storedNickname ? 'home' : 'login')
const [user, setUser] = useState({ nickname: storedNickname })

const login = useCallback((value) => {
  const nickname = saveNickname(value)
  setUser({ nickname })
  setRoute('onboarding')
}, [])

const logout = useCallback(() => {
  clearNickname()
  setUser({ nickname: '' })
  setLastAnalysis(null)
  setRoute('login')
}, [])
```

Add `login` to `SCREENS`, context, home greeting, my-page name/avatar, and logout click. Replace the fixed email with `이 기기에 저장된 로컬 프로필`.

- [ ] **Step 7: Run login/profile tests, lint, and build**

```powershell
npm.cmd test -- src/profile.test.js src/screens-login.test.jsx
npm.cmd run lint
npm.cmd run build
```

Expected: all commands exit 0 and `rg -n "김세현|세현님" src` returns no user-visible hard-coded name.

- [ ] **Step 8: Commit Task 6**

```powershell
git add package.json package-lock.json vitest.config.js src/test/setup.js src/profile.js src/profile.test.js src/screens-login.jsx src/screens-login.test.jsx src/App.jsx src/screens-1-4.jsx src/screens-5-9.jsx src/tokens.css
git diff --cached --name-only
git commit -m "feat: add local nickname login"
```

Run the commit commands from `frontend`; paths are intentionally frontend-relative.

---

### Task 7: Implement Real Camera Capture and File Fallback

**Files:**
- Create: `frontend/src/camera.js`
- Create: `frontend/src/camera.test.js`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/screens-1-4.jsx`
- Modify: `frontend/src/tokens.css`

**Interfaces:**
- Consumes: App context and browser media APIs.
- Produces: `requestUserCamera(mediaDevices) -> Promise<MediaStream>`, `stopMediaStream(stream)`, `captureVideoFrame(video, canvas?) -> Promise<Blob>`, `validateSelectedImage(file) -> File`, context `requestCameraPermission() -> Promise<boolean>`, and camera calls `ctx.startAnalysis(image)` from Task 8.

- [ ] **Step 1: Write failing camera helper tests**

```js
import { describe, expect, it, vi } from 'vitest'
import { requestUserCamera, stopMediaStream, validateSelectedImage } from './camera'

it('requests the user-facing camera without audio', async () => {
  const stream = { getTracks: () => [] }
  const getUserMedia = vi.fn().mockResolvedValue(stream)
  await expect(requestUserCamera({ getUserMedia })).resolves.toBe(stream)
  expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user' }, audio: false })
})

it('stops every stream track', () => {
  const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }]
  stopMediaStream({ getTracks: () => tracks })
  tracks.forEach(track => expect(track.stop).toHaveBeenCalledOnce())
})

it('rejects non-image and oversized files', () => {
  expect(() => validateSelectedImage(new File(['x'], 'x.pdf', { type: 'application/pdf' }))).toThrow('JPG')
  const large = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })
  expect(() => validateSelectedImage(large)).toThrow('10MB')
})
```

- [ ] **Step 2: Run and confirm missing helper failures**

```powershell
npm.cmd test -- src/camera.test.js
```

- [ ] **Step 3: Implement media request, cleanup, capture, and file checks**

```js
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export function requestUserCamera(mediaDevices = navigator.mediaDevices) {
  if (!mediaDevices?.getUserMedia) throw new Error('이 브라우저에서는 카메라를 사용할 수 없습니다.')
  return mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
}

export function stopMediaStream(stream) {
  stream?.getTracks?.().forEach(track => track.stop())
}

export function validateSelectedImage(file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('JPG, PNG, WEBP 이미지만 사용할 수 있습니다.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('이미지는 10MB 이하여야 합니다.')
  return file
}
```

`captureVideoFrame` sets canvas width/height from `video.videoWidth/videoHeight`, draws the unmirrored source, and resolves `canvas.toBlob(..., 'image/jpeg', 0.9)`. Reject if video dimensions are zero or `toBlob` returns null.

- [ ] **Step 4: Replace the fake camera feed**

`ScreenCamera` must:

- request stream on mount;
- assign it to `videoRef.current.srcObject`;
- mirror only the displayed `<video>` using CSS;
- stop the stream on unmount and before submitting an image;
- show specific permission/device errors;
- expose a visible `사진 선택` button backed by the file input;
- call `ctx.startAnalysis(blobOrFile)` only after a successful capture/selection;
- keep retry and back actions functional.

Use this lifecycle skeleton rather than embedding media access in click handlers:

```jsx
function ScreenCamera({ ctx, nav }) {
  const videoRef = React.useRef(null)
  const streamRef = React.useRef(null)
  const fileRef = React.useRef(null)
  const [cameraError, setCameraError] = React.useState('')

  const openCamera = React.useCallback(async () => {
    stopMediaStream(streamRef.current)
    try {
      const stream = await requestUserCamera()
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraError('')
    } catch (error) {
      setCameraError(cameraErrorMessage(error))
    }
  }, [])

  React.useEffect(() => {
    openCamera()
    return () => stopMediaStream(streamRef.current)
  }, [openCamera])

  const submitImage = image => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
    ctx.startAnalysis(image)
  }

  const capture = async () => submitImage(await captureVideoFrame(videoRef.current))
  const chooseFile = event => submitImage(validateSelectedImage(event.target.files[0]))

  return (
    <div className="screen camera-screen anim-slide-r">
      <video ref={videoRef} className="camera-preview" playsInline muted autoPlay />
      {cameraError && <div role="alert">{cameraError}</div>}
      <button type="button" onClick={capture} aria-label="얼굴 사진 촬영">촬영</button>
      <button type="button" onClick={() => fileRef.current?.click()}>사진 선택</button>
      <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={chooseFile} />
      <button type="button" onClick={() => { stopMediaStream(streamRef.current); nav.go('home') }}>닫기</button>
    </div>
  )
}
```

Keep the existing face guide, visual capture button, instructions, and top controls around this functional core.

Add the App permission helper:

```js
const requestCameraPermission = useCallback(async () => {
  try {
    const stream = await requestUserCamera()
    stopMediaStream(stream)
    setPermissions(current => ({ ...current, camera: true }))
    return true
  } catch {
    setPermissions(current => ({ ...current, camera: false }))
    return false
  }
}, [])
```

`cameraErrorMessage(error)` maps `NotAllowedError`, `NotFoundError`, and `NotReadableError` to Korean actionable messages and uses a generic camera message for all other errors.

```js
export function cameraErrorMessage(error) {
  if (error?.name === 'NotAllowedError') return '카메라 권한이 차단되었습니다. 브라우저 설정에서 허용하거나 사진을 선택해 주세요.'
  if (error?.name === 'NotFoundError') return '사용할 수 있는 카메라를 찾지 못했습니다. 사진을 선택해 주세요.'
  if (error?.name === 'NotReadableError') return '다른 앱이 카메라를 사용 중입니다. 해당 앱을 닫고 다시 시도해 주세요.'
  return '카메라를 시작하지 못했습니다. 다시 시도하거나 사진을 선택해 주세요.'
}
```

Update onboarding camera `grant` to call `ctx.requestCameraPermission()`, immediately stop its permission-check stream, and set the permission boolean from the real result.

- [ ] **Step 5: Add component-level stream cleanup and file-fallback tests**

Mock `navigator.mediaDevices.getUserMedia`, render `ScreenCamera`, unmount it, and assert track stop. Trigger a file input change with a PNG `File` and assert `ctx.startAnalysis(file)`.

- [ ] **Step 6: Run camera tests, lint, and build**

```powershell
npm.cmd test -- src/camera.test.js
npm.cmd run lint
npm.cmd run build
```

Expected: PASS; `rg -n "fake camera feed|send captured image" src/screens-1-4.jsx` returns no matches.

- [ ] **Step 7: Commit Task 7**

```powershell
git add src/camera.js src/camera.test.js src/App.jsx src/screens-1-4.jsx src/tokens.css
git diff --cached --name-only
git commit -m "feat: capture real camera images"
```

---

### Task 8: Connect the Analyze Client and Request Lifecycle

**Files:**
- Modify: `frontend/src/api/client.js`
- Create: `frontend/src/api/client.test.js`
- Modify: `frontend/src/api/adapters.js`
- Create: `frontend/src/api/adapters.test.js`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/screens-1-4.jsx`
- Modify: `frontend/src/screens-5-9.jsx`

**Interfaces:**
- Consumes: `/analyze` response from Task 5 and camera image from Task 7.
- Produces: `analyzeSkin({ image, nickname, lat, lng, skin_type, signal })`, `adaptSkinAnalysis(response)`, context `startAnalysis(image)`, `retryAnalysis()`, `cancelAnalysis(destination)`, `analysisStatus`, and `analysisError`.

- [ ] **Step 1: Write failing multipart-client tests**

```js
import { afterEach, expect, it, vi } from 'vitest'
import { analyzeSkin } from './client'

afterEach(() => vi.unstubAllGlobals())

it('posts image and profile fields as FormData', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ main_risk: 'dryness' }) })
  vi.stubGlobal('fetch', fetchMock)
  const image = new File(['image'], 'face.jpg', { type: 'image/jpeg' })
  await analyzeSkin({ image, nickname: '민지', lat: 36.62, lng: 127.29, skin_type: 'dry_sensitive' })
  const [, request] = fetchMock.mock.calls[0]
  expect(request.method).toBe('POST')
  expect(request.body).toBeInstanceOf(FormData)
  expect(request.headers).toBeUndefined()
  expect(request.body.get('nickname')).toBe('민지')
  expect(request.body.get('image')).toBe(image)
})
```

- [ ] **Step 2: Run and verify `analyzeSkin` is missing**

```powershell
npm.cmd test -- src/api/client.test.js
```

- [ ] **Step 3: Implement structured multipart requests**

```js
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function toApiError(response, fallbackMessage) {
  let detail = ''
  try {
    const body = await response.json()
    detail = typeof body.detail === 'string' ? body.detail : ''
  } catch {
    detail = ''
  }
  return new ApiError(detail || `${fallbackMessage} (${response.status})`, response.status)
}

export async function analyzeSkin({ image, nickname, lat, lng, skin_type, signal }) {
  const body = new FormData()
  body.append('image', image, image.name || 'camera-capture.jpg')
  body.append('nickname', nickname)
  body.append('lat', String(lat))
  body.append('lng', String(lng))
  body.append('skin_type', skin_type)
  const response = await fetch(`${API_URL}/analyze`, { method: 'POST', body, signal })
  if (!response.ok) throw await toApiError(response, '피부 분석에 실패했습니다.')
  return response.json()
}
```

Share `toApiError` with `getRecommend`; do not set multipart `Content-Type` manually.

- [ ] **Step 4: Write and implement adapter tests**

Test that an API payload maps to five factors in canonical order, main risk, focus-risk labels, timestamp, and disclaimer-ready view data.

```js
const TARGET_ORDER = ['pigmentation', 'dryness', 'pore', 'wrinkle', 'sensitivity']

export function adaptSkinAnalysis(response) {
  const factors = TARGET_ORDER.map(id => ({ id, ...response.skin_analysis[id] }))
  return {
    analyzedAt: response.analyzed_at,
    mainRisk: factors.find(item => item.id === response.main_risk),
    focusRisks: response.focus_risks.map(id => factors.find(item => item.id === id)),
    factors,
  }
}
```

- [ ] **Step 5: Implement the App request lifecycle with timeout**

`startAnalysis(image)` must set status `uploading`, route to `analyzing`, create an AbortController, and start a 60-second timeout. On success it must update `lastAnalysis`, `env`, `recommend`, and status before routing to `result`. On failure it must remain on `analyzing` with `analysisStatus='error'`. User cancellation and timeout must be distinguished, and the timeout must be cleared in all outcomes. Keep the failed image only in an in-memory ref for the visible retry action; clear it on success, explicit cancel, or leaving the error screen.

```js
const [analysisStatus, setAnalysisStatus] = useState('idle')
const [analysisError, setAnalysisError] = useState('')
const analysisControllerRef = useRef(null)
const analysisImageRef = useRef(null)

const startAnalysis = useCallback(async image => {
  const controller = new AbortController()
  analysisControllerRef.current?.abort()
  analysisControllerRef.current = controller
  analysisImageRef.current = image
  setAnalysisStatus('uploading')
  setAnalysisError('')
  nav.go('analyzing')
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 60_000)
  try {
    const response = await analyzeSkin({
      image,
      nickname: user.nickname,
      lat: location.lat,
      lng: location.lng,
      skin_type: skinProfile.type,
      signal: controller.signal,
    })
    setLastAnalysis(adaptSkinAnalysis(response))
    setEnv(adaptEnvData(response.env_data))
    setRecommend(response)
    setAnalysisStatus('completed')
    analysisImageRef.current = null
    nav.go('result')
  } catch (error) {
    if (timedOut) setAnalysisError('분석 시간이 초과되었습니다. 다시 시도해 주세요.')
    else if (error.name !== 'AbortError') setAnalysisError(error.message)
    if (timedOut || error.name !== 'AbortError') setAnalysisStatus('error')
  } finally {
    clearTimeout(timeoutId)
  }
}, [location, nav, skinProfile.type, user.nickname])

const retryAnalysis = useCallback(() => {
  if (analysisImageRef.current) startAnalysis(analysisImageRef.current)
}, [startAnalysis])

const cancelAnalysis = useCallback((destination = 'camera') => {
  analysisControllerRef.current?.abort()
  analysisControllerRef.current = null
  analysisImageRef.current = null
  setAnalysisStatus('idle')
  setAnalysisError('')
  nav.go(destination)
}, [nav])
```

- [ ] **Step 6: Replace timer-driven analyzing behavior**

`ScreenAnalyzing` must render from `ctx.analysisStatus`; it has no completion timers and never assigns `SKIN_ANALYSIS`. Error state provides `다시 촬영`, `다시 시도`, and `홈으로` actions wired to `cancelAnalysis('camera')`, `retryAnalysis()`, and `cancelAnalysis('home')` respectively.

- [ ] **Step 7: Run client/adapter/request-flow tests**

Use fake timers to verify 60-second abort and mock `analyzeSkin` to verify App success/error state. Then run:

```powershell
npm.cmd test -- src/api/client.test.js src/api/adapters.test.js
npm.cmd run lint
npm.cmd run build
```

Expected: PASS; no fixed analysis completion timer remains.

- [ ] **Step 8: Commit Task 8**

```powershell
git add src/api/client.js src/api/client.test.js src/api/adapters.js src/api/adapters.test.js src/App.jsx src/screens-1-4.jsx src/screens-5-9.jsx
git diff --cached --name-only
git commit -m "feat: connect camera analysis request flow"
```

---

### Task 9: Render Real Risk Results and Rank Products

**Files:**
- Create: `frontend/src/recommendation-ranking.js`
- Create: `frontend/src/recommendation-ranking.test.js`
- Modify: `frontend/src/screens-5-9.jsx`
- Modify: `frontend/src/data.jsx`
- Modify: `frontend/src/tokens.css`

**Interfaces:**
- Consumes: adapted analysis and `ranking_signals` from Task 8.
- Produces: `scoreProduct(product, signals) -> number`, `rankProducts(products, signals) -> Product[]`, five-factor result UI, dynamic avoid list, and signal-backed product reasons.

- [ ] **Step 1: Write failing deterministic ranking tests**

```js
import { expect, it } from 'vitest'
import { rankProducts, scoreProduct } from './recommendation-ranking'

const products = [
  { id: 'pigment', match: 94, rating: 4.8, category: '선케어', ingredients: ['나이아신아마이드'] },
  { id: 'dry', match: 80, rating: 4.7, category: '보습', ingredients: ['세라마이드', '판테놀'] },
]

it('moves a lower-base product up when risk signals match', () => {
  const signals = [
    { kind: 'category', value: '보습', weight: 16.2 },
    { kind: 'ingredient', value: '세라마이드', weight: 10.8 },
  ]
  expect(rankProducts(products, signals)[0].id).toBe('dry')
})

it('applies an avoid penalty larger than positive boosts', () => {
  const risky = { id: 'risky', match: 99, rating: 5, category: '에센스', ingredients: ['향료'] }
  const score = scoreProduct(risky, [{ kind: 'avoid', value: '향료', weight: -100 }])
  expect(score).toBe(-1)
})
```

- [ ] **Step 2: Run and verify missing ranking module**

```powershell
npm.cmd test -- src/recommendation-ranking.test.js
```

- [ ] **Step 3: Implement normalized matching and stable sorting**

```js
function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '')
}

function looselyMatches(left, right) {
  const a = normalize(left)
  const b = normalize(right)
  return Boolean(a && b && (a.includes(b) || b.includes(a)))
}

export function scoreProduct(product, signals = []) {
  return signals.reduce((score, signal) => {
    const matched = signal.kind === 'category'
      ? looselyMatches(product.category, signal.value)
      : product.ingredients.some(ingredient => looselyMatches(ingredient, signal.value))
    return matched ? score + signal.weight : score
  }, product.match)
}

export function rankProducts(products, signals = []) {
  return products
    .map((product, index) => ({ product, index, score: scoreProduct(product, signals) }))
    .sort((a, b) => b.score - a.score || b.product.match - a.product.match || b.product.rating - a.product.rating || a.index - b.index)
    .map(item => ({
      ...item.product,
      personalizedScore: item.score,
      personalizedMatch: Math.max(0, Math.min(100, Math.round(item.score))),
    }))
}
```

- [ ] **Step 4: Replace mock result data with API data**

`ScreenResult` must not use `ctx.lastAnalysis || SKIN_ANALYSIS`. If no analysis exists, render a recovery card and camera button. With data:

- show main risk name and score in the ring;
- show exactly two focus tags;
- show five factor cards in canonical order;
- render `우선 관리` for `risk_label='high'`, otherwise `낮음`;
- label all scores as risk probabilities, so higher means more attention;
- use `ctx.recommend.message` and `ctx.recommend.avoid`;
- display analysis time and the non-medical disclaimer;
- update the section count to 5.

Use the actual adapted shape directly:

```jsx
if (!ctx.lastAnalysis) {
  return (
    <div className="screen">
      <NavTop title="분석 결과" onBack={() => nav.go('home')} />
      <div className="screen-body empty-analysis">
        <p>표시할 피부 분석 결과가 없습니다.</p>
        <Button onClick={() => nav.go('camera')}>피부 분석 시작</Button>
      </div>
    </div>
  )
}

const { mainRisk, focusRisks, factors, analyzedAt } = ctx.lastAnalysis

<ScoreRing value={mainRisk.risk_score} size={92} stroke={9} label={mainRisk.label_ko} />
{focusRisks.map(risk => <span key={risk.id}>{risk.label_ko}</span>)}
{factors.map(factor => (
  <FactorCard
    key={factor.id}
    f={{
      ...factor,
      score: factor.risk_score,
      level: factor.risk_label === 'high' ? 'attention' : 'low',
      badge: factor.risk_label === 'high' ? '우선 관리' : '낮음',
    }}
  />
))}
<p className="analysis-disclaimer">의료 진단이 아닌 화장품 추천용 AI 분석입니다.</p>
```

Format `analyzedAt` with `Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })`. Risk bars and attention colors must communicate that a higher score means more attention, reversing the old mock score semantics.

- [ ] **Step 5: Use ranking signals and show applied reasons**

Replace the existing recommendation sort heuristic with:

```js
const ranked = React.useMemo(
  () => rankProducts(PRODUCTS, ctx.recommend?.ranking_signals || []),
  [ctx.recommend?.ranking_signals],
)
```

Category, rating, and price filters apply after personalization scoring without mutating `PRODUCTS`. Product cards show `personalizedMatch` and the highest-weight matching signal as the recommendation reason.

- [ ] **Step 6: Add result and ranking behavior tests**

Render `ScreenResult` with five known metrics and assert all Korean labels, top risk, two focus tags, and disclaimer. Render recommendations with dryness-heavy versus pigmentation-heavy signals and assert the first product changes.

```powershell
npm.cmd test -- src/recommendation-ranking.test.js
npm.cmd run lint
npm.cmd run build
```

Expected: PASS; `rg -n "ctx.lastAnalysis \|\| SKIN_ANALYSIS|sub=\"6개 항목\"" src/screens-5-9.jsx` returns no matches.

- [ ] **Step 7: Commit Task 9**

```powershell
git add src/recommendation-ranking.js src/recommendation-ranking.test.js src/screens-5-9.jsx src/data.jsx src/tokens.css
git diff --cached --name-only
git commit -m "feat: show and rank real skin risks"
```

---

### Task 10: Add End-to-End Verification and Operator Documentation

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/playwright.config.js`
- Create: `frontend/e2e/app-flow.spec.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete backend and frontend flow from Tasks 1–9.
- Produces: reproducible local startup, browser acceptance test, and final verification evidence.

- [ ] **Step 1: Install Playwright test tooling and browser**

```powershell
Set-Location frontend
npm.cmd install --save-dev @playwright/test
npx.cmd playwright install chromium
```

Add script:

```json
"e2e": "playwright test"
```

- [ ] **Step 2: Create exact local web-server configuration**

```js
// frontend/playwright.config.js
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 36.62, longitude: 127.29 },
    trace: 'retain-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
    },
  }],
  webServer: [
    {
      command: '..\\.venv\\Scripts\\python.exe run.py',
      cwd: '../backend',
      url: 'http://127.0.0.1:8000/',
      timeout: 120_000,
      reuseExistingServer: true,
    },
    {
      command: 'npm.cmd run dev -- --host 127.0.0.1',
      cwd: '.',
      url: 'http://127.0.0.1:5173/',
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],
})
```

- [ ] **Step 3: Write the full browser-flow test**

The test must:

1. clear local storage;
2. enter `민지` on the login screen;
3. complete onboarding permissions and skin setup;
4. assert the home greeting is `민지님`;
5. open the camera and assert a live `<video>` has a non-null `srcObject`;
6. capture using Chromium's fake camera;
7. wait for the actual result screen;
8. assert five target labels and the disclaimer;
9. open recommendations and assert products are visible;
10. return home, open my page, assert `민지`, log out, and assert the login screen returns.

Use role/text selectors instead of implementation class names. Wait up to 90 seconds for the cold model inference request.

Implement the test with this structure, adjusting only selector wording to the final accessible labels:

```js
import { expect, test } from '@playwright/test'

test('nickname, camera analysis, recommendation, and logout flow', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await page.getByLabel('닉네임').fill('민지')
  await page.getByRole('button', { name: '계속하기' }).click()
  await page.getByRole('button', { name: '시작하기' }).click()
  await page.getByRole('button', { name: '허용하기' }).click()
  await page.getByRole('button', { name: '허용하기' }).click()
  await page.getByRole('button', { name: /저장|완료|시작/ }).click()

  await expect(page.getByText('민지님')).toBeVisible()
  await page.getByRole('button', { name: '얼굴 분석 시작' }).click()
  await expect.poll(() => page.locator('video').evaluate(video => Boolean(video.srcObject))).toBe(true)
  await page.getByRole('button', { name: '얼굴 사진 촬영' }).click()

  await expect(page.getByText('분석 결과')).toBeVisible({ timeout: 90_000 })
  for (const label of ['색소침착', '건조', '모공', '주름', '민감']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
  }
  await expect(page.getByText(/의료 진단이 아닌/)).toBeVisible()
  await page.getByRole('button', { name: '맞춤 제품 보기' }).click()
  await expect(page.getByText(/추천|제품/).first()).toBeVisible()

  await page.getByRole('button', { name: /홈|뒤로/ }).first().click()
  await page.getByRole('button', { name: /마이 페이지|프로필/ }).click()
  await expect(page.getByText('민지', { exact: true })).toBeVisible()
  await page.getByText('로그아웃', { exact: true }).click()
  await expect(page.getByLabel('닉네임')).toBeVisible()
})
```

If the current icon-only my-page or back buttons have no accessible name, add `aria-label` in their production components rather than using CSS selectors in the test.

- [ ] **Step 4: Update the root README with reproducible setup**

Document:

- the ZIP extraction command from Task 1;
- model checksum verification;
- backend dependency installation;
- two-terminal local startup commands;
- `/docs` and frontend URLs;
- camera requirement of localhost or HTTPS;
- image-in-memory policy;
- all backend/frontend/E2E verification commands;
- the fact that deployment is not included.

- [ ] **Step 5: Run the complete verification matrix**

From repository root:

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend/tests -q
Set-Location frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run e2e
```

Expected:

- backend tests: 0 failures, including both model sample contracts;
- frontend tests: 0 failures;
- ESLint: exit 0;
- Vite production build: exit 0;
- Playwright: full flow passes in Chromium.

- [ ] **Step 6: Inspect the final diff and privacy constraints**

```powershell
Set-Location ..
git status --short
git diff --check
git ls-files | Select-String -Pattern 'final_model\.keras|test_images|sample_0[12]\.jpg'
rg -n "김세현|세현님|fake camera feed|send captured image|이미지는 기기에서만 처리" frontend/src
```

Expected: no model or face sample is tracked; no old hard-coded name, fake-camera text, false privacy copy, or mock capture marker remains.

- [ ] **Step 7: Commit Task 10**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/playwright.config.js frontend/e2e/app-flow.spec.js README.md
git diff --cached --name-only
git commit -m "test: verify complete skin analysis flow"
```

- [ ] **Step 8: Request final code review before integration**

Use `superpowers:requesting-code-review` against the complete diff. Address every correctness issue, rerun the complete verification matrix after fixes, and only then use `superpowers:finishing-a-development-branch` to decide whether to keep local commits, push, or open a pull request.
