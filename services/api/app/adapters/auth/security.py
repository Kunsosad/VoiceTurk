import base64
import hashlib
import hmac
import json
import time
from typing import Any

import bcrypt

from app.domain.entities import User
from app.domain.enums import UserRole
from app.ports.repositories import RepositoryPort


class AuthenticationError(ValueError):
    pass


class AuthManager:
    """HTTP/infrastructure auth support; credentials do not become domain entities."""

    def __init__(self, repository: RepositoryPort, secret_key: str, expire_minutes: int) -> None:
        self.repository = repository
        self.secret = secret_key.encode("utf-8")
        self.expire_seconds = expire_minutes * 60

    def register(self, email: str, password: str, name: str, role: UserRole) -> User:
        normalized = email.strip().lower()
        if len(password) < 10:
            raise ValueError("Password must be at least 10 characters")
        if self._credential(normalized):
            raise ValueError("Email is already registered")
        user_id = f"user_{hashlib.sha256(normalized.encode()).hexdigest()[:12]}"
        user = User(user_id, role, name.strip(), normalized)
        credential = {"credential_id": user_id, "email": normalized,
                      "password_hash": bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()}
        self.repository.add("users", user)
        self.repository.add("auth_credentials", credential)
        return user

    def authenticate(self, email: str, password: str) -> tuple[User, str]:
        credential = self._credential(email.strip().lower())
        if not credential or not bcrypt.checkpw(password.encode(), credential["password_hash"].encode()):
            raise AuthenticationError("Invalid email or password")
        user = self.repository.get("users", credential["credential_id"])
        if not user or user.status != "ACTIVE":
            raise AuthenticationError("Account is unavailable")
        return user, self.issue_token(user)

    def issue_token(self, user: User) -> str:
        payload = {"sub": user.user_id, "role": user.role.value, "exp": int(time.time()) + self.expire_seconds}
        encoded = self._b64(json.dumps(payload, separators=(",", ":")).encode())
        signature = self._b64(hmac.new(self.secret, encoded.encode(), hashlib.sha256).digest())
        return f"{encoded}.{signature}"

    def current_user(self, token: str) -> User:
        try:
            encoded, signature = token.split(".", 1)
            expected = self._b64(hmac.new(self.secret, encoded.encode(), hashlib.sha256).digest())
            if not hmac.compare_digest(signature, expected):
                raise AuthenticationError("Invalid access token")
            payload = json.loads(self._unb64(encoded))
            if int(payload["exp"]) <= int(time.time()):
                raise AuthenticationError("Access token expired")
            user = self.repository.get("users", payload["sub"])
            if not user or user.status != "ACTIVE":
                raise AuthenticationError("Account is unavailable")
            return user
        except AuthenticationError:
            raise
        except Exception as exc:
            raise AuthenticationError("Invalid access token") from exc

    def seed_demo_accounts(self) -> list[User]:
        accounts = [
            ("user_001", "buyer@voiceturk.demo", "VoiceTurk123!", "Linh Buyer", UserRole.BUYER),
            ("contributor_001", "contributor@voiceturk.demo", "VoiceTurk123!", "Minh Contributor", UserRole.CONTRIBUTOR),
            ("admin_001", "admin@voiceturk.demo", "VoiceTurk123!", "VoiceTurk Admin", UserRole.ADMIN),
        ]
        users = []
        for user_id, email, password, name, role in accounts:
            credential = self._credential(email)
            if credential:
                users.append(self.repository.get("users", credential["credential_id"]))
                continue
            user = User(user_id, role, name, email)
            self.repository.add("users", user)
            self.repository.add("auth_credentials", {"credential_id": user_id, "email": email,
                "password_hash": bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()})
            users.append(user)
        return users

    def _credential(self, email: str) -> dict[str, Any] | None:
        return next((value for value in self.repository.list("auth_credentials") if value["email"] == email), None)

    @staticmethod
    def _b64(value: bytes) -> str:
        return base64.urlsafe_b64encode(value).decode().rstrip("=")

    @staticmethod
    def _unb64(value: str) -> bytes:
        return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
