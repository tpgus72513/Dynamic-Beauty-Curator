# 다이내믹 뷰티 큐레이터 (Dynamic Beauty Curator)

정적 피부 타입 데이터와 실시간 환경 지표(미세먼지·자외선·수질)를 결합하여
GPS 기반 스킨케어 추천을 제공하는 백엔드 API 프로젝트.

- 팀: 5명 (테크리드 / 백엔드 / 프론트 / 데이터분석가 / 보조코딩 / PPT)
- 기간: 2026. 5. 13 ~ 2026. 5. 29

---

## 1. 폴더 구조

```
dynamic-beauty-curator/
├── README.md                  ← 지금 이 파일. 제일 먼저 읽기
│
├── backend/                   ← [백엔드 담당] FastAPI 추천 서버
│   ├── requirements.txt           설치할 라이브러리 목록
│   ├── .env.example               API 키 입력 양식 (복사해서 .env로 사용)
│   ├── run.py                     서버 실행 진입점
│   └── app/
│       ├── main.py                FastAPI 앱 + /recommend 엔드포인트
│       ├── schemas.py             요청/응답 JSON 형태 정의
│       ├── config.py              .env에서 API 키 읽어오기
│       ├── env_client.py          외부 환경 API 호출 (기상청·에어코리아)
│       ├── recommender.py         매칭 룰북 조회 + 추천 메시지 생성
│       └── fallback.py            외부 API 장애 시 시드 응답
│   └── data/
│       ├── rules.json             매칭 룰북 (분석가 → 코딩러가 변환)
│       └── demo_seed.json         발표 안전망용 시드 데이터
│
├── crawler/                   ← [보조코딩 담당] 올리브영 리뷰 크롤러
│   ├── requirements.txt
│   ├── step1_open.py              1단계: 크롬 열기 연습
│   ├── step2_one_review.py        2단계: 리뷰 1개 읽기 연습
│   ├── crawler_final.py           최종: 여러 페이지 → CSV 저장
│   ├── crawl_all.py               제품 목록 전체 자동 수집
│   └── products.csv               수집 대상 제품 목록 (직접 채우기)
│
├── analysis/                  ← [데이터분석가 담당] 리뷰 NLP 분석
│   ├── requirements.txt
│   ├── nlp_keywords.py            환경 키워드 ↔ 성분 키워드 빈도 분석
│   └── build_rulebook.py          분석 결과 → rules.json 생성
│
└── docs/
    └── API_SETUP.md               외부 API 키 발급 방법 정리
```

## 2. 역할별 작업 순서

### 백엔드 담당
1. `docs/API_SETUP.md` 읽고 외부 API 키 발급
2. `backend/.env.example`을 복사해 `.env` 만들고 키 입력
3. `backend/requirements.txt` 설치
4. `backend/run.py` 실행 → 서버가 뜨는지 확인
5. `app/main.py`부터 차근차근 코드 이해

### 보조코딩 담당
1. `crawler/requirements.txt` 설치
2. `crawler/step1_open.py` → `step2_one_review.py` 순서로 실행하며 연습
3. 올리브영에서 '검사'로 셀렉터 확인 후 `crawler_final.py`의 셀렉터 교체
4. `products.csv`에 수집 대상 제품 채우기
5. `crawl_all.py`로 전체 수집 → `reviews_all.csv` 생성

### 데이터분석가 담당
1. 보조코딩이 만든 `reviews_all.csv`를 `analysis/` 폴더에 복사
2. `analysis/nlp_keywords.py` 실행 → 키워드 빈도 확인
3. `analysis/build_rulebook.py` 실행 → `backend/data/rules.json` 생성
4. 생성된 rules.json을 백엔드 담당과 공유

## 3. 전체 데이터 흐름

```
[보조코딩] 올리브영 크롤링 → reviews_all.csv
                                  ↓
[분석가]   NLP 키워드 분석 → rules.json (매칭 룰북)
                                  ↓
[백엔드]   FastAPI 서버가 rules.json 읽음
           + 외부 API(미세먼지·자외선) 실시간 호출
                                  ↓
           POST /recommend → 추천 JSON 응답
                                  ↓
[프론트]   앱 화면에 추천 카드 표시
```

## 4. 주의사항

- 코드의 셀렉터(`.review_list li` 등)는 **예시**입니다. 올리브영에서 직접 '검사'로 확인 후 교체하세요.
- `.env` 파일에는 API 키가 들어가므로 **절대 깃에 올리지 마세요** (`.gitignore`에 추가).
- 발표 데모는 라이브 API에 의존하지 말고 `demo_seed.json` fallback을 반드시 준비하세요.
