# ============================================================
# main.py
# FastAPI 애플리케이션의 진입점.
# 여기서 API 엔드포인트(주소)들을 정의한다.
#
# 실행 방법:
#   backend 폴더에서 →  python run.py
#   또는            →  uvicorn app.main:app --reload
#
# 실행 후 브라우저에서:
#   http://127.0.0.1:8000        → 서버 살아있는지 확인
#   http://127.0.0.1:8000/docs   → API 문서 (여기서 직접 테스트 가능!)
# ============================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import check_keys
from schemas import RecommendRequest, RecommendResponse
import recommender


# ------------------------------------------------------------
# FastAPI 앱 생성
# ------------------------------------------------------------
app = FastAPI(
    title="다이내믹 뷰티 큐레이터 API",
    description="정적 피부 타입 × 실시간 환경 데이터 기반 스킨케어 추천 API",
    version="1.0.0",
)

# CORS 설정: 프론트엔드(다른 주소)에서 이 API를 호출할 수 있게 허용
# 데모 단계에서는 모두 허용("*"). 실제 서비스에서는 특정 주소만 허용해야 함.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------
# 서버 시작 시 1회 실행: API 키 설정 확인
# ------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    print("=" * 50)
    print(" 다이내믹 뷰티 큐레이터 API 시작")
    print("=" * 50)
    check_keys()


# ------------------------------------------------------------
# 엔드포인트 1: 헬스 체크 (서버가 살아있는지 확인용)
# ------------------------------------------------------------
@app.get("/")
def health_check():
    """서버가 정상 동작하는지 확인하는 가장 기본 엔드포인트"""
    return {
        "status": "ok",
        "service": "Dynamic Beauty Curator API",
        "message": "서버가 정상 동작 중입니다. /docs 에서 API를 테스트하세요.",
    }


# ------------------------------------------------------------
# 엔드포인트 2: 추천 (이 프로젝트의 핵심)
# ------------------------------------------------------------
@app.post("/recommend", response_model=RecommendResponse)
def recommend_skincare(request: RecommendRequest):
    """
    GPS 좌표와 피부 타입을 받아 맞춤형 스킨케어 루틴을 추천한다.

    처리 흐름:
      1. 좌표 → 행정동 변환
      2. 미세먼지·자외선·수질 데이터 조회 (실패 시 fallback)
      3. 피부타입 + 환경등급으로 매칭 룰북 조회
      4. 자연어 추천 메시지 생성
      5. 응답 반환

    요청 예시:
      { "lat": 36.62, "lng": 127.29, "skin_type": "dry_sensitive" }
    """
    try:
        result = recommender.recommend(
            lat=request.lat,
            lng=request.lng,
            skin_type=request.skin_type,
        )
        return result

    except Exception as e:
        # 예상치 못한 에러는 500 에러로 응답
        print(f"[main] 추천 처리 중 에러: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"추천 처리 중 오류가 발생했습니다: {str(e)}",
        )
