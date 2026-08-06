import hashlib
import json
from io import BytesIO
from pathlib import Path
from threading import Lock

import keras
import numpy as np
from PIL import Image, ImageOps

from config import settings


TARGET_COUNT = 5


class ModelUnavailableError(RuntimeError):
    """Raised when the local model cannot be loaded or used."""


class InvalidModelOutputError(RuntimeError):
    """Raised when model output breaks the five-probability contract."""


def preprocess_image_bytes(
    image_bytes: bytes,
    input_size: tuple[int, int],
) -> np.ndarray:
    """Decode one image while preserving the model's required 0~255 range."""
    with Image.open(BytesIO(image_bytes)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        # Match tf.keras.utils.load_img(..., target_size=...), whose default
        # interpolation is nearest-neighbor in the ZIP handoff script.
        image = image.resize(input_size, Image.Resampling.NEAREST)
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

    ordered = sorted(
        metrics,
        key=lambda key: metrics[key]["probability"],
        reverse=True,
    )
    return {
        "skin_analysis": metrics,
        "focus_risks": ordered[:2],
        "main_risk": ordered[0],
        "main_risk_score": metrics[ordered[0]]["risk_score"],
    }


class SkinAnalyzer:
    def __init__(
        self,
        model_path: Path,
        config_path: Path,
        expected_sha256: str,
    ):
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

    def predict_bytes(self, image_bytes: bytes) -> dict:
        if not self.ready:
            raise ModelUnavailableError("Skin model is unavailable")
        batch = preprocess_image_bytes(image_bytes, tuple(self.config["input_size"]))
        with self._predict_lock:
            probabilities = self.model.predict(batch, verbose=0)[0]
        return parse_probabilities(probabilities, self.config)


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
        "name": (_skin_analyzer.config or {}).get(
            "model_name",
            "efficientnetb2_skin_multitask",
        ),
        "version": settings.MODEL_SHA256[:12].lower(),
        "error": None if _skin_analyzer.ready else "model_unavailable",
    }
