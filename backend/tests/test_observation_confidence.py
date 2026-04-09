"""Tests for observation confidence blending."""

from app.services.observation_confidence import (
    aggregate_run_confidence,
    compute_observation_confidence,
    mean_retrieval_score_from_package,
)


def test_compute_observation_confidence_formula():
    total, bd = compute_observation_confidence(
        grounding_f1=1.0,
        cfr_score=1.0,
        structure_score=1.0,
        retrieval_score=1.0,
    )
    assert total == 1.0
    assert bd["grounding_f1"] == 1.0


def test_compute_observation_confidence_missing_uses_neutral():
    total, bd = compute_observation_confidence(
        grounding_f1=None,
        cfr_score=None,
        structure_score=None,
        retrieval_score=None,
    )
    assert 0.0 <= total <= 1.0
    assert bd["grounding_f1"] == 0.5


def test_aggregate_run_confidence():
    agg = aggregate_run_confidence([0.8, 0.6], component_breakdowns=[{"grounding_f1": 1.0, "cfr_score": 0.5}] * 2)
    assert agg["observation_count"] == 2
    assert agg["avg_confidence"] == 0.7
    assert agg["avg_grounding_f1"] == 1.0


def test_mean_retrieval_empty():
    assert mean_retrieval_score_from_package([], []) == 0.5


def test_mean_retrieval_scores():
    s = mean_retrieval_score_from_package(
        [{"score": 0.8}, {"score": 0.6}],
        [{"score": 1.0}],
    )
    assert abs(s - (0.8 + 0.6 + 1.0) / 3) < 1e-6
