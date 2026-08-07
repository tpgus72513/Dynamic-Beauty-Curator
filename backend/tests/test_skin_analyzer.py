import copy
import hashlib
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


class FakeTensor:
    def __init__(self, shape, dtype="float32", name=None):
        self.shape = shape
        self.dtype = dtype
        if name is not None:
            self.name = name


class FakeModel:
    def __init__(
        self,
        *,
        input_shape=(None, 260, 260, 3),
        input_dtype="float32",
        input_name="image",
        output_shape=(None, 5),
        output_dtype="float32",
        output_name="risk_probabilities",
        model_name="efficientnetb2_skin_multitask",
    ):
        self.inputs = [FakeTensor(input_shape, input_dtype, input_name)]
        self.outputs = [FakeTensor(output_shape, output_dtype)]
        self.output_names = [output_name]
        self.name = model_name


class PredictingFakeModel(FakeModel):
    def __init__(self, prediction):
        super().__init__()
        self.prediction = prediction

    def predict(self, _batch, verbose=0):
        return self.prediction


def make_analyzer(tmp_path, monkeypatch, model_config, fake_model=None):
    model_path = tmp_path / "model.keras"
    model_bytes = b"test-only-model-container"
    model_path.write_bytes(model_bytes)
    config_path = tmp_path / "inference_config.json"
    config_path.write_text(
        json.dumps(model_config, ensure_ascii=False),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        "skin_analyzer.keras.models.load_model",
        lambda *_args, **_kwargs: fake_model or FakeModel(),
    )
    return SkinAnalyzer(
        model_path,
        config_path,
        hashlib.sha256(model_bytes).hexdigest().upper(),
    )


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


def test_parse_probabilities_breaks_rounded_score_ties_by_canonical_order(
    model_config,
):
    result = parse_probabilities(
        np.array([0.201, 0.204, 0.1, 0.1, 0.1], dtype=np.float32),
        model_config,
    )

    assert result["skin_analysis"]["pigmentation"]["risk_score"] == 20
    assert result["skin_analysis"]["dryness"]["risk_score"] == 20
    assert result["main_risk"] == "pigmentation"
    assert result["focus_risks"] == ["pigmentation", "dryness"]


@pytest.mark.parametrize(
    "values",
    [
        [0.1, 0.2, 0.3, 0.4],
        [[0.1], [0.2], [0.3], [0.4], [0.5]],
        [[0.1, 0.2, 0.3, 0.4, 0.5]],
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


@pytest.mark.parametrize(
    ("field", "invalid_value"),
    [
        (
            "target_columns",
            ["dryness", "pigmentation", "pore", "wrinkle", "sensitivity"],
        ),
        (
            "target_columns",
            ["pigmentation", "dryness", "pore", "wrinkle", "wrinkle"],
        ),
        ("input_size", [224, 224]),
        ("color_mode", "grayscale"),
        ("preprocess_mode", "external_divide_by_255"),
        ("normalization", "divide_by_255"),
        ("pixel_range", "0_1"),
        ("output_activation", "softmax"),
        ("output_shape", [1, 5]),
    ],
)
def test_load_rejects_inference_config_that_changes_zip_contract(
    tmp_path,
    monkeypatch,
    model_config,
    field,
    invalid_value,
):
    invalid_config = copy.deepcopy(model_config)
    invalid_config[field] = invalid_value
    analyzer = make_analyzer(tmp_path, monkeypatch, invalid_config)

    with pytest.raises(ModelUnavailableError):
        analyzer.load()

    assert field in analyzer.error


def test_load_rejects_thresholds_that_change_zip_contract(
    tmp_path,
    monkeypatch,
    model_config,
):
    invalid_config = copy.deepcopy(model_config)
    invalid_config["selected_thresholds"]["dryness"] = 0.3
    analyzer = make_analyzer(tmp_path, monkeypatch, invalid_config)

    with pytest.raises(ModelUnavailableError):
        analyzer.load()

    assert "selected_thresholds" in analyzer.error


def test_load_authenticates_the_complete_tracked_inference_config(
    tmp_path,
    monkeypatch,
    model_config,
):
    unauthenticated_config = copy.deepcopy(model_config)
    unauthenticated_config["untracked_override"] = True
    analyzer = make_analyzer(tmp_path, monkeypatch, unauthenticated_config)

    with pytest.raises(ModelUnavailableError):
        analyzer.load()

    assert "authentication" in analyzer.error


@pytest.mark.parametrize(
    ("fake_model", "error_fragment"),
    [
        (FakeModel(input_shape=(None, 224, 224, 3)), "input shape"),
        (FakeModel(input_shape=(None, 260, 260, 1)), "input shape"),
        (FakeModel(input_dtype="float64"), "input dtype"),
        (FakeModel(input_name="face"), "input name"),
        (FakeModel(input_name=None), "input name"),
        (FakeModel(output_shape=(None, 4)), "output shape"),
        (FakeModel(output_shape=(None, 1, 5)), "output shape"),
        (FakeModel(output_dtype="float64"), "output dtype"),
        (FakeModel(output_name="scores"), "output name"),
        (FakeModel(model_name="different_model"), "model name"),
        (FakeModel(model_name=None), "model name"),
    ],
)
def test_load_rejects_models_that_break_the_zip_contract(
    tmp_path,
    monkeypatch,
    model_config,
    fake_model,
    error_fragment,
):
    analyzer = make_analyzer(tmp_path, monkeypatch, model_config, fake_model)

    with pytest.raises(ModelUnavailableError):
        analyzer.load()

    assert error_fragment in analyzer.error


def test_load_accepts_the_tracked_config_and_matching_model_metadata(
    tmp_path,
    monkeypatch,
    model_config,
):
    analyzer = make_analyzer(tmp_path, monkeypatch, model_config)

    analyzer.load()

    assert analyzer.ready


def test_load_rejects_a_model_without_output_names(
    tmp_path,
    monkeypatch,
    model_config,
):
    fake_model = FakeModel()
    del fake_model.output_names
    analyzer = make_analyzer(tmp_path, monkeypatch, model_config, fake_model)

    with pytest.raises(ModelUnavailableError):
        analyzer.load()

    assert "output name" in analyzer.error


def test_predict_rejects_more_than_one_output_batch(model_config):
    analyzer = SkinAnalyzer(
        settings.MODEL_PATH,
        settings.MODEL_CONFIG_PATH,
        settings.MODEL_SHA256,
    )
    analyzer.config = model_config
    analyzer.model = PredictingFakeModel(
        np.array(
            [
                [0.1, 0.2, 0.3, 0.4, 0.5],
                [0.5, 0.4, 0.3, 0.2, 0.1],
            ],
            dtype=np.float32,
        )
    )

    with pytest.raises(InvalidModelOutputError):
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
