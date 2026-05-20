import requests
import json

url = "https://m.oliveyoung.co.kr/review/api/v2/reviews/cursor"

headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36",
    "Origin": "https://m.oliveyoung.co.kr",
    "Referer": "https://m.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000149135"
}

payload = {
    "goodsNumber": "A000000149135",
    "reviewType": "ALL",
    "size": 10,
    "sortType": "USEFUL_SCORE_DESC",
    "cursorId": None,
    "cursorScore": None,
    "cursorCount": None
}

response = requests.post(url, headers=headers, json=payload)

# JSON 변환
data = response.json()

# 보기 좋게 출력
print(json.dumps(data, indent=2, ensure_ascii=False))