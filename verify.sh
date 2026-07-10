#!/usr/bin/env bash
# Verification script for agent-promotion-line.
# Runs: preflight, pytest (unit + BDD + EDD), schema round-trip check.
# Exits 0 only if every check passes.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Agent Promotion Line: verify.sh ===${NC}"
echo ""

# 1. Preflight
echo -e "${YELLOW}[1/3] Running preflight checks...${NC}"
bash preflight.sh || { echo -e "${RED}Preflight failed.${NC}"; exit 1; }
echo ""

# 2. Pytest (all tests)
echo -e "${YELLOW}[2/3] Running pytest...${NC}"
VENV_PYTHON=".venv/bin/python"
"$VENV_PYTHON" -m pytest tests/ -q --tb=short || { echo -e "${RED}Tests failed.${NC}"; exit 1; }
echo ""

# 3. Schema round-trip check (all models serialize and deserialize)
echo -e "${YELLOW}[3/3] Schema round-trip verification...${NC}"
"$VENV_PYTHON" -c "
import sys
sys.path.insert(0, '.')
from app.domain.models import (
    AgentAuthority, TrackRecord, PromotionEvent, DemotionEvent,
    AuthorityDecision, RatificationRequest, PromotionCase, LedgerEntry, ChainLink,
)
from tests.conftest import (
    make_authority, make_track_record, make_promotion_event, make_demotion_event,
    make_authority_decision, make_ratification_request, make_promotion_case,
    make_ledger_entry, make_chain_link,
)

models = [
    ('AgentAuthority', make_authority),
    ('TrackRecord', lambda: make_track_record(successes=3, failures=1)),
    ('PromotionEvent', make_promotion_event),
    ('DemotionEvent', make_demotion_event),
    ('AuthorityDecision', make_authority_decision),
    ('RatificationRequest', make_ratification_request),
    ('PromotionCase', make_promotion_case),
    ('LedgerEntry', make_ledger_entry),
    ('ChainLink', make_chain_link),
]

failed = []
for name, factory in models:
    try:
        obj = factory()
        json_str = obj.model_dump_json()
        restored = type(obj).model_validate_json(json_str)
        assert restored.model_dump() == obj.model_dump(), f'{name} round-trip mismatch'
    except Exception as e:
        failed.append(f'{name}: {e}')

if failed:
    for f in failed:
        print(f'  FAIL: {f}', file=sys.stderr)
    sys.exit(1)

print(f'  {len(models)} models verified.')
" || { echo -e "${RED}Schema round-trip check failed.${NC}"; exit 1; }
echo ""

echo -e "${GREEN}=== All checks passed. ===${NC}"
exit 0
