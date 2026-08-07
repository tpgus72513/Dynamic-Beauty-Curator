import warnings
from dataclasses import dataclass
from io import BytesIO
from math import isfinite

from anyio import fail_after
from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from python_multipart import MultipartParser
from python_multipart.exceptions import MultipartParseError
from python_multipart.multipart import parse_options_header
from starlette.requests import Request

from config import settings


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
IMAGE_FORMAT_BY_TYPE = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}
ANALYZE_FIELDS = {"image", "nickname", "lat", "lng", "skin_type"}


@dataclass(frozen=True)
class AnalyzeMultipart:
    image_bytes: bytes
    image_content_type: str
    nickname: str
    lat: float
    lng: float
    skin_type: str


def validate_content_type(content_type: str | None) -> None:
    if content_type is None or content_type.lower() not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="JPG, PNG, WEBP 이미지만 사용할 수 있습니다.",
        )


def validate_decodable_image(
    image_bytes: bytes,
    expected_content_type: str | None = None,
) -> None:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(image_bytes)) as image:
                expected_format = IMAGE_FORMAT_BY_TYPE.get(expected_content_type)
                if expected_format is not None and image.format != expected_format:
                    raise HTTPException(
                        status_code=415,
                        detail="이미지 형식과 파일 내용이 일치하지 않습니다.",
                    )
                width, height = image.size
                if (
                    width <= 0
                    or height <= 0
                    or width > settings.MAX_IMAGE_WIDTH
                    or height > settings.MAX_IMAGE_HEIGHT
                    or width * height > settings.MAX_IMAGE_PIXELS
                ):
                    raise HTTPException(
                        status_code=413,
                        detail="이미지 해상도가 너무 큽니다.",
                    )
                image.load()
                rgb_image = image.convert("RGB")
                try:
                    rgb_image.load()
                finally:
                    rgb_image.close()
    except HTTPException:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise HTTPException(
            status_code=413,
            detail="이미지 해상도가 너무 큽니다.",
        ) from exc
    except (
        UnidentifiedImageError,
        OSError,
    ) as exc:
        raise HTTPException(
            status_code=400,
            detail="이미지를 읽을 수 없습니다.",
        ) from exc


class _AnalyzeMultipartCollector:
    """Collect the five analyze parts in memory with per-part limits."""

    def __init__(self, max_image_bytes: int, max_field_bytes: int):
        self.max_image_bytes = max_image_bytes
        self.max_field_bytes = max_field_bytes
        self.fields: dict[str, str] = {}
        self.image_bytes: bytes | None = None
        self.image_content_type: str | None = None
        self.finished = False
        self._seen: set[str] = set()
        self._headers: dict[bytes, bytes] = {}
        self._header_field = bytearray()
        self._header_value = bytearray()
        self._part_name: str | None = None
        self._part_data = bytearray()

    @property
    def callbacks(self):
        return {
            "on_part_begin": self.on_part_begin,
            "on_part_data": self.on_part_data,
            "on_part_end": self.on_part_end,
            "on_header_field": self.on_header_field,
            "on_header_value": self.on_header_value,
            "on_header_end": self.on_header_end,
            "on_headers_finished": self.on_headers_finished,
            "on_end": self.on_end,
        }

    def on_part_begin(self) -> None:
        self._headers = {}
        self._header_field = bytearray()
        self._header_value = bytearray()
        self._part_name = None
        self._part_data = bytearray()

    def on_header_field(self, data: bytes, start: int, end: int) -> None:
        self._header_field.extend(data[start:end])

    def on_header_value(self, data: bytes, start: int, end: int) -> None:
        self._header_value.extend(data[start:end])

    def on_header_end(self) -> None:
        name = bytes(self._header_field).lower()
        if not name or name in self._headers:
            raise HTTPException(status_code=400, detail="잘못된 multipart 헤더입니다.")
        self._headers[name] = bytes(self._header_value)
        self._header_field.clear()
        self._header_value.clear()

    def on_headers_finished(self) -> None:
        disposition = self._headers.get(b"content-disposition")
        if disposition is None:
            raise HTTPException(status_code=400, detail="multipart 필드 정보가 없습니다.")

        disposition_type, options = parse_options_header(disposition)
        raw_name = options.get(b"name")
        if disposition_type.lower() != b"form-data" or not isinstance(raw_name, bytes):
            raise HTTPException(status_code=400, detail="잘못된 multipart 필드입니다.")

        try:
            part_name = raw_name.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(status_code=422, detail="필드 이름을 읽을 수 없습니다.") from exc

        if part_name not in ANALYZE_FIELDS:
            raise HTTPException(status_code=422, detail="지원하지 않는 필드입니다.")
        if part_name in self._seen:
            raise HTTPException(status_code=422, detail="필드가 중복되었습니다.")
        self._seen.add(part_name)
        self._part_name = part_name

        if part_name == "image":
            if b"filename" not in options:
                raise HTTPException(status_code=422, detail="이미지 파일이 필요합니다.")
            raw_content_type = self._headers.get(b"content-type", b"")
            media_type, _ = parse_options_header(raw_content_type)
            try:
                self.image_content_type = media_type.decode("ascii").lower()
            except UnicodeDecodeError as exc:
                raise HTTPException(status_code=415, detail="이미지 형식을 확인해 주세요.") from exc
            validate_content_type(self.image_content_type)
        elif b"filename" in options:
            raise HTTPException(status_code=422, detail="텍스트 필드에 파일을 넣을 수 없습니다.")

    def on_part_data(self, data: bytes, start: int, end: int) -> None:
        if self._part_name is None:
            raise HTTPException(status_code=400, detail="잘못된 multipart 본문입니다.")
        chunk = data[start:end]
        limit = self.max_image_bytes if self._part_name == "image" else self.max_field_bytes
        if len(self._part_data) + len(chunk) > limit:
            detail = (
                "이미지는 10MB 이하여야 합니다."
                if self._part_name == "image"
                else "입력 필드가 너무 큽니다."
            )
            raise HTTPException(status_code=413, detail=detail)
        self._part_data.extend(chunk)

    def on_part_end(self) -> None:
        if self._part_name == "image":
            self.image_bytes = bytes(self._part_data)
            return

        if self._part_name is None:
            raise HTTPException(status_code=400, detail="잘못된 multipart 본문입니다.")
        try:
            self.fields[self._part_name] = self._part_data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(status_code=422, detail="텍스트 필드를 읽을 수 없습니다.") from exc

    def on_end(self) -> None:
        self.finished = True


