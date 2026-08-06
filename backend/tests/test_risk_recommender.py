import recommender
from recommender import build_personalized_message, build_ranking_signals


def metric(probability: float) -> dict:
    return {
        "probability": probability,
        "risk_score": round(probability * 100),
        "threshold": 0.2,
    }


def sample_analysis() -> dict:
    return {
        "pigmentation": metric(0.10),
        "dryness": metric(0.90),
        "pore": metric(0.20),
        "wrinkle": metric(0.30),
        "sensitivity": metric(0.80),
    }


def sample_env(pm25_grade: str = "보통", uv_grade: str = "높음") -> dict:
    return {
        "region": "조치원읍",
        "pm25": 20,
        "pm25_grade": pm25_grade,
        "uv": 6,
        "uv_grade": uv_grade,
        "water": "양호",
    }


def test_dryness_and_sensitivity_create_weighted_signals():
    signals = build_ranking_signals(sample_analysis(), sample_env())

    assert signals[0] == {
        "kind": "category",
        "value": "보습",
        "weight": 16.2,
        "source": "risk:dryness",
        "reason": "건조 위험도 90",
    }
    assert any(
        signal["value"] == "세라마이드"
        and signal["weight"] == 10.8
        and signal["source"] == "risk:dryness"
        for signal in signals
    )
    assert any(
        signal["kind"] == "avoid"
        and signal["value"] == "향료"
        and signal["weight"] == -100.0
        for signal in signals
    )


def test_environment_signals_are_capped_at_twenty_points():
    signals = build_ranking_signals(
        sample_analysis(),
        sample_env(pm25_grade="나쁨", uv_grade="높음"),
    )
    environment = [
        signal
        for signal in signals
        if signal["source"].startswith("environment:")
        and signal["weight"] > 0
    ]

    assert len(environment) == 2
    assert sum(signal["weight"] for signal in environment) == 20.0


def test_message_contains_nickname_top_risks_and_only_elevated_environment():
    analysis = sample_analysis()
    env = sample_env()
    signals = build_ranking_signals(analysis, env)

    message = build_personalized_message("민지", analysis, env, signals)

    assert "민지님" in message
    assert "건조" in message and "민감" in message
    assert "자외선" in message
    assert "미세먼지" not in message


def test_legacy_recommendation_keeps_old_message_and_empty_signals(monkeypatch):
    monkeypatch.setattr(
        recommender,
        "get_env_data",
        lambda _lat, _lng: (sample_env(uv_grade="보통"), True),
    )

    result = recommender.recommend(36.62, 127.29, "unknown")

    assert result["ranking_signals"] == []
    assert "환경이 비교적 쾌적합니다" in result["message"]
    assert result["rule_id"] == "default_basic"


def test_risk_recommendation_prioritizes_top_risk_and_merges_avoids(monkeypatch):
    monkeypatch.setattr(
        recommender,
        "get_env_data",
        lambda _lat, _lng: (sample_env(), True),
    )

    result = recommender.recommend(
        36.62,
        127.29,
        "dry_sensitive",
        nickname="민지",
        skin_analysis=sample_analysis(),
    )

    assert result["recommendations"][0]["category"] == "보습"
    assert "향료" in result["avoid"]
    assert "민지님" in result["message"]
