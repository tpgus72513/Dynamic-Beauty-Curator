import requests
import pandas as pd
import time

url = "https://m.oliveyoung.co.kr/review/api/v2/reviews/cursor"

headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36",
    "Origin": "https://m.oliveyoung.co.kr"
}

products = {
    "라운드랩_자작나무_선크림": "A000000149135",
    "달바_핑크_톤업_선크림": "A000000232725",
    "라로슈포제_알뗄리오스_선_플루이드": "A000000252924",
    "메디힐_마데카소사이드_수분_선_세럼": "A000000252921",
    "에스트라_더마UV365_장벽수분_무기자차_선크림": "A000000206826",
    "달바_판테놀_리퀴드_에센스_선세럼": "A000000254193",
    "식물나라_보송_페이스_앤_바디_선_스틱": "A000000150460",
    "오브제_포어_제로_오일_컨트롤_선스틱 ": "A000000238816",
    "닥터지_그린마일드_업_선_플러스": "A000000253334",
    "제로이드_데일리_선크림_기획": "A000000253724",
    "마다가스카르_센텔라_히알루-시카_워터핏_선세럼": "A000000215559",
    "라운드랩_자작나무_수분_선스틱": "A000000202197",
    "AHC_마스터즈_에어리치_선스틱": "A000000254125",
    "닥터지_브라이트닝_업_선_플러스": "A000000253335",
    "구달_맑은_어성초_진정_무기자차_선크림": "A000000219554",
    "달바_에센스_선크림": "A000000232723",
    "달바_그린_톤업_선크림": "A000000218862",
    "넘버즈인 3번 도자기결 톤업베이지 선크림": "A000000250767",
    
}

all_reviews = []

for product_name, goods_no in products.items():
    print(f"\n[{product_name}] 수집 시작...")
    headers["Referer"] = f"https://m.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo={goods_no}"

    cursor_id = None
    cursor_score = None

    for page in range(3):
        payload = {
            "goodsNumber": goods_no,
            "reviewType": "ALL",
            "size": 10,
            "sortType": "USEFUL_SCORE_DESC",
            "cursorId": cursor_id,
            "cursorScore": cursor_score,
            "cursorCount": None
        }

        response = requests.post(url, headers=headers, json=payload)
        data = response.json()
        reviews = data.get("data", {}).get("goodsReviewList", [])

        if not reviews:
            print(f"  → {page+1}페이지에서 종료")
            break

        for r in reviews:
            all_reviews.append({
                "제품명": product_name,
                "제품번호": goods_no,
                "리뷰ID": r.get("reviewId"),
                "별점": r.get("reviewScore"),
                "내용": r.get("content"),
            })

        last = reviews[-1]
        cursor_id = last.get("reviewId")
        cursor_score = last.get("reviewScore")

        print(f"  {page+1}페이지 완료 - 누적 {len(all_reviews)}건")
        time.sleep(0.5)

df = pd.DataFrame(all_reviews)
df.to_csv("reviews_선크림.csv", index=False, encoding="utf-8-sig")
print(f"\n완료! 총 {len(all_reviews)}건 저장 → reviews_선크림.csv")