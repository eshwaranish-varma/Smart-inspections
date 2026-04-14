"""AI draft evaluation: structure, CFR validity, grounding, optional OCR/WER metrics."""

from app.evaluation.evaluator import evaluate_ai_output, validate_observation_count
from app.evaluation.metrics import aggregate_metrics
from app.evaluation.store import get_evaluation_by_id, list_evaluation_summaries, load_evaluations, save_evaluation

__all__ = [
    "evaluate_ai_output",
    "validate_observation_count",
    "aggregate_metrics",
    "save_evaluation",
    "load_evaluations",
    "get_evaluation_by_id",
    "list_evaluation_summaries",
]
