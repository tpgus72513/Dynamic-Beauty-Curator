from io import BytesIO

import pytest
from fastapi import HTTPException
from PIL import Image

from image_upload import (
    validate_content_type,
    validate_decodable_image,
)


def png_bytes(size=(16, 16), mode="RGB") -> bytes:
    output = BytesIO()
    Image.new(mode, size).save(output, format="PNG")
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


def test_rejects_image_width_over_safe_limit():
    with pytest.raises(HTTPException) as exc:
        validate_decodable_image(png_bytes(size=(4097, 1), mode="1"))

    assert exc.value.status_code == 413


def test_rejects_image_total_pixels_over_safe_limit():
    with pytest.raises(HTTPException) as exc:
        validate_decodable_image(png_bytes(size=(4001, 4000), mode="1"))

    assert exc.value.status_code == 413
