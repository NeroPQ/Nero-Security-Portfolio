#!/usr/bin/env python3
"""Compatibility entrypoint. Astro is the only build pipeline; output is dist/."""
from pathlib import Path
import subprocess
print("Legacy preview/ generator retired. Running npm run build → dist/.", flush=True)
subprocess.run(["npm", "run", "build"], cwd=Path(__file__).resolve().parents[1], check=True)
