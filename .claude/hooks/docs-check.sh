#!/usr/bin/env bash
# Claude Code Stop hook: when code changed after the project docs, ask Claude to
# update docs/spec.md, docs/decisions.md, CLAUDE.md and project memory before stopping.
# Reminds once per batch of code changes (marker file), never loops (stop_hook_active).
input=$(cat)
[[ $input =~ \"stop_hook_active\"[[:space:]]*:[[:space:]]*true ]] && exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

marker=.claude/.docs-checked
ref="" # newest of the docs + marker
for f in docs/spec.md docs/decisions.md CLAUDE.md "$marker"; do
  [[ -f $f ]] && { [[ -z $ref || $f -nt $ref ]] && ref=$f; }
done

stale=0
while IFS= read -r line; do
  f=${line:3}; f=${f##* -> }; f=${f%\"}; f=${f#\"}
  case $f in docs/*|CLAUDE.md|"$marker") continue ;; esac
  [[ -f $f ]] || continue
  if [[ -z $ref || $f -nt $ref ]]; then stale=1; break; fi
done < <(git status --porcelain --untracked-files=all 2>/dev/null)

(( stale )) || exit 0
mkdir -p .claude && touch "$marker"
echo '{"decision":"block","reason":"Code changed after the project docs. Before finishing: update docs/spec.md if game behaviour changed, add an entry to docs/decisions.md for any decision made, update CLAUDE.md if commands/structure/conventions changed, and save non-obvious learnings to project memory. If nothing needs updating, say so in one line and stop."}'
