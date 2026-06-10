#!/usr/bin/env python3
import sys, json, os

data = json.load(sys.stdin)
file_path = data.get('tool_input', {}).get('file_path', '')
basename = os.path.basename(file_path)

if basename == '.env' or basename.startswith('.env.'):
    print(f'차단: .env 파일 접근 불가 — {file_path}', file=sys.stderr)
    sys.exit(2)
