#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

export NERO_SHOW_DRAFTS=1

npm run check --if-present
npm run build
python3 scripts/generate_static.py

echo
echo "[+] Draft preview URLs:"
echo "http://127.0.0.1:4325/writeups/"
echo "http://127.0.0.1:4325/writeups/htb-password-attacks-skills-assessment-nexura/"
echo "http://127.0.0.1:4325/writeups/htb-metasploit-fortilogger-meterpreter/"
echo

npm run preview -- --host 127.0.0.1 --port 4325
