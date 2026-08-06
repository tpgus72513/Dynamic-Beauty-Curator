import json
from io import BytesIO

import numpy as np
import pytest
from PIL import Image

from config import settings
from skin_analyzer import (
    InvalidModelOutputError,
    ModelUnavailableError,
    SkinAnalyzer,
    parse_probabilities,
    preprocess_image_bytes,
)


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
        "pigmentation",
        "dryness",
        "pore",
        "wrinkle",
        "sensitivity",
    ]
    assert result["main_risk"] == "sensitivity"
    assert result["focus_risks"] == ["sensitivity", "wrinkle"]


@pytest.mark.parametrize(
    "values",
    [
        [0.1, 0.2, 0.3, 0.4],
        [0.1, 0.2, np.nan, 0.4, 0.5],
        [0.1, 0.2, 0.3, 0.4, 1.1],
    ],
)
def test_parse_probabilities_rejects_invalid_model_output(model_config, values):
    with pytest.raises(InvalidModelOutputError):
        parse_probabilities(np.asarray(values, dtype=np.float32), model_config)


def test_predict_rejects_calls_before_model_is_ready():
    analyzer = SkinAnalyzer(
        settings.MODEL_PATH,
        settings.MODEL_CONFIG_PATH,
        settings.MODEL_SHA256,
    )

    with pytest.raises(ModelUnavailableError):
        analyzer.predict_bytes(make_png())


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
