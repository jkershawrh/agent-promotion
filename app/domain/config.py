"""Loads authority tier configuration from YAML with hardcoded fallback."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

import yaml


_FALLBACK_CONFIG: dict[str, Any] = {
    "tiers": {
        "T0": {"name": "PROBATION", "ceiling": 0.0},
        "T1": {"name": "VERIFIED", "ceiling": 25.0},
        "T2": {"name": "TRUSTED", "ceiling": 50.0},
        "T3": {"name": "AUTONOMOUS", "ceiling": 100.0},
        "T4": {"name": "PRINCIPAL", "ceiling": 1000.0},
    },
    "promotion": {
        "T0_to_T1": {"min_verified_chains": 50, "min_rolling_accuracy": 0.60, "extra_gate": "none"},
        "T1_to_T2": {"min_verified_chains": 200, "min_rolling_accuracy": 0.75, "extra_gate": "none"},
        "T2_to_T3": {"min_verified_chains": 500, "min_rolling_accuracy": 0.85, "extra_gate": "hitl_if_mode"},
        "T3_to_T4": {"min_verified_chains": 1000, "min_rolling_accuracy": 0.90, "extra_gate": "hitl_always"},
    },
    "maintenance": {
        "accuracy_margin": 0.10,
        "window_size": 500,
    },
    "modes": ["FULL_AUTO", "HITL_HIGH_TIER"],
}


def _find_config_file() -> Optional[Path]:
    """Look for authority.yaml in config/ then config/defaults/."""
    base = Path(os.environ.get("APL_CONFIG_DIR", "config"))
    for candidate in [base / "authority.yaml", base / "defaults" / "authority.yaml"]:
        if candidate.exists():
            return candidate
    return None


def load_config() -> dict[str, Any]:
    """Load authority config from YAML file, falling back to hardcoded defaults."""
    path = _find_config_file()
    if path is not None:
        with open(path) as f:
            loaded = yaml.safe_load(f)
        if isinstance(loaded, dict):
            return loaded
    return _FALLBACK_CONFIG.copy()


def validate_config(config: dict[str, Any]) -> list[str]:
    """Validate that tier ceilings and promotion thresholds are monotonically increasing.

    Returns a list of error messages (empty if valid).
    """
    errors: list[str] = []

    tiers = config.get("tiers", {})
    tier_keys = ["T0", "T1", "T2", "T3", "T4"]

    ceilings: list[float] = []
    for key in tier_keys:
        tier = tiers.get(key)
        if tier is None:
            errors.append(f"Missing tier definition: {key}")
            continue
        ceiling = tier.get("ceiling")
        if ceiling is None:
            errors.append(f"Missing ceiling for tier {key}")
            continue
        ceilings.append(float(ceiling))

    for i in range(1, len(ceilings)):
        if ceilings[i] <= ceilings[i - 1]:
            errors.append(
                f"Tier ceilings not monotonically increasing: "
                f"{tier_keys[i - 1]}={ceilings[i - 1]} >= {tier_keys[i]}={ceilings[i]}"
            )

    promotion = config.get("promotion", {})
    transitions = ["T0_to_T1", "T1_to_T2", "T2_to_T3", "T3_to_T4"]
    accuracies: list[float] = []
    chain_counts: list[int] = []
    for trans in transitions:
        gate = promotion.get(trans)
        if gate is None:
            errors.append(f"Missing promotion threshold: {trans}")
            continue
        acc = gate.get("min_rolling_accuracy")
        chains = gate.get("min_verified_chains")
        if acc is not None:
            accuracies.append(float(acc))
        if chains is not None:
            chain_counts.append(int(chains))

    for i in range(1, len(accuracies)):
        if accuracies[i] < accuracies[i - 1]:
            errors.append(
                f"Promotion accuracy thresholds not monotonically increasing: "
                f"{transitions[i - 1]}={accuracies[i - 1]} > {transitions[i]}={accuracies[i]}"
            )

    for i in range(1, len(chain_counts)):
        if chain_counts[i] < chain_counts[i - 1]:
            errors.append(
                f"Promotion chain count thresholds not monotonically increasing: "
                f"{transitions[i - 1]}={chain_counts[i - 1]} > {transitions[i]}={chain_counts[i]}"
            )

    return errors


def get_tier_ceiling(config: dict[str, Any], tier: str) -> float:
    """Return the consequence ceiling for a given tier."""
    return float(config["tiers"][tier]["ceiling"])


def get_promotion_threshold(config: dict[str, Any], from_tier: str, to_tier: str) -> dict[str, Any]:
    """Return the promotion threshold for a tier transition."""
    key = f"{from_tier}_to_{to_tier}"
    return config["promotion"][key]


def get_maintenance_threshold(config: dict[str, Any], tier: str) -> float:
    """Return the minimum rolling accuracy to maintain a tier (promotion accuracy minus margin)."""
    margin = config.get("maintenance", {}).get("accuracy_margin", 0.10)
    tier_index = ["T0", "T1", "T2", "T3", "T4"].index(tier)
    if tier_index == 0:
        return 0.0
    transitions = ["T0_to_T1", "T1_to_T2", "T2_to_T3", "T3_to_T4"]
    trans_key = transitions[tier_index - 1]
    promo_acc = config["promotion"][trans_key]["min_rolling_accuracy"]
    return float(promo_acc) - margin


def get_window_size(config: dict[str, Any]) -> int:
    """Return the rolling window size for track record assessment."""
    return int(config.get("maintenance", {}).get("window_size", 500))
