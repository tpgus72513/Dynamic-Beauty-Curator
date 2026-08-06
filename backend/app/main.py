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

from datetime import datetime, timezone
from functools import partial

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from config import check_keys, settings
from image_upload import (
    read_limited_upload,
    validate_content_type,
    validate_decodable_image,
)
from schemas import AnalyzeResponse, RecommendRequest, RecommendResponse
from skin_analyzer import (
    InvalidModelOutputError,
    ModelUnavailableError,
    analyze_image,
    initialize_skin_analyzer,
    model_status,
)
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
    initialize_skin_analyzer()


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
        "model": model_status(),
    }


def assemble_analyze_response(analysis: dict, recommendation: dict) -> dict:
    status = model_status()
    return {
        **analysis,
        **recommendation,
        "analyzed_at": datetime.now(timezone.utc),
        "model": {"name": status["name"], "version": status["version"]},
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


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_skin(
    image: UploadFile = File(...),
    nickname: str = Form(..., min_length=1, max_length=12),
    lat: float = Form(...),
    lng: float = Form(...),
    skin_type: str = Form(...),
):
    """Analyze one image in memory and compose a personalized routine."""
    clean_nickname = nickname.strip()
    if not clean_nickname or len(clean_nickname) > 12:
        raise HTTPException(
            status_code=422,
            detail="닉네임은 1~12자로 입력해 주세요.",
        )

    validate_content_type(image.content_type)
    image_bytes = await read_limited_upload(image, settings.MAX_IMAGE_BYTES)
    validate_decodable_image(image_bytes)

    try:
        analysis = await run_in_threadpool(analyze_image, image_bytes)
        recommend_call = partial(
            recommender.recommend,
            lat=lat,
            lng=lng,
            skin_type=skin_type,
            nickname=clean_nickname,
            skin_analysis=analysis["skin_analysis"],
        )
        recommendation = await run_in_threadpool(recommend_call)
    except ModelUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail="피부 분석 모델을 사용할 수 없습니다.",
        ) from exc
    except InvalidModelOutputError as exc:
        raise HTTPException(
            status_code=500,
            detail="피부 분석 결과를 확인할 수 없습니다.",
        ) from exc

    return assemble_analyze_response(analysis, recommendation)
