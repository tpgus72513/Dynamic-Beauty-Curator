# ============================================================
# recommender.py
# 추천 엔진의 핵심 로직
#   1. 환경 데이터를 가져온다 (외부 API, 실패 시 fallback)
#   2. 피부타입 + 환경등급으로 매칭 룰북(rules.json)을 조회한다
#   3. 사람이 읽을 자연어 메시지를 만든다
#   4. 최종 응답 데이터를 조립한다
# ============================================================

import json
import logging
from config import settings
from env_client import fetch_all_env, pm25_to_grade, uv_to_grade
from fallback import get_fallback_env


logger = logging.getLogger(__name__)


class EnvironmentServiceError(RuntimeError):
    """Raised without preserving external request URLs or API credentials."""


# rules.json을 한 번만 읽어서 메모리에 보관
def _load_rules():
    with open(settings.RULES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


_RULES = _load_rules()


def _load_risk_rules():
    with open(settings.RISK_RULES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


_RISK_RULES = _load_risk_rules()
RANK_MULTIPLIERS = [1.0, 0.75, 0.35, 0.35, 0.35]


# ------------------------------------------------------------
# 1. 환경 데이터 가져오기 (외부 API → 실패 시 fallback)
# ------------------------------------------------------------
def get_env_data(lat: float, lng: float) -> tuple:
    """
    환경 데이터를 가져온다.

    Returns:
        (env_dict, is_fallback)
        - env_dict: 환경 데이터 딕셔너리
        - is_fallback: True면 외부 API 실패로 시드 데이터를 쓴 것
    """
    try:
        # 먼저 진짜 외부 API 호출 시도
        env = fetch_all_env(lat, lng)
        logger.info("External environment API call succeeded")
        return env, False

    except Exception as exc:
        # 실패하면 fallback으로 전환
        logger.warning(
            "External environment API failed; fallback policy applied (type=%s)",
            type(exc).__name__,
        )

        if not settings.USE_FALLBACK:
            raise EnvironmentServiceError("Environment data is unavailable") from None

        # 좌표로는 행정동을 모르므로, 데모에서는 좌표를 행정동으로 역추정하거나
        # 가장 가까운 시드 지역을 쓴다. 여기서는 단순히 좌표 기반 추정 생략하고
        # 데모용 대표 지역(조치원읍)을 기본으로 사용.
        # → 실제 데모 시에는 좌표→행정동 매핑 테이블을 추가하면 더 정확함
        region = _guess_region_for_demo(lat, lng)
        env = get_fallback_env(region)
        return env, True


def _guess_region_for_demo(lat: float, lng: float) -> str:
    """
    데모용 좌표→행정동 간이 추정.
    fallback 상황에서 어떤 시드 지역을 쓸지 정한다.
    실제로는 더 정교한 매핑이 필요하지만 데모에는 충분.
    """
    # 세종시 근처
    if 36.4 <= lat <= 36.8 and 127.1 <= lng <= 127.4:
        return "조치원읍"
    # 서울 강남 근처
    if 37.4 <= lat <= 37.6 and 127.0 <= lng <= 127.1:
        return "강남구"
    # 부산 근처
    if 35.1 <= lat <= 35.3 and 129.0 <= lng <= 129.1:
        return "부산진구"
    # 기본
    return "조치원읍"


# ------------------------------------------------------------
# 2. 매칭 룰북 조회
# ------------------------------------------------------------
def match_rule(skin_type: str, pm25_grade: str, uv_grade: str) -> dict:
    """
    피부타입 + 미세먼지등급 + 자외선등급으로 룰북에서 규칙을 찾는다.

    매칭되는 게 없으면 default 규칙을 반환한다.

    Args:
        skin_type: 예) "dry_sensitive"
        pm25_grade: 예) "매우나쁨"
        uv_grade: 예) "높음"

    Returns:
        룰 딕셔너리 (rule_id, recommendations, avoid, review_evidence)
    """
    # 룰북 키 형식: {피부타입}_{미세먼지등급}_{자외선등급}
    key = f"{skin_type}_{pm25_grade}_{uv_grade}"

    rules = _RULES.get("rules", {})
    if key in rules:
        print(f"[recommender] 룰 매칭: {key}")
        return rules[key]

    # 정확히 일치하는 게 없으면 default
    print(f"[recommender] 매칭 룰 없음 ({key}) → default 사용")
    return _RULES.get("default", {})


# ------------------------------------------------------------
# 3. 자연어 메시지 생성
# ------------------------------------------------------------
def build_message(env: dict, rule: dict) -> str:
    """
    환경 데이터와 룰을 바탕으로 사용자에게 보여줄 문장을 만든다.

    예: "오늘 조치원읍은 미세먼지가 매우 나쁩니다.
         딥클렌징 폼과 시카 크림을 추천해요."
    """
    region = env["region"]
    pm25_grade = env["pm25_grade"]
    uv_grade = env["uv_grade"]

    # 환경 상황 한 줄
    parts = [f"오늘 {region}은(는) "]
    conditions = []
    if pm25_grade in ("나쁨", "매우나쁨"):
        conditions.append(f"미세먼지가 {pm25_grade}")
    if uv_grade in ("높음", "매우높음"):
        conditions.append(f"자외선이 {uv_grade}")
    if env.get("water") == "주의":
        conditions.append("수질 주의 지역")

    if conditions:
        parts.append(", ".join(conditions) + "입니다. ")
    else:
        parts.append("환경이 비교적 쾌적합니다. ")

    # 추천 카테고리 요약
    recs = rule.get("recommendations", [])
    if recs:
        cats = [r["category"] for r in recs[:2]]  # 앞 2개만 문장에
        parts.append(f"{' · '.join(cats)} 위주의 케어를 추천해요.")

    return "".join(parts)


def build_ranking_signals(skin_analysis: dict, env: dict) -> list[dict]:
    """Convert continuous model probabilities into deterministic rank signals."""
    ordered = sorted(
        skin_analysis,
        key=lambda target: skin_analysis[target]["probability"],
        reverse=True,
    )
    positive = []
    avoids = []

    for rank, target in enumerate(ordered):
        probability = float(skin_analysis[target]["probability"])
        multiplier = RANK_MULTIPLIERS[rank]
        rule = _RISK_RULES[target]
        reason = f"{rule['label_ko']} 위험도 {round(probability * 100)}"

        for category in rule["categories"]:
            positive.append(
                {
                    "kind": "category",
                    "value": category,
                    "weight": round(18 * probability * multiplier, 4),
                    "source": f"risk:{target}",
                    "reason": reason,
                }
            )
        for ingredient in rule["ingredients"][:2]:
            positive.append(
                {
                    "kind": "ingredient",
                    "value": ingredient,
                    "weight": round(12 * probability * multiplier, 4),
                    "source": f"risk:{target}",
                    "reason": reason,
                }
            )

        threshold = float(skin_analysis[target].get("threshold", 0.2))
        if probability >= threshold:
            for value in rule["avoid"]:
                avoids.append(
                    {
                        "kind": "avoid",
                        "value": value,
                        "weight": -100.0,
                        "source": f"risk:{target}",
                        "reason": reason,
                    }
                )

    environment = []
    if env["uv_grade"] in {"높음", "매우높음"}:
        environment.append(
            {
                "kind": "category",
                "value": "선케어",
                "weight": 10.0,
                "source": "environment:uv",
                "reason": f"자외선 {env['uv_grade']}",
            }
        )
        avoids.extend(
            [
                {
                    "kind": "avoid",
                    "value": "고농도 AHA",
                    "weight": -100.0,
                    "source": "environment:uv",
                    "reason": f"자외선 {env['uv_grade']}",
                },
                {
                    "kind": "avoid",
                    "value": "레티놀",
                    "weight": -100.0,
                    "source": "environment:uv",
                    "reason": f"자외선 {env['uv_grade']}",
                },
            ]
        )
    if env["pm25_grade"] in {"나쁨", "매우나쁨"}:
        environment.extend(
            [
                {
                    "kind": "category",
                    "value": "클렌징",
                    "weight": 10.0,
                    "source": "environment:pm25",
                    "reason": f"미세먼지 {env['pm25_grade']}",
                },
                {
                    "kind": "ingredient",
                    "value": "센텔라",
                    "weight": 10.0,
                    "source": "environment:pm25",
                    "reason": f"미세먼지 {env['pm25_grade']}",
                },
            ]
        )

    deduplicated_avoids = list(
        {(signal["kind"], signal["value"]): signal for signal in avoids}.values()
    )
    return (
        sorted(positive, key=lambda signal: signal["weight"], reverse=True)
        + environment[:2]
        + deduplicated_avoids
    )


def build_personalized_message(
    nickname: str,
    skin_analysis: dict,
    env: dict,
    signals: list[dict],
) -> str:
    ordered = sorted(
        skin_analysis,
        key=lambda target: skin_analysis[target]["probability"],
        reverse=True,
    )
    labels = [_RISK_RULES[target]["label_ko"] for target in ordered[:2]]

    conditions = []
    if env["pm25_grade"] in {"나쁨", "매우나쁨"}:
        conditions.append(f"미세먼지는 {env['pm25_grade']} 단계")
    if env["uv_grade"] in {"높음", "매우높음"}:
        conditions.append(f"자외선은 {env['uv_grade']} 단계")
    if env.get("water") == "주의":
        conditions.append("수질은 주의 단계")

    environment_phrase = (
        f"현재 {'이고, '.join(conditions)}예요."
        if conditions
        else "현재 환경은 비교적 쾌적해요."
    )
    positive_values = [
        signal["value"]
        for signal in signals
        if signal["kind"] in {"category", "ingredient"}
    ]
    focus_values = list(dict.fromkeys(positive_values))[:2]
    care_phrase = " · ".join(focus_values)

    return (
        f"{nickname}님은 {labels[0]}와 {labels[1]} 위험도가 상대적으로 높아요. "
        f"{environment_phrase} {care_phrase} 중심의 케어를 추천해요."
    )


def build_env_response(env: dict) -> dict:
    return {
        "region": env["region"],
        "pm25": env["pm25"],
        "pm25_grade": env["pm25_grade"],
        "uv": env["uv"],
        "uv_grade": env["uv_grade"],
        "water": env["water"],
    }


def merge_recommendations(rule: dict, signals: list[dict]) -> list[dict]:
    items = []
    seen = set()
    positive = [
        signal
        for signal in signals
        if signal["kind"] in {"category", "ingredient"}
    ]
    for category_signal in [
        signal for signal in positive if signal["kind"] == "category"
    ]:
        ingredients = [
            signal
            for signal in positive
            if signal["kind"] == "ingredient"
            and signal["source"] == category_signal["source"]
        ]
        ingredient = (
            ingredients[0]["value"] if ingredients else category_signal["value"]
        )
        key = (category_signal["value"], ingredient)
        if key not in seen:
            seen.add(key)
            items.append(
                {"step": len(items) + 1, "category": key[0], "ingredient": key[1]}
            )

    for original in rule.get("recommendations", []):
        key = (original["category"], original["ingredient"])
        if key not in seen:
            seen.add(key)
            items.append({**original, "step": len(items) + 1})
    return items


def merge_avoid(rule: dict, signals: list[dict]) -> list[str]:
    values = [
        *rule.get("avoid", []),
        *[signal["value"] for signal in signals if signal["kind"] == "avoid"],
    ]
    return list(dict.fromkeys(values))


# ------------------------------------------------------------
# 4. 전체 추천 흐름 (main.py가 이 함수를 호출)
# ------------------------------------------------------------
def recommend(
    lat: float,
    lng: float,
    skin_type: str,
    nickname: str | None = None,
    skin_analysis: dict | None = None,
) -> dict:
    """
    추천 전체 파이프라인을 실행하고 응답 데이터를 조립한다.

    Returns:
        RecommendResponse 형태에 맞는 딕셔너리
    """
    # (1) 환경 데이터 가져오기
    env, is_fallback = get_env_data(lat, lng)

    # (2) 룰북 조회
    rule = match_rule(skin_type, env["pm25_grade"], env["uv_grade"])

    # (3) 분석 결과가 있으면 위험도 기반 신호와 개인화 메시지 생성
    signals = build_ranking_signals(skin_analysis, env) if skin_analysis else []
    message = (
        build_personalized_message(
            nickname or "고객",
            skin_analysis,
            env,
            signals,
        )
        if skin_analysis
        else build_message(env, rule)
    )

    # (4) 응답 조립
    return {
        "message": message,
        "env_data": build_env_response(env),
        "recommendations": merge_recommendations(rule, signals),
        "avoid": merge_avoid(rule, signals),
        "ranking_signals": signals,
        "rule_id": rule.get("rule_id", "unknown"),
        "is_fallback": is_fallback,
    }
