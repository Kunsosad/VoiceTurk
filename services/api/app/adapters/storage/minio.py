from typing import Any, BinaryIO

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.ports.providers import ObjectStoragePort


class MinioStorageAdapter(ObjectStoragePort):
    def __init__(self, endpoint_url: str, bucket: str, access_key: str, secret_key: str,
                 region: str, secure: bool, public_base_url: str = "") -> None:
        if not endpoint_url or not access_key or not secret_key:
            raise RuntimeError("MinIO requires S3_ENDPOINT_URL, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY")
        if not endpoint_url.startswith(("http://", "https://")):
            endpoint_url = f"{'https' if secure else 'http'}://{endpoint_url}"
        self.bucket = bucket
        self.public_base_url = public_base_url.rstrip("/")
        self.client = boto3.client("s3", endpoint_url=endpoint_url, aws_access_key_id=access_key,
            aws_secret_access_key=secret_key, region_name=region, config=Config(signature_version="s3v4"))
        try:
            self.client.head_bucket(Bucket=bucket)
        except ClientError as exc:
            code = str(exc.response.get("Error", {}).get("Code", ""))
            if code in {"404", "NoSuchBucket"}:
                self.client.create_bucket(Bucket=bucket)
            else:
                raise RuntimeError(f"Cannot access MinIO bucket '{bucket}': {exc}") from exc

    def create_presigned_put_url(self, object_key: str, content_type: str, expires_seconds: int = 900) -> str:
        return self.client.generate_presigned_url("put_object", Params={"Bucket": self.bucket, "Key": object_key,
            "ContentType": content_type}, ExpiresIn=expires_seconds)

    def create_presigned_get_url(self, object_key: str, expires_seconds: int = 900) -> str:
        return self.client.generate_presigned_url("get_object", Params={"Bucket": self.bucket, "Key": object_key}, ExpiresIn=expires_seconds)

    def put_object(self, object_key: str, data: bytes | BinaryIO, content_type: str) -> None:
        self.client.put_object(Bucket=self.bucket, Key=object_key, Body=data, ContentType=content_type)

    def get_object(self, object_key: str) -> bytes:
        return self.client.get_object(Bucket=self.bucket, Key=object_key)["Body"].read()

    def get_object_metadata(self, object_key: str) -> dict[str, Any]:
        value = self.client.head_object(Bucket=self.bucket, Key=object_key)
        return {"size_bytes": value["ContentLength"], "content_type": value.get("ContentType"), "object_key": object_key}

    def copy_object(self, source_key: str, dest_key: str) -> None:
        self.client.copy_object(Bucket=self.bucket, Key=dest_key, CopySource={"Bucket": self.bucket, "Key": source_key})

    def delete_object(self, object_key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=object_key)

    def object_exists(self, object_key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=object_key)
            return True
        except ClientError as exc:
            if str(exc.response.get("Error", {}).get("Code", "")) in {"404", "NoSuchKey"}:
                return False
            raise

    def get_public_or_signed_url(self, object_key: str) -> str:
        return f"{self.public_base_url}/{object_key}" if self.public_base_url else self.create_presigned_get_url(object_key)
