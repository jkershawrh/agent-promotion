#!/usr/bin/env bash
# Preflight checks for agent-promotion-line.
# Exits non-zero with a clear message on any failure.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

fail() { echo -e "${RED}PREFLIGHT FAIL:${NC} $1"; exit 1; }
pass() { echo -e "${GREEN}OK:${NC} $1"; }

# 1. Python version (3.9+)
PYTHON="${PYTHON:-python3}"
if ! command -v "$PYTHON" &>/dev/null; then
    fail "Python not found. Set PYTHON env var or install python3."
fi
PY_VERSION=$("$PYTHON" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PY_MAJOR=$("$PYTHON" -c 'import sys; print(sys.version_info.major)')
PY_MINOR=$("$PYTHON" -c 'import sys; print(sys.version_info.minor)')
if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 9 ]; }; then
    fail "Python 3.9+ required, found $PY_VERSION"
fi
pass "Python $PY_VERSION"

# 2. Virtual environment present
if [ ! -d ".venv" ]; then
    fail "No .venv directory found. Run: python3 -m venv .venv"
fi
pass "Virtual environment (.venv) present"

# 3. Core dependencies importable
VENV_PYTHON=".venv/bin/python"
if [ ! -f "$VENV_PYTHON" ]; then
    fail ".venv/bin/python not found. Recreate the venv."
fi
for pkg in fastapi pydantic httpx yaml pytest; do
    if ! "$VENV_PYTHON" -c "import $pkg" 2>/dev/null; then
        fail "Required package '$pkg' not importable. Run: pip install -e '.[dev]'"
    fi
done
pass "All core dependencies importable"

# 4. Config file parses
"$VENV_PYTHON" -c "
import yaml, sys
try:
    with open('config/defaults/authority.yaml') as f:
        cfg = yaml.safe_load(f)
    assert isinstance(cfg, dict), 'Config is not a dict'
    assert 'tiers' in cfg, 'Missing tiers section'
    assert 'promotion' in cfg, 'Missing promotion section'
except Exception as e:
    print(f'Config parse error: {e}', file=sys.stderr)
    sys.exit(1)
" || fail "config/defaults/authority.yaml failed to parse"
pass "Config file parses successfully"

# 5. Tier tables are monotonic
"$VENV_PYTHON" -c "
import sys
sys.path.insert(0, '.')
from app.domain.config import load_config, validate_config
cfg = load_config()
errors = validate_config(cfg)
if errors:
    for e in errors:
        print(f'  {e}', file=sys.stderr)
    sys.exit(1)
" || fail "Tier tables are not monotonically increasing"
pass "Tier tables monotonically increasing"

# 6. App models importable
"$VENV_PYTHON" -c "
import sys
sys.path.insert(0, '.')
from app.domain.models import AgentAuthority, TrackRecord, AuthorityDecision
" || fail "App domain models not importable"
pass "Domain models importable"

echo ""
echo -e "${GREEN}All preflight checks passed.${NC}"
