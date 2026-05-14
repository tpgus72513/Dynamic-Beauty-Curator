# ============================================================
# env_client.py
# 외부 환경 API를 호출하는 모듈
#   - 카카오 API: GPS 좌표 → 행정동 이름
#   - 에어코리아 API: 측정소 → 미세먼지 농도
#   - 기상청 API: 자외선 지수
#
# 핵심 설계: 외부 API 호출이 실패하면 예외를 던지고,
#            호출하는 쪽(recommender.py)이 fallback으로 넘어가게 한다.
#
# ⚠️ 주의: 아래 API URL과 파라미터는 기본 골격이다.
#         각 API의 실제 명세는 docs/API_SETUP.md와 공식 문서를 보고
#         백엔드 담당이 정확히 맞춰야 한다. (특히 파라미터 이름)
# ============================================================

import requests
from config import settings


# ------------------------------------------------------------
# 등급 변환 헬퍼: 숫자 농도/지수를 사람이 읽는 등급으로
# ------------------------------------------------------------
def pm25_to_grade(value: int) -> str:
    """초미세먼지 농도(㎍/㎥)를 등급으로 변환"""
    if value <= 15:
        return "좋음"
    elif value <= 35:
        return "보통"
    elif value <= 75:
        return "나쁨"
    else:
        return "매우나쁨"


def uv_to_grade(value: int) -> str:
    """자외선 지수를 등급으로 변환"""
    if value <= 2:
        return "낮음"
    elif value <= 5:
        return "보통"
    elif value <= 7:
        return "높음"
    else:
        return "매우높음"


# ------------------------------------------------------------
# 1. GPS 좌표 → 행정동 이름 (카카오 API)
# ------------------------------------------------------------
def get_region(lat: float, lng: float) -> str:
    """
    위경도 좌표를 행정동 이름으로 변환한다.

    실패하면 예외를 던진다 → 호출하는 쪽이 fallback 처리.
    """
    url = "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json"
    headers = {"Authorization": f"KakaoAK {settings.KAKAO_API_KEY}"}
    params = {"x": lng, "y": lat}

    res = requests.get(url, headers=headers, params=params, timeout=settings.API_TIMEOUT)
    res.raise_for_status()  # 200이 아니면 예외 발생

    data = res.json()
    # 행정동(H) 타입의 region_3depth_name을 사용
    for doc in data.get("documents", []):
        if doc.get("region_type") == "H":
            return doc.get("region_3depth_name", "알 수 없음")

    # 행정동을 못 찾으면 첫 번째 결과의 동 이름이라도 반환
    docs = data.get("documents", [])
    if docs:
        return docs[0].get("region_3depth_name", "알 수 없음")
    raise ValueError("좌표에 해당하는 행정동을 찾을 수 없음")


# ------------------------------------------------------------
# 2. 미세먼지 농도 (에어코리아 대기오염정보 API)
# ------------------------------------------------------------
def get_pm25(region: str) -> int:
    """
    행정동(또는 시도) 기준 초미세먼지 농도를 가져온다.

    실제로는 [측정소정보 API로 가까운 측정소를 찾고]
    → [그 측정소의 실시간 농도를 조회] 하는 2단계지만,
    여기서는 시도 단위 조회로 단순화한 골격을 제공한다.
    백엔드 담당이 측정소 매핑 로직을 추가해야 한다.
    """
    url = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty"
    params = {
        "serviceKey": settings.AIRKOREA_API_KEY,
        "returnType": "json",
        "numOfRows": 100,
        "pageNo": 1,
        "sidoName": "세종",  # ⚠️ region에서 시도를 추출하도록 수정 필요
        "ver": "1.0",
    }

    res = requests.get(url, params=params, timeout=settings.API_TIMEOUT)
    res.raise_for_status()

    data = res.json()
    items = data.get("response", {}).get("body", {}).get("items", [])
    if not items:
        raise ValueError("미세먼지 데이터 없음")

    # 첫 번째 측정소의 pm25 값 사용 (실제로는 가장 가까운 측정소를 골라야 함)
    pm25_raw = items[0].get("pm25Value", "-")
    if pm25_raw in ("-", "", None):
        raise ValueError("미세먼지 측정값이 비어있음")

    return int(float(pm25_raw))


# ------------------------------------------------------------
# 3. 자외선 지수 (기상청 자외선 관측 API)
# ------------------------------------------------------------
def get_uv(region: str) -> int:
    """
    자외선 지수를 가져온다.

    기상청 자외선 API는 응답 형식이 단순 텍스트인 경우가 많아
    파싱 로직을 백엔드 담당이 명세에 맞춰 조정해야 한다.
    여기서는 호출 골격만 제공한다.
    """
    url = "https://apihub.kma.go.kr/api/typ01/url/kma_sfctm_uv.php"
    params = {
        "authKey": settings.KMA_UV_API_KEY,
        # ⚠️ 실제 파라미터(지점번호 등)는 기상청 명세 확인 후 추가
    }

    res = requests.get(url, params=params, timeout=settings.API_TIMEOUT)
    res.raise_for_status()

    # 기상청 응답은 텍스트일 수 있으므로, 실제 파싱은 명세에 맞춰 구현
    # 지금은 골격이므로 파싱 실패 시 예외를 던져 fallback으로 넘어가게 함
    text = res.text
    if not text or "error" in text.lower():
        raise ValueError("자외선 데이터 파싱 실패")

    # TODO: 백엔드 담당 — 실제 응답 형식에 맞춰 자외선 지수 추출
    raise NotImplementedError("기상청 자외선 응답 파싱 로직을 명세에 맞춰 구현하세요")


# ------------------------------------------------------------
# 4. 수질 (현재는 공개 실시간 API가 제한적 → 시드/정적 데이터 사용)
# ------------------------------------------------------------
def get_water(region: str) -> str:
    """
    수질 상태를 가져온다.

    노후 수도관/수질 실시간 API는 공개 범위가 제한적이므로
    프로젝트에서는 행정동별 정적 데이터(노후 수도관 지역 목록)나
    시드 데이터를 사용하는 것을 권장한다.
    """
    # MVP에서는 정적 판단으로 단순화 (분석가가 지역 목록 제공)
    노후수도관_지역 = ["조치원읍", "부산진구", "동구"]  # 예시
    if region in 노후수도관_지역:
        return "주의"
    return "양호"


# ------------------------------------------------------------
# 통합 함수: 한 번에 모든 환경 데이터를 모은다
# ------------------------------------------------------------
def fetch_all_env(lat: float, lng: float) -> dict:
    """
    좌표를 받아 행정동 + 미세먼지 + 자외선 + 수질을 모두 조회한다.

    하나라도 실패하면 예외를 던진다.
    → recommender.py가 이 예외를 잡아서 fallback으로 전환한다.

    Returns:
        {region, pm25, pm25_grade, uv, uv_grade, water}
    """
    region = get_region(lat, lng)
    pm25 = get_pm25(region)
    uv = get_uv(region)
    water = get_water(region)

    return {
        "region": region,
        "pm25": pm25,
        "pm25_grade": pm25_to_grade(pm25),
        "uv": uv,
        "uv_grade": uv_to_grade(uv),
        "water": water,
    }
