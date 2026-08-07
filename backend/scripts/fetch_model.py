"""Download the model artifact required by a Render build."""

import hashlib
import os
from pathlib import Path
from urllib.request import urlopen


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DESTINATION = BACKEND_DIR / "model" / "skin_multitask" / "final_model.keras"
DEFAULT_SHA256 = "E835BB5686FF5C3DDF83BA92D52EB7CB4D2E100D1097178775B08A68F313EB15"


def main() -> None:
    url = os.environ["MODEL_DOWNLOAD_URL"]
    destination = Path(os.getenv("MODEL_DESTINATION", str(DEFAULT_DESTINATION)))
    expected_sha256 = os.getenv("MODEL_SHA256", DEFAULT_SHA256).strip().upper()
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(f"{destination.suffix}.part")
    temporary.unlink(missing_ok=True)

    digest = hashlib.sha256()
    try:
        with urlopen(url, timeout=120) as source, temporary.open("wb") as output:
            while chunk := source.read(1024 * 1024):
                digest.update(chunk)
                output.write(chunk)
        if digest.hexdigest().upper() != expected_sha256:
            raise RuntimeError("Downloaded model checksum mismatch")
        temporary.replace(destination)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


if __name__ == "__main__":
    main()
