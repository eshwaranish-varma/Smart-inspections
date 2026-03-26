from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def _env_files() -> tuple[str, ...]:
    """Prefer repo root `.env`, then optional `backend/.env` overrides (same keys as root template)."""
    paths: list[str] = []
    root_env = _REPO_ROOT / ".env"
    backend_env = _REPO_ROOT / "backend" / ".env"
    if root_env.is_file():
        paths.append(str(root_env))
    if backend_env.is_file():
        paths.append(str(backend_env))
    return tuple(paths)


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
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

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

    model_config = SettingsConfigDict(
        env_file=_env_files() or None,
        env_file_encoding="utf-8",
        # Monorepo `.env` includes Docker/Next/Vite keys the API does not use.
        extra="ignore",
    )


settings = Settings()
