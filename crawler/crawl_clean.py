import requests
import pandas as pd
import time

url = "https://m.oliveyoung.co.kr/review/api/v2/reviews/cursor"

headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36",
    "Origin": "https://m.oliveyoung.co.kr"
}

# ============================================================
# 제품 리스트
# ============================================================
products = {
    "마녀공장 퓨어 소이빈 클렌징오일": "A000000253617",
    "블랑네이처 아크네 클렌징 폼": "A000000186409",
    "넘버즈인 3번 보들보들 모공결 클렌징 오일": "A000000250980",
    "메이크프렘 세이프 미 릴리프 모이스처 클렌징밀크": "A000000158513",
    "바이오더마 센시비오 H2O": "A000000130319",
    "아누아 어성초 포어 컨트롤 클렌징오일": "A000000205555",
    "블랑네이처 9배 어성초 버블 클렌징 밀크": "A000000253342",
    "풀리 비건 팩클렌저 기획 3종": "A000000212703",
    "듀이트리 하이아미노 올 클렌징 밀크": "A000000231175",
    "휩드 비건 팩클렌저 130g 기획 3종": "A000000217511",
    "마녀공장 퓨어 소이빈 클렌징폼": "A000000253619",
    "센카 퍼펙트 휩 페이셜 워시": "A000000253116",
    "닥터지 브라이트닝 필링젤 기획": "A000000162279",
    #"비플레인 녹두 약산성 클렌징폼기획": "A000000187479",
    #"에스네이처 아쿠아 라이스 약산성 클렌징폼": "A000000190494",
    #"라곰 셀럽 마이크로 폼 클렌저": "A000000230821",
    #"포들 2엑스 프레시밤 밤투폼": "A000000230421",
    #"라로슈포제 에빠끌라 딥 클렌징 포밍 크림": "A000000250102",
    #"라운드랩 자작나무 수분 클렌저": "A000000236899",
}

# ============================================================
# 피부타입 매핑
# ============================================================
skin_type_map = {
    "A01": "지성",
    "A02": "건성",
    "A03": "복합성",
    "A04": "민감성",
    "A05": "약건성",
    "A06": "트러블성",
    "A07": "중성"
}

def convert_skin_type(code):
    if not code:
        return "알수 없음"
    return skin_type_map.get(code, "알수 없음")


# ============================================================
# 크롤링
# ============================================================
all_reviews = []

for product_name, goods_no in products.items():
    print(f"\n[{product_name}] 수집 시작...")

    headers["Referer"] = f"https://m.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo={goods_no}"

    cursor_id = None
    cursor_score = None

    seen_ids = set()   # ⭐ 핵심: 중복 제거용

    for page in range(2):

        payload = {
            "goodsNumber": goods_no,
            "reviewType": "ALL",
            "size": 20,
            "sortType": "USEFUL_SCORE_DESC",
            "cursorId": cursor_id,
            "cursorScore": cursor_score,
            "cursorCount": None
        }

        try:
            response = requests.post(url, headers=headers, json=payload)
            data = response.json()
        except Exception as e:
            print(f"[ERROR] 요청 실패: {e}")
            break

        reviews = data.get("data", {}).get("goodsReviewList", [])

        if not reviews:
            print(f"  → {page+1}페이지에서 종료")
            break

        added_count = 0

        for r in reviews:
            review_id = r.get("reviewId")

            # ⭐ 중복 제거
            if review_id in seen_ids:
                continue

            seen_ids.add(review_id)
            added_count += 1

            all_reviews.append({
                "제품명": product_name,
                "제품번호": goods_no,
                "카테고리": "클렌징",
                "리뷰ID": review_id,
                "별점": r.get("reviewScore"),
                "리뷰텍스트": r.get("content"),
                "피부타입": convert_skin_type(
                    r.get("profileDto", {}).get("skinType")
                ),
                "작성일": r.get("createdDateTime"),
            })

        # ⭐ cursor 업데이트 (마지막 리뷰 기준)
        last = reviews[-1]
        cursor_id = last.get("reviewId")
        cursor_score = last.get("reviewScore")

        print(f"  {page+1}페이지 완료 - 이번 {added_count}건 / 누적 {len(seen_ids)}건")

        time.sleep(0.5)


# ============================================================
# 저장
# ============================================================
df = pd.DataFrame(all_reviews)

df.to_csv("reviews_클렌징.csv", index=False, encoding="utf-8-sig")

print(f"\n완료! 총 {len(df)}건 저장 → reviews_클렌징.csv")