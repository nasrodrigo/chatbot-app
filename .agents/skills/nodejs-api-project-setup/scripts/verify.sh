#!/usr/bin/env bash
# Verify a Node API project: typecheck, lint, tests, build, and a real start-and-request smoke test.
# Usage: bash verify.sh <project-dir>
set -u
dir="${1:-.}"
cd "$dir" || { echo "FAIL: cannot cd to $dir"; exit 1; }
[ -f package.json ] || { echo "FAIL: no package.json in $dir"; exit 1; }

has_script() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)"; }
status=0
report() { printf '%-10s %s\n' "$1" "$2"; }
step() { # name; runs `npm run <name>` if the script exists
  if has_script "$1"; then
    if CI=true npm run --silent "$1" >"/tmp/api-verify-$1.log" 2>&1; then report "$1" OK
    else report "$1" "FAIL (log: /tmp/api-verify-$1.log)"; tail -n 20 "/tmp/api-verify-$1.log"; status=1; fi
  else report "$1" "skipped (no script)"; fi
}

if [ ! -d node_modules ]; then report install "MISSING (run the package manager's install first)"; exit 1; fi
report install OK

step typecheck
step lint
step test
step build

# Smoke test: start the compiled server and request /health.
if [ -f dist/server.js ]; then
  port=$((20000 + RANDOM % 20000))
  NODE_ENV=production PORT=$port LOG_LEVEL=silent node dist/server.js >/tmp/api-verify-server.log 2>&1 &
  pid=$!
  ok=0
  for _ in $(seq 1 40); do
    if node -e "fetch('http://127.0.0.1:$port/health').then(async r=>{const b=await r.json();process.exit(r.ok&&b.status==='ok'?0:1)}).catch(()=>process.exit(1))" 2>/dev/null; then ok=1; break; fi
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.25
  done
  if [ "$ok" = 1 ]; then report smoke "OK (GET /health on port $port)"
  else report smoke "FAIL (see /tmp/api-verify-server.log)"; tail -n 15 /tmp/api-verify-server.log; status=1; fi
  kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
else
  report smoke "skipped (no dist/server.js; build must produce it)"
fi
exit $status
