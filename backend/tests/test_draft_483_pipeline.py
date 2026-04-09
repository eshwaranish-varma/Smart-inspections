"""Tests for strict per-observation FDA 483 draft pipeline (no batched LLM)."""

import pytest

from app.schemas.inspection import ObservationInput, ObservationOutput
from app.schemas.inspection import SegmentedObservation
from app.services.draft_483_pipeline import (
    parse_draft_483_json,
    segmentation_quality_heuristic,
    validate_draft_483_observation,
    validate_segmentation,
)


def test_parse_draft_483_json_fenced():
    raw = """```json
{"drafted_text": "hello", "evidence_used": ["a"], "cfr_citation": "21 CFR 211.100"}
```"""
    d = parse_draft_483_json(raw)
    assert d is not None
    assert d["drafted_text"] == "hello"
    assert d["evidence_used"] == ["a"]


def test_validate_id_mismatch():
    inp = ObservationInput(obs_id="1", raw_text="x", evidence=["a"])
    out = ObservationOutput(obs_id="2", drafted_text="y", evidence_used=["a"])
    with pytest.raises(ValueError, match="Obs ID mismatch"):
        validate_draft_483_observation(inp, out, [inp])


def test_validate_cross_observation_leakage():
    batch = [
        ObservationInput(obs_id="1", raw_text="Temp logs missing", evidence=["logbook empty"]),
        ObservationInput(obs_id="2", raw_text="No deviation record", evidence=["no CAPA entry"]),
    ]
    bad = ObservationOutput(
        obs_id="1",
        drafted_text="Temp logs missing and no deviation record",
        evidence_used=["logbook empty"],
        cfr_citation=None,
    )
    with pytest.raises(ValueError, match="Cross-observation leakage"):
        validate_draft_483_observation(batch[0], bad, batch)


def test_segmentation_quality_merged_warning():
    raw = "Temperature logs were not maintained. No deviation was recorded for equipment failure."
    one_seg = [
        SegmentedObservation(
            obs_id="OBS_1",
            raw_text="Temperature logs were not maintained. No deviation was recorded for equipment failure.",
            evidence=[],
        )
    ]
    valid, warn = segmentation_quality_heuristic(raw, one_seg)
    assert valid is False and warn is True


def test_segmentation_quality_ok_two_segments():
    raw = "Temperature logs were not maintained. No deviation was recorded for equipment failure."
    two_seg = [
        SegmentedObservation(obs_id="OBS_1", raw_text="Temperature logs were not maintained", evidence=[]),
        SegmentedObservation(obs_id="OBS_2", raw_text="No deviation was recorded for equipment failure", evidence=[]),
    ]
    valid, warn = segmentation_quality_heuristic(raw, two_seg)
    assert valid is True and warn is False


def test_evidence_normalize_allows_punctuation_variance():
    inp = ObservationInput(obs_id="1", raw_text="x", evidence=["logbook empty"])
    out = ObservationOutput(
        obs_id="1",
        drafted_text="ok",
        evidence_used=["Logbook — empty"],
        cfr_citation=None,
    )
    validate_draft_483_observation(inp, out, [inp])


def test_validate_evidence_grounding():
    inp = ObservationInput(obs_id="1", raw_text="x", evidence=["logbook empty"])
    bad_ev = ObservationOutput(
        obs_id="1",
        drafted_text="ok",
        evidence_used=["made up phrase"],
        cfr_citation=None,
    )
    with pytest.raises(ValueError, match="Hallucinated evidence"):
        validate_draft_483_observation(inp, bad_ev, [inp])


def test_validate_segmentation_duplicate():
    batch = [
        SegmentedObservation(obs_id="OBS_1", raw_text="same", evidence=[]),
        SegmentedObservation(obs_id="OBS_2", raw_text="same", evidence=[]),
    ]
    with pytest.raises(ValueError, match="Duplicate observation"):
        validate_segmentation(batch)


def test_validate_segmentation_ok_two_issues():
    batch = [
        SegmentedObservation(
            obs_id="OBS_1",
            raw_text="Temperature logs were not maintained",
            evidence=["logs"],
        ),
        SegmentedObservation(
            obs_id="OBS_2",
            raw_text="No deviation was recorded for equipment failure",
            evidence=["deviation"],
        ),
    ]
    assert validate_segmentation(batch) is True


def test_validate_ok_isolated_observations():
    batch = [
        ObservationInput(obs_id="1", raw_text="Temp logs missing", evidence=["logbook empty"]),
        ObservationInput(obs_id="2", raw_text="No deviation record", evidence=["no CAPA entry"]),
    ]
    out1 = ObservationOutput(
        obs_id="1",
        drafted_text="Temperature monitoring records were incomplete; logbook empty.",
        evidence_used=["logbook empty"],
        cfr_citation="21 CFR 211.142",
    )
    out2 = ObservationOutput(
        obs_id="2",
        drafted_text="Deviations were not documented; no CAPA entry.",
        evidence_used=["no CAPA entry"],
        cfr_citation="21 CFR 211.192",
    )
    assert validate_draft_483_observation(batch[0], out1, batch) is True
    assert validate_draft_483_observation(batch[1], out2, batch) is True
