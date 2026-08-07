import hashlib
import os
import subprocess
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread


BACKEND_DIR = Path(__file__).resolve().parents[1]
FETCH_SCRIPT = BACKEND_DIR / "scripts" / "fetch_model.py"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        pass


def test_fetch_model_downloads_matching_artifact(tmp_path):
    artifact = b"model artifact from the ZIP package"
    source_dir = tmp_path / "source"
    source_dir.mkdir()
    (source_dir / "final_model.keras").write_bytes(artifact)
    destination = tmp_path / "downloaded" / "final_model.keras"

    handler = partial(QuietHandler, directory=str(source_dir))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        env = os.environ.copy()
        env.update(
            {
                "MODEL_DOWNLOAD_URL": (
                    f"http://127.0.0.1:{server.server_port}/final_model.keras"
                ),
                "MODEL_DESTINATION": str(destination),
                "MODEL_SHA256": hashlib.sha256(artifact).hexdigest(),
            }
        )
        result = subprocess.run(
            [sys.executable, str(FETCH_SCRIPT)],
            cwd=BACKEND_DIR,
            env=env,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert result.returncode == 0, result.stderr
    assert destination.read_bytes() == artifact


def test_fetch_model_rejects_artifact_with_wrong_checksum(tmp_path):
    artifact = b"tampered model artifact"
    source_dir = tmp_path / "source"
    source_dir.mkdir()
    (source_dir / "final_model.keras").write_bytes(artifact)
    destination = tmp_path / "downloaded" / "final_model.keras"

    handler = partial(QuietHandler, directory=str(source_dir))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        env = os.environ.copy()
        env.update(
            {
                "MODEL_DOWNLOAD_URL": (
                    f"http://127.0.0.1:{server.server_port}/final_model.keras"
                ),
                "MODEL_DESTINATION": str(destination),
                "MODEL_SHA256": hashlib.sha256(b"expected artifact").hexdigest(),
            }
        )
        result = subprocess.run(
            [sys.executable, str(FETCH_SCRIPT)],
            cwd=BACKEND_DIR,
            env=env,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert result.returncode != 0
    assert not destination.exists()
