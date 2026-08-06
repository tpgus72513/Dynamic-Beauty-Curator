import asyncio
from io import BytesIO
from tempfile import SpooledTemporaryFile

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from config import settings
from image_upload import (
    read_limited_upload,
    validate_content_type,
    validate_decodable_image,
)


def make_upload(data: bytes, filename: str = "face.jpg") -> UploadFile:
    file = SpooledTemporaryFile()
    file.write(data)
    file.seek(0)
    return UploadFile(file=file, filename=filename)


def png_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (16, 16), "peachpuff").save(output, format="PNG")
    return output.getvalue()


def test_rejects_non_image_content_type():
    with pytest.raises(HTTPException) as exc:
        validate_content_type("application/pdf")

    assert exc.value.status_code == 415


@pytest.mark.parametrize("content_type", ["image/jpeg", "image/png", "image/webp"])
def test_accepts_supported_image_content_types(content_type):
    validate_content_type(content_type)


def test_rejects_undecodable_bytes():
    with pytest.raises(HTTPException) as exc:
        validate_decodable_image(b"not-an-image")

    assert exc.value.status_code == 400


def test_accepts_a_decodable_image():
    validate_decodable_image(png_bytes())


def test_returns_exact_upload_bytes_below_limit():
    upload = make_upload(b"small-image")

    actual = asyncio.run(read_limited_upload(upload, settings.MAX_IMAGE_BYTES))

    assert actual == b"small-image"


def test_rejects_an_empty_upload():
    upload = make_upload(b"")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(read_limited_upload(upload, settings.MAX_IMAGE_BYTES))

    assert exc.value.status_code == 400


def test_rejects_an_upload_over_ten_megabytes():
    upload = make_upload(b"x" * (settings.MAX_IMAGE_BYTES + 1))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(read_limited_upload(upload, settings.MAX_IMAGE_BYTES))

    assert exc.value.status_code == 413
