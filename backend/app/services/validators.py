"""Shared validation helpers for 483 ↔ EIR alignment."""

from __future__ import annotations

from typing import Any


def _norm_id(x: Any) -> str:
    return str(x).strip() if x is not None else ""


def validate_1to1_mapping(observations: list[Any], eir_sections: list[dict[str, Any]]) -> tuple[bool, str]:
    """
    Strict validation: same count and same observation_id order as input observations.

    `observations` must be objects with `.id` (e.g. EIRPipelineObservation or Observation).
    `eir_sections` must be dicts with key `observation_id`.
    """
    if len(observations) != len(eir_sections):
        return False, "Count mismatch"

    obs_ids = [_norm_id(getattr(o, "id", None)) for o in observations]
    eir_ids = [_norm_id(s.get("observation_id")) for s in eir_sections]

    if obs_ids != eir_ids:
        return False, "Order or ID mismatch"

    return True, "Valid"


def compute_tp_score(observations: list[Any], eir_sections: list[dict[str, Any]]) -> float:
    """
    True-positive rate for 1:1 mapping: fraction of rows where observation_id matches input id.
    """
    if not observations:
        return 0.0
    correct = 0
    for obs, sec in zip(observations, eir_sections):
        if _norm_id(getattr(obs, "id", None)) == _norm_id(sec.get("observation_id")):
            correct += 1
    return round(correct / len(observations), 4)
