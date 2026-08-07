# ============================================================
# config.py
# .env 파일에서 API 키와 설정을 읽어오는 모듈
# 다른 파일들은 여기서 settings를 import 해서 사용한다
# ============================================================

import os
from pathlib import Path

from dotenv import load_dotenv

# .env 파일을 읽어서 환경변수로 등록
# (backend/.env 위치에 있다고 가정)
load_dotenv()

BACKEND_DIR = Path(__file__).resolve().parents[1]
LOCAL_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
)


def _read_cors_origins() -> tuple[str, ...]:
    configured = os.getenv("CORS_ORIGINS", "").strip()
    if not configured:
        return LOCAL_CORS_ORIGINS
    origins = tuple(origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip())
    if not origins or "*" in origins:
        raise ValueError("CORS_ORIGINS must be an explicit comma-separated allowlist")
    return origins


class Settings:
    """프로젝트 전역 설정값을 모아두는 클래스"""

    # 외부 API 키
    KMA_UV_API_KEY: str = os.getenv("KMA_UV_API_KEY", "")
    AIRKOREA_API_KEY: str = os.getenv("AIRKOREA_API_KEY", "")
    KAKAO_API_KEY: str = os.getenv("KAKAO_API_KEY", "")

    # fallback 사용 여부 (.env에서 "True"/"False" 문자열로 읽힘)
    USE_FALLBACK: bool = os.getenv("USE_FALLBACK", "True").lower() == "true"

    # 데이터 파일 경로
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    RULES_PATH: str = os.path.join(BASE_DIR, "data", "rules.json")
    SEED_PATH: str = os.path.join(BASE_DIR, "data", "demo_seed.json")

    # 외부 API 호출 타임아웃 (초)
    API_TIMEOUT: int = 5

    # ZIP 모델 패키지 런타임 계약
    MODEL_DIR: Path = BACKEND_DIR / "model" / "skin_multitask"
    MODEL_PATH: Path = MODEL_DIR / "final_model.keras"
    MODEL_CONFIG_PATH: Path = MODEL_DIR / "inference_config.json"
    MODEL_EXPECTED_PATH: Path = MODEL_DIR / "expected_predictions.json"
    MODEL_SHA256: str = "E835BB5686FF5C3DDF83BA92D52EB7CB4D2E100D1097178775B08A68F313EB15"
    RISK_RULES_PATH: Path = BACKEND_DIR / "data" / "skin_risk_rules.json"
    MAX_IMAGE_BYTES: int = 10 * 1024 * 1024
    MAX_MULTIPART_BODY_BYTES: int = MAX_IMAGE_BYTES + 64 * 1024
    MAX_MULTIPART_FIELD_BYTES: int = 1024
    MULTIPART_READ_TIMEOUT_SECONDS: float = 30.0
    MAX_IMAGE_WIDTH: int = 4096
    MAX_IMAGE_HEIGHT: int = 4096
    MAX_IMAGE_PIXELS: int = 16_000_000
    MAX_CONCURRENT_ANALYSES: int = 2
    MAX_CONCURRENT_UPLOADS: int = 4
    MAX_CONCURRENT_RECOMMENDATIONS: int = 4
    MAX_RECOMMEND_BODY_BYTES: int = 4096
    RECOMMEND_READ_TIMEOUT_SECONDS: float = 5.0
    CORS_ORIGINS: tuple[str, ...] = _read_cors_origins()


# 다른 파일에서 from config import settings 로 가져다 쓴다
settings = Settings()


def check_keys():
    """API 키가 제대로 설정됐는지 확인하는 함수 (서버 시작 시 호출)"""
    missing = []
    if not settings.KMA_UV_API_KEY or "여기에" in settings.KMA_UV_API_KEY:
        missing.append("KMA_UV_API_KEY")
    if not settings.AIRKOREA_API_KEY or "여기에" in settings.AIRKOREA_API_KEY:
        missing.append("AIRKOREA_API_KEY")

    if missing:
        print(f"[경고] .env에 다음 키가 설정되지 않았습니다: {', '.join(missing)}")
        print("       → 외부 API 호출은 실패하고 fallback 데이터로 동작합니다.")
    else:
        print("[OK] API 키 설정 확인 완료")
