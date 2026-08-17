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


@router.post("/social")
def social_login(
    data: dict,
    db: Session = Depends(get_db),
):
    """
    Social OAuth login/register endpoint.

    Accepts:
      - provider:     'google' | 'twitter' | 'facebook' | 'instagram'
      - provider_id:  the unique user id from the OAuth provider
      - name:         user's display name from provider
      - email:        user's email from provider (may be empty for some providers)
      - avatar_url:   optional profile picture URL from provider

    Flow:
      1. Look up an existing user by (provider, provider_id).
      2. If email is provided, also check by email to link an existing account.
      3. If no existing user, create a new User (role=User) with a randomly-generated
         placeholder password hash (they can never log in with a password unless they
         set one explicitly).
      4. Return a JWT token identical to /auth/login.
    """
    provider = (data.get("provider") or "").lower().strip()
    provider_id = (data.get("provider_id") or "").strip()
    name = (data.get("name") or "").strip() or "Miracle User"
    email_val = (data.get("email") or "").strip().lower() or None
    avatar_url = (data.get("avatar_url") or None)

    ALLOWED_PROVIDERS = {"google", "twitter", "facebook", "instagram"}
    if provider not in ALLOWED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    if not provider_id:
        raise HTTPException(status_code=400, detail="provider_id is required")

    # 1. Look up by social_id + provider
    user = (
        db.query(User)
        .filter(User.social_provider == provider, User.social_id == provider_id)
        .first()
    )

    # 2. If not found by social_id, try by email (link existing account)
    if not user and email_val:
        user = db.query(User).filter(User.email == email_val).first()
        if user:
            # Link this social identity to the existing account
            user.social_provider = provider
            user.social_id = provider_id
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            db.commit()

    # 3. Create a new user if still not found
    if not user:
        # Generate a synthetic unique email if provider gave none
        if not email_val:
            email_val = f"{provider}_{provider_id}@miracle.social"

        # Placeholder un-guessable password hash for social-only accounts
        import secrets
        placeholder_pw = secrets.token_hex(32)
        hashed_placeholder = hash_password(placeholder_pw)

        user = User(
            name=name,
            email=email_val,
            hashed_password=hashed_placeholder,
            role="User",
            social_provider=provider,
            social_id=provider_id,
            avatar_url=avatar_url,
        )
        db.add(user)
        db.flush()

        # Initialize empty profile atomically
        profile = UserProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(user)

    # Update name / avatar if provider gave us a fresher value
    if name and user.name != name:
        user.name = name
    if avatar_url:
        user.avatar_url = avatar_url
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
