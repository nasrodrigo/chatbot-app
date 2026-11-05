#!/usr/bin/env bash
# Create a Node.js + Express 5 + TypeScript API project from the bundled template.
# Usage: bash scaffold.sh <project-dir> [--pm npm|pnpm|yarn] [--no-install]
set -eu

usage() { echo "usage: scaffold.sh <project-dir> [--pm npm|pnpm|yarn] [--no-install]"; exit 1; }
dir="${1:-}"; [ -n "$dir" ] || usage; shift
pm=npm; install=1
while [ $# -gt 0 ]; do
  case "$1" in
    --no-install) install=0 ;;
    --pm) pm="${2:-}"; [ -n "$pm" ] || usage; shift ;;
    *) echo "unknown option: $1"; usage ;;
  esac
  shift
done

case "$pm" in
  npm)  add="npm install";  add_dev="npm install --save-dev" ;;
  pnpm) add="pnpm add";     add_dev="pnpm add --save-dev" ;;
  yarn) add="yarn add";     add_dev="yarn add --dev" ;;
  *) echo "unsupported package manager: $pm"; exit 1 ;;
esac

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [ "$node_major" -lt 22 ]; then
  echo "Node 22 or newer is required (found $(node -v)). Upgrade Node (e.g. via nvm or fnm) and retry."
  exit 1
fi

if [ -e "$dir" ] && [ -n "$(ls -A "$dir" 2>/dev/null)" ]; then
  echo "Refusing to scaffold: $dir exists and is not empty"; exit 1
fi

here="$(cd "$(dirname "$0")/.." && pwd)"
tpl="$here/assets/template"
mkdir -p "$dir"
dir="$(cd "$dir" && pwd)"
name="$(basename "$dir" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9-\n' '-')"

cp -R "$tpl/." "$dir/"
cd "$dir"
mv gitignore.tmpl .gitignore
mv prettierrc.tmpl .prettierrc
mv env.example.tmpl .env.example
mv package.json.tmpl package.json
mv README.md.tmpl README.md
sed -i.bak "s/__NAME__/$name/g" package.json README.md && rm -f package.json.bak README.md.bak
cp .env.example .env

if [ "$install" = 1 ]; then
  $add express zod pino helmet cors
  $add_dev typescript tsx @types/node @types/express @types/cors pino-pretty eslint @eslint/js typescript-eslint prettier
else
  echo "Skipped installs. Run in $dir:"
  echo "  $add express zod pino helmet cors"
  echo "  $add_dev typescript tsx @types/node @types/express @types/cors pino-pretty eslint @eslint/js typescript-eslint prettier"
fi
echo "Scaffolded $name in $dir"
