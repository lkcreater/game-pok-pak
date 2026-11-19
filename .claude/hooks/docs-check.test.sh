#!/usr/bin/env bash
# Self-check for docs-check.sh. Run: bash .claude/hooks/docs-check.test.sh
set -u
HOOK="$(cd "$(dirname "$0")" && pwd)/docs-check.sh"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
cd "$T" && git init -q && mkdir -p docs lib .claude
echo spec > docs/spec.md; echo dec > docs/decisions.md; echo claude > CLAUDE.md
git add -A && git -c user.email=t@t -c user.name=t commit -qm init

run() { printf '%s' "${1:-{\}}" | CLAUDE_PROJECT_DIR="$T" bash "$HOOK"; }
fail() { echo "FAIL: $1 (got: $2)"; exit 1; }
blocks() { [[ $1 == *'"decision":"block"'* ]]; }

out=$(run); [[ -z $out ]] || fail "1 no changes → silent" "$out"
sleep 1; echo x > lib/x.ts
out=$(run); blocks "$out" || fail "2 new code after docs → block" "$out"
out=$(run); [[ -z $out ]] || fail "3 second stop → silent (marker)" "$out"
sleep 1; echo y >> lib/x.ts
out=$(run); blocks "$out" || fail "4 code edited again → block" "$out"
sleep 1; echo z >> lib/x.ts
out=$(run '{"stop_hook_active": true}'); [[ -z $out ]] || fail "5 stop_hook_active → silent" "$out"
sleep 1; echo more >> docs/spec.md
out=$(run); [[ -z $out ]] || fail "6 docs edited after code → silent" "$out"
sleep 1; echo w >> lib/x.ts; git add -A && git -c user.email=t@t -c user.name=t commit -qm code
out=$(run); blocks "$out" || fail "7 code committed after docs (clean tree) → block" "$out"
echo ok
