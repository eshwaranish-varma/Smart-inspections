"""Grounding evaluator: substring vs hybrid (semantic path optional)."""

from app.evaluation import evaluator as ev


def test_substring_grounding_unchanged():
    obs = {
        "observation_text": "The firm failed to maintain records.",
        "evidence_list": ["batch record incomplete"],
        "cfr_citation": "21 CFR 211.180",
    }
    src = "During review the batch record incomplete was noted."
    out = ev._evaluate_one_observation(
        src,
        obs,
        None,
        0,
        grounding_mode="substring",
        evidence_mode="balanced",
    )
    assert out["grounded"] is True
    assert out["grounded_substring"] is True


def test_strict_substring_fails_when_paraphrased():
    obs = {
        "observation_text": "Observation",
        "evidence_list": ["completely different phrase"],
        "cfr_citation": "21 CFR 211.100",
    }
    src = "The temperature log was missing entries."
    out = ev._evaluate_one_observation(
        src,
        obs,
        None,
        0,
        grounding_mode="substring",
        evidence_mode="strict",
    )
    assert out["grounded"] is False
    assert out["evidence_fp"] >= 1
