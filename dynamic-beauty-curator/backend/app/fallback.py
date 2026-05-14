# ============================================================
# fallback.py
# 외부 API가 장애나거나 응답이 없을 때, 미리 저장해둔
# demo_seed.json 데이터를 대신 돌려주는 모듈
#
# "발표 안전망" — 발표 당일 API가 죽어도 데모가 멈추지 않게 한다
# ============================================================

import json
from config import settings


# demo_seed.json을 한 번만 읽어서 메모리에 보관
def _load_seed():
    with open(settings.SEED_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


_SEED_DATA = _load_seed()


def get_fallback_env(region: str) -> dict:
    """
    행정동 이름으로 시드 환경 데이터를 가져온다.

    Args:
        region: 행정동 이름 (예: "조치원읍")

    Returns:
        환경 데이터 딕셔너리 (pm25, uv, water 등)
    """
    regions = _SEED_DATA.get("regions", {})

    # 해당 행정동 데이터가 있으면 그걸 사용
    if region in regions:
        return regions[region]

    # 없으면 기본값 사용
    print(f"[fallback] '{region}' 시드 데이터 없음 → 기본값 사용")
    return _SEED_DATA.get("_default", {})
