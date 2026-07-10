#!/usr/bin/env bash
# Verification script for the Agent Promotion Line demo and docs.
# Runs: Vitest (CDD + TDD), vite build, doc consistency, em-dash check.
# Exits 0 only if every check passes.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$DEMO_DIR/.." && pwd)"

echo -e "${YELLOW}=== Agent Promotion Line: Demo verify.sh ===${NC}"
echo ""

# 1. Vitest (CDD + TDD)
echo -e "${YELLOW}[1/5] Running Vitest (CDD + TDD)...${NC}"
cd "$DEMO_DIR"
npx vitest run --reporter=verbose 2>&1 || { echo -e "${RED}Vitest failed.${NC}"; exit 1; }
echo ""

# 2. TypeScript type check
echo -e "${YELLOW}[2/5] TypeScript type check...${NC}"
npx tsc -b 2>&1 || { echo -e "${RED}TypeScript failed.${NC}"; exit 1; }
echo -e "${GREEN}OK:${NC} TypeScript compiles"
echo ""

# 3. Vite build
echo -e "${YELLOW}[3/5] Vite build...${NC}"
npx vite build 2>&1 || { echo -e "${RED}Vite build failed.${NC}"; exit 1; }
echo -e "${GREEN}OK:${NC} Vite build succeeded"
echo ""

# 4. Doc consistency check (all docs reference the same layers)
echo -e "${YELLOW}[4/5] Doc consistency check...${NC}"
LAYERS=("Hook" "Earn" "Depth" "Floor" "Close")
DOCS=(
    "$ROOT_DIR/docs/story-arc.md"
    "$ROOT_DIR/docs/modules/ROOT/pages/presenter-guide.adoc"
    "$ROOT_DIR/docs/modules/ROOT/pages/demo-script.adoc"
    "$ROOT_DIR/docs/modules/ROOT/pages/lab-guide.adoc"
)
CONSISTENCY_FAIL=0
for layer in "${LAYERS[@]}"; do
    for doc in "${DOCS[@]}"; do
        if [ ! -f "$doc" ]; then
            echo -e "${RED}  Missing doc: $doc${NC}"
            CONSISTENCY_FAIL=1
            continue
        fi
        if ! grep -qi "$layer" "$doc" 2>/dev/null; then
            echo -e "${RED}  Layer '$layer' not found in $(basename "$doc")${NC}"
            CONSISTENCY_FAIL=1
        fi
    done
done
if [ "$CONSISTENCY_FAIL" -ne 0 ]; then
    echo -e "${RED}Doc consistency check failed.${NC}"
    exit 1
fi
echo -e "${GREEN}OK:${NC} All docs reference all layers"
echo ""

# 5. Em-dash check (no U+2014 in any generated file)
echo -e "${YELLOW}[5/5] Em-dash check...${NC}"
EMDASH_FAIL=0
GENERATED_FILES=(
    "$ROOT_DIR/docs/story-arc.md"
    "$ROOT_DIR/docs/MAPPING.md"
    "$ROOT_DIR/docs/READFIRST.md"
    "$ROOT_DIR/docs/modules/ROOT/pages/presenter-guide.adoc"
    "$ROOT_DIR/docs/modules/ROOT/pages/demo-script.adoc"
    "$ROOT_DIR/docs/modules/ROOT/pages/lab-guide.adoc"
    "$ROOT_DIR/docs/modules/ROOT/pages/index.adoc"
    "$ROOT_DIR/docs/modules/ROOT/nav.adoc"
    "$ROOT_DIR/agnosticv/description.adoc"
)
for f in "${GENERATED_FILES[@]}"; do
    if [ -f "$f" ]; then
        if grep -Pn '\x{2014}' "$f" 2>/dev/null; then
            echo -e "${RED}  Em-dash found in $(basename "$f")${NC}"
            EMDASH_FAIL=1
        fi
    fi
done
if [ "$EMDASH_FAIL" -ne 0 ]; then
    echo -e "${RED}Em-dash check failed.${NC}"
    exit 1
fi
echo -e "${GREEN}OK:${NC} No em-dashes in generated text"
echo ""

# Summary
echo -e "${GREEN}=== All demo checks passed. ===${NC}"
echo ""
echo "  Vitest:       CDD + TDD passing"
echo "  TypeScript:   compiles"
echo "  Vite:         builds"
echo "  Docs:         consistent across all formats"
echo "  Em-dashes:    none"
exit 0
