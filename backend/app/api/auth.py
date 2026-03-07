import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


@router.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest):
    users = settings.users_dict
    if req.username not in users or users[req.username] != req.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    payload = {
        "sub": req.username,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    return LoginResponse(token=token, username=req.username)
