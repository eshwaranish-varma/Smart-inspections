import logging
import uuid
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.inspection import (
    GenerateObservationsRequest, GenerateObservationsResponse, GenerateObservationsRunMetrics,
    GenerateEIRRequest, EIRNarrative, EIRPipelineNarrative, RefineObservationRequest,
    DraftObservation, ValidationResult, ExtractMetadataRequest, ExtractMetadataResponse,
    ObservationValidation, EvidenceSourceItem,
    ObservationInput, ObservationOutput, Draft483Response, SegmentedObservation,
)
from app.services.ai_service import AIService, REVIEW_FLAG_CFR_NOT_EXACT_REFERENCE_MATCH
from app.services.citation_service import CitationService
from app.config import settings
from app.deps import get_db, get_kb
from app.evaluation import evaluate_ai_output, save_evaluation, validate_observation_count
from app.services.observation_validation import build_validation_payload, infer_evidence_sources
from app.services.draft_483_pipeline import (
    segmentation_quality_heuristic,
    validate_draft_483_observation,
    validate_segmentation,
)
from app.services.pipeline_observation_metrics import (
    SEGMENTATION_WARNING_NOTE,
    classify_observation_pipeline,
    pipeline_status_color,
    run_metrics_summary,
)
from app.services.context_retrieval import build_retrieval_package, legacy_truncation_block
from app.services.grounding_semantic import GroundingCache
from app.evaluation.evaluator import _default_embed_fn
from app.services.observation_confidence import (
    aggregate_run_confidence,
    compute_observation_confidence,
    mean_retrieval_score_from_package,
)
from app.services.pipeline_logging_service import (
    create_pipeline_run,
    finalize_pipeline_run,
    log_cfr_candidates,
    log_observation_result,
    log_pipeline_event,
    log_retrieved_chunks,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _utc_run_timestamp_z() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _finalize_pipeline_run_safe(
    db: Session | None,
    pipeline_run_id: UUID | None,
    *,
    status: str,
    error_message: str | None = None,
    response_summary: dict[str, Any] | None = None,
) -> None:
    if db is None or pipeline_run_id is None:
        return
    try:
        finalize_pipeline_run(
            db,
            pipeline_run_id,
            status=status,
            error_message=error_message,
            response_summary=response_summary,
        )
    except Exception as e:
        logger.warning("finalize_pipeline_run failed: %s", e)


def _http_exc_detail_str(exc: HTTPException) -> str:
    d = exc.detail
    if isinstance(d, str):
        return d
    return str(d)


def _cfr_candidates_for_logging(citation_service: CitationService, citation_text: str) -> list[dict[str, Any]]:
    citation_service.load()
    q = (citation_text or "").strip()
    if not q:
        return []
    mode = (citation_service.cfr_match_mode or "fuzzy").strip().lower()
    tk = max(3, int(citation_service.cfr_top_k))
    if mode == "fuzzy":
        rows = citation_service.keyword_search_cfr(q, top_k=tk)
    elif mode == "semantic":
        rows = citation_service.semantic_search_cfr(q, top_k=tk)
    else:
        rows = citation_service.hybrid_search_cfr(q, top_k=tk)
    out: list[dict[str, Any]] = []
    for r in rows:
        d = dict(r)
        d.setdefault("retrieval_source", d.get("retrieval_source") or mode)
        out.append(d)
    return out


def _chunks_payload_from_pkg(pkg: dict[str, Any], observation_index: int) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in pkg.get("note_rows") or []:
        if not isinstance(r, dict):
            continue
        txt = (r.get("text") or "")[:4000]
        out.append(
            {
                "observation_index": observation_index,
                "chunk_type": r.get("chunk_type") or "notes",
                "source": r.get("source") or "inspection_notes",
                "score": r.get("score"),
                "content_preview": txt[:2000],
                "payload": {"chunk_id": r.get("chunk_id"), "text": txt},
            }
        )
    for r in pkg.get("kb_rows") or []:
        if not isinstance(r, dict):
            continue
        txt = (r.get("text") or "")[:4000]
        out.append(
            {
                "observation_index": observation_index,
                "chunk_type": r.get("chunk_type") or "kb",
                "source": str(r.get("source") or "kb"),
                "score": r.get("score"),
                "content_preview": txt[:2000],
                "payload": {"text": txt},
            }
        )
    return out


def _persist_generate_observations_pipeline(
    db: Session,
    pipeline_run_id: UUID,
    *,
    req: GenerateObservationsRequest,
    segment_pkgs: list[dict[str, Any]],
    segmented: list[SegmentedObservation],
    observations: list[DraftObservation],
    per_eval: list[Any],
    citation_service: CitationService,
    scores: dict[str, Any],
    doc_id: str,
    conf_agg: dict[str, Any],
    metrics_dict: dict[str, Any],
) -> None:
    log_pipeline_event(
        db,
        pipeline_run_id,
        "run_input",
        {"raw_input_text": req.raw_notes, "cfr_parts": req.cfr_parts, "establishment_type": req.establishment_type},
    )
    seg_payload: dict[str, Any] = {
        "segment_count": len(segment_pkgs),
        "segmentation_valid": scores.get("segmentation_valid"),
        "segments": [s.model_dump() for s in segmented],
    }
    log_pipeline_event(
        db,
        pipeline_run_id,
        "segmentation",
        seg_payload,
    )

    for i, pkg in enumerate(segment_pkgs):
        log_pipeline_event(
            db,
            pipeline_run_id,
            "retrieval",
            {"observation_index": i, "retrieval_metadata": pkg.get("retrieval_metadata")},
            observation_index=i,
        )
        log_retrieved_chunks(db, pipeline_run_id, _chunks_payload_from_pkg(pkg, i))

    for i, obs in enumerate(observations):
        row = per_eval[i] if i < len(per_eval) and isinstance(per_eval[i], dict) else {}
        log_pipeline_event(
            db,
            pipeline_run_id,
            "citation",
            {"observation_index": i, "cfr_citation": obs.cfr_citation},
            observation_index=i,
        )
        cands = _cfr_candidates_for_logging(citation_service, obs.cfr_citation)
        matched = (obs.matched_citation or "").strip()
        for c in cands:
            if matched and (c.get("citation") or "").strip() == matched:
                c["selected"] = True
                break
        else:
            if matched:
                cands.insert(
                    0,
                    {
                        "citation": obs.matched_citation,
                        "score": obs.citation_match_score,
                        "selected": True,
                        "retrieval_source": "resolved",
                        "section_title": obs.citation_title,
                    },
                )
        log_cfr_candidates(
            db,
            pipeline_run_id,
            i,
            cands,
            query=obs.cfr_citation,
            default_retrieval_source=settings.cfr_match_mode,
        )

        log_pipeline_event(
            db,
            pipeline_run_id,
            "generation",
            {"observation_id": obs.id, "observation_index": i},
            observation_index=i,
        )
        log_pipeline_event(
            db,
            pipeline_run_id,
            "grounding",
            {
                "observation_index": i,
                "grounding_mode": settings.grounding_mode,
                "grounded": row.get("grounded"),
                "grounding_f1": row.get("grounding_f1"),
            },
            observation_index=i,
        )
        log_pipeline_event(
            db,
            pipeline_run_id,
            "evaluation",
            {
                "observation_index": i,
                "confidence": obs.confidence,
                "confidence_breakdown": obs.confidence_breakdown,
                "overall": row.get("overall"),
            },
            observation_index=i,
        )

        eval_payload = dict(row)
        eval_payload["confidence"] = obs.confidence
        eval_payload["confidence_breakdown"] = obs.confidence_breakdown
        eval_payload["grounding_mode"] = settings.grounding_mode

        log_observation_result(
            db,
            pipeline_run_id,
            i,
            payload=obs.model_dump(mode="json"),
            evaluation=eval_payload,
            observation_id=obs.id,
        )

    log_pipeline_event(
        db,
        pipeline_run_id,
        "storage",
        {"doc_id": doc_id, "inspection_id": (req.inspection_id or "").strip() or None},
    )

    summary = {
        "doc_id": doc_id,
        "pipeline_run_id": str(pipeline_run_id),
        "observation_count": len(observations),
        "avg_confidence": conf_agg.get("avg_confidence"),
        "avg_grounding_f1": conf_agg.get("avg_grounding_f1"),
        "avg_cfr_score": conf_agg.get("avg_cfr_score"),
        "avg_retrieval_score": conf_agg.get("avg_retrieval_score"),
        "metrics": {k: metrics_dict.get(k) for k in ("true_positive_rate", "evidence_score", "cfr_valid") if k in metrics_dict},
    }
    finalize_pipeline_run(
        db,
        pipeline_run_id,
        status="success",
        response_summary=summary,
        metadata={
            "grounding_mode": settings.grounding_mode,
            "use_retrieval_for_generation": settings.use_retrieval_for_generation,
            "cfr_match_mode": settings.cfr_match_mode,
            "evaluation_keys": list(scores.keys())[:40],
        },
    )


def _citation_service() -> CitationService:
    return CitationService(
        settings.title21_sections_csv,
        xml_dir=settings.title21_xml_directory,
        match_threshold=settings.citation_match_threshold,
        database_url=settings.effective_database_url,
        title21_source=settings.title21_source,
        title21_table=settings.title21_table,
        cfr_match_mode=settings.cfr_match_mode,
        cfr_confidence_threshold=settings.cfr_confidence_threshold,
        cfr_top_k=settings.cfr_top_k,
        cfr_embedding_model=settings.cfr_embedding_model,
        cfr_index_dir=settings.cfr_index_path,
    )


def _apply_title21_citation_match(obs: DraftObservation, citation_service: CitationService) -> dict | None:
    """Populate matched Title 21 fields or flag when CFR text is not verified at ≥ threshold."""
    match = citation_service.best_match(obs.cfr_citation)
    flags = [f for f in (obs.review_flags or []) if f != REVIEW_FLAG_CFR_NOT_EXACT_REFERENCE_MATCH]
    if match:
        obs.matched_citation = match["citation"]
        obs.citation_title = match.get("section_title") or match.get("section_label") or ""
        obs.citation_match_score = match["score"]
        obs.citation_volume_label = match.get("volume_label") or ""
        obs.citation_part_label = match.get("part_label") or ""
        obs.citation_chapter_label = match.get("chapter_label") or ""
        obs.citation_subchapter_label = match.get("subchapter_label") or ""
        obs.review_flags = flags
        return match
    obs.matched_citation = ""
    obs.citation_title = ""
    obs.citation_match_score = 0.0
    obs.citation_volume_label = ""
    obs.citation_part_label = ""
    obs.citation_chapter_label = ""
    obs.citation_subchapter_label = ""
    if (obs.cfr_citation or "").strip():
        obs.review_flags = flags + [REVIEW_FLAG_CFR_NOT_EXACT_REFERENCE_MATCH]
    else:
        obs.review_flags = flags
    return None


def _get_ai_service() -> AIService:
    return AIService(
        provider=settings.resolved_llm_provider,
        api_key=settings.resolved_openai_api_key,
        google_api_key=settings.google_api_key,
        model=settings.resolved_openai_model,
        google_model=settings.google_model,
        temperature=settings.openai_temperature,
        openai_base_url=settings.resolved_openai_base_url,
    )


def _get_metadata_ai_service() -> AIService:
    return AIService(
        provider="openai",
        api_key=settings.resolved_openai_api_key,
        google_api_key="",
        model=settings.resolved_openai_model,
        google_model=settings.google_model,
        temperature=settings.openai_temperature,
        openai_base_url=settings.resolved_openai_base_url,
    )


def _pipeline_to_draft_observations(
    segmented: list[SegmentedObservation],
    drafted: list[ObservationOutput],
) -> list[DraftObservation]:
    """Map segmentation + per-observation draft outputs to API DraftObservation rows."""
    out: list[DraftObservation] = []
    if len(segmented) != len(drafted):
        raise ValueError("Segmented and drafted observation counts must match")
    for seg, d in zip(segmented, drafted):
        excerpt = (seg.raw_text or "").strip()[:4000]
        ev_list = list(d.evidence_used or []) or list(seg.evidence or [])
        out.append(
            DraftObservation(
                id=d.obs_id,
                observation_text=d.drafted_text,
                cfr_citation=d.cfr_citation or "",
                evidence_list=ev_list,
                evidence_grounding_types=list(d.evidence_grounding_types or []),
                source_notes_excerpt=excerpt,
                confidence_score=0.0,
                confidence=0.0,
                review_flags=[],
            )
        )
    return out


@router.post("/draft-483", response_model=Draft483Response)
async def draft_483(observations: list[ObservationInput] = Body(...)):
    """
    Strict one-observation-per-LLM-call FDA 483 drafting. Does not batch all rows into one prompt.
    """
    ai = _get_ai_service()
    try:
        drafted = await ai.draft_observations(observations)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Draft 483 failed: {str(e)}")

    for i, obs in enumerate(observations):
        validate_draft_483_observation(obs, drafted[i], observations)

    return Draft483Response(status="success", count=len(drafted), observations=drafted)


@router.post("/generate-observations", response_model=GenerateObservationsResponse)
async def generate_observations(req: GenerateObservationsRequest, db: Session = Depends(get_db)):
    """
    Raw notes → LLM segmentation (distinct issues) → per-observation FDA 483 drafting.
    No single-shot draft of all observations from raw notes.
    """
    ai = _get_ai_service()
    citation_service = _citation_service()
    kb = get_kb()

    pipeline_run_id: UUID | None = None
    try:
        pipeline_run_id = create_pipeline_run(
            db,
            run_type="generate_observations",
            inspection_id=(req.inspection_id or "").strip() or None,
            request_payload={
                "raw_input_text": req.raw_notes,
                "establishment_type": req.establishment_type,
                "cfr_parts": req.cfr_parts,
                "additional_context": req.additional_context or {},
            },
            metadata={
                "grounding_mode": settings.grounding_mode,
                "use_retrieval_for_generation": settings.use_retrieval_for_generation,
                "cfr_match_mode": settings.cfr_match_mode,
            },
        )
    except Exception as e:
        logger.warning("create_pipeline_run skipped: %s", e)

    segmented = None
    drafted_outputs = None
    inputs: list[ObservationInput] = []
    retrieval_run_meta: list[dict] = []
    segment_pkgs: list[dict[str, Any]] = []

    try:
        segmented = await ai.segment_observations(req.raw_notes, req.refinement_feedback)
        validate_segmentation(segmented)
        segmentation_valid, segmentation_warning = segmentation_quality_heuristic(req.raw_notes, segmented)
        cfr_candidates = [str(x).strip() for x in (req.cfr_parts or []) if str(x).strip()]
        cfr_metric_applicable = bool(cfr_candidates)
        for o in segmented:
            pkg = build_retrieval_package(
                kb,
                req.raw_notes,
                o.raw_text,
                notes_top_k=settings.notes_retrieval_top_k,
                kb_top_k=settings.kb_retrieval_top_k,
                max_context_chunks=settings.max_context_chunks,
                use_retrieval=settings.use_retrieval_for_generation,
                embedding_model=settings.cfr_embedding_model,
            )
            segment_pkgs.append(pkg)
            retrieval_run_meta.append(pkg.get("retrieval_metadata") or {})
            ctx = (pkg.get("context_block") or "").strip()
            if settings.use_retrieval_for_generation and not ctx:
                logger.warning(
                    "Retrieval returned no context for segment %s; using legacy note truncation for prompt",
                    o.obs_id,
                )
                ctx = legacy_truncation_block(req.raw_notes, max_chars=8000)
            elif not settings.use_retrieval_for_generation:
                ctx = legacy_truncation_block(req.raw_notes, max_chars=8000)
            inputs.append(
                ObservationInput(
                    obs_id=o.obs_id,
                    raw_text=o.raw_text,
                    evidence=o.evidence,
                    cfr_candidates=cfr_candidates,
                    retrieval_context=ctx,
                )
            )
        drafted_outputs = await ai.draft_observations(inputs)
        for i, obs_in in enumerate(inputs):
            validate_draft_483_observation(obs_in, drafted_outputs[i], inputs)
    except ValueError as e:
        err_msg = str(e)
        logger.warning("generate_observations pipeline validation failed: %s", err_msg)
        _finalize_pipeline_run_safe(db, pipeline_run_id, status="failed", error_message=err_msg)
        raise HTTPException(status_code=422, detail=err_msg) from e
    except RuntimeError as e:
        _finalize_pipeline_run_safe(db, pipeline_run_id, status="failed", error_message=str(e))
        raise HTTPException(status_code=400, detail=str(e)) from e
    except HTTPException as e:
        _finalize_pipeline_run_safe(db, pipeline_run_id, status="failed", error_message=_http_exc_detail_str(e))
        raise
    except Exception as e:
        _finalize_pipeline_run_safe(db, pipeline_run_id, status="failed", error_message=str(e))
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}") from e

    assert segmented is not None and drafted_outputs is not None
    n_seg = len(segmented)
    n_draft = len(drafted_outputs)
    mapping_valid = n_seg == n_draft
    count_rationale = "Segmentation (LLM) + one LLM call per observation for Form FDA 483 drafting."

    count_check = validate_observation_count(segmented, drafted_outputs)
    observation_count_mismatch = count_check["status"] == "failed"
    if observation_count_mismatch:
        logger.error(
            "PIPELINE RED — Observation count mismatch: %d segmented vs %d drafted (%s)",
            n_seg, n_draft, count_check["reason"],
        )

    observations = _pipeline_to_draft_observations(segmented, drafted_outputs)

    gcache: GroundingCache | None = None
    if settings.grounding_mode in ("semantic", "hybrid"):
        gcache = GroundingCache(source_text=req.raw_notes, model_name="")
        try:
            gcache.ensure(_default_embed_fn())
        except Exception:
            gcache = None

    matched_refs: list[dict] = []
    for obs in observations:
        match = _apply_title21_citation_match(obs, citation_service)
        if match:
            matched_refs.append(match)
        obs.cfr_reference = (obs.cfr_citation or "").strip()
        val = build_validation_payload(
            obs.model_dump(),
            input_text=req.raw_notes,
            citation_match_score=float(obs.citation_match_score or 0.0),
            cfr_threshold=settings.citation_match_threshold,
            cfr_applicable=cfr_metric_applicable,
            grounding_mode=settings.grounding_mode,
            grounding_similarity_threshold=settings.grounding_similarity_threshold,
            evidence_mode=settings.evidence_mode,
            grounding_cache=gcache,
        )
        obs.validation = ObservationValidation(**val)
        obs.evidence_sources = [
            EvidenceSourceItem(**x) for x in infer_evidence_sources(obs.id, req.raw_notes, obs.source_notes_excerpt)
        ]

    kb_context: list[str] = []
    if inputs and (inputs[0].retrieval_context or "").strip():
        kb_context = [inputs[0].retrieval_context[:2000]]
    elif kb and kb.is_initialized:
        kb_context = kb.query(req.raw_notes[:500])

    payload_out = {
        "observations": [o.model_dump() for o in observations],
        "knowledge_base_refs": kb_context[:2],
        "citation_refs": matched_refs[:10],
    }
    scores = evaluate_ai_output(
        req.raw_notes,
        payload_out,
        req.ground_truth,
        expected_observation_count=n_seg,
        cfr_metric_applicable=cfr_metric_applicable,
        cfr_candidates=cfr_candidates if cfr_metric_applicable else None,
        grounding_mode=settings.grounding_mode,
        grounding_similarity_threshold=settings.grounding_similarity_threshold,
        evidence_mode=settings.evidence_mode,
    )
    scores["retrieval"] = {
        "per_segment": retrieval_run_meta,
        "use_retrieval_for_generation": settings.use_retrieval_for_generation,
    }
    scores["segmentation_valid"] = segmentation_valid
    scores["segmentation_warning"] = segmentation_warning

    per_eval = scores.get("observations")
    if not isinstance(per_eval, list):
        per_eval = []
    pipeline_statuses: list[str] = []
    conf_breakdowns: list[dict[str, Any]] = []
    conf_totals: list[float] = []

    for i, obs in enumerate(observations):
        row = per_eval[i] if i < len(per_eval) and isinstance(per_eval[i], dict) else {}
        struct_ok = bool(row.get("structure"))
        grounded = bool(row.get("grounded"))
        cv = row.get("cfr_valid")
        if cfr_metric_applicable:
            cfr_row = bool(cv) if cv is not None else False
        else:
            cfr_row = True
        gf1 = float(row.get("grounding_f1") or 0.0)

        pkg = segment_pkgs[i] if i < len(segment_pkgs) else {}
        note_rows = pkg.get("note_rows") if isinstance(pkg.get("note_rows"), list) else []
        kb_rows = pkg.get("kb_rows") if isinstance(pkg.get("kb_rows"), list) else []
        retrieval_score = mean_retrieval_score_from_package(note_rows, kb_rows)
        if not settings.use_retrieval_for_generation:
            retrieval_score = 0.5

        if cfr_metric_applicable:
            try:
                cfr_s = max(0.0, min(1.0, float(obs.citation_match_score or 0.0)))
            except (TypeError, ValueError):
                cfr_s = 0.0
        else:
            cfr_s = 1.0

        structure_s = 1.0 if struct_ok else 0.0
        conf, breakdown = compute_observation_confidence(
            grounding_f1=gf1,
            cfr_score=cfr_s,
            structure_score=structure_s,
            retrieval_score=retrieval_score,
        )
        conf_breakdowns.append(breakdown)
        conf_totals.append(conf)

        pst, reason = classify_observation_pipeline(
            structure=struct_ok,
            grounded=grounded,
            cfr_metric_applicable=cfr_metric_applicable,
            cfr_valid_row=cfr_row,
            segmentation_warning_run=bool(segmentation_warning),
        )
        obs.confidence = conf
        obs.confidence_score = conf
        obs.confidence_breakdown = breakdown
        obs.pipeline_status = pst
        obs.failure_reason = reason
        obs.pipeline_status_color = pipeline_status_color(pst)
        pipeline_statuses.append(pst)
        if i < len(per_eval) and isinstance(per_eval[i], dict):
            per_eval[i]["confidence"] = conf
            per_eval[i]["confidence_breakdown"] = breakdown
            per_eval[i]["pipeline_status"] = pst
            per_eval[i]["failure_reason"] = reason
            per_eval[i]["pipeline_status_color"] = obs.pipeline_status_color
            per_eval[i]["grounding_mode"] = settings.grounding_mode

    conf_agg = aggregate_run_confidence(conf_totals, component_breakdowns=conf_breakdowns)
    scores["confidence_aggregate"] = conf_agg

    metrics_dict = run_metrics_summary(
        observations_status=pipeline_statuses,
        scores=scores,
        cfr_valid_run=scores.get("cfr_valid"),
    )
    metrics_dict["avg_confidence"] = conf_agg.get("avg_confidence")
    metrics_dict["avg_grounding_f1"] = conf_agg.get("avg_grounding_f1")
    metrics_dict["avg_cfr_score"] = conf_agg.get("avg_cfr_score")
    metrics_dict["avg_retrieval_score"] = conf_agg.get("avg_retrieval_score")

    metrics_model = GenerateObservationsRunMetrics(**metrics_dict)
    scores["metrics"] = metrics_model.model_dump(mode="json", by_alias=True)
    scores["summary"] = metrics_model.summary.model_dump(mode="json", by_alias=True)
    segmentation_note = SEGMENTATION_WARNING_NOTE if segmentation_warning else None
    scores["segmentation_note"] = segmentation_note
    pipeline_integrity = bool(mapping_valid and segmentation_valid and not observation_count_mismatch)
    scores["pipeline_integrity"] = pipeline_integrity
    scores["observation_count_mismatch"] = observation_count_mismatch

    payload_out = {
        "observations": [o.model_dump() for o in observations],
        "knowledge_base_refs": kb_context[:2],
        "citation_refs": matched_refs[:10],
    }

    doc_id = str(uuid.uuid4())
    run_timestamp = _utc_run_timestamp_z()
    save_evaluation(
        {
            "doc_id": doc_id,
            "input": req.raw_notes,
            "output": payload_out,
            "scores": scores,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "inspection_id": (req.inspection_id or "").strip() or None,
            "inspection_title": (req.inspection_title or "").strip() or None,
        }
    )

    if pipeline_run_id:
        try:
            _persist_generate_observations_pipeline(
                db,
                pipeline_run_id,
                req=req,
                segment_pkgs=segment_pkgs,
                segmented=segmented,
                observations=observations,
                per_eval=per_eval,
                citation_service=citation_service,
                scores=scores,
                doc_id=doc_id,
                conf_agg=conf_agg,
                metrics_dict=metrics_dict,
            )
        except Exception as e:
            logger.warning("pipeline persistence failed (response still returned): %s", e)
            _finalize_pipeline_run_safe(
                db,
                pipeline_run_id,
                status="failed",
                error_message=str(e),
                response_summary={"doc_id": doc_id, "partial": True},
            )

    mismatch_warning_msg: str | None = None
    if observation_count_mismatch:
        mismatch_warning_msg = (
            f"Observation count mismatch detected: {n_seg} input observations vs {n_draft} drafted outputs. "
            "AI may have split or dropped observations incorrectly."
        )

    return GenerateObservationsResponse(
        status="success",
        run_timestamp=run_timestamp,
        observations=observations,
        knowledge_base_refs=kb_context[:2],
        citation_refs=matched_refs[:10],
        doc_id=doc_id,
        pipeline_run_id=str(pipeline_run_id) if pipeline_run_id else None,
        evaluation=scores,
        expected_observation_count=n_seg,
        drafted_observation_count=n_draft,
        count_matches_expectation=mapping_valid,
        observation_count_rationale=count_rationale,
        segmented_count=n_seg,
        drafted_count=n_draft,
        mapping_valid=mapping_valid,
        segmentation_valid=segmentation_valid,
        segmentation_warning=segmentation_warning,
        segmentation_note=segmentation_note,
        summary=metrics_model.summary,
        pipeline_integrity=pipeline_integrity,
        observation_count_mismatch_warning=mismatch_warning_msg,
        metrics=metrics_model,
    )


