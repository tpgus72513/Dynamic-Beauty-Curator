# ============================================================
# schemas.py
# 요청(Request)과 응답(Response)의 JSON 형태를 정의하는 모듈
#
# pydantic의 BaseModel을 상속하면:
#   - 들어온 데이터의 타입을 자동으로 검사해줌
#   - 잘못된 데이터가 오면 FastAPI가 자동으로 에러 응답을 보냄
#   - API 문서(/docs)에 형태가 자동으로 표시됨
# ============================================================

from datetime import datetime
from typing import Dict, List

from pydantic import BaseModel, Field


# ------------------------------------------------------------
# 요청 형태: 앱이 서버로 보내는 데이터
# ------------------------------------------------------------
class RecommendRequest(BaseModel):
    """POST /recommend 로 들어오는 요청 본문"""

    lat: float = Field(..., description="위도 (예: 36.62)", example=36.62)
    lng: float = Field(..., description="경도 (예: 127.29)", example=127.29)
    skin_type: str = Field(
        ...,
        description="피부 타입. dry / oily / combination / sensitive 중 하나",
        example="dry_sensitive",
    )


# ------------------------------------------------------------
# 응답 안에 들어가는 작은 조각들
# ------------------------------------------------------------
class EnvData(BaseModel):
    """환경 데이터 (미세먼지·자외선·수질 등)"""

    region: str = Field(..., description="행정동 이름", example="조치원읍")
    pm25: int = Field(..., description="초미세먼지 농도", example=87)
    pm25_grade: str = Field(..., description="미세먼지 등급", example="매우나쁨")
    uv: int = Field(..., description="자외선 지수", example=6)
    uv_grade: str = Field(..., description="자외선 등급", example="높음")
    water: str = Field(..., description="수질 상태", example="주의")


class RecommendItem(BaseModel):
    """추천 항목 하나"""

    step: int = Field(..., description="루틴 단계 (1, 2, 3...)", example=1)
    category: str = Field(..., description="제품 카테고리", example="딥클렌징 폼")
    ingredient: str = Field(..., description="추천 성분", example="BHA")


class SkinMetric(BaseModel):
    label_ko: str
    probability: float = Field(..., ge=0, le=1)
    risk_score: int = Field(..., ge=0, le=100)
    threshold: float = Field(..., ge=0, le=1)
    risk_label: str


class RankingSignal(BaseModel):
    kind: str
    value: str
    weight: float
    source: str
    reason: str


class ModelInfo(BaseModel):
    name: str
    version: str


# ------------------------------------------------------------
# 응답 형태: 서버가 앱으로 돌려주는 최종 데이터
# ------------------------------------------------------------
class RecommendResponse(BaseModel):
    """POST /recommend 의 응답 본문"""

    message: str = Field(
        ...,
        description="사용자에게 보여줄 자연어 추천 메시지",
        example="오늘 조치원읍은 미세먼지가 매우 나쁩니다. 딥클렌징 폼과 시카 크림을 추천해요.",
    )
    env_data: EnvData = Field(..., description="조회된 환경 데이터")
    recommendations: List[RecommendItem] = Field(..., description="추천 루틴 목록")
    avoid: List[str] = Field(default=[], description="오늘 피해야 할 성분")
    rule_id: str = Field(..., description="적용된 매칭 룰북 ID", example="dry_sens_pm25h")
    is_fallback: bool = Field(
        default=False,
        description="True면 외부 API 장애로 시드 데이터를 사용한 응답임",
    )


class AnalyzeResponse(BaseModel):
    analyzed_at: datetime
    model: ModelInfo
    skin_analysis: Dict[str, SkinMetric]
    focus_risks: List[str]
    main_risk: str
    main_risk_score: int = Field(..., ge=0, le=100)
    message: str
    env_data: EnvData
    recommendations: List[RecommendItem]
    avoid: List[str]
    ranking_signals: List[RankingSignal]
    rule_id: str
    is_fallback: bool
