def generate_auth_module(input_json: dict) -> str:
    return '''from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

router = APIRouter(prefix="/auth", tags=["auth"])

users_db: dict[str, dict] = {}


class UserRegister(BaseModel):
    email: str
    password: str
    name: str = ""


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    email: str
    name: str


def create_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserRegister):
    if payload.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    users_db[payload.email] = {
        "email": payload.email,
        "name": payload.name,
        "hashed_password": pwd_context.hash(payload.password),
    }
    return {"email": payload.email, "name": payload.name}


@router.post("/login", response_model=Token)
def login(payload: UserLogin):
    user = users_db.get(payload.email)
    if not user or not pwd_context.verify(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": create_token({"sub": payload.email}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)),
        "refresh_token": create_token({"sub": payload.email, "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)),
    }


@router.post("/refresh", response_model=Token)
def refresh(payload: TokenRefresh):
    try:
        data = jwt.decode(payload.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        email = data.get("sub")
        if not email or email not in users_db:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        return {
            "access_token": create_token({"sub": email}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)),
            "refresh_token": create_token({"sub": email, "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)),
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/me", response_model=UserOut)
def get_me(email: str = Depends(verify_token)):
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": user["email"], "name": user["name"]}
'''
