"""Shared-password admin login. Reads stay public; every write under /api needs an admin token."""
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

TOKEN_DAYS = 30
ALGORITHM = "HS256"
READ_METHODS = {"GET", "HEAD", "OPTIONS"}
# POSTs that do not change project data: login, PDF exports built from posted rows,
# and the orientation/size caches the 3D viewer computes from the model on first load.
PUBLIC_WRITES = {
    "/api/auth/login",
    "/api/reports/mold-readiness.pdf",
    "/api/reports/analysis.pdf",
    "/api/phases/export-gantt.pdf",
    "/api/facades",
    "/api/dims",
}


class LoginRequest(BaseModel):
    password: str


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def _token_is_valid(request: Request) -> bool:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return False
    try:
        jwt.decode(auth[7:], _secret(), algorithms=[ALGORITHM])
        return True
    except jwt.InvalidTokenError:
        return False


async def require_admin_for_writes(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/") and request.method not in READ_METHODS and path not in PUBLIC_WRITES:
        if not _token_is_valid(request):
            return JSONResponse({"detail": "Inicia sesión como administrador para editar."}, status_code=401)
    return await call_next(request)


def create_auth_router() -> APIRouter:
    router = APIRouter(prefix="/auth")

    @router.post("/login")
    async def login(payload: LoginRequest):
        expected = os.environ.get("ADMIN_PASSWORD", "")
        if not expected or not hmac.compare_digest(payload.password.encode(), expected.encode()):
            return JSONResponse({"detail": "Contraseña incorrecta."}, status_code=401)
        exp = datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS)
        return {"token": jwt.encode({"role": "admin", "exp": exp}, _secret(), algorithm=ALGORITHM)}

    @router.get("/me")
    async def me(request: Request):
        return {"admin": _token_is_valid(request)}

    return router
