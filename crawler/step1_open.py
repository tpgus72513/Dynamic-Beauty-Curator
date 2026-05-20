# ============================================================
# step1_open.py
# [크롤링 1단계 연습] 크롬을 열고 올리브영 페이지에 들어가기만 한다.
#
# 목적: Selenium이 내 컴퓨터에서 제대로 동작하는지 확인.
#       이게 되면 절반은 온 것이다.
#
# 실행: python step1_open.py
# 성공 기준: 크롬 창이 자동으로 뜨고, 페이지 제목이 출력된다.
# ============================================================

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

# ------------------------------------------------------------
# 크롬 드라이버 자동 설치 및 실행
# webdriver-manager가 내 크롬 버전에 맞는 드라이버를 알아서 받아준다
# ------------------------------------------------------------
print("크롬을 실행합니다...")
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))

# ------------------------------------------------------------
# 올리브영 제품 페이지 열기
# ⚠️ 아래 URL은 예시. 올리브영에서 실제 제품 페이지 주소로 바꿔야 한다.
#    (제품 상세 페이지 주소를 복사해서 붙여넣으면 됨)
# ------------------------------------------------------------
url = "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000123456"
driver.get(url)

# 페이지가 다 로딩될 때까지 5초 기다림
time.sleep(5)

# ------------------------------------------------------------
# 결과 확인
# ------------------------------------------------------------
print("페이지 열기 성공!")
print("페이지 제목:", driver.title)
print("현재 주소:", driver.current_url)

# 화면을 눈으로 확인할 수 있게 10초 더 기다린 뒤 닫기
print("10초 후 창을 닫습니다...")
time.sleep(10)
driver.quit()
print("종료 완료")
