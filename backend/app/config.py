# ============================================================
# config.py
# .env 파일에서 API 키와 설정을 읽어오는 모듈
# 다른 파일들은 여기서 settings를 import 해서 사용한다
# ============================================================

import os
from dotenv import load_dotenv

# .env 파일을 읽어서 환경변수로 등록
# (backend/.env 위치에 있다고 가정)
load_dotenv()


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
