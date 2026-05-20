import requests

res = requests.get(
    "https://apihub.kma.go.kr/api/typ01/url/kma_sfctm_uv.php",
    params={
        "authKey": "Bh6sw8ovR_aerMPKL4f2FQ",
        "help": 1,   # 헤더 포함 출력
        "stn": 108,  # 서울 지점
    }
)
print(res.text)