"""End-to-end MinIO diagnostic using the same root .env as VoiceTurk backend."""
from __future__ import annotations

import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api"))


def load_env(path: Path) -> None:
    if not path.exists():
        raise RuntimeError(f"UNKNOWN_STORAGE_ERROR: env file not found: {path}")
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def mask(value: str) -> str:
    if not value:
        return "<missing>"
    if len(value) <= 5:
        return "*" * len(value)
    return f"{value[:3]}{'*' * max(4, len(value) - 5)}{value[-2:]}"


def fail(code: str, detail: object) -> int:
    print(f"{code}: {detail}", file=sys.stderr)
    return 1


def main() -> int:
    try:
        load_env(ROOT / ".env")
        from app.adapters.storage.minio import MinioStorageAdapter

        provider = os.getenv("OBJECT_STORAGE_PROVIDER", "local")
        endpoint = os.getenv("S3_ENDPOINT_URL", "")
        public = os.getenv("S3_PUBLIC_BASE_URL", "")
        bucket = os.getenv("S3_BUCKET_NAME", "voiceturk-dev")
        access = os.getenv("S3_ACCESS_KEY_ID", "")
        secret = os.getenv("S3_SECRET_ACCESS_KEY", "")
        configured_region = os.getenv("S3_REGION", "us-east-1")
        region = "us-east-1" if configured_region in {"", "auto"} else configured_region
        secure = os.getenv("S3_SECURE", "false").lower() == "true"
        app_env = os.getenv("APP_ENV", "development")
        expiry = int(os.getenv("S3_PRESIGNED_EXPIRE_SECONDS", "900"))

        print("VoiceTurk MinIO diagnostic (secrets masked)")
        for key, value in {
            "OBJECT_STORAGE_PROVIDER": provider, "S3_ENDPOINT_URL": endpoint,
            "S3_PUBLIC_BASE_URL": public or "<empty>", "S3_BUCKET_NAME": bucket,
            "S3_REGION": f"{configured_region} (effective: {region})", "S3_SECURE": secure,
            "S3_ACCESS_KEY_ID": mask(access), "S3_SECRET_ACCESS_KEY": mask(secret),
        }.items():
            print(f"  {key}={value}")

        if provider != "minio":
            return fail("UNKNOWN_STORAGE_ERROR", "OBJECT_STORAGE_PROVIDER is not minio")
        if not public:
            print("WARNING: S3_PUBLIC_BASE_URL is empty; endpoint fallback is safe only when browser-reachable")
        host = urlparse(public or endpoint).hostname or ""
        if host == "minio":
            return fail("PUBLIC_URL_NOT_BROWSER_REACHABLE", "Docker hostname 'minio' is not browser-resolvable")
        if host == "127.0.0.1":
            print("URL_SHAPE: 127.0.0.1 works only when browser and backend run on this machine")
        elif host.startswith("100.74."):
            print("URL_SHAPE: 100.74.x.x requires Tailscale/VPN reachability from the browser")
        elif host.startswith("192.168."):
            print("URL_SHAPE: 192.168.x.x requires LAN reachability from the browser device")

        try:
            storage = MinioStorageAdapter(endpoint, bucket, access, secret, region, secure, public, app_env)
        except Exception as exc:
            message = str(exc)
            if any(token in message.lower() for token in ("credential", "access denied", "signature")):
                return fail("AUTH_FAILED", message)
            if "does not exist" in message:
                return fail("BUCKET_NOT_FOUND", message)
            if "create" in message.lower() and "bucket" in message.lower():
                return fail("BUCKET_CREATE_FAILED", message)
            return fail("CONNECTION_FAILED", message)

        stamp = int(time.time())
        direct_key = f"diagnostics/{stamp}/hello.txt"
        signed_key = f"diagnostics/{stamp}/presigned.txt"
        try:
            storage.put_object(direct_key, b"hello from VoiceTurk diagnostics", "text/plain")
            metadata = storage.get_object_metadata(direct_key)
            print(f"DIRECT_PUT_OK: {direct_key} ({metadata['size_bytes']} bytes)")
            get_url = storage.create_presigned_get_url(direct_key, expiry)
            put_url = storage.create_presigned_put_url(signed_key, "text/plain", expiry)
            print(f"PRESIGNED_GET_OK: host={urlparse(get_url).netloc}")
            print(f"PRESIGNED_PUT_OK: host={urlparse(put_url).netloc}")
            preflight = urllib.request.Request(put_url, method="OPTIONS", headers={
                "Origin": "http://localhost:5173", "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": "content-type"})
            with urllib.request.urlopen(preflight, timeout=15) as response:
                allowed_origin = response.headers.get("Access-Control-Allow-Origin")
                allowed_methods = response.headers.get("Access-Control-Allow-Methods", "")
                if allowed_origin not in {"*", "http://localhost:5173"} or "PUT" not in allowed_methods:
                    return fail("CORS_LIKELY_BLOCKED", f"origin={allowed_origin}, methods={allowed_methods}")
            print("CORS_PREFLIGHT_OK: http://localhost:5173 may PUT")
            request = urllib.request.Request(put_url, data=b"presigned upload probe", method="PUT",
                                             headers={"Content-Type": "text/plain"})
            with urllib.request.urlopen(request, timeout=15) as response:
                if response.status not in (200, 201, 204):
                    return fail("PRESIGNED_PUT_FAILED", f"HTTP {response.status}")
            if not storage.object_exists(signed_key):
                return fail("PRESIGNED_PUT_FAILED", "object does not exist after HTTP PUT")
            print("PRESIGNED_PUT_VERIFIED")
            print("Browser probe is still required to validate the browser's VPN/LAN route")
            return 0
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            if "SignatureDoesNotMatch" in body:
                return fail("SIGNATURE_MISMATCH", f"HTTP {exc.code}")
            return fail("PRESIGNED_PUT_FAILED", f"HTTP {exc.code}: {body[:200]}")
        except urllib.error.URLError as exc:
            return fail("PUBLIC_URL_NOT_BROWSER_REACHABLE", exc.reason)
        except Exception as exc:
            return fail("UNKNOWN_STORAGE_ERROR", f"{type(exc).__name__}: {exc}")
        finally:
            for key in (direct_key, signed_key):
                try:
                    storage.delete_object(key)
                except Exception:
                    pass
    except Exception as exc:
        return fail("UNKNOWN_STORAGE_ERROR", f"{type(exc).__name__}: {exc}")


if __name__ == "__main__":
    raise SystemExit(main())
