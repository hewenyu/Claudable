"""
Unified CLI facade

This module re-exports the public API for backward compatibility.
Implementations live in:
- Base/Utils: app/services/cli/base.py
- Providers: app/services/cli/adapters/*.py
- Manager: app/services/cli/manager.py
"""

from .adapters import ClaudeCodeCLI, CodexCLI, CursorAgentCLI, GeminiCLI, QwenCLI
from .base import MODEL_MAPPING, BaseCLI, CLIType, get_display_path, get_project_root
from .manager import UnifiedCLIManager

__all__ = [
    "BaseCLI",
    "CLIType",
    "MODEL_MAPPING",
    "get_project_root",
    "get_display_path",
    "ClaudeCodeCLI",
    "CursorAgentCLI",
    "CodexCLI",
    "QwenCLI",
    "GeminiCLI",
    "UnifiedCLIManager",
]
