# ============================================================
# step2_one_review.py
# [크롤링 2단계 연습] 리뷰 탭을 클릭하고, 리뷰가 화면에 뜨는지 확인.
#
# 목적: '리뷰 개수'가 0이 아니라 숫자로 나오면 성공.
#       0이 나오면 셀렉터(.review_list li)가 틀린 것 → 직접 '검사'로 확인.
#
# 실행: python step2_one_review.py
#
# ★★★ 가장 중요 ★★★
# 아래 CSS 셀렉터들은 전부 "예시"다.
# 올리브영 페이지에서 리뷰 텍스트 위에 우클릭 → "검사"(Inspect) 를 눌러
# 실제 class 이름을 확인하고, 그것으로 바꿔야 한다.
# 올리브영은 HTML 구조를 자주 바꾸므로 코드가 안 되면 99% 셀렉터 문제다.
# ============================================================

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))

# ⚠️ 실제 제품 URL로 교체
url = "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000123456"
driver.get(url)
time.sleep(5)

# ------------------------------------------------------------
# 리뷰 탭 클릭
# ⚠️ "a#reviewInfo" 는 예시 셀렉터. 직접 '검사'로 확인할 것.
# ------------------------------------------------------------
try:
    review_tab = driver.find_element(By.CSS_SELECTOR, "a#reviewInfo")
    # 자바스크립트로 클릭 (일반 클릭이 안 먹는 경우가 있어서 이 방식 사용)
    driver.execute_script("arguments[0].click();", review_tab)
    time.sleep(3)
    print("[OK] 리뷰 탭 클릭 성공")
except Exception as e:
    print("[실패] 리뷰 탭 클릭:", e)
    print("       → '검사'로 리뷰 탭의 정확한 셀렉터를 확인하세요.")

# ------------------------------------------------------------
# 현재 화면의 HTML을 BeautifulSoup에 넘겨서 분석
# ------------------------------------------------------------
soup = BeautifulSoup(driver.page_source, "html.parser")

# 리뷰 하나하나를 찾는다
# ⚠️ ".review_list li" 는 예시. 직접 확인할 것.
reviews = soup.select(".review_list li")

print(f"\n찾은 리뷰 개수: {len(reviews)}")

if len(reviews) == 0:
    print("[경고] 리뷰를 찾지 못했습니다.")
    print("       → 셀렉터 '.review_list li' 가 틀렸습니다. '검사'로 다시 확인하세요.")
else:
    # 첫 번째 리뷰 원본 텍스트 출력 (셀렉터가 맞는지 눈으로 확인)
    first = reviews[0]
    print("\n--- 첫 번째 리뷰 원본 (앞 200자) ---")
    print(first.get_text(strip=True)[:200])

time.sleep(5)
driver.quit()
