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
import logging
from threading import BoundedSemaphore

from anyio import fail_after
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from starlette.requests import ClientDisconnect
from starlette.responses import JSONResponse

from config import check_keys, settings
from image_upload import (
    parse_analyze_multipart,
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


logger = logging.getLogger(__name__)


class TrustedBrowserOriginMiddleware:
    """Reject untrusted browser origins before request bodies are consumed."""

    def __init__(self, app, allowed_origins):
        self.app = app
        self.allowed_origins = frozenset(allowed_origins)

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = tuple(scope.get("headers", ()))
            origins = [
                value.decode("latin-1").rstrip("/")
                for name, value in headers
                if name.lower() == b"origin"
            ]
            hosts = [
                value.decode("latin-1")
                for name, value in headers
                if name.lower() == b"host"
            ]
            same_origin = (
                f"{scope.get('scheme', 'http')}://{hosts[0]}"
                if len(hosts) == 1
                else None
            )
            if origins and (
                len(origins) != 1
                or (
                    origins[0] not in self.allowed_origins
                    and origins[0] != same_origin
                )
            ):
                response = JSONResponse(
                    status_code=403,
                    content={"detail": "허용되지 않은 브라우저 출처입니다."},
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


# ------------------------------------------------------------
# FastAPI 앱 생성
# ------------------------------------------------------------
app = FastAPI(
    title="다이내믹 뷰티 큐레이터 API",
    description="정적 피부 타입 × 실시간 환경 데이터 기반 스킨케어 추천 API",
    version="1.0.0",
)

# The browser client is local-only for now, so no arbitrary origins are trusted.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.CORS_ORIGINS),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.add_middleware(
    TrustedBrowserOriginMiddleware,
    allowed_origins=settings.CORS_ORIGINS,
)

_analysis_slots = BoundedSemaphore(settings.MAX_CONCURRENT_ANALYSES)
_upload_slots = BoundedSemaphore(settings.MAX_CONCURRENT_UPLOADS)
_recommend_slots = BoundedSemaphore(settings.MAX_CONCURRENT_RECOMMENDATIONS)


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


async def parse_recommend_request(request: Request) -> RecommendRequest:
    """Read a small JSON recommendation request with a hard byte/time limit."""
    media_type = request.headers.get("content-type", "").partition(";")[0].strip().lower()
    if media_type != "application/json":
        raise HTTPException(status_code=415, detail="application/json 요청이 필요합니다.")

    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            advertised_size = int(content_length)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Content-Length가 올바르지 않습니다.") from exc
        if advertised_size < 0:
            raise HTTPException(status_code=400, detail="Content-Length가 올바르지 않습니다.")
        if advertised_size > settings.MAX_RECOMMEND_BODY_BYTES:
            raise HTTPException(status_code=413, detail="추천 요청 본문이 너무 큽니다.")

    body = bytearray()
    try:
        with fail_after(settings.RECOMMEND_READ_TIMEOUT_SECONDS):
            async for chunk in request.stream():
                if len(body) + len(chunk) > settings.MAX_RECOMMEND_BODY_BYTES:
                    raise HTTPException(status_code=413, detail="추천 요청 본문이 너무 큽니다.")
                body.extend(chunk)
    except HTTPException:
        raise
    except TimeoutError as exc:
        raise HTTPException(status_code=408, detail="추천 요청 시간이 초과되었습니다.") from exc
    except ClientDisconnect as exc:
        raise HTTPException(status_code=400, detail="추천 요청 연결이 종료되었습니다.") from exc

    if not body:
        raise HTTPException(status_code=422, detail="추천 입력값을 확인해 주세요.")
    try:
        return RecommendRequest.model_validate_json(bytes(body))
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail="추천 입력값을 확인해 주세요.") from exc


# ------------------------------------------------------------
# 엔드포인트 2: 추천 (이 프로젝트의 핵심)
# ------------------------------------------------------------
@app.post("/recommend", response_model=RecommendResponse)
async def recommend_skincare(request: Request):
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
    payload = await parse_recommend_request(request)
    if not _recommend_slots.acquire(blocking=False):
        raise HTTPException(
            status_code=429,
            detail="추천 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
            headers={"Retry-After": "1"},
        )

    try:
        recommend_call = partial(
            recommender.recommend,
            lat=payload.lat,
            lng=payload.lng,
            skin_type=payload.skin_type,
        )
        return await run_in_threadpool(recommend_call)
    except recommender.EnvironmentServiceError:
        raise HTTPException(
            status_code=503,
            detail="환경 추천 데이터를 사용할 수 없습니다.",
        ) from None
    except Exception as exc:
        logger.error("Recommendation processing failed (type=%s)", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="추천 처리 중 오류가 발생했습니다.",
        ) from None
    finally:
        _recommend_slots.release()


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_skin(request: Request):
    """Analyze one image in memory and compose a personalized routine."""
    if not _upload_slots.acquire(blocking=False):
        raise HTTPException(
            status_code=429,
            detail="이미지 업로드 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
            headers={"Retry-After": "1"},
        )

    try:
        form = await parse_analyze_multipart(request)
    finally:
        _upload_slots.release()

    if not _analysis_slots.acquire(blocking=False):
        raise HTTPException(
            status_code=429,
            detail="피부 분석 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
            headers={"Retry-After": "1"},
        )

    try:
        await run_in_threadpool(
            validate_decodable_image,
            form.image_bytes,
            form.image_content_type,
        )

        try:
            analysis = await run_in_threadpool(analyze_image, form.image_bytes)
            recommend_call = partial(
                recommender.recommend,
                lat=form.lat,
                lng=form.lng,
                skin_type=form.skin_type,
                nickname=form.nickname,
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
        except recommender.EnvironmentServiceError:
            raise HTTPException(
                status_code=503,
                detail="환경 추천 데이터를 사용할 수 없습니다.",
            ) from None
        except Exception as exc:
            logger.error("Skin analysis processing failed (type=%s)", type(exc).__name__)
            raise HTTPException(
                status_code=500,
                detail="피부 분석 처리 중 오류가 발생했습니다.",
            ) from None

        return assemble_analyze_response(analysis, recommendation)
    finally:
        _analysis_slots.release()
