from typing import Optional
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, Depends, HTTPException, Request, Form
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserProfile
from ..schemas import UserRegister, Token
from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    is_legacy_sha256,
)
from ..rate_limiter import limiter_login, limiter_register


router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=Token,
    dependencies=[Depends(limiter_register)],
)
def register_user(
    req: UserRegister,
    db: Session = Depends(get_db),
):
    # Security: Prevent privilege escalation via self-registration.
    # Public registration is restricted to the "User" role only.
    # Privileged roles (Skincare Consultant, Dermatologist, Administrator)
    # must be assigned by an Administrator through the admin management interface.
    SELF_REGISTERABLE_ROLES = {"User"}
    requested_role = (req.role or "User").strip()

    if requested_role not in SELF_REGISTERABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{requested_role}' cannot be self-assigned during registration. "
                   f"Contact an administrator to request elevated access."
        )

    existing = db.query(User).filter(User.email == req.email).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists",
        )

    hashed = hash_password(req.password)

    user = User(
        name=req.name,
        email=req.email,
        hashed_password=hashed,
        role="User",  # Always assign "User" regardless of request
    )

    db.add(user)
    db.flush()  # flush to get user.id before committing

    # Initialize empty profile atomically with the user
    profile = UserProfile(user_id=user.id)
    db.add(profile)
    db.commit()  # single atomic commit: user + profile
    db.refresh(user)

    token = create_access_token(
        {
            "sub": user.id,
            "role": user.role,
            "name": user.name,
        }
    )

    return Token(
        access_token=token,
        user_id=user.id,
        role=user.role,
        name=user.name,
    )



@router.post(
    "/login",
    response_model=Token,
    dependencies=[Depends(limiter_login)],
)
async def login_user(
    request: Request,
    db: Session = Depends(get_db),
):
    email_val = None
    password_val = None

    content_type = request.headers.get("content-type", "")

    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        try:
            form = await request.form()
            email_val = form.get("email") or form.get("username")
            password_val = form.get("password")
        except Exception:
            pass
    else:
        try:
            body = await request.json()
            email_val = body.get("email") or body.get("username")
            password_val = body.get("password")
        except Exception:
            pass

    if not email_val or not password_val:
        raise HTTPException(
            status_code=422,
            detail="Email and password are required",
        )

    user = db.query(User).filter(User.email == email_val).first()

    if not user or not verify_password(password_val, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    # Upgrade legacy SHA-256 hashes to Argon2id after successful login.
    if is_legacy_sha256(user.hashed_password):
        user.hashed_password = hash_password(password_val)
        db.commit()

    token = create_access_token(
        {
            "sub": user.id,
            "role": user.role,
            "name": user.name,
        }
    )

    return Token(
        access_token=token,
        user_id=user.id,
        role=user.role,
        name=user.name,
    )


@router.get("/me")
def get_me(
    user: User = Depends(get_current_user),
):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.put("/password")
def change_password(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_pw = data.get("current_password")
    new_pw = data.get("new_password")

    if not current_pw or not new_pw:
        raise HTTPException(status_code=400, detail="current_password and new_password are required")

    if not verify_password(current_pw, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    if len(new_pw) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    current_user.hashed_password = hash_password(new_pw)
    db.commit()

    return {"status": "success", "message": "Password updated successfully"}


