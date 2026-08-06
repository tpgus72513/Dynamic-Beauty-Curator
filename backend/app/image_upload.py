import warnings
from io import BytesIO

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def validate_content_type(content_type: str | None) -> None:
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="JPG, PNG, WEBP 이미지만 사용할 수 있습니다.",
        )


async def read_limited_upload(upload: UploadFile, max_bytes: int) -> bytes:
    data = await upload.read(max_bytes + 1)
    if not data:
        raise HTTPException(status_code=400, detail="이미지 파일이 비어 있습니다.")
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="이미지는 10MB 이하여야 합니다.")
    return data


def validate_decodable_image(image_bytes: bytes) -> None:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(image_bytes)) as image:
                image.verify()
    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise HTTPException(
            status_code=400,
            detail="이미지를 읽을 수 없습니다.",
        ) from exc
