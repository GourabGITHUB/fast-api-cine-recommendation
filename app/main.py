import hashlib
import secrets
import threading
import time

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .models import RecommendationRequest, RecommendationResponse
from .recommendation import get_recommendations
from .rate_limit import limiter


app = FastAPI()

# Rate limiting

app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)


# CORS

ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Local React (Vite)
    "https://your-frontend-name.onrender.com"  #  deployed Render React URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Request-Token"],
    max_age=86400,
)


# Request token 

TOKEN_TTL_SECONDS = 60

# token_hash 
request_tokens: dict[str, float] = {}

# Protects the dictionary when multiple requests arrive concurrently.
token_lock = threading.Lock()


def hash_token(token: str) -> str:
    """
    Store only a SHA-256 hash of the token.
    """
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def cleanup_expired_tokens() -> None:
    """
    Remove expired tokens periodically.
    """
    now = time.time()

    expired = [
        token_hash
        for token_hash, expires_at in request_tokens.items()
        if expires_at <= now
    ]

    for token_hash in expired:
        del request_tokens[token_hash]


def create_request_token() -> str:
    """
    Create a cryptographically secure random token.
    """
    token = secrets.token_urlsafe(32)

    token_hash = hash_token(token)
    expires_at = time.time() + TOKEN_TTL_SECONDS

    with token_lock:
        cleanup_expired_tokens()
        request_tokens[token_hash] = expires_at

    return token


def consume_request_token(token: str) -> bool:
    """
    Validate and consume a token.

    Returns True exactly once for a valid token.
    """
    if not token:
        return False

    token_hash = hash_token(token)

    with token_lock:
        cleanup_expired_tokens()

        expires_at = request_tokens.get(token_hash)

        if expires_at is None:
            return False

        if expires_at <= time.time():
            del request_tokens[token_hash]
            return False

        # Single-use:
        # remove it BEFORE processing the request.
        del request_tokens[token_hash]

        return True


# Routes

@app.get("/")
def root():
    return {
        "message": "astris API is running"
    }


@app.get("/request-token")
@limiter.limit("20/minute")
def request_token(request: Request):
    """
    Generate a short-lived, single-use token.

    The frontend must request one of these before calling /recommend.
    """

    token = create_request_token()

    return {
        "token": token,
        "expires_in": TOKEN_TTL_SECONDS,
    }


@app.post(
    "/recommend",
    response_model=RecommendationResponse,
)
@limiter.limit("5/minute")
@limiter.limit("30/day")
def recommend(
    request: Request,
    payload: RecommendationRequest,
):
    """
    Consume a single-use request token and process the recommendation.
    """

    token = request.headers.get("X-Request-Token")

    if not consume_request_token(token):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired request token",
        )

    try:
        return get_recommendations(
            payload.query_type,
            payload.query,
        )

    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Recommendation service is temporarily unavailable",
        )