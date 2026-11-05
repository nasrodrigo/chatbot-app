#!/usr/bin/env bash
# Verify a scaffolded React Native / Expo project without needing a simulator.
# Usage: bash verify.sh <project-dir> [--bundle]
#   --bundle  also run a full Metro export for Android and iOS (Expo only; slower)
set -u
dir="${1:-.}"; bundle=0
[ "${2:-}" = "--bundle" ] && bundle=1
cd "$dir" || { echo "FAIL: cannot cd to $dir"; exit 1; }
[ -f package.json ] || { echo "FAIL: no package.json in $dir"; exit 1; }

has_script() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)"; }
has_dep() { node -e "const p=require('./package.json');process.exit((p.dependencies?.['$1']||p.devDependencies?.['$1'])?0:1)"; }
status=0
report() { printf '%-12s %s\n' "$1" "$2"; }
run() { # name, command
  if CI=true bash -c "$2" >"/tmp/rn-verify-$1.log" 2>&1; then report "$1" OK
  else report "$1" "FAIL (log: /tmp/rn-verify-$1.log)"; tail -n 15 "/tmp/rn-verify-$1.log"; status=1; fi
}

if [ ! -d node_modules ]; then
  report install "MISSING (run the package manager's install first)"; exit 1
fi
report install OK

is_expo=0; has_dep expo && is_expo=1

if [ -f tsconfig.json ]; then run typecheck "npx tsc --noEmit"; else report typecheck "skipped (no tsconfig.json)"; fi

if has_script lint; then run lint "npm run lint"; else report lint "skipped (no lint script)"; fi

if has_script test; then run test "npm test -- --watchAll=false"; else report test "skipped (no test script)"; fi

if [ "$is_expo" = 1 ]; then
  # expo-doctor and install --check contact Expo's servers; offline failures are warnings, not blockers.
  if CI=true npx expo-doctor >/tmp/rn-verify-doctor.log 2>&1; then report doctor OK
  else report doctor "WARN (see /tmp/rn-verify-doctor.log; may be a network issue)"; tail -n 10 /tmp/rn-verify-doctor.log; fi

  if [ "$bundle" = 1 ]; then
    run bundle-android "npx expo export --platform android --output-dir /tmp/rn-verify-dist-android"
    run bundle-ios "npx expo export --platform ios --output-dir /tmp/rn-verify-dist-ios"
  else
    report bundle "skipped (pass --bundle for a full Metro export)"
  fi
else
  report expo "not an Expo project; skipped doctor/bundle (verify native builds manually)"
fi

echo "NOTE: simulator/device behavior is not verified by this script."
exit $status
