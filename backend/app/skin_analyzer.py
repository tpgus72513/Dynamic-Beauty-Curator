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
EXPECTED_TARGET_COLUMNS = (
    "pigmentation",
    "dryness",
    "pore",
    "wrinkle",
    "sensitivity",
)
EXPECTED_INPUT_SIZE = (260, 260)
EXPECTED_INPUT_SHAPE = (None, 260, 260, 3)
EXPECTED_OUTPUT_SHAPE = (None, TARGET_COUNT)
EXPECTED_DTYPE = "float32"
EXPECTED_MODEL_NAME = "efficientnetb2_skin_multitask"
EXPECTED_INPUT_NAME = "image"
EXPECTED_OUTPUT_NAME = "risk_probabilities"
EXPECTED_THRESHOLDS = {target: 0.2 for target in EXPECTED_TARGET_COLUMNS}
EXPECTED_CONFIG_SHA256 = (
    "055D59B487FD516B0F39071647F06909A62349653481EE5070CDAC217B0BBBA5"
)


class ModelUnavailableError(RuntimeError):
    """Raised when the local model cannot be loaded or used."""


class InvalidModelOutputError(RuntimeError):
    """Raised when model output breaks the five-probability contract."""


def _canonical_config_sha256(config: dict) -> str:
    canonical = json.dumps(
        config,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest().upper()


def _require_config_value(config: dict, field: str, expected) -> None:
    if config.get(field) != expected:
        raise ModelUnavailableError(
            f"Inference config {field} does not match the ZIP contract"
        )


def _validate_inference_config(config: dict) -> None:
    if not isinstance(config, dict):
        raise ModelUnavailableError("Inference config must be a JSON object")

    targets = config.get("target_columns")
    if not isinstance(targets, list) or len(set(targets)) != TARGET_COUNT:
        raise ModelUnavailableError(
            "Inference config target_columns must contain five unique targets"
        )
    if tuple(targets) != EXPECTED_TARGET_COLUMNS:
        raise ModelUnavailableError(
            "Inference config target_columns order does not match the ZIP contract"
        )

    _require_config_value(config, "input_size", list(EXPECTED_INPUT_SIZE))
    _require_config_value(config, "color_mode", "RGB")
    _require_config_value(
        config,
        "preprocess_mode",
        "efficientnet_builtin_raw_0_255",
    )
    _require_config_value(config, "normalization", "none")
    _require_config_value(config, "pixel_range", "0_255")
    _require_config_value(config, "output_activation", "sigmoid")
    _require_config_value(config, "output_shape", [TARGET_COUNT])

    labels = config.get("target_labels_ko")
    if (
        not isinstance(labels, dict)
        or set(labels) != set(EXPECTED_TARGET_COLUMNS)
        or any(
            not isinstance(labels[target], str) or not labels[target]
            for target in targets
        )
    ):
        raise ModelUnavailableError(
            "Inference config target_labels_ko does not match the ZIP targets"
        )

    thresholds = config.get("selected_thresholds")
    if not isinstance(thresholds, dict) or set(thresholds) != set(
        EXPECTED_TARGET_COLUMNS
    ):
        raise ModelUnavailableError(
            "Inference config selected_thresholds must cover every ZIP target"
        )
    try:
        normalized_thresholds = {
            target: float(thresholds[target]) for target in EXPECTED_TARGET_COLUMNS
        }
    except (TypeError, ValueError) as exc:
        raise ModelUnavailableError(
            "Inference config selected_thresholds must be numeric"
        ) from exc
    if normalized_thresholds != EXPECTED_THRESHOLDS:
        raise ModelUnavailableError(
            "Inference config selected_thresholds do not match the ZIP contract"
        )

    try:
        config_digest = _canonical_config_sha256(config)
    except (TypeError, ValueError) as exc:
        raise ModelUnavailableError(
            "Inference config authentication failed"
        ) from exc
    if config_digest != EXPECTED_CONFIG_SHA256:
        raise ModelUnavailableError("Inference config authentication failed")


def _dtype_name(dtype) -> str:
    return str(getattr(dtype, "name", dtype))


def _tensor_name(tensor) -> str | None:
    name = getattr(tensor, "name", None)
    if not name:
        return None
    return str(name).split(":", maxsplit=1)[0]


def _validate_model_contract(model) -> None:
    inputs = list(getattr(model, "inputs", ()) or ())
    if len(inputs) != 1 or tuple(inputs[0].shape) != EXPECTED_INPUT_SHAPE:
        raise ModelUnavailableError("Skin model input shape breaks the ZIP contract")
    if _dtype_name(inputs[0].dtype) != EXPECTED_DTYPE:
        raise ModelUnavailableError("Skin model input dtype breaks the ZIP contract")
    input_name = _tensor_name(inputs[0])
    if input_name != EXPECTED_INPUT_NAME:
        raise ModelUnavailableError("Skin model input name breaks the ZIP contract")

    outputs = list(getattr(model, "outputs", ()) or ())
    if len(outputs) != 1 or tuple(outputs[0].shape) != EXPECTED_OUTPUT_SHAPE:
        raise ModelUnavailableError("Skin model output shape breaks the ZIP contract")
    if _dtype_name(outputs[0].dtype) != EXPECTED_DTYPE:
        raise ModelUnavailableError("Skin model output dtype breaks the ZIP contract")

    output_names = getattr(model, "output_names", None)
    if output_names is None or list(output_names) != [EXPECTED_OUTPUT_NAME]:
        raise ModelUnavailableError("Skin model output name breaks the ZIP contract")

    model_name = getattr(model, "name", None)
    if model_name != EXPECTED_MODEL_NAME:
        raise ModelUnavailableError("Skin model name breaks the ZIP contract")


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
    values = np.asarray(probabilities, dtype=np.float32)
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

    canonical_index = {
        target: index for index, target in enumerate(config["target_columns"])
    }
    ordered = sorted(
        metrics,
        key=lambda key: (
            -metrics[key]["risk_score"],
            canonical_index[key],
        ),
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
            config = json.loads(self.config_path.read_text(encoding="utf-8"))
            _validate_inference_config(config)
            model = keras.models.load_model(self.model_path, compile=False)
            _validate_model_contract(model)
            self.config = config
            self.model = model
            self.error = None
        except Exception as exc:
            self.config = None
            self.model = None
            self.error = str(exc)
            raise ModelUnavailableError("Skin model failed to load") from exc

    def predict_bytes(self, image_bytes: bytes) -> dict:
        if not self.ready:
            raise ModelUnavailableError("Skin model is unavailable")
        batch = preprocess_image_bytes(image_bytes, tuple(self.config["input_size"]))
        with self._predict_lock:
            model_output = np.asarray(self.model.predict(batch, verbose=0))
        if model_output.shape != (1, TARGET_COUNT):
            raise InvalidModelOutputError("Expected model output shape (1, 5)")
        return parse_probabilities(model_output[0], self.config)


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
