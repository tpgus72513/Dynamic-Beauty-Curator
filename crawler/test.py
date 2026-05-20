from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time

# ============================================================
# 테스트할 제품 URL
# ============================================================
PRODUCT_URL = "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000149135"

# ============================================================
# 현재 사용 중인 셀렉터
# ============================================================
SELECTOR_REVIEW_TAB = "a#reviewInfo"
SELECTOR_REVIEW_LIST = ".review_list li"

# ============================================================
# 크롬 실행
# ============================================================
options = webdriver.ChromeOptions()
options.add_argument("--window-size=1200,900")

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=options
)

# ============================================================
# 제품 페이지 열기
# ============================================================
driver.get(PRODUCT_URL)
time.sleep(5)

# ============================================================
# 리뷰 탭 클릭
# ============================================================
try:
    review_tab = driver.find_element(By.CSS_SELECTOR, SELECTOR_REVIEW_TAB)
    driver.execute_script("arguments[0].click();", review_tab)
    time.sleep(3)

except Exception as e:
    print("리뷰 탭 클릭 실패:", e)
    driver.quit()
    exit()

# ============================================================
# HTML 가져오기
# ============================================================
soup = BeautifulSoup(driver.page_source, "html.parser")

reviews = soup.select(SELECTOR_REVIEW_LIST)

print(f"리뷰 개수: {len(reviews)}")

# ============================================================
# 리뷰 1개 HTML 구조 출력
# ============================================================
for r in reviews:
    print("=" * 80)
    print(r.prettify())
    print("=" * 80)
    break

driver.quit()