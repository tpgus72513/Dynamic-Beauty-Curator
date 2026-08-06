import sys
import json
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parents[1]
APP_DIR = BACKEND_DIR / "app"
sys.path.insert(0, str(APP_DIR))


@pytest.fixture
def model_config():
    from config import settings

    return json.loads(settings.MODEL_CONFIG_PATH.read_text(encoding="utf-8"))
