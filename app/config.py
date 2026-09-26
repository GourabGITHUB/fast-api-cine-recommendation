from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    gemini_api_key: str = Field(validation_alias="GOOGLE_API_KEY")
    #redis_host: str = "172.17.0.2"
    redis_host: str = "localhost"
    redis_port: int = 6379
    model_config = SettingsConfigDict(
    env_file=".env",              # Automatically loads .env in local dev
    env_file_encoding="utf-8",
    extra="ignore"                # Ignores extra env vars injected by Render
    )


settings = Settings()