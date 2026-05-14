# ============================================================
# crawler_final.py
# [크롤링 최종] 여러 페이지를 넘기며 리뷰를 수집해 CSV로 저장한다.
#
# 이 파일은 "제품 1개"를 수집한다.
# 여러 제품을 한 번에 수집하려면 crawl_all.py 를 사용한다.
#
# 실행: python crawler_final.py
#
# ★★★ 사용 전 필수 작업 ★★★
# 1. 아래 [설정] 부분의 PRODUCT_URL 등을 수집할 제품에 맞게 수정
# 2. 아래 4개의 CSS 셀렉터를 올리브영에서 '검사'로 확인 후 교체:
#    - 리뷰 탭         (review_tab)
#    - 리뷰 목록       (reviews)
#    - 리뷰 텍스트     (.txt_inner)
#    - 별점/피부타입/날짜
#    - 다음 페이지 버튼
# ============================================================

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import pandas as pd
import time


# ============================================================
# [설정] — 여기를 수집 대상에 맞게 수정하세요
# ============================================================
PRODUCT_URL = "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000123456"
PRODUCT_NAME = "진정크림_예시"        # 파일명/구분용 (한글 가능)
CATEGORY = "클렌징·진정"               # "클렌징·진정" 또는 "선케어·수딩"
MAX_PAGES = 10                        # 가져올 리뷰 페이지 수


# ============================================================
# [셀렉터] — 올리브영에서 '검사'로 확인 후 반드시 교체
# 아래는 전부 예시값이다.
# ============================================================
SELECTOR_REVIEW_TAB = "a#reviewInfo"        # 리뷰 탭 버튼
SELECTOR_REVIEW_LIST = ".review_list li"    # 리뷰 하나하나
SELECTOR_TEXT = ".txt_inner"                # 리뷰 본문 텍스트
SELECTOR_STAR = ".point"                    # 별점
SELECTOR_SKIN = ".tag_info"                 # 작성자 피부 타입 태그
SELECTOR_DATE = ".date"                     # 작성일
SELECTOR_NEXT = ".pageing a.next"           # 다음 페이지 버튼


def crawl_one_product():
    """제품 1개의 리뷰를 여러 페이지에 걸쳐 수집한다."""

    # --------------------------------------------------------
    # 크롬 실행
    # --------------------------------------------------------
    options = webdriver.ChromeOptions()
    # options.add_argument("--headless")  # 창 안 띄우려면 주석 해제
    options.add_argument("--window-size=1200,900")
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()), options=options
    )

    driver.get(PRODUCT_URL)
    time.sleep(5)

    # --------------------------------------------------------
    # 리뷰 탭 클릭
    # --------------------------------------------------------
    try:
        review_tab = driver.find_element(By.CSS_SELECTOR, SELECTOR_REVIEW_TAB)
        driver.execute_script("arguments[0].click();", review_tab)
        time.sleep(3)
        print(f"[OK] '{PRODUCT_NAME}' 리뷰 탭 클릭")
    except Exception as e:
        print(f"[실패] 리뷰 탭 클릭: {e}")
        driver.quit()
        return []

    # --------------------------------------------------------
    # 페이지를 넘기며 리뷰 수집
    # --------------------------------------------------------
    all_reviews = []

    for page in range(1, MAX_PAGES + 1):
        time.sleep(2)  # 페이지 로딩 대기 (너무 빠르면 차단당함)

        soup = BeautifulSoup(driver.page_source, "html.parser")
        reviews = soup.select(SELECTOR_REVIEW_LIST)

        if not reviews:
            print(f"[종료] {page}페이지에서 리뷰 없음 (마지막 페이지이거나 셀렉터 오류)")
            break

        for r in reviews:
            # 각 항목을 안전하게 추출 — 없으면 빈 문자열
            text = _safe_text(r, SELECTOR_TEXT)
            star = _safe_text(r, SELECTOR_STAR)
            skin = _safe_text(r, SELECTOR_SKIN)
            date = _safe_text(r, SELECTOR_DATE)

            # 리뷰 본문이 빈 것은 버린다
            if text:
                all_reviews.append({
                    "제품명": PRODUCT_NAME,
                    "카테고리": CATEGORY,
                    "리뷰텍스트": text,
                    "별점": star,
                    "피부타입": skin,
                    "작성일": date,
                })

        print(f"[OK] {page}페이지 수집 — 누적 {len(all_reviews)}건")

        # 다음 페이지 버튼 클릭
        try:
            next_btn = driver.find_element(By.CSS_SELECTOR, SELECTOR_NEXT)
            driver.execute_script("arguments[0].click();", next_btn)
        except Exception:
            print(f"[종료] 다음 페이지 버튼 없음 (마지막 페이지)")
            break

    driver.quit()
    return all_reviews


def _safe_text(element, selector):
    """
    element 안에서 selector에 해당하는 텍스트를 안전하게 꺼낸다.
    없으면 빈 문자열을 반환 (코드가 멈추지 않게).
    """
    try:
        return element.select_one(selector).get_text(strip=True)
    except Exception:
        return ""


# ============================================================
# 메인 실행
# ============================================================
if __name__ == "__main__":
    reviews = crawl_one_product()

    if reviews:
        df = pd.DataFrame(reviews)
        filename = f"reviews_{PRODUCT_NAME}.csv"
        # utf-8-sig: 엑셀에서 한글이 안 깨지게 하는 인코딩
        df.to_csv(filename, index=False, encoding="utf-8-sig")
        print(f"\n[완료] 총 {len(reviews)}건 저장 → {filename}")
    else:
        print("\n[경고] 수집된 리뷰가 없습니다. 셀렉터를 다시 확인하세요.")
