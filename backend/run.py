# ============================================================
# run.py
# 서버를 실행하는 진입점 파일.
#
# 사용법: backend 폴더에서  →  python run.py
#
# (uvicorn app.main:app --reload 명령과 같은 역할이지만,
#  초보자가 그냥 python run.py 한 줄로 실행할 수 있게 만든 것)
# ============================================================

import sys
import os

# app 폴더를 import 경로에 추가
# (이렇게 해야 app/main.py 안에서 'from config import ...' 가 동작함)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

import uvicorn

if __name__ == "__main__":
    print("서버를 시작합니다... (종료하려면 Ctrl+C)")
    print("브라우저에서 http://127.0.0.1:8000/docs 를 열어보세요.")
    uvicorn.run(
        "main:app",          # app/main.py 안의 app 객체
        host="127.0.0.1",
        port=8000,
        reload=True,         # 코드를 수정하면 서버가 자동 재시작
        app_dir="app",       # main.py가 있는 폴더
    )
