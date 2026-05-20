# ============================================================
# build_rulebook.py
# [데이터 분석 2단계] 분석 결과를 바탕으로 매칭 룰북(rules.json)을 만든다.
#
# 흐름:
#   nlp_keywords.py (키워드 분석)
#        ↓ keyword_analysis.json
#   build_rulebook.py (이 파일)  ← 분석가의 전문 지식 + 분석 결과를 합침
#        ↓ rules.json
#   backend가 사용
#
# ⚠️ 중요: 룰북은 100% 자동 생성이 아니다.
#   - 키워드 분석 결과는 "근거(evidence)" 자료로 쓰고
#   - 실제 추천 내용(어떤 피부에 어떤 제품)은 분석가가 직접 채운다
#   - 아래 RULEBOOK_TABLE 을 분석가가 작성/수정하는 것이 핵심 작업
#
# 실행: python build_rulebook.py
# ============================================================

import json
import os


# ============================================================
# [설정]
# ============================================================
ANALYSIS_FILE = "keyword_analysis.json"   # nlp_keywords.py 결과
# 생성된 rules.json을 백엔드 폴더로 바로 저장
OUTPUT_FILE = os.path.join("..", "backend", "data", "rules.json")


# ============================================================
# [룰북 테이블] — ★분석가가 직접 작성하는 핵심 부분★
#
# 형식: (피부타입, 미세먼지등급, 자외선등급): {추천 내용}
#   - 피부타입: dry / oily / combination / sensitive / dry_sensitive ...
#   - 미세먼지등급: 좋음 / 보통 / 나쁨 / 매우나쁨
#   - 자외선등급: 낮음 / 보통 / 높음 / 매우높음
#
# 모든 조합을 다 채울 필요는 없다. 자주 쓰일 핵심 조합 위주로.
# 매칭 안 되는 조합은 backend가 default 룰을 쓴다.
# ============================================================
RULEBOOK_TABLE = {
    ("dry_sensitive", "매우나쁨", "높음"): {
        "rule_id": "dry_sens_pm25h_uvh",
        "recommendations": [
            {"step": 1, "category": "딥클렌징 폼", "ingredient": "BHA"},
            {"step": 2, "category": "약산성 토너", "ingredient": "판테놀"},
            {"step": 3, "category": "시카 크림", "ingredient": "센텔라아시아티카"},
            {"step": 4, "category": "자외선 차단제", "ingredient": "징크옥사이드"},
        ],
        "avoid": ["고농도 AHA", "알코올 토너"],
    },
    ("dry_sensitive", "보통", "보통"): {
        "rule_id": "dry_sens_pm25n_uvn",
        "recommendations": [
            {"step": 1, "category": "약산성 클렌저", "ingredient": "아미노산계 계면활성제"},
            {"step": 2, "category": "보습 토너", "ingredient": "히알루론산"},
            {"step": 3, "category": "수분 크림", "ingredient": "세라마이드"},
        ],
        "avoid": ["딥클렌징 폼"],
    },
    ("oily", "나쁨", "매우높음"): {
        "rule_id": "oily_pm25b_uvvh",
        "recommendations": [
            {"step": 1, "category": "클렌징 오일", "ingredient": "포도씨 오일"},
            {"step": 2, "category": "모공 토너", "ingredient": "나이아신아마이드"},
            {"step": 3, "category": "수딩 젤", "ingredient": "알로에베라"},
            {"step": 4, "category": "선 젤", "ingredient": "옥토크릴렌"},
        ],
        "avoid": ["무거운 크림", "오일 세럼"],
    },
    ("combination", "나쁨", "낮음"): {
        "rule_id": "comb_pm25b_uvl",
        "recommendations": [
            {"step": 1, "category": "약산성 클렌저", "ingredient": "BHA"},
            {"step": 2, "category": "진정 토너", "ingredient": "센텔라아시아티카"},
            {"step": 3, "category": "수분 크림", "ingredient": "세라마이드"},
        ],
        "avoid": [],
    },
}

# 매칭되는 룰이 없을 때 쓰는 기본 루틴
DEFAULT_RULE = {
    "rule_id": "default_basic",
    "recommendations": [
        {"step": 1, "category": "순한 클렌저", "ingredient": "아미노산계 계면활성제"},
        {"step": 2, "category": "보습 토너", "ingredient": "히알루론산"},
        {"step": 3, "category": "기초 수분 크림", "ingredient": "글리세린"},
    ],
    "avoid": [],
    "review_evidence": "매칭되는 세부 룰이 없을 때 적용하는 기본 루틴",
}


def load_evidence():
    """
    nlp_keywords.py가 만든 분석 결과를 읽어온다.
    각 룰에 '근거(review_evidence)'를 자동으로 붙이는 데 사용.
    파일이 없으면 빈 결과로 진행 (근거 없이 룰북만 생성).
    """
    if not os.path.exists(ANALYSIS_FILE):
        print(f"[알림] '{ANALYSIS_FILE}' 없음 → 근거 없이 룰북만 생성합니다.")
        return {}

    with open(ANALYSIS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def make_evidence_text(env_grade: str, evidence_data: dict) -> str:
    """
    환경등급에 맞는 근거 문장을 분석 결과에서 만들어낸다.
    예: "미세먼지 관련 리뷰 320건 중 시카(45회), 판테놀(30회) 동반 등장"
    """
    동반분석 = evidence_data.get("환경_성분_동반분석", {})

    # 미세먼지등급 → 분석 키워드 매핑
    if env_grade in ("나쁨", "매우나쁨"):
        key = "미세먼지"
    else:
        key = "건조"

    if key not in 동반분석:
        return "리뷰 분석 데이터 기반 (상세 근거 없음)"

    info = 동반분석[key]
    리뷰수 = info.get("리뷰수", 0)
    성분 = info.get("주요성분", {})

    성분_요약 = ", ".join([f"{k}({v}회)" for k, v in list(성분.items())[:3]])
    return f"{key} 관련 리뷰 {리뷰수}건 중 {성분_요약} 동반 등장"


def build():
    """룰북 테이블 + 분석 근거를 합쳐 rules.json을 생성한다."""

    evidence_data = load_evidence()

    # 룰북 테이블을 JSON 구조로 변환
    rules = {}
    for (skin, pm25, uv), rule in RULEBOOK_TABLE.items():
        # 키 형식: 피부타입_미세먼지등급_자외선등급 (backend의 match_rule과 동일)
        key = f"{skin}_{pm25}_{uv}"

        # 분석 결과에서 근거 문장 자동 생성
        rule_with_evidence = dict(rule)
        rule_with_evidence["review_evidence"] = make_evidence_text(pm25, evidence_data)

        rules[key] = rule_with_evidence

    # 최종 JSON 구조
    output = {
        "_comment": "build_rulebook.py가 자동 생성한 매칭 룰북. 수정은 build_rulebook.py의 RULEBOOK_TABLE에서.",
        "_structure": "키 형식: {피부타입}_{미세먼지등급}_{자외선등급}. 매칭 없으면 default 사용.",
        "rules": rules,
        "default": DEFAULT_RULE,
    }

    # 파일로 저장
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[완료] 룰북 생성 → {OUTPUT_FILE}")
    print(f"       총 {len(rules)}개 룰 + default 1개")
    print("       백엔드 담당에게 rules.json이 갱신되었다고 알려주세요.")


if __name__ == "__main__":
    build()
