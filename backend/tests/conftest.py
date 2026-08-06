import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
APP_DIR = BACKEND_DIR / "app"
sys.path.insert(0, str(APP_DIR))
