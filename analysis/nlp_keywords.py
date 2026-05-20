# ============================================================
# nlp_keywords.py
# [데이터 분석 1단계] 크롤링한 리뷰에서 키워드 빈도를 분석한다.
#
# 분석 내용:
#   1. 환경 키워드(미세먼지, 자외선, 건조 등)가 들어간 리뷰가 몇 건인지
#   2. 그 리뷰들에서 어떤 성분(시카, 판테놀 등)이 자주 언급되는지
#
# 이 결과가 매칭 룰북(rules.json)의 "근거(review_evidence)"가 된다.
# 심사위원이 "추천 근거가 뭐냐"고 물으면 이 통계로 답한다.
#
# 실행: python nlp_keywords.py
# 준비: crawler가 만든 reviews_all.csv 를 이 폴더에 복사해둘 것
# ============================================================

import pandas as pd
from collections import Counter
import json


# ============================================================
# [설정]
# ============================================================
INPUT_FILE = "reviews_all.csv"          # 크롤러가 만든 리뷰 파일
OUTPUT_FILE = "keyword_analysis.json"   # 분석 결과 저장 파일


# ============================================================
# [키워드 사전] — 분석가가 프로젝트에 맞게 추가/수정
# ============================================================

# 환경/상황 키워드: 어떤 환경 조건을 언급하는 단어들
ENV_KEYWORDS = [
    "미세먼지", "황사", "공기",          # 대기질 관련
    "자외선", "햇빛", "햇볕", "여름",     # 자외선 관련
    "건조", "각질", "당김",              # 건조 관련
    "트러블", "뒤집어", "붉은기", "진정", # 피부 트러블 관련
]

# 성분 키워드: 화장품 성분/효능 단어들
INGREDIENT_KEYWORDS = [
    "시카", "센텔라",
    "판테놀", "비판텐",
    "세라마이드",
    "나이아신아마이드", "나이아신",
    "히알루론", "히알루론산",
    "BHA", "AHA", "PHA",
    "병풀", "어성초", "녹차",
    "글리세린", "스쿠알란",
]


def analyze():
    """리뷰 데이터를 읽어 키워드 빈도를 분석한다."""

    # --------------------------------------------------------
    # 1. 리뷰 데이터 읽기
    # --------------------------------------------------------
    try:
        df = pd.read_csv(INPUT_FILE)
    except FileNotFoundError:
        print(f"[오류] '{INPUT_FILE}' 파일이 없습니다.")
        print("       crawler 폴더에서 만든 reviews_all.csv 를 이 폴더로 복사하세요.")
        return

    print(f"총 리뷰 수: {len(df)}건\n")

    # 리뷰텍스트 컬럼이 비어있는 행 제거
    df = df.dropna(subset=["리뷰텍스트"])
    texts = df["리뷰텍스트"].astype(str).tolist()

    # --------------------------------------------------------
    # 2. 환경 키워드별 등장 리뷰 수 세기
    # --------------------------------------------------------
    print("=" * 50)
    print(" 환경 키워드별 등장 리뷰 수")
    print("=" * 50)

    env_counts = {}
    for kw in ENV_KEYWORDS:
        count = sum(1 for t in texts if kw in t)
        env_counts[kw] = count
        print(f"  '{kw}' : {count}건")

    # --------------------------------------------------------
    # 3. 환경 키워드별로 → 같이 언급된 성분 분석
    #    (예: '미세먼지' 리뷰에서 '시카'가 몇 번 같이 나오나)
    # --------------------------------------------------------
    print("\n" + "=" * 50)
    print(" 환경 키워드 × 성분 키워드 동반 등장 분석")
    print("=" * 50)

    # 분석할 주요 환경 키워드 (대표 3개)
    main_env = ["미세먼지", "자외선", "건조"]

    cooccurrence = {}  # 최종 결과를 담을 딕셔너리

    for env_kw in main_env:
        # 이 환경 키워드가 들어간 리뷰만 필터링
        matched_texts = [t for t in texts if env_kw in t]

        # 그 리뷰들에서 성분 키워드 빈도 세기
        ingredient_counter = Counter()
        for t in matched_texts:
            for ing in INGREDIENT_KEYWORDS:
                if ing in t:
                    ingredient_counter[ing] += 1

        # 결과 저장 (많이 나온 순서대로)
        top_ingredients = ingredient_counter.most_common(5)
        cooccurrence[env_kw] = {
            "리뷰수": len(matched_texts),
            "주요성분": dict(top_ingredients),
        }

        print(f"\n[ '{env_kw}' 관련 리뷰 {len(matched_texts)}건 ]")
        if top_ingredients:
            for ing, cnt in top_ingredients:
                print(f"  - {ing} : {cnt}회 동반 등장")
        else:
            print("  (성분 키워드가 발견되지 않음)")

    # --------------------------------------------------------
    # 4. 분석 결과를 JSON 파일로 저장
    # --------------------------------------------------------
    result = {
        "총리뷰수": len(df),
        "환경키워드_등장수": env_counts,
        "환경_성분_동반분석": cooccurrence,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n[완료] 분석 결과 저장 → {OUTPUT_FILE}")
    print("이 결과를 바탕으로 build_rulebook.py 를 실행해 rules.json 을 만드세요.")


if __name__ == "__main__":
    analyze()
