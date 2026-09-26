import redis
from redis.backoff import NoBackoff
from redis.retry import Retry
from google import genai
from google.genai import types
from .config import settings
from .models import Recommendation, RecommendationResponse
import logging

client = genai.Client(api_key=settings.gemini_api_key)

logger = logging.getLogger(__name__)

redis_client = redis.Redis(
host=settings.redis_host,
port=settings.redis_port,
decode_responses=True,
socket_connect_timeout=1.5,
socket_timeout=1.5,
retry_on_timeout=False,
retry=Retry(NoBackoff(),0),
)

def normalize_recommendations(
    response: RecommendationResponse,
) -> RecommendationResponse:
    unique: list[Recommendation] = []
    seen_titles: set[str] = set()

    for recommendation in response.recommendations:
        normalized_title = recommendation.title.strip().casefold()

        if not normalized_title:
            continue

        if normalized_title in seen_titles:
            continue

        seen_titles.add(normalized_title)

        unique.append(
            Recommendation(
                title=recommendation.title.strip(),
                description=recommendation.description.strip(),
            )
        )

        if len(unique) == 8:
            break

    if len(unique) < 5:
        raise ValueError(
            "Gemini returned fewer than 5 unique recommendations"
        )

    return RecommendationResponse(
        recommendations=unique
    )


def generate_once(prompt: str) -> RecommendationResponse:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config= types.GenerateContentConfig(
            temperature=0.6,
            response_mime_type="application/json",
            response_schema=RecommendationResponse,
        ),
    )

    if response.parsed is None:
        raise RuntimeError("Gemini returned an empty response")

    return normalize_recommendations(response.parsed)


def generate_recommendations(prompt: str) -> RecommendationResponse:
    # 1. Check Redis cache first
    cache_key = f"rec:{prompt.strip().casefold()}"
    try:
        cached_response = redis_client.get(cache_key)
        if cached_response:
            return RecommendationResponse.model_validate_json(cached_response)
        
    except (redis.RedisError, TimeoutError ) as e:
        logger.warning("Redis cache read failed, falling back to Gemini: %s", str(e))

    try:
        result = generate_once(prompt)

    except ValueError:
        # First response did not satisfy our recommendation rules.
        retry_prompt = f"""
The previous recommendation response did not contain enough
unique recommendations.

Generate a new recommendation response.

Requirements:
- Return between 5 and 8 recommendations.
- Every recommendation must be unique.
- Do not repeat titles.
- Do not include the user's original title if this is a title-based request.
- Keep descriptions short and useful.

Original request:

{prompt}
"""

        try:
            result = generate_once(retry_prompt)

        except ValueError as exc:
            raise RuntimeError(
                "Gemini could not produce enough unique recommendations"
            ) from exc

        except Exception as exc:
            raise RuntimeError(
                "Gemini request failed during retry"
            ) from exc

    except Exception as exc:
        raise RuntimeError(
            "Gemini request failed"
        ) from exc

    # 2. Cache successful result (e.g. 24 hour TTL)
    try:
        redis_client.set(cache_key, result.model_dump_json(), ex=86400)
    except (redis.RedisError, redis.exceptions.TimeoutError) as e:
        logger.warning("Failed to save response to Redis cache: %s", str(e))
    
    return result