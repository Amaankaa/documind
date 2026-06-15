"""Bundled community markdown shipped inside the backend image (no GitHub fetch required)."""
from __future__ import annotations

from pathlib import Path

BUNDLED_NOTES_ROOT = Path(__file__).resolve().parent / "bundled_notes"


def bundled_note_path(relative_path: str) -> Path:
    """Resolve a repo-relative note path like `greedy/greedy.md`."""
    return BUNDLED_NOTES_ROOT / relative_path


def read_bundled_note(relative_path: str) -> str | None:
    path = bundled_note_path(relative_path)
    if not path.is_file():
        return None
    return path.read_text(encoding="utf-8")
