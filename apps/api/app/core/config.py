import os
from pathlib import Path

from pydantic import BaseModel, field_validator


def find_project_root() -> Path:
    """
    Find the project root directory by looking for specific marker files.
    This ensures consistent behavior regardless of where the API is executed from.
    """
    current_path = Path(__file__).resolve()

    # Start from current file and go up
    for parent in [current_path] + list(current_path.parents):
        # Check if this directory has both apps/ and Makefile (project root indicators)
        if (parent / "apps").is_dir() and (parent / "Makefile").exists():
            return parent

    # Fallback: navigate up from apps/api to project root
    # Current path is likely: /project-root/apps/api/app/core/config.py
    # So we need to go up 4 levels: config.py -> core -> app -> api -> apps -> project-root
    api_dir = current_path.parent.parent.parent  # /project-root/apps/api
    if api_dir.name == "api" and api_dir.parent.name == "apps":
        return api_dir.parent.parent  # /project-root

    # Last resort: current working directory
    return Path.cwd()


# Get project root once at module load
PROJECT_ROOT = find_project_root()


class Settings(BaseModel):
    api_port: int = int(os.getenv("API_PORT", "8080"))

    # SQLite database URL
    database_url: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{PROJECT_ROOT / 'data' / 'cc.db'}",
    )

    # Use project root relative paths
    projects_root: str = os.getenv(
        "PROJECTS_ROOT", str(PROJECT_ROOT / "data" / "projects")
    )
    projects_root_host: str = os.getenv(
        "PROJECTS_ROOT_HOST",
        os.getenv("PROJECTS_ROOT", str(PROJECT_ROOT / "data" / "projects")),
    )

    # Local Git projects management
    local_git_projects_root: str = os.getenv(
        "LOCAL_GIT_PROJECTS_ROOT", 
        os.path.expanduser("~/code/github")
    )

    preview_port_start: int = int(os.getenv("PREVIEW_PORT_START", "3100"))
    preview_port_end: int = int(os.getenv("PREVIEW_PORT_END", "3999"))

    # Security settings
    cors_origins: list[str] = [
        "http://localhost:3000",    # Development frontend
        "http://localhost:3001",    # Alternative dev port
        "http://127.0.0.1:3000",    # Alternative localhost
        "http://127.0.0.1:3001",    # Alternative localhost port
    ]
    
    # Environment validation flags
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    @field_validator('anthropic_api_key')
    @classmethod
    def validate_anthropic_api_key(cls, v):
        """Validate Anthropic API key is set for production."""
        if not v or v == "your_anthropic_api_key_here":
            import warnings
            warnings.warn(
                "ANTHROPIC_API_KEY not properly configured. "
                "Claude Code functionality will be limited.",
                UserWarning
            )
        return v
    
    @field_validator('database_url')
    @classmethod
    def validate_database_url(cls, v):
        """Validate database URL format."""
        if not v:
            raise ValueError("DATABASE_URL cannot be empty")
        return v
    
    # Allow environment override for CORS origins
    def __init__(self, **data):
        super().__init__(**data)
        if cors_env := os.getenv("CORS_ORIGINS"):
            self.cors_origins = [origin.strip() for origin in cors_env.split(",")]


settings = Settings()
