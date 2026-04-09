from pathlib import Path
from typing import Self

from pydantic import AliasChoices, Field, HttpUrl, field_validator, model_validator
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
    #: Alternate env names (e.g. OpenRouter) — see ``resolved_openai_api_key`` / ``resolved_openai_model``.
    openai_router_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("OPENAI_ROUTER_API_KEY", "openai_router_api_key"),
    )
    openai_router_model: str = Field(
        default="",
        validation_alias=AliasChoices("OPENAI_ROUTER_MODEL", "openai_router_model"),
    )
    #: OpenAI-compatible API base (OpenRouter, Azure OpenAI proxy, etc.). Empty = platform.openai.com.
    openai_compat_base_url: str = Field(
        default="",
        validation_alias=AliasChoices(
            "OPENAI_COMPAT_BASE_URL",
            "OPENAI_API_BASE",
            "openai_compat_base_url",
        ),
    )
    google_api_key: str = ""
    google_model: str = "gemini-2.0-flash"
    llm_provider: str = "google"  # "google" or "openai"

    #: deployment environment — controls which Postgres URL is used when overrides are set
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "APP_ENV"),
        description='Use "production" for Supabase pooler when DATABASE_POOLER_URL or pooler DATABASE_URL is set.',
    )

    #: Required: default / fallback PostgreSQL URI (must be valid postgres://)
    database_url: str = Field(
        ...,
        description="PostgreSQL connection URL (e.g. Supabase direct or pooler). Validated at startup.",
    )
    #: Optional: direct host (db.<project>.supabase.co:5432) — preferred in non-production when set
    database_direct_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_DIRECT_URL", "database_direct_url"),
        description="Non-prod override: direct Supabase Postgres (port 5432).",
    )
    #: Optional: transaction pooler (…pooler.supabase.com:6543) — preferred in production when set
    database_pooler_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_POOLER_URL", "database_pooler_url"),
        description="Production override: Supabase connection pooler (port 6543).",
    )

    #: Supabase project URL (REST). Optional if you only use Postgres via DATABASE_URL.
    #: Also reads NEXT_PUBLIC_SUPABASE_URL so one monorepo `.env` can supply both GUI and API.
    supabase_url: HttpUrl | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_URL",
            "supabase_url",
        ),
        description="https://<project-ref>.supabase.co",
    )
    #: Supabase anon or service role key (never commit real values)
    supabase_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "SUPABASE_KEY",
            "SUPABASE_ANON_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            "supabase_key",
        ),
        description="Supabase API key (anon or service role). Optional unless SUPABASE_URL is set.",
    )
    data_dir: str = "../data"
    title21_csv_path: str = ""
    title21_xml_dir: str = Field(
        default="",
        description="Directory of Title 21 section XML files (merged with CSV). Empty uses data/title21 if present.",
    )
    citation_match_threshold: float = Field(
        default=0.95,
        ge=0.0,
        le=1.0,
        description="Minimum fuzzy score for best_match; exact CSV/XML index hits always match.",
    )
    #: Where CitationService loads Title 21: auto (prefer Postgres table if non-empty), database, files.
    title21_source: str = Field(
        default="auto",
        description="Title 21 load strategy: auto | database | files",
    )
    #: Supabase/public table created from title-21-sections.csv (see data/title_21_sections_csv_schema.sql).
    title21_table: str = Field(
        default="title_21_sections",
        description="Postgres table name (public schema) for CFR section rows.",
    )
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # --- CFR citation retrieval (fuzzy | semantic | hybrid) ---
    cfr_match_mode: str = Field(
        default="fuzzy",
        description="fuzzy (legacy) | semantic (embeddings) | hybrid (merge both). Set hybrid for semantic CFR.",
    )
    cfr_confidence_threshold: float = Field(
        default=0.72,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score for semantic/hybrid best_match acceptance",
    )
    cfr_top_k: int = Field(default=8, ge=1, le=50, description="Top-K for CFR semantic/hybrid search")
    cfr_embedding_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="Local sentence-transformers model for CFR semantic index",
    )
    cfr_index_dir: str = Field(
        default="",
        description="Directory to persist CFR FAISS index; empty uses {data_dir}/.cfr_semantic_index",
    )

    # --- Evidence grounding (substring | semantic | hybrid) ---
    grounding_mode: str = Field(
        default="substring",
        description="substring (legacy) | semantic | hybrid (substring OR semantic). Set hybrid for semantic grounding.",
    )
    grounding_similarity_threshold: float = Field(
        default=0.78,
        ge=0.0,
        le=1.0,
        description="Cosine similarity threshold for semantic grounding (sentence embeddings)",
    )
    evidence_mode: str = Field(
        default="balanced",
        description="strict = exact evidence phrases; balanced = minor normalization allowed",
    )

    # --- Knowledge base retrieval (replaces naive first-N-char truncation when enabled) ---
    notes_retrieval_top_k: int = Field(default=6, ge=1, le=30)
    kb_retrieval_top_k: int = Field(default=5, ge=1, le=30)
    max_context_chunks: int = Field(default=12, ge=1, le=50)
    use_retrieval_for_generation: bool = Field(
        default=True,
        description="If True, use top-k retrieval from notes + KB; else legacy truncation + kb.query",
    )

    @staticmethod
    def _postgres_uri_ok(v: str) -> str:
        s = v.strip()
        if s.startswith("https://") and "supabase.co" in s.lower():
            raise ValueError(
                "DATABASE_URL must be a PostgreSQL connection string (postgresql://...), "
                "not the Supabase HTTPS project URL. In the Supabase Dashboard go to "
                "Project Settings → Database → Connection string → URI (direct or pooler)."
            )
        if not s.startswith(("postgresql://", "postgres://")):
            raise ValueError(
                "Must be a PostgreSQL URL (postgresql:// or postgres://). SQLite is not supported."
            )
        return s

    @field_validator("database_url")
    @classmethod
    def postgres_only(cls, v: str) -> str:
        return cls._postgres_uri_ok(v)

    @field_validator("database_direct_url", "database_pooler_url", mode="before")
    @classmethod
    def optional_postgres(cls, v: str | None) -> str | None:
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        return cls._postgres_uri_ok(str(v).strip())

    @field_validator("supabase_url", mode="before")
    @classmethod
    def empty_supabase_url(cls, v: object) -> object:
        if v is None or (isinstance(v, str) and not str(v).strip()):
            return None
        return v

    @field_validator("supabase_key", mode="before")
    @classmethod
    def empty_supabase_key(cls, v: object) -> object:
        if v is None or (isinstance(v, str) and not str(v).strip()):
            return None
        return v

    @model_validator(mode="after")
    def supabase_url_key_pair(self) -> Self:
        """If one of URL/key is set, both must be set (avoids half-configured Supabase)."""
        has_url = self.supabase_url is not None
        has_key = bool((self.supabase_key or "").strip())
        if has_url and not has_key:
            raise ValueError(
                "SUPABASE_KEY (or SUPABASE_ANON_KEY) is required when SUPABASE_URL is set."
            )
        if has_key and not has_url:
            raise ValueError("SUPABASE_URL is required when a Supabase API key is set.")
        return self

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in ("production", "prod")

    @property
    def effective_database_url(self) -> str:
        """
        Connection string for SQLAlchemy.

        - **production**: ``DATABASE_POOLER_URL`` if set, else ``DATABASE_URL``
        - **non-production**: ``DATABASE_DIRECT_URL`` if set, else ``DATABASE_URL``
        """
        if self.is_production:
            return (self.database_pooler_url or self.database_url).strip()
        return (self.database_direct_url or self.database_url).strip()

    @property
    def resolved_openai_api_key(self) -> str:
        """API key for OpenAI-compatible calls: ``OPENAI_API_KEY``, or ``OPENAI_ROUTER_API_KEY`` if unset."""
        return (self.openai_api_key or "").strip() or (self.openai_router_api_key or "").strip()

    @property
    def resolved_openai_model(self) -> str:
        """Model id when using OpenAI-compatible API; prefers router model when only router key is set."""
        primary_key = (self.openai_api_key or "").strip()
        om = (self.openai_model or "").strip() or "gpt-4o"
        rm = (self.openai_router_model or "").strip()
        router_only = not primary_key and (self.openai_router_api_key or "").strip()
        if router_only and rm:
            return rm
        return om

    @property
    def resolved_openai_base_url(self) -> str | None:
        """
        Base URL for OpenAI-compatible HTTP clients (``ChatOpenAI``, ``OpenAIEmbeddings``).

        Uses ``OPENAI_COMPAT_BASE_URL`` / ``OPENAI_API_BASE`` when set; otherwise, if the
        effective key is OpenRouter-only or ``sk-or-v1…``, defaults to OpenRouter's API base.
        """
        explicit = (self.openai_compat_base_url or "").strip()
        if explicit:
            return explicit.rstrip("/")
        primary = (self.openai_api_key or "").strip()
        router = (self.openai_router_api_key or "").strip()
        key = self.resolved_openai_api_key
        if key.startswith("sk-or-v1"):
            return "https://openrouter.ai/api/v1"
        if not primary and router:
            return "https://openrouter.ai/api/v1"
        return None

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
    def title21_xml_directory(self) -> Path | None:
        if self.title21_xml_dir:
            p = Path(self.title21_xml_dir).resolve()
            return p if p.is_dir() else None
        auto = self.data_path / "title21"
        if not auto.is_dir():
            return None
        bundle = auto / "CFR-2025-title-21"
        if bundle.is_dir():
            return bundle
        return auto

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def cfr_index_path(self) -> Path:
        if (self.cfr_index_dir or "").strip():
            return Path(self.cfr_index_dir).resolve()
        return self.data_path / ".cfr_semantic_index"

    model_config = SettingsConfigDict(
        env_file=_env_files() or None,
        env_file_encoding="utf-8",
        # Monorepo `.env` includes Docker/Next/Vite keys the API does not use.
        extra="ignore",
    )


settings = Settings()
