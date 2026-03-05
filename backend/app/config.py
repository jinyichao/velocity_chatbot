from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DASHSCOPE_API_KEY: str
    QWEN_MODEL: str = "qwen-plus"
    DASHSCOPE_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"

    CHROMA_PERSIST_DIR: str = "./data/chroma"
    AUDIT_DB_PATH: str = "./data/audit.db"

    # Comma-separated origins, e.g. "http://localhost:5173,http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # Out-of-scope fallback message
    OUT_OF_SCOPE_MESSAGE: str = (
        "That is out of my scope, I will assist you on figuring out "
        "the right operations at Velocity."
    )


settings = Settings()
