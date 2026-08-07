import asyncio
from io import BytesIO
from threading import BoundedSemaphore

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from packaging.version import Version
from PIL import Image
import python_multipart
import starlette
import starlette.formparsers
from starlette.requests import Request

import main
from config import settings
from image_upload import parse_analyze_multipart


TARGETS = ["pigmentation", "dryness", "pore", "wrinkle", "sensitivity"]


def png_bytes(size=(32, 32)) -> bytes:
    output = BytesIO()
    Image.new("RGB", size, "peachpuff").save(output, format="PNG")
    return output.getvalue()


def gif_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (32, 32), "peachpuff").save(output, format="GIF")
    return output.getvalue()


def truncated_jpeg_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (32, 32), "peachpuff").save(output, format="JPEG")
    return output.getvalue()[:-2]


def fake_analysis() -> dict:
    return {
        "skin_analysis": {
            target: {
                "label_ko": target,
                "probability": 0.1,
                "risk_score": 10,
                "threshold": 0.2,
                "risk_label": "low",
            }
            for target in TARGETS
        },
        "focus_risks": ["pigmentation", "dryness"],
        "main_risk": "pigmentation",
        "main_risk_score": 10,
    }


def fake_recommendation() -> dict:
    return {
        "message": "safe",
        "env_data": {
            "region": "local",
            "pm25": 10,
            "pm25_grade": "good",
            "uv": 1,
            "uv_grade": "low",
            "water": "good",
        },
        "recommendations": [],
        "avoid": [],
        "ranking_signals": [],
        "rule_id": "test",
        "is_fallback": True,
    }


def stub_success(monkeypatch) -> None:
    monkeypatch.setattr(main, "analyze_image", lambda _image: fake_analysis())
    monkeypatch.setattr(main.recommender, "recommend", lambda **_kwargs: fake_recommendation())
    monkeypatch.setattr(
        main,
        "model_status",
        lambda: {"ready": True, "name": "skin", "version": "test", "error": None},
    )


def post_analysis(
    client: TestClient,
    *,
    skin_type="dry_sensitive",
    image=None,
    image_content_type="image/png",
):
    return client.post(
        "/analyze",
        data={
            "nickname": "tester",
            "lat": "36.62",
            "lng": "127.29",
            "skin_type": skin_type,
        },
        files={"image": ("face.png", image or png_bytes(), image_content_type)},
    )


def test_runtime_uses_patched_multipart_stack():
    assert Version(starlette.__version__) >= Version("0.47.2")
    assert Version(python_multipart.__version__) >= Version("0.0.27")


def test_analyze_never_constructs_a_spooled_temporary_file(monkeypatch):
    stub_success(monkeypatch)
    spooled_calls = []
    real_spooled_file = starlette.formparsers.SpooledTemporaryFile

    def track_spooled_file(*args, **kwargs):
        spooled_calls.append((args, kwargs))
        return real_spooled_file(*args, **kwargs)

    monkeypatch.setattr(
        starlette.formparsers,
        "SpooledTemporaryFile",
        track_spooled_file,
    )

    response = post_analysis(TestClient(main.app))

    assert response.status_code == 200
    assert spooled_calls == []


def test_image_decode_validation_runs_in_the_worker_pool(monkeypatch):
    stub_success(monkeypatch)
    real_run_in_threadpool = main.run_in_threadpool
    worker_calls = []

    async def tracking_run_in_threadpool(func, *args, **kwargs):
        worker_calls.append(func)
        return await real_run_in_threadpool(func, *args, **kwargs)

    monkeypatch.setattr(main, "run_in_threadpool", tracking_run_in_threadpool)

    response = post_analysis(TestClient(main.app))

    assert response.status_code == 200
    assert main.validate_decodable_image in worker_calls


def test_analyze_rejects_oversized_text_field_before_inference(monkeypatch):
    stub_success(monkeypatch)
    inference_calls = []

    def track_inference(image):
        inference_calls.append(image)
        return fake_analysis()

    monkeypatch.setattr(main, "analyze_image", track_inference)

    response = post_analysis(TestClient(main.app), skin_type="x" * 1025)

    assert response.status_code == 413
    assert inference_calls == []


def test_analyze_rejects_image_whose_detected_format_does_not_match_mime(monkeypatch):
    stub_success(monkeypatch)
    inference_calls = []

    def track_inference(image):
        inference_calls.append(image)
        return fake_analysis()

    monkeypatch.setattr(main, "analyze_image", track_inference)

    response = post_analysis(
        TestClient(main.app),
        image=gif_bytes(),
        image_content_type="image/png",
    )

    assert response.status_code == 415
    assert inference_calls == []


def test_analyze_accepts_case_insensitive_multipart_media_type(monkeypatch):
    stub_success(monkeypatch)
    client = TestClient(main.app)
    request = client.build_request(
        "POST",
        "/analyze",
        data={
            "nickname": "tester",
            "lat": "36.62",
            "lng": "127.29",
            "skin_type": "dry_sensitive",
        },
        files={"image": ("face.png", png_bytes(), "image/png")},
    )
    request.headers["content-type"] = request.headers["content-type"].replace(
        "multipart/form-data",
        "Multipart/Form-Data",
    )

    response = client.send(request)

    assert response.status_code == 200


