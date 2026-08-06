from datetime import datetime, timedelta
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

import main
from config import settings
from skin_analyzer import InvalidModelOutputError, ModelUnavailableError


TARGETS = ["pigmentation", "dryness", "pore", "wrinkle", "sensitivity"]
LABELS = ["색소침착", "건조", "모공", "주름", "민감"]


def png_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (260, 260), "peachpuff").save(output, format="PNG")
    return output.getvalue()


def fake_analysis() -> dict:
    values = [0.1, 0.9, 0.2, 0.3, 0.8]
    return {
        "skin_analysis": {
            target: {
                "label_ko": label,
                "probability": value,
                "risk_score": round(value * 100),
                "threshold": 0.2,
                "risk_label": "high" if value >= 0.2 else "low",
            }
            for target, label, value in zip(TARGETS, LABELS, values)
        },
        "focus_risks": ["dryness", "sensitivity"],
        "main_risk": "dryness",
        "main_risk_score": 90,
    }


def fake_recommendation() -> dict:
    return {
        "message": "민지님은 건조와 민감 관리가 필요해요.",
        "env_data": {
            "region": "조치원읍",
            "pm25": 20,
            "pm25_grade": "좋음",
            "uv": 6,
            "uv_grade": "높음",
            "water": "양호",
        },
        "recommendations": [
            {"step": 1, "category": "보습", "ingredient": "세라마이드"}
        ],
        "avoid": ["향료"],
        "ranking_signals": [
            {
                "kind": "category",
                "value": "보습",
                "weight": 16.2,
                "source": "risk:dryness",
                "reason": "건조 위험도 90",
            }
        ],
        "rule_id": "default_basic",
        "is_fallback": True,
    }


def post_analysis(client: TestClient, **overrides):
    data = {
        "nickname": "민지",
        "lat": "36.62",
        "lng": "127.29",
        "skin_type": "dry_sensitive",
    }
    data.update(overrides.pop("data", {}))
    files = {
        "image": ("face.png", png_bytes(), "image/png"),
    }
    files.update(overrides.pop("files", {}))
    return client.post("/analyze", data=data, files=files, **overrides)


def test_analyze_returns_model_and_personalized_recommendation(monkeypatch):
    monkeypatch.setattr(main, "initialize_skin_analyzer", lambda: None, raising=False)
    monkeypatch.setattr(main, "analyze_image", lambda _image: fake_analysis(), raising=False)
    monkeypatch.setattr(
        main,
        "model_status",
        lambda: {
            "ready": True,
            "name": "efficientnetb2_skin_multitask",
            "version": "e835bb5686ff",
            "error": None,
        },
        raising=False,
    )
    monkeypatch.setattr(
        main.recommender,
        "recommend",
        lambda **_kwargs: fake_recommendation(),
    )

    with TestClient(main.app) as client:
        response = post_analysis(client)

    assert response.status_code == 200
    body = response.json()
    assert body["main_risk"] == "dryness"
    assert body["focus_risks"] == ["dryness", "sensitivity"]
    assert list(body["skin_analysis"]) == TARGETS
    assert body["model"]["name"] == "efficientnetb2_skin_multitask"
    assert "민지님" in body["message"]
    assert body["ranking_signals"][0]["value"] == "보습"
    analyzed_at = datetime.fromisoformat(body["analyzed_at"].replace("Z", "+00:00"))
    assert analyzed_at.utcoffset() == timedelta(0)


def test_health_reports_model_state(monkeypatch):
    monkeypatch.setattr(
        main,
        "model_status",
        lambda: {"ready": False, "name": "skin", "version": "v1", "error": "model_unavailable"},
        raising=False,
    )

    response = TestClient(main.app).get("/")

    assert response.status_code == 200
    assert response.json()["model"]["ready"] is False


def test_analyze_rejects_pdf_before_inference():
    response = post_analysis(
        TestClient(main.app),
        files={"image": ("face.pdf", b"%PDF", "application/pdf")},
    )

    assert response.status_code == 415


def test_analyze_rejects_oversized_image_before_decode():
    response = post_analysis(
        TestClient(main.app),
        files={
            "image": (
                "large.png",
                b"x" * (settings.MAX_IMAGE_BYTES + 1),
                "image/png",
            )
        },
    )

    assert response.status_code == 413


def test_analyze_rejects_corrupt_image():
    response = post_analysis(
        TestClient(main.app),
        files={"image": ("face.png", b"not-an-image", "image/png")},
    )

    assert response.status_code == 400


def test_analyze_rejects_blank_nickname():
    response = post_analysis(
        TestClient(main.app),
        data={"nickname": "   "},
    )

    assert response.status_code == 422
    assert "닉네임" in response.json()["detail"]


def test_analyze_hides_model_error_details(monkeypatch):
    def unavailable(_image):
        raise ModelUnavailableError(r"C:\private\final_model.keras")

    monkeypatch.setattr(main, "analyze_image", unavailable, raising=False)

    response = post_analysis(TestClient(main.app))

    assert response.status_code == 503
    assert "C:\\private" not in response.text
    assert "사용할 수 없습니다" in response.json()["detail"]


def test_analyze_maps_invalid_output_to_safe_server_error(monkeypatch):
    def invalid_output(_image):
        raise InvalidModelOutputError("raw probabilities were NaN")

    monkeypatch.setattr(main, "analyze_image", invalid_output, raising=False)

    response = post_analysis(TestClient(main.app))

    assert response.status_code == 500
    assert "NaN" not in response.text
