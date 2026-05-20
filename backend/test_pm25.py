# test_pm25.py
# get_pm25() 단독 호출 테스트 스크립트
# config.py / env_client.py 없이도 돌아가도록 requests + dotenv 직접 사용

import os
import requests
from dotenv import load_dotenv

load_dotenv()  # .env 파일 읽기

AIRKOREA_API_KEY = os.getenv("AIRKOREA_API_KEY", "")

# ── 에어코리아 API 직접 호출 ──────────────────────────────────
def get_pm25_raw(sido_name: str = "세종") -> dict:
    """에어코리아 시도별 실시간 미세먼지 원본 응답 반환"""
    url = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty"
    params = {
        "serviceKey": AIRKOREA_API_KEY,
        "returnType": "json",
        "numOfRows": 10,
        "pageNo": 1,
        "sidoName": sido_name,
        "ver": "1.0",
    }
    res = requests.get(url, params=params, timeout=10)
    res.raise_for_status()
    return res.json()


def pm25_to_grade(value: int) -> str:
    if value <= 15:   return "좋음"
    elif value <= 35: return "보통"
    elif value <= 75: return "나쁨"
    else:             return "매우나쁨"


# ── 실행 ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  get_pm25() 호출 테스트")
    print("=" * 50)

    # API 키 확인
    if not AIRKOREA_API_KEY:
        print("❌ .env에 AIRKOREA_API_KEY가 없습니다. STEP 1~2를 다시 확인하세요.")
        exit(1)
    print(f"✅ API 키 로딩 완료: {AIRKOREA_API_KEY[:6]}...")

    # 테스트할 시도 목록
    test_sidos = ["세종", "서울", "경기"]

    for sido in test_sidos:
        print(f"\n[ 테스트: sidoName = '{sido}' ]")
        try:
            data = get_pm25_raw(sido)

            # 응답 상태 코드 확인
            result_code = data.get("response", {}).get("header", {}).get("resultCode")
            result_msg  = data.get("response", {}).get("header", {}).get("resultMsg")
            print(f"  resultCode : {result_code}")
            print(f"  resultMsg  : {result_msg}")

            if result_code != "00":
                print(f"  ⚠️ API 오류 응답 — 키 또는 파라미터 확인 필요")
                continue

            items = data.get("response", {}).get("body", {}).get("items", [])
            if not items:
                print("  ⚠️ items가 비어있음 — 해당 시도에 데이터 없음")
                continue

            # 첫 번째 측정소 결과 출력
            first = items[0]
            station = first.get("stationName", "알수없음")
            pm25_raw = first.get("pm25Value", "-")

            print(f"  측정소     : {station}")
            print(f"  pm25Value  : {pm25_raw}")

            if pm25_raw in ("-", "", None):
                print("  ⚠️ 측정값이 비어있음 (센서 미작동일 수 있음)")
            else:
                pm25_int = int(float(pm25_raw))
                grade = pm25_to_grade(pm25_int)
                print(f"  ✅ 최종 결과: {pm25_int} ㎍/㎥ → '{grade}'")

        except requests.exceptions.HTTPError as e:
            print(f"  ❌ HTTP 오류: {e}")
            print(f"     → 키가 틀렸거나 아직 승인 전일 수 있습니다.")
        except Exception as e:
            print(f"  ❌ 예외 발생: {e}")

    print("\n" + "=" * 50)
    print("  테스트 완료")
    print("=" * 50)