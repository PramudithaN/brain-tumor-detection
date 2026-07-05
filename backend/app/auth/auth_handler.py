import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
from pydantic import BaseModel

security = HTTPBearer(auto_error=False)

# Load configuration from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

class User(BaseModel):
    id: str
    email: Optional[str] = None

async def verify_token_locally(token: str) -> Optional[User]:
    """Verify Supabase JWT locally using the JWT Secret."""
    if not SUPABASE_JWT_SECRET:
        return None
    try:
        # Supabase JWT uses HS256 with the JWT secret
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        user_id = payload.get("sub")
        email = payload.get("email")
        if user_id:
            return User(id=user_id, email=email)
    except JWTError:
        pass
    return None

async def verify_token_remotely(token: str) -> Optional[User]:
    """Verify token by checking with Supabase auth server directly."""
    if not SUPABASE_URL:
        return None
    try:
        headers = {
            "apikey": os.getenv("SUPABASE_ANON_KEY", ""),
            "Authorization": f"Bearer {token}"
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)
            if response.status_code == 200:
                data = response.json()
                return User(id=data.get("id"), email=data.get("email"))
    except Exception:
        pass
    return None

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> User:
    """Dependency to require authentication."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    user = await verify_token_locally(token)
    if not user:
        user = await verify_token_remotely(token)
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    """Dependency for routes that accept optional authentication."""
    if not credentials:
        return None
        
    token = credentials.credentials
    user = await verify_token_locally(token)
    if not user:
        user = await verify_token_remotely(token)
    return user
