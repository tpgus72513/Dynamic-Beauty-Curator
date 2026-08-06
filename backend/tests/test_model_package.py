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
        "pigmentation",
        "dryness",
        "pore",
        "wrinkle",
        "sensitivity",
    ]
