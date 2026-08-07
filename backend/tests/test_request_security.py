from threading import BoundedSemaphore

import pytest
from fastapi.testclient import TestClient

import main
import recommender
from config import settings


def recommendation_response() -> dict:
    return {
        "message": "safe",
        "env_data": {
            "region": "local",
            "pm25": 10,
            "pm25_grade": "좋음",
            "uv": 1,
            "uv_grade": "낮음",
            "water": "양호",
        },
        "recommendations": [],
        "avoid": [],
        "ranking_signals": [],
        "rule_id": "test",
        "is_fallback": True,
    }


def post_recommend(client: TestClient, **overrides):
    payload = {"lat": 36.62, "lng": 127.29, "skin_type": "dry_sensitive"}
    payload.update(overrides)
    return client.post("/recommend", json=payload)


@pytest.mark.parametrize(
    "overrides",
    [
        {"lat": 91},
        {"lng": 181},
        {"lat": "NaN"},
        {"skin_type": "x" * 65},
        {"skin_type": "   "},
    ],
)
def test_recommend_rejects_invalid_bounded_input_before_work(monkeypatch, overrides):
    calls = []
    monkeypatch.setattr(
        main.recommender,
        "recommend",
        lambda **kwargs: calls.append(kwargs) or recommendation_response(),
    )

    response = post_recommend(TestClient(main.app), **overrides)

    assert response.status_code == 422
    assert calls == []


def test_recommend_rejects_oversized_json_before_work(monkeypatch):
    calls = []
    monkeypatch.setattr(
        main.recommender,
        "recommend",
        lambda **kwargs: calls.append(kwargs) or recommendation_response(),
    )
    oversized_json = (
        b'{"lat":36.62,"lng":127.29,"skin_type":"dry_sensitive","padding":"'
        + b"x" * settings.MAX_RECOMMEND_BODY_BYTES
        + b'"}'
    )

    response = TestClient(main.app).post(
        "/recommend",
        content=oversized_json,
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 413
    assert calls == []


def test_recommend_rejects_when_its_worker_slots_are_busy(monkeypatch):
    occupied_slot = BoundedSemaphore(1)
    occupied_slot.acquire()
    monkeypatch.setattr(main, "_recommend_slots", occupied_slot, raising=False)
    monkeypatch.setattr(
        main.recommender,
        "recommend",
        lambda **_kwargs: recommendation_response(),
    )

    try:
        response = post_recommend(TestClient(main.app))
    finally:
        occupied_slot.release()

    assert response.status_code == 429
    assert response.headers["retry-after"] == "1"


def test_recommend_never_returns_or_prints_internal_exception_details(
    monkeypatch,
    capsys,
):
    secret = "serviceKey=TOP_SECRET_API_KEY"
    monkeypatch.setattr(
        main.recommender,
        "recommend",
        lambda **_kwargs: (_ for _ in ()).throw(RuntimeError(secret)),
    )

    response = post_recommend(TestClient(main.app))
    captured = capsys.readouterr()

    assert response.status_code == 500
    assert secret not in response.text
    assert secret not in captured.out
    assert secret not in captured.err


def test_environment_fallback_does_not_print_external_exception_details(
    monkeypatch,
    capsys,
):
    secret = "authKey=TOP_SECRET_API_KEY"
    monkeypatch.setattr(
        recommender,
        "fetch_all_env",
        lambda *_args: (_ for _ in ()).throw(RuntimeError(secret)),
    )
    monkeypatch.setattr(settings, "USE_FALLBACK", True, raising=False)

    _env, is_fallback = recommender.get_env_data(36.62, 127.29)
    captured = capsys.readouterr()

    assert is_fallback is True
    assert secret not in captured.out
    assert secret not in captured.err
