"""Prompt alignment: strict evidence mode injects constraints."""

from app.services.prompt_builders import build_observation_prompt, evidence_mode_instructions


def test_strict_evidence_instructions():
    t = evidence_mode_instructions("strict", strict_retrieved=True)
    assert "STRICT" in t
    assert "exact" in t.lower()


def test_build_observation_prompt_appends_retrieval():
    base = "RAW OBSERVATION:\nhello"
    p = build_observation_prompt(
        base_user_prompt=base,
        retrieved_context="SNIPPET FROM NOTES",
        evidence_mode="strict",
        use_retrieved_evidence_only=True,
    )
    assert "RETRIEVED" in p
    assert "SNIPPET FROM NOTES" in p
    assert base in p
