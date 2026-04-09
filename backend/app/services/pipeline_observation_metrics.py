"""Per-observation pipeline confidence, status, and failure_reason for dashboards."""

from __future__ import annotations

# Align with demo / evaluation narrative
FAILURE_SEGMENTATION_MERGE = "segmentation_merge_suspected"
FAILURE_EVIDENCE = "evidence_not_grounded"
FAILURE_CFR = "cfr_mismatch"
FAILURE_STRUCTURE = "structure_invalid"
FAILURE_CROSS_LEAK = "cross_observation_leakage"

SEGMENTATION_WARNING_NOTE = "Possible observation merging detected"


def pipeline_status_color(status: str) -> str:
    """Dashboard token: pass → green, warning → yellow, failed → red."""
    if status == "pass":
        return "green"
    if status == "warning":
        return "yellow"
    if status == "failed":
        return "red"
    return "yellow"


def count_pipeline_statuses(statuses: list[str]) -> dict[str, int]:
    return {
        "pass": sum(1 for s in statuses if s == "pass"),
        "warning": sum(1 for s in statuses if s == "warning"),
        "failed": sum(1 for s in statuses if s == "failed"),
    }


def compute_pipeline_confidence(
    *,
    mapping_valid: bool,
    grounding_f1: float,
    structure: bool,
    cfr_metric_applicable: bool,
    cfr_valid: bool,
) -> float:
    """Weighted pipeline confidence (not raw model logits)."""
    mapping = 1.0 if mapping_valid else 0.0
    evidence = max(0.0, min(1.0, float(grounding_f1)))
    structure_f = 1.0 if structure else 0.0
    cfr_f = 1.0 if not cfr_metric_applicable else (1.0 if cfr_valid else 0.0)
    return round(
        0.3 * mapping + 0.3 * evidence + 0.2 * structure_f + 0.2 * cfr_f,
        4,
    )


def classify_observation_pipeline(
    *,
    structure: bool,
    grounded: bool,
    cfr_metric_applicable: bool,
    cfr_valid_row: bool,
    segmentation_warning_run: bool,
) -> tuple[str, str | None]:
    """
    Returns (pipeline_status, failure_reason).
    status: pass | warning | failed
    """
    if not structure:
        return "failed", FAILURE_STRUCTURE
    if cfr_metric_applicable and not cfr_valid_row:
        return "failed", FAILURE_CFR
    if not grounded:
        return "warning", FAILURE_EVIDENCE
    if segmentation_warning_run:
        return "warning", FAILURE_SEGMENTATION_MERGE
    return "pass", None


def run_metrics_summary(
    *,
    observations_status: list[str],
    scores: dict,
    cfr_valid_run: bool | None,
) -> dict:
    """Run-level metrics block for API response."""
    from app.schemas.inspection import PipelineStatusSummary

    n = len(observations_status)
    counts = count_pipeline_statuses(observations_status)
    pass_n = counts["pass"]
    tpr = round(pass_n / n, 4) if n else 0.0
    summary = PipelineStatusSummary(
        pass_n=pass_n,
        warning=counts["warning"],
        failed=counts["failed"],
    )
    return {
        "true_positive_rate": tpr,
        "evidence_score": scores.get("grounding_f1_micro"),
        "cfr_valid": cfr_valid_run,
        "summary": summary,
    }
