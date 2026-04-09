"""Pipeline confidence and failure classification."""

from app.services.pipeline_observation_metrics import (
    FAILURE_CFR,
    FAILURE_EVIDENCE,
    FAILURE_SEGMENTATION_MERGE,
    FAILURE_STRUCTURE,
    classify_observation_pipeline,
    compute_pipeline_confidence,
    pipeline_status_color,
    run_metrics_summary,
)


def test_compute_pipeline_confidence_weights():
    c = compute_pipeline_confidence(
        mapping_valid=True,
        grounding_f1=1.0,
        structure=True,
        cfr_metric_applicable=True,
        cfr_valid=True,
    )
    assert c == 1.0


def test_classify_structure_failed():
    st, r = classify_observation_pipeline(
        structure=False,
        grounded=True,
        cfr_metric_applicable=True,
        cfr_valid_row=True,
        segmentation_warning_run=False,
    )
    assert st == "failed" and r == FAILURE_STRUCTURE


def test_classify_evidence_warning():
    st, r = classify_observation_pipeline(
        structure=True,
        grounded=False,
        cfr_metric_applicable=True,
        cfr_valid_row=True,
        segmentation_warning_run=False,
    )
    assert st == "warning" and r == FAILURE_EVIDENCE


def test_classify_segmentation_warning_after_grounded():
    st, r = classify_observation_pipeline(
        structure=True,
        grounded=True,
        cfr_metric_applicable=True,
        cfr_valid_row=True,
        segmentation_warning_run=True,
    )
    assert st == "warning" and r == FAILURE_SEGMENTATION_MERGE


def test_classify_cfr_failed():
    st, r = classify_observation_pipeline(
        structure=True,
        grounded=True,
        cfr_metric_applicable=True,
        cfr_valid_row=False,
        segmentation_warning_run=False,
    )
    assert st == "failed" and r == FAILURE_CFR


def test_run_metrics_tpr():
    m = run_metrics_summary(
        observations_status=["pass", "pass", "warning"],
        scores={"grounding_f1_micro": 0.88},
        cfr_valid_run=None,
    )
    assert m["true_positive_rate"] == round(2 / 3, 4)
    assert m["evidence_score"] == 0.88
    assert m["cfr_valid"] is None
    s = m["summary"]
    assert s.pass_n == 2 and s.warning == 1 and s.failed == 0


def test_pipeline_status_color_map():
    assert pipeline_status_color("pass") == "green"
    assert pipeline_status_color("warning") == "yellow"
    assert pipeline_status_color("failed") == "red"
