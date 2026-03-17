from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_temperature: float = 0.1
    google_api_key: str = ""
    google_model: str = "gemini-2.0-flash"
    llm_provider: str = "google"  # "google" or "openai"
    database_url: str = "sqlite:///./smart_inspections.db"
    data_dir: str = "../data"
    title21_csv_path: str = ""
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def data_path(self) -> Path:
        return Path(self.data_dir).resolve()

    @property
    def title21_sections_csv(self) -> Path:
        if self.title21_csv_path:
            configured = Path(self.title21_csv_path).resolve()
            if configured.exists():
                return configured

        # Use workspace data_dir; caller must ensure file exists.
        return self.data_path / "title-21-sections.csv"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
