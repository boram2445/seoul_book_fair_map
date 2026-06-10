#!/usr/bin/env python3
"""Stop 훅: 수정된 TS 파일이 속한 앱만 tsc --noEmit 실행.

- 통과: 조용히 종료.
- 실패 & 재시도 가능: {"decision": "block", "reason": "..."} 를 stdout으로 출력해
  Claude가 스스로 수정하도록 유도.
- 재시도 상한(기본 2회) 도달: block 하지 않고 stderr로 안내만.
"""
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

PROJECT_ROOT = "/Users/goyoai/Documents/company/goyoai-frontend-web"
TMP_DIR = os.path.join(PROJECT_ROOT, ".claude", "tmp")
MAX_ATTEMPTS = 2
MAX_ERROR_BLOCKS = 10
MAX_LINES_PER_BLOCK = 10

APP_PREFIXES = [
    ("apps/goyoai-gointern-web/", "gointern"),
    ("apps/goyoai-aify-web/", "aify"),
    ("apps/goyoai-gointern-bo-web/", "gointern-bo"),
    ("apps/goyoai-stock-web/", "stock"),
    ("apps/goyoai-cosmos-web/", "cosmos"),
]

SHARED_PREFIXES = (
    "packages/goservice/",
    "packages/ui/",
    "packages/icons/",
    "packages/goyo-symbols/",
)

SHARED_FALLBACK_APPS = ["gointern", "aify"]  # CLAUDE.md 동기화 primary

# tsc 에러 시작 줄: "path/to/file.ts(42,3): error TS1234: ..."
ERROR_LINE_RE = re.compile(r"^(?P<path>[^\s(].*?\.(?:ts|tsx))\((\d+),(\d+)\):\s+error\s+TS\d+:")


def read_lines(path: str) -> list[str]:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def write_counter(path: str, value: int) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(str(value))


def read_counter(path: str) -> int:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return int((f.read() or "0").strip())
    except Exception:
        return 0


def resolve_apps(modified_files: list[str]) -> list[str]:
    apps: list[str] = []
    has_app_edit = False
    has_shared_only = False

    for absolute in modified_files:
        rel = os.path.relpath(absolute, PROJECT_ROOT).replace("\\", "/")
        matched_app = None
        for prefix, app in APP_PREFIXES:
            if rel.startswith(prefix):
                matched_app = app
                break
        if matched_app:
            has_app_edit = True
            if matched_app not in apps:
                apps.append(matched_app)
            continue
        if any(rel.startswith(p) for p in SHARED_PREFIXES):
            has_shared_only = True

    if has_shared_only and not has_app_edit:
        for app in SHARED_FALLBACK_APPS:
            if app not in apps:
                apps.append(app)

    return apps


def run_tsc(app: str) -> tuple[str, int, str]:
    """Returns (app, returncode, combined_output)."""
    script = f"type:{app}"
    proc = subprocess.run(
        ["pnpm", "-s", "run", script],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )
    combined = (proc.stdout or "") + (proc.stderr or "")
    return app, proc.returncode, combined


def parse_error_blocks(output: str) -> list[tuple[str, list[str]]]:
    """output 전체를 (파일경로, [에러 블록 라인들]) 리스트로 파싱."""
    lines = output.splitlines()
    blocks: list[tuple[str, list[str]]] = []
    current: list[str] | None = None
    current_path: str = ""

    for line in lines:
        match = ERROR_LINE_RE.match(line)
        if match:
            if current is not None:
                blocks.append((current_path, current))
            current_path = match.group("path")
            current = [line]
        elif current is not None:
            if line.startswith(" ") or line.startswith("\t"):
                if len(current) < MAX_LINES_PER_BLOCK:
                    current.append(line)
            else:
                blocks.append((current_path, current))
                current = None
                current_path = ""

    if current is not None:
        blocks.append((current_path, current))
    return blocks


def truncate_errors(
    app_outputs: list[tuple[str, str]],
    modified_files: list[str],
) -> str:
    modified_rel = {
        os.path.relpath(p, PROJECT_ROOT).replace("\\", "/") for p in modified_files
    }

    prioritized: list[tuple[str, list[str]]] = []
    others: list[tuple[str, list[str]]] = []

    for app, output in app_outputs:
        for file_path, block in parse_error_blocks(output):
            tagged = [f"[{app}] " + block[0]] + block[1:]
            norm = file_path.replace("\\", "/")
            if any(norm.endswith(rel) or rel.endswith(norm) for rel in modified_rel):
                prioritized.append((file_path, tagged))
            else:
                others.append((file_path, tagged))

    picked = prioritized + others
    total = len(picked)
    picked = picked[:MAX_ERROR_BLOCKS]

    out_lines: list[str] = []
    for _, block in picked:
        out_lines.extend(block)

    remaining = total - len(picked)
    if remaining > 0:
        out_lines.append(
            f"... and {remaining} more error(s). Run the app's `pnpm type:<app>` locally to see all."
        )

    if not out_lines:
        # 에러 라인 파싱 실패한 경우를 대비한 폴백 — 앱별 stderr 앞부분만
        for app, output in app_outputs:
            snippet = "\n".join(output.splitlines()[:20])
            out_lines.append(f"[{app}]\n{snippet}")

    return "\n".join(out_lines)


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0

    session_id = data.get("session_id") or "default"
    modified_list_path = os.path.join(TMP_DIR, f"modified-{session_id}.txt")
    attempts_path = os.path.join(TMP_DIR, f"typecheck-attempts-{session_id}.txt")

    modified_files = read_lines(modified_list_path)
    if not modified_files:
        return 0

    attempts = read_counter(attempts_path)
    if attempts >= MAX_ATTEMPTS:
        print(
            f"[typecheck-modified] {MAX_ATTEMPTS}회 자동 수정 시도 후에도 타입 오류가 "
            "남아 있습니다. 수동 확인이 필요합니다.",
            file=sys.stderr,
        )
        return 0

    apps = resolve_apps(modified_files)
    if not apps:
        # 체크 대상 앱을 못 찾음 — 기록만 지우고 종료.
        try:
            os.remove(modified_list_path)
        except Exception:
            pass
        return 0

    print(
        f"[typecheck-modified] running tsc for apps: {', '.join(apps)} "
        f"(attempt {attempts + 1}/{MAX_ATTEMPTS})",
        file=sys.stderr,
    )

    results: list[tuple[str, int, str]] = []
    with ThreadPoolExecutor(max_workers=len(apps)) as pool:
        for result in pool.map(run_tsc, apps):
            results.append(result)

    failures = [(app, output) for app, code, output in results if code != 0]

    if not failures:
        for p in (modified_list_path, attempts_path):
            try:
                os.remove(p)
            except Exception:
                pass
        print("[typecheck-modified] all type checks passed.", file=sys.stderr)
        return 0

    # 실패 — 카운터 증가 후 block 출력
    write_counter(attempts_path, attempts + 1)

    failed_apps = ", ".join(app for app, _ in failures)
    error_body = truncate_errors(failures, modified_files)

    reason = (
        f"TypeScript 타입 체크 실패 (앱: {failed_apps}). "
        "아래 오류를 보고 수정한 뒤 작업을 계속하세요. "
        f"(자동 재시도 {attempts + 1}/{MAX_ATTEMPTS})\n\n"
        f"{error_body}"
    )

    print(json.dumps({"decision": "block", "reason": reason}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
