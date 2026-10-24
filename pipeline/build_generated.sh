#!/usr/bin/env bash
# build_generated.sh - regenerate the generated/ artifact tree from source.
#
# Single source of truth for generator order. Everything under generated/ is a
# build artifact (the directory is gitignored), so this script wipes it and
# fully regenerates it from content/ and assets/.
#
# Run order is load-bearing: gen_scene_index.py reads generated/object_library.ts
# for its placement cross-check, so gen_object_library.py must run first.
#
#   0. material_anti_return_lint -> post-cutover semantic material gate
#   1. gen_object_library.py -> generated/object_library.ts
#   2. gen_liquid_regions.py -> generated/material_svg/ + generated/liquid_regions.json
#   3. gen_svg_manifest.py   -> generated/svg_manifest.ts
#   4. gen_scene_index.py    -> generated/scenes.ts (reads object_library.ts)
#   5. gen_protocols.py      -> generated/protocols.ts, generated/protocols_index_slim.ts
#
# Called directly by build_github_pages.sh. No npm lifecycle hooks; no
# package.json aliases.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Make repo-root packages (pipeline.*, validation.*) importable by the
# generators regardless of whether the caller sourced source_me.sh
REPO_ROOT="$(git rev-parse --show-toplevel)"
if command -v cygpath >/dev/null 2>&1; then
	export PYTHONPATH="$(cygpath -w "$REPO_ROOT")${PYTHONPATH:+;$PYTHONPATH}"
else
	export PYTHONPATH="$REPO_ROOT${PYTHONPATH:+:$PYTHONPATH}"
fi

# Resolve Python command: inherit PYTHON env var if set, otherwise probe
if [ -z "${PYTHON:-}" ]; then
	if python3 --version >/dev/null 2>&1; then
		PYTHON="python3"
	elif python --version >/dev/null 2>&1; then
		PYTHON="python"
	elif py -3 --version >/dev/null 2>&1; then
		PYTHON="py -3"
	else
		PYTHON="python3"
	fi
fi

# Fail before deleting or generating artifacts if retired object-level liquid
# overlay behavior, invalid material art, or an ordinary fill binding returns.
"$PYTHON" -m validation.svg.material_anti_return_lint

# Wipe and recreate the artifact tree so no stale outputs survive.
rm -rf generated
mkdir -p generated

# Run the generators in canonical order.
"$PYTHON" pipeline/gen_object_library.py
"$PYTHON" pipeline/gen_liquid_regions.py
"$PYTHON" pipeline/gen_svg_manifest.py
"$PYTHON" pipeline/gen_scene_index.py
"$PYTHON" pipeline/gen_protocols.py

echo "Regenerated generated/ (object_library, material_svg, liquid_regions, svg_manifest, scenes, protocols)."