@router.post("/generate-eir", response_model=EIRNarrative)
async def generate_eir(req: GenerateEIRRequest):
    ai = _get_ai_service()
    kb = get_kb()
    combined = (req.raw_notes or "") + "\n" + "\n".join(o.observation_text for o in req.observations)
    from app.services.context_retrieval import build_eir_kb_context_list

    kb_context, _eir_meta = build_eir_kb_context_list(
        kb,
        req.raw_notes or "",
        combined[:2000],
        notes_top_k=settings.notes_retrieval_top_k,
        kb_top_k=settings.kb_retrieval_top_k,
        max_context_chunks=settings.max_context_chunks,
        use_retrieval=settings.use_retrieval_for_generation,
        embedding_model=settings.cfr_embedding_model,
    )
    if not kb_context and kb and kb.is_initialized:
        kb_context = kb.query(combined[:1200])
    try:
        return ai.generate_eir_narrative(
            observations=req.observations,
            inspection_metadata=req.inspection_metadata.model_dump(),
            raw_notes=req.raw_notes,
            kb_context=kb_context,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EIR generation failed: {str(e)}")


@router.post("/generate-eir-pipeline", response_model=EIRPipelineNarrative)
async def generate_eir_pipeline(req: GenerateEIRRequest):
    """Post–483 EIR narrative with observation/evidence traceability (separate from /generate-eir)."""
    ai = _get_ai_service()
    kb = get_kb()
    combined = (req.raw_notes or "") + "\n" + "\n".join(o.observation_text for o in req.observations)
    from app.services.context_retrieval import build_eir_kb_context_list

    kb_context, _eir_meta = build_eir_kb_context_list(
        kb,
        req.raw_notes or "",
        combined[:2000],
        notes_top_k=settings.notes_retrieval_top_k,
        kb_top_k=settings.kb_retrieval_top_k,
        max_context_chunks=settings.max_context_chunks,
        use_retrieval=settings.use_retrieval_for_generation,
        embedding_model=settings.cfr_embedding_model,
    )
    if not kb_context and kb and kb.is_initialized:
        kb_context = kb.query(combined[:1200])
    try:
        return ai.generate_eir_pipeline_narrative(
            observations=req.observations,
            inspection_metadata=req.inspection_metadata.model_dump(),
            raw_notes=req.raw_notes,
            kb_context=kb_context,
            strict_eir_coverage=req.strict_eir_coverage,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EIR pipeline generation failed: {str(e)}")


@router.post("/refine-observation", response_model=DraftObservation)
async def refine_observation(req: RefineObservationRequest):
    ai = _get_ai_service()
    try:
        obs = ai.refine_observation(req.observation, req.user_feedback)
        _apply_title21_citation_match(obs, _citation_service())
        obs.cfr_reference = (obs.cfr_citation or "").strip()
        excerpt_ctx = (req.observation.source_notes_excerpt or "").strip()
        val = build_validation_payload(
            obs.model_dump(),
            input_text=excerpt_ctx,
            citation_match_score=float(obs.citation_match_score or 0.0),
            cfr_threshold=settings.citation_match_threshold,
            grounding_mode=settings.grounding_mode,
            grounding_similarity_threshold=settings.grounding_similarity_threshold,
            evidence_mode=settings.evidence_mode,
            grounding_cache=None,
        )
        obs.validation = ObservationValidation(**val)
        obs.evidence_sources = [
            EvidenceSourceItem(**x) for x in infer_evidence_sources(obs.id, excerpt_ctx, obs.source_notes_excerpt)
        ]
        return obs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-observation", response_model=ValidationResult)
async def validate_observation(obs: DraftObservation):
    ai = _get_ai_service()
    return ai.validate_observation(obs)


@router.post("/extract-metadata", response_model=ExtractMetadataResponse)
async def extract_metadata(req: ExtractMetadataRequest):
    ai = _get_metadata_ai_service()
    try:
        metadata = ai.extract_inspection_metadata(req.raw_text)
        return ExtractMetadataResponse(metadata=metadata)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metadata extraction failed: {str(e)}")