def _parse_coordinate(value: str, name: str, minimum: float, maximum: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"{name} 값이 올바르지 않습니다.") from exc
    if not isfinite(parsed) or not minimum <= parsed <= maximum:
        raise HTTPException(status_code=422, detail=f"{name} 값이 올바르지 않습니다.")
    return parsed


async def parse_analyze_multipart(request: Request) -> AnalyzeMultipart:
    """Parse `/analyze` without Starlette UploadFile or temporary files."""
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            advertised_size = int(content_length)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Content-Length가 올바르지 않습니다.") from exc
        if advertised_size < 0:
            raise HTTPException(status_code=400, detail="Content-Length가 올바르지 않습니다.")
        if advertised_size > settings.MAX_MULTIPART_BODY_BYTES:
            raise HTTPException(status_code=413, detail="요청 본문이 너무 큽니다.")

    raw_content_type = request.headers.get("content-type", "")
    try:
        encoded_content_type = raw_content_type.encode("latin-1")
    except UnicodeEncodeError as exc:
        raise HTTPException(status_code=415, detail="multipart/form-data 요청이 필요합니다.") from exc
    media_type, options = parse_options_header(encoded_content_type)
    boundary = options.get(b"boundary")
    if media_type.lower() != b"multipart/form-data" or not isinstance(boundary, bytes):
        raise HTTPException(status_code=415, detail="multipart/form-data 요청이 필요합니다.")
    if not boundary or len(boundary) > 70:
        raise HTTPException(status_code=400, detail="multipart boundary가 올바르지 않습니다.")

    collector = _AnalyzeMultipartCollector(
        max_image_bytes=settings.MAX_IMAGE_BYTES,
        max_field_bytes=settings.MAX_MULTIPART_FIELD_BYTES,
    )
    parser = MultipartParser(
        boundary,
        collector.callbacks,
        max_size=settings.MAX_MULTIPART_BODY_BYTES,
        max_header_count=16,
        max_header_size=4096,
    )
    received_size = 0
    try:
        with fail_after(settings.MULTIPART_READ_TIMEOUT_SECONDS):
            async for chunk in request.stream():
                received_size += len(chunk)
                if received_size > settings.MAX_MULTIPART_BODY_BYTES:
                    raise HTTPException(status_code=413, detail="요청 본문이 너무 큽니다.")
                parser.write(chunk)
            parser.finalize()
    except HTTPException:
        raise
    except TimeoutError as exc:
        raise HTTPException(status_code=408, detail="이미지 업로드 시간이 초과되었습니다.") from exc
    except MultipartParseError as exc:
        raise HTTPException(status_code=400, detail="multipart 요청을 읽을 수 없습니다.") from exc

    if not collector.finished:
        raise HTTPException(status_code=400, detail="multipart 요청이 완전하지 않습니다.")
    if collector.image_bytes is None:
        raise HTTPException(status_code=422, detail="필수 입력값이 없습니다.")
    if not collector.image_bytes:
        raise HTTPException(status_code=400, detail="이미지 파일이 비어 있습니다.")
    if collector.image_content_type is None:
        raise HTTPException(status_code=415, detail="이미지 형식을 확인해 주세요.")

    missing = ANALYZE_FIELDS.difference({"image", *collector.fields})
    if missing:
        raise HTTPException(status_code=422, detail="필수 입력값이 없습니다.")

    nickname = collector.fields["nickname"].strip()
    if not nickname or len(nickname) > 12:
        raise HTTPException(status_code=422, detail="닉네임은 1~12자로 입력해 주세요.")
    skin_type = collector.fields["skin_type"].strip()
    if not skin_type or len(skin_type) > 64:
        raise HTTPException(status_code=422, detail="피부 타입을 확인해 주세요.")

    return AnalyzeMultipart(
        image_bytes=collector.image_bytes,
        image_content_type=collector.image_content_type,
        nickname=nickname,
        lat=_parse_coordinate(collector.fields["lat"], "위도", -90, 90),
        lng=_parse_coordinate(collector.fields["lng"], "경도", -180, 180),
        skin_type=skin_type,
    )
