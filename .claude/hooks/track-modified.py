#!/usr/bin/env python3
"""PostToolUse 훅: Edit/Write/MultiEdit 대상 .ts/.tsx 파일을 세션별 목록에 기록."""
import json
import os
import sys

PROJECT_ROOT = "/Users/goyoai/Documents/company/goyoai-frontend-web"
TMP_DIR = os.path.join(PROJECT_ROOT, ".claude", "tmp")

SKIP_SUBSTRINGS = (
    "/node_modules/",
    "/.next/",
    "/dist/",
    "/.turbo/",
    "/coverage/",
)
SKIP_PATH_PREFIXES = (
    os.path.join(PROJECT_ROOT, "packages", "tailwind-config") + os.sep,
    os.path.join(PROJECT_ROOT, "packages", "eslint-config") + os.sep,
    os.path.join(PROJECT_ROOT, "packages", "typescript-config") + os.sep,
    os.path.join(PROJECT_ROOT, "packages", "i18n-scripts") + os.sep,
)


def is_ts_source(path: str) -> bool:
    if not path:
        return False
    if not (path.endswith(".ts") or path.endswith(".tsx")):
        return False
    if path.endswith(".d.ts"):
        return False
    norm = path.replace("\\", "/")
    if any(s in norm for s in SKIP_SUBSTRINGS):
        return False
    if any(path.startswith(prefix) for prefix in SKIP_PATH_PREFIXES):
        return False
    return True


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0

    session_id = data.get("session_id") or "default"
    file_path = (data.get("tool_input") or {}).get("file_path") or ""

    if not is_ts_source(file_path):
        return 0

    try:
        os.makedirs(TMP_DIR, exist_ok=True)
        list_path = os.path.join(TMP_DIR, f"modified-{session_id}.txt")

        existing: set[str] = set()
        if os.path.exists(list_path):
            with open(list_path, "r", encoding="utf-8") as f:
                existing = {line.strip() for line in f if line.strip()}

        if file_path not in existing:
            with open(list_path, "a", encoding="utf-8") as f:
                f.write(file_path + "\n")
    except Exception:
        # 본 작업(Edit/Write)을 막으면 안 되므로 훅 실패는 조용히 무시.
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