def test_analyze_rejects_truncated_image_before_inference(monkeypatch):
    stub_success(monkeypatch)
    inference_calls = []

    def track_inference(image):
        inference_calls.append(image)
        return fake_analysis()

    monkeypatch.setattr(main, "analyze_image", track_inference)

    response = post_analysis(
        TestClient(main.app),
        image=truncated_jpeg_bytes(),
        image_content_type="image/jpeg",
    )

    assert response.status_code == 400
    assert inference_calls == []


def test_analyze_rejects_advertised_oversized_body_before_parsing():
    response = TestClient(main.app).post(
        "/analyze",
        content=b"",
        headers={
            "content-type": "multipart/form-data; boundary=body-limit",
            "content-length": str(settings.MAX_MULTIPART_BODY_BYTES + 1),
        },
    )

    assert response.status_code == 413


def test_analyze_reports_a_missing_image_as_an_unprocessable_form():
    response = TestClient(main.app).post(
        "/analyze",
        files=[
            ("nickname", (None, "tester")),
            ("lat", (None, "36.62")),
            ("lng", (None, "127.29")),
            ("skin_type", (None, "dry_sensitive")),
        ],
    )

    assert response.status_code == 422


def test_analyze_rejects_actual_oversized_stream_without_content_length():
    body = b"x" * (settings.MAX_MULTIPART_BODY_BYTES + 1)

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/analyze",
            "headers": [(b"content-type", b"multipart/form-data; boundary=stream-limit")],
        },
        receive,
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(parse_analyze_multipart(request))

    assert exc.value.status_code == 413


def test_analyze_times_out_a_stalled_upload_stream(monkeypatch):
    monkeypatch.setattr(settings, "MULTIPART_READ_TIMEOUT_SECONDS", 0.01, raising=False)

    async def receive():
        await asyncio.sleep(0.05)
        return {"type": "http.request", "body": b"", "more_body": False}

    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/analyze",
            "headers": [(b"content-type", b"multipart/form-data; boundary=stalled")],
        },
        receive,
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(parse_analyze_multipart(request))

    assert exc.value.status_code == 408


def test_analyze_maps_an_oversized_multipart_boundary_to_bad_request():
    boundary = "x" * 257

    response = TestClient(main.app, raise_server_exceptions=False).post(
        "/analyze",
        content=b"",
        headers={"content-type": f"multipart/form-data; boundary={boundary}"},
    )

    assert response.status_code == 400


def test_analyze_rejects_when_all_inference_slots_are_busy(monkeypatch):
    stub_success(monkeypatch)
    occupied_slot = BoundedSemaphore(1)
    occupied_slot.acquire()
    monkeypatch.setattr(main, "_analysis_slots", occupied_slot, raising=False)

    try:
        response = post_analysis(TestClient(main.app))
    finally:
        occupied_slot.release()

    assert response.status_code == 429
    assert response.headers["retry-after"] == "1"


def test_busy_inference_does_not_hide_an_oversized_upload(monkeypatch):
    occupied_slot = BoundedSemaphore(1)
    occupied_slot.acquire()
    monkeypatch.setattr(main, "_analysis_slots", occupied_slot, raising=False)

    try:
        response = TestClient(main.app).post(
            "/analyze",
            content=b"",
            headers={
                "content-type": "multipart/form-data; boundary=busy",
                "content-length": str(settings.MAX_MULTIPART_BODY_BYTES + 1),
            },
        )
    finally:
        occupied_slot.release()

    assert response.status_code == 413


def test_busy_upload_limit_rejects_before_reading_body(monkeypatch):
    occupied_slot = BoundedSemaphore(1)
    occupied_slot.acquire()
    monkeypatch.setattr(main, "_upload_slots", occupied_slot, raising=False)

    try:
        response = TestClient(main.app).post(
            "/analyze",
            content=b"",
            headers={
                "content-type": "multipart/form-data; boundary=busy",
                "content-length": str(settings.MAX_MULTIPART_BODY_BYTES + 1),
            },
        )
    finally:
        occupied_slot.release()

    assert response.status_code == 429


def test_cors_allows_the_local_frontend_origin():
    response = TestClient(main.app).options(
        "/analyze",
        headers={
            "origin": "http://localhost:5173",
            "access-control-request-method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_does_not_echo_an_untrusted_origin():
    response = TestClient(main.app).options(
        "/analyze",
        headers={
            "origin": "https://attacker.example",
            "access-control-request-method": "POST",
        },
    )

    assert response.status_code == 403
    assert "access-control-allow-origin" not in response.headers


def test_untrusted_browser_origin_is_rejected_before_inference(monkeypatch):
    stub_success(monkeypatch)
    inference_calls = []
    monkeypatch.setattr(
        main,
        "analyze_image",
        lambda image: inference_calls.append(image) or fake_analysis(),
    )

    response = TestClient(main.app).post(
        "/analyze",
        data={
            "nickname": "tester",
            "lat": "36.62",
            "lng": "127.29",
            "skin_type": "dry_sensitive",
        },
        files={"image": ("face.png", png_bytes(), "image/png")},
        headers={"origin": "https://attacker.example"},
    )

    assert response.status_code == 403
    assert inference_calls == []


def test_same_origin_api_request_remains_available_for_swagger(monkeypatch):
    stub_success(monkeypatch)

    response = TestClient(main.app).post(
        "/analyze",
        data={
            "nickname": "tester",
            "lat": "36.62",
            "lng": "127.29",
            "skin_type": "dry_sensitive",
        },
        files={"image": ("face.png", png_bytes(), "image/png")},
        headers={"origin": "http://testserver"},
    )

    assert response.status_code == 200
