# ============================================================
# crawl_all.py
# [크롤링 전체 자동화] products.csv에 적힌 모든 제품의 리뷰를
# 한 번에 수집해서 하나의 CSV(reviews_all.csv)로 합친다.
#
# 실행 전 준비:
#   1. crawler_final.py 의 셀렉터가 올바르게 동작하는 것을 먼저 확인
#   2. products.csv 에 수집할 제품 20~30개를 채워넣기
#
# 실행: python crawl_all.py
#
# ⚠️ 크롤링 매너:
#   - 제품 사이에 쉬는 시간(SLEEP_BETWEEN_PRODUCTS)을 둔다
#   - 한 번에 너무 많이 돌리지 말고 하루 10개씩 나눠서
#   - 새벽 등 트래픽 적은 시간대 권장
# ============================================================

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import pandas as pd
import time


# ============================================================
# [설정]
# ============================================================
PRODUCTS_FILE = "products.csv"        # 수집 대상 목록
OUTPUT_FILE = "reviews_all.csv"       # 최종 결과 파일
MAX_PAGES = 10                        # 제품당 가져올 페이지 수
SLEEP_BETWEEN_PRODUCTS = 5            # 제품 사이 쉬는 시간(초)


# ============================================================
# [셀렉터] — crawler_final.py 와 동일하게 맞춰서 수정
# ============================================================
SELECTOR_REVIEW_TAB = "a#reviewInfo"
SELECTOR_REVIEW_LIST = ".review_list li"
SELECTOR_TEXT = ".txt_inner"
SELECTOR_STAR = ".point"
SELECTOR_SKIN = ".tag_info"
SELECTOR_DATE = ".date"
SELECTOR_NEXT = ".pageing a.next"


def _safe_text(element, selector):
    """element 안에서 selector 텍스트를 안전하게 추출 (없으면 빈 문자열)"""
    try:
        return element.select_one(selector).get_text(strip=True)
    except Exception:
        return ""


def crawl_product(driver, url, name, category):
    """제품 1개를 수집한다. driver는 재사용 (매번 새로 켜지 않음)."""
    driver.get(url)
    time.sleep(5)

    # 리뷰 탭 클릭
    try:
        review_tab = driver.find_element(By.CSS_SELECTOR, SELECTOR_REVIEW_TAB)
        driver.execute_script("arguments[0].click();", review_tab)
        time.sleep(3)
    except Exception as e:
        print(f"  [실패] '{name}' 리뷰 탭 클릭: {e}")
        return []

    collected = []
    for page in range(1, MAX_PAGES + 1):
        time.sleep(2)
        soup = BeautifulSoup(driver.page_source, "html.parser")
        reviews = soup.select(SELECTOR_REVIEW_LIST)

        if not reviews:
            break

        for r in reviews:
            text = _safe_text(r, SELECTOR_TEXT)
            if text:
                collected.append({
                    "제품명": name,
                    "카테고리": category,
                    "리뷰텍스트": text,
                    "별점": _safe_text(r, SELECTOR_STAR),
                    "피부타입": _safe_text(r, SELECTOR_SKIN),
                    "작성일": _safe_text(r, SELECTOR_DATE),
                })

        # 다음 페이지
        try:
            next_btn = driver.find_element(By.CSS_SELECTOR, SELECTOR_NEXT)
            driver.execute_script("arguments[0].click();", next_btn)
        except Exception:
            break

    return collected


# ============================================================
# 메인 실행
# ============================================================
if __name__ == "__main__":
    # 제품 목록 읽기
    products = pd.read_csv(PRODUCTS_FILE)
    print(f"수집 대상 제품: {len(products)}개\n")

    # 크롬을 한 번만 켜서 모든 제품에 재사용
    options = webdriver.ChromeOptions()
    # options.add_argument("--headless")
    options.add_argument("--window-size=1200,900")
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()), options=options
    )

    all_reviews = []

    # 제품을 하나씩 순회
    for idx, row in products.iterrows():
        print(f"[{idx + 1}/{len(products)}] '{row['name']}' 수집 중...")
        reviews = crawl_product(driver, row["url"], row["name"], row["category"])
        all_reviews.extend(reviews)
        print(f"  → {len(reviews)}건 수집 (전체 누적 {len(all_reviews)}건)")

        # 다음 제품으로 넘어가기 전 잠시 쉼 (차단 방지)
        time.sleep(SLEEP_BETWEEN_PRODUCTS)

    driver.quit()

    # 전체 결과를 하나의 CSV로 저장
    if all_reviews:
        df = pd.DataFrame(all_reviews)
        df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")
        print(f"\n[완료] 총 {len(all_reviews)}건 저장 → {OUTPUT_FILE}")
        print("이 파일을 analysis/ 폴더로 옮겨서 분석가에게 전달하세요.")
    else:
        print("\n[경고] 수집된 리뷰가 없습니다. 셀렉터를 확인하세요.")
