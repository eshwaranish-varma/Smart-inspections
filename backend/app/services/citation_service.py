from __future__ import annotations

import csv
import logging
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

_TABLE_NAME_SAFE = re.compile(r"^[a-z_][a-z0-9_]*$", re.I)


@dataclass
class CitationRecord:
    citation: str
    section_title: str
    section_label: str
    part_label: str
    chapter_label: str
    subchapter_label: str
    volume_label: str = ""


def _xml_local_tag(el: ET.Element) -> str:
    if not el.tag:
        return ""
    return el.tag.split("}")[-1]


class CitationService:
    """
    Title 21 CFR citation lookup from CSV and optional XML.

    Supported XML:

    - **GPO CFRDOC** (e.g. ``CFR-2025-title21-vol*.xml``): ``SECTION`` elements with ``SECTNO`` / ``SUBJECT``;
      this is the preferred backbone when present under ``data/title21/CFR-2025-title-21/``.
    - **Legacy** elements with ``citation`` / ``citation_text`` attributes.

    ``best_match`` only returns a fuzzy lookup when similarity is ≥ ``match_threshold`` (default 0.95).
    Exact index hits (normalized string or base section) use scores 1.0 / 0.99 and always pass.
    """

    def __init__(
        self,
        csv_path: Path,
        *,
        xml_dir: Path | None = None,
        match_threshold: float = 0.95,
        search_min_score: float = 0.45,
        database_url: str | None = None,
        title21_source: str = "auto",
        title21_table: str = "title_21_sections",
        cfr_match_mode: str = "fuzzy",
        cfr_confidence_threshold: float = 0.72,
        cfr_top_k: int = 8,
        cfr_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        cfr_index_dir: Path | None = None,
    ):
        self.csv_path = csv_path
        self.xml_dir = xml_dir
        self.match_threshold = match_threshold
        self.search_min_score = search_min_score
        self._database_url = (database_url or "").strip() or None
        self._title21_source = (title21_source or "auto").strip().lower()
        self._title21_table = (title21_table or "title_21_sections").strip()
        self.cfr_match_mode = (cfr_match_mode or "fuzzy").strip().lower()
        self.cfr_confidence_threshold = float(cfr_confidence_threshold)
        self.cfr_top_k = max(1, int(cfr_top_k))
        self.cfr_embedding_model = cfr_embedding_model
        self._cfr_index_dir = cfr_index_dir
        self._records: list[CitationRecord] = []
        self._citation_index: dict[str, CitationRecord] = {}
        self._loaded = False
        self._load_source: str = "none"
        self._semantic_index = None  # lazy CFRSemanticIndex

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load(self) -> None:
        if self._loaded:
            return

        use_db = self._title21_source in ("auto", "database") and self._database_url
        db_count = 0
        if use_db:
            db_count = self._load_from_postgres()
            self._load_source = "database"
            if db_count == 0 and self._title21_source == "database":
                logger.warning(
                    "Title 21 table %s returned 0 rows; citation lookup may be empty.",
                    self._title21_table,
                )

        load_files = self._title21_source == "files" or (
            self._title21_source == "auto" and db_count == 0
        )
        if load_files:
            self._load_source = "files"
            if self.csv_path.exists():
                with self.csv_path.open("r", encoding="utf-8", newline="") as fp:
                    reader = csv.DictReader(fp)
                    for row in reader:
                        citation = (row.get("citation") or "").strip()
                        if not citation:
                            continue

                        record = CitationRecord(
                            citation=citation,
                            section_title=(row.get("section_title") or "").strip(),
                            section_label=(row.get("section_label") or "").strip(),
                            part_label=(row.get("part_label") or "").strip(),
                            chapter_label=(row.get("chapter_label") or "").strip(),
                            subchapter_label=(row.get("subchapter_label") or "").strip(),
                            volume_label=(row.get("volume_label") or "").strip(),
                        )
                        self._merge_record(record)
            else:
                logger.warning("Title 21 citation CSV not found: %s", self.csv_path)

            if self.xml_dir and self.xml_dir.is_dir():
                self._load_xml_directory(self.xml_dir)

        self._loaded = True
        logger.info(
            "Loaded %s Title 21 citations (source=%s)",
            len(self._records),
            self._load_source,
        )

    def _load_from_postgres(self) -> int:
        """Load citations from public.title_21_sections (Supabase). Returns row count merged."""
        if not self._database_url or not _TABLE_NAME_SAFE.match(self._title21_table):
            logger.warning("Skipping DB Title 21 load: bad database URL or invalid table name.")
            return 0
        engine: Engine | None = None
        try:
            engine = create_engine(
                self._database_url,
                pool_pre_ping=True,
                pool_size=1,
                max_overflow=0,
            )
            q = text(
                f"""
                SELECT citation, section_title, section_label, part_label,
                       chapter_label, subchapter_label, COALESCE(volumes::text, '') AS vol
                FROM public.{self._title21_table}
                WHERE citation IS NOT NULL AND TRIM(citation) <> ''
                """
            )
            n = 0
            with engine.connect() as conn:
                for row in conn.execute(q).mappings():
                    citation = (row.get("citation") or "").strip()
                    if not citation:
                        continue
                    record = CitationRecord(
                        citation=citation,
                        section_title=(row.get("section_title") or "").strip(),
                        section_label=(row.get("section_label") or "").strip(),
                        part_label=(row.get("part_label") or "").strip(),
                        chapter_label=(row.get("chapter_label") or "").strip(),
                        subchapter_label=(row.get("subchapter_label") or "").strip(),
                        volume_label=(row.get("vol") or "").strip(),
                    )
                    self._merge_record(record)
                    n += 1
            return n
        except Exception as e:
            logger.warning("Title 21 DB load failed (fall back to files if auto): %s", e)
            return 0
        finally:
            if engine is not None:
                engine.dispose()

    def status(self) -> dict:
        """Lightweight introspection for /api/citations/status."""
        self.load()
        sem_ready = False
        try:
            self._ensure_semantic_index()
            sem_ready = bool(self._semantic_index and self._semantic_index.is_ready)
        except Exception:
            sem_ready = False
        return {
            "source": self._load_source,
            "records": len(self._records),
            "title21_source_config": self._title21_source,
            "table": self._title21_table if self._load_source == "database" else None,
            "cfr_match_mode": self.cfr_match_mode,
            "semantic_index_ready": sem_ready,
        }

    def _ensure_semantic_index(self) -> None:
        if self._semantic_index is not None:
            return
        from app.services.cfr_semantic_index import CFRSemanticIndex

        self.load()
        idx = CFRSemanticIndex(model_name=self.cfr_embedding_model, index_dir=self._cfr_index_dir)
        try:
            idx.build(self._records)
        except Exception as e:
            logger.warning("CFR semantic index build failed: %s", e)
        self._semantic_index = idx

    def _merge_record(self, rec: CitationRecord) -> None:
        """Insert or replace by normalized citation key (keeps ``_records`` and index aligned)."""
        key = self._normalize(rec.citation)
        existing = self._citation_index.get(key)
        if existing is not None:
            try:
                self._records.remove(existing)
            except ValueError:
                pass
        self._records.append(rec)
        self._citation_index[key] = rec

    def _load_xml_directory(self, directory: Path) -> None:
        """Merge sections from ``*.xml`` (recursive) — CFRDOC or legacy attributed elements."""
        for path in sorted(set(directory.rglob("*.xml"))):
            try:
                tree = ET.parse(path)
            except (ET.ParseError, OSError) as e:
                logger.warning("Skipping XML %s: %s", path, e)
                continue
            root = tree.getroot()
            if _xml_local_tag(root) == "CFRDOC":
                count = self._ingest_cfrdoc_xml(path, root)
                if count:
                    logger.info("Merged %s CFR sections from %s (CFRDOC)", count, path.name)
                continue
            count = 0
            for el in root.iter():
                ak = {k.lower() for k in el.attrib}
                if not ({"citation", "citation_text"} & ak):
                    continue
                rec = self._record_from_xml_element(el)
                if rec is None:
                    continue
                self._merge_record(rec)
                count += 1
            if count:
                logger.info("Merged %s citation rows from %s", count, path.name)

    def _record_from_xml_element(self, el: ET.Element) -> CitationRecord | None:
        """Accept ecf-style attributes: citation, section_title, part_label, chapter_label, volume_label, etc."""
        a = {k.lower().replace("-", "_"): (v or "").strip() for k, v in el.attrib.items()}
        citation = (
            a.get("citation")
            or a.get("citation_text")
            or a.get("n")
            or a.get("id")
            or ""
        ).strip()
        if not citation:
            return None
        low = citation.lower()
        if not low.startswith("21") and "cfr" not in low:
            return None

        title = a.get("section_title") or a.get("title") or a.get("heading") or ""
        return CitationRecord(
            citation=citation,
            section_title=title,
            section_label=a.get("section_label") or "",
            part_label=a.get("part_label") or a.get("part") or "",
            chapter_label=a.get("chapter_label") or a.get("chapter") or "",
            subchapter_label=a.get("subchapter_label") or a.get("subchapter") or "",
            volume_label=a.get("volume_label") or a.get("volume") or "",
        )

    def _volume_label_from_path(self, path: Path) -> str:
        m = re.search(r"vol\s*(\d+)", path.name, re.I)
        if m:
            return f"Title 21 CFR, GPO 2025, vol. {m.group(1)}"
        return "Title 21 CFR, GPO 2025"

    def _element_text(self, el: ET.Element | None) -> str:
        if el is None:
            return ""
        s = "".join(el.itertext()).strip()
        s = s.replace("\u2014", " - ").replace("\u2013", "-").replace("\u2009", " ")
        return re.sub(r"\s+", " ", s)

    def _canonical_21_cfr_from_sectno(self, raw: str) -> str:
        """Normalize ``§ 211.100``, ``211.100``, etc. to ``21 CFR 211.100``."""
        if not raw:
            return ""
        s = raw.replace("\u2009", " ").replace("\xa0", " ")
        s = re.sub(r"[\s\u2000-\u200b\ufeff]+", " ", s).strip()
        s = re.sub(r"^§+\s*", "", s)
        m = re.search(r"(\d+(?:\.\d+)*)", s)
        if not m:
            return ""
        return f"21 CFR {m.group(1)}"

    def _chapter_heading_chapter(self, el: ET.Element) -> str:
        for child in el:
            if _xml_local_tag(child) == "TOC":
                for g in child:
                    if _xml_local_tag(g) == "TOCHD":
                        for h in g:
                            if _xml_local_tag(h) == "HD":
                                return self._element_text(h)
        for child in el:
            if _xml_local_tag(child) == "HD":
                return self._element_text(child)
        return ""

    def _heading_hd(self, el: ET.Element) -> str:
        for child in el:
            t = _xml_local_tag(child)
            if t == "HD" and child.get("SOURCE") == "HED":
                return self._element_text(child)
            if t == "HD":
                return self._element_text(child)
        return ""

    def _part_heading(self, part_el: ET.Element) -> str:
        for child in part_el:
            t = _xml_local_tag(child)
            if t == "HD" and child.get("SOURCE") == "HED":
                return self._element_text(child)
            if t == "HD":
                return self._element_text(child)
        for child in part_el:
            if _xml_local_tag(child) == "EAR":
                return self._element_text(child)
        return ""

    def _subchapter_label_from_ctx(self, ctx: dict[str, str]) -> str:
        subch = (ctx.get("subchapter") or "").strip()
        subp = (ctx.get("subpart") or "").strip()
        if subch and subp:
            return f"{subch} — {subp}"
        return subch or subp

    def _record_from_cfr_section(
        self,
        section: ET.Element,
        volume_label: str,
        ctx: dict[str, str],
    ) -> CitationRecord | None:
        sectno_el: ET.Element | None = None
        subject_el: ET.Element | None = None
        for child in section:
            t = _xml_local_tag(child)
            if t == "SECTNO":
                sectno_el = child
            elif t == "SUBJECT":
                subject_el = child
        if sectno_el is None:
            return None
        raw = "".join(sectno_el.itertext()).strip()
        citation = self._canonical_21_cfr_from_sectno(raw)
        if not citation:
            return None
        title = self._element_text(subject_el)
        m = re.search(r"(\d+(?:\.\d+)*)", raw)
        section_label = m.group(1) if m else ""
        return CitationRecord(
            citation=citation,
            section_title=title,
            section_label=section_label,
            part_label=ctx.get("part") or "",
            chapter_label=ctx.get("chapter") or "",
            subchapter_label=self._subchapter_label_from_ctx(ctx),
            volume_label=volume_label,
        )

    def _ingest_cfrdoc_xml(self, path: Path, root: ET.Element) -> int:
        vol = self._volume_label_from_path(path)
        count = 0
        stack: list[dict[str, str]] = [
            {"chapter": "", "subchapter": "", "part": "", "subpart": ""}
        ]

        def walk(el: ET.Element) -> None:
            nonlocal count
            tag = _xml_local_tag(el)
            if tag == "CHAPTER":
                stack.append({**stack[-1], "chapter": self._chapter_heading_chapter(el)})
            elif tag == "SUBCHAP":
                stack.append({**stack[-1], "subchapter": self._heading_hd(el)})
            elif tag == "PART":
                stack.append({**stack[-1], "part": self._part_heading(el)})
            elif tag == "SUBPART":
                stack.append({**stack[-1], "subpart": self._heading_hd(el)})
            elif tag == "SECTION":
                rec = self._record_from_cfr_section(el, vol, stack[-1])
                if rec:
                    self._merge_record(rec)
                    count += 1
            for child in el:
                walk(child)
            if tag in ("CHAPTER", "SUBCHAP", "PART", "SUBPART"):
                stack.pop()

        walk(root)
        return count

    def search(self, query: str, limit: int = 10) -> list[dict]:
        return self.keyword_search_cfr(query, top_k=limit)

    def keyword_search_cfr(self, query: str, *, top_k: int = 10) -> list[dict]:
        """Fuzzy / string similarity over loaded Title 21 records (legacy search)."""
        self.load()
        q = (query or "").strip()
        if not q or not self._records:
            return []

        normalized_q = self._normalize(q)
        scored: list[tuple[float, CitationRecord]] = []
        for record in self._records:
            norm_citation = self._normalize(record.citation)
            score = SequenceMatcher(None, normalized_q, norm_citation).ratio()
            if normalized_q in norm_citation:
                score = max(score, 0.95)
            elif normalized_q in self._normalize(record.section_title):
                score = max(score, 0.8)

            if score >= self.search_min_score:
                scored.append((score, record))

        scored.sort(key=lambda item: item[0], reverse=True)
        out = []
        for s, record in scored[:top_k]:
            d = self._to_dict(record, s)
            d["retrieval_source"] = "keyword"
            out.append(d)
        return out

    def semantic_search_cfr(self, query: str, *, top_k: int = 8) -> list[dict]:
        """Embedding similarity over CFR rows (requires semantic index)."""
        self.load()
        q = (query or "").strip()
        if not q:
            return []
        self._ensure_semantic_index()
        if not self._semantic_index or not self._semantic_index.is_ready:
            logger.warning("semantic_search_cfr: index not ready; returning empty")
            return []

        pairs = self._semantic_index.search(q, k=top_k)
        out: list[dict] = []
        for rec, sim in pairs:
            d = self._to_dict(rec, float(sim))
            d["retrieval_source"] = "semantic"
            out.append(d)
        logger.info(
            "semantic_search_cfr query=%r top=%s scores=%s",
            q[:200],
            len(out),
            [round(x.get("score", 0), 3) for x in out[:5]],
        )
        return out

    def hybrid_search_cfr(self, query: str, *, top_k: int = 8) -> list[dict]:
        """
        Merge keyword + semantic hits; dedupe by normalized citation; rank by blended score.
        """
        self.load()
        q = (query or "").strip()
        if not q:
            return []

        kw = self.keyword_search_cfr(q, top_k=top_k)
        self._ensure_semantic_index()
        sem = (
            self.semantic_search_cfr(q, top_k=top_k)
            if (self._semantic_index and self._semantic_index.is_ready)
            else []
        )

        merged: dict[str, dict] = {}
        for d in kw:
            key = self._normalize(d.get("citation") or "")
            if not key:
                continue
            nd = dict(d)
            nd["score"] = float(nd.get("score", 0.0))
            nd["retrieval_source"] = "keyword"
            merged[key] = nd

        for d in sem:
            key = self._normalize(d.get("citation") or "")
            if not key:
                continue
            sem_score = float(d.get("score", 0.0))
            base = merged.get(key)
            if base is None:
                nd = dict(d)
                nd["score"] = round(sem_score, 4)
                nd["retrieval_source"] = "semantic"
                merged[key] = nd
            else:
                base["score"] = round(float(base.get("score", 0.0)) * 0.5 + sem_score * 0.5, 4)
                base["retrieval_source"] = "hybrid"

        ranked = sorted(merged.values(), key=lambda x: float(x.get("score", 0.0)), reverse=True)
        logger.info(
            "hybrid_search_cfr query=%r merged=%d top_score=%s",
            q[:200],
            len(ranked),
            round(float(ranked[0]["score"]), 4) if ranked else None,
        )
        return ranked[:top_k]

    def best_match(self, citation_text: str) -> dict | None:
        self.load()
        if not citation_text:
            return None

        norm = self._normalize(citation_text)
        direct = self._citation_index.get(norm)
        if direct:
            d = self._to_dict(direct, 1.0)
            d["retrieval_source"] = "exact"
            return d

        base = self._base_citation(citation_text)
        if base:
            base_norm = self._normalize(base)
            direct_base = self._citation_index.get(base_norm)
            if direct_base:
                d = self._to_dict(direct_base, 0.99)
                d["retrieval_source"] = "exact"
                return d

        mode = self.cfr_match_mode
        threshold = self.match_threshold if mode == "fuzzy" else self.cfr_confidence_threshold

        if mode == "fuzzy":
            candidates = self.keyword_search_cfr(citation_text, top_k=1)
        elif mode == "semantic":
            candidates = self.semantic_search_cfr(citation_text, top_k=1)
        else:
            candidates = self.hybrid_search_cfr(citation_text, top_k=max(3, self.cfr_top_k))
            candidates = candidates[:1]

        if not candidates:
            return None
        top = candidates[0]
        top_score = float(top["score"])
        logger.info(
            "best_match mode=%s query=%r score=%s threshold=%s source=%s",
            mode,
            (citation_text or "")[:120],
            top_score,
            threshold,
            top.get("retrieval_source"),
        )
        if top_score >= threshold:
            return top

        # Fallback: legacy fuzzy if hybrid/semantic did not meet threshold
        if mode != "fuzzy":
            fb = self.keyword_search_cfr(citation_text, top_k=1)
            if fb and float(fb[0]["score"]) >= self.match_threshold:
                fb[0]["retrieval_source"] = "keyword_fallback"
                logger.info("best_match: using fuzzy fallback for %r", citation_text[:80])
                return fb[0]
        return None

    def _to_dict(self, record: CitationRecord, score: float) -> dict[str, Any]:
        return {
            "citation": record.citation,
            "section_title": record.section_title,
            "section_label": record.section_label,
            "part_label": record.part_label,
            "chapter_label": record.chapter_label,
            "subchapter_label": record.subchapter_label,
            "volume_label": record.volume_label,
            "score": round(score, 4),
        }

    def _normalize(self, text: str) -> str:
        return re.sub(r"\s+", " ", text.lower().strip())

    def _base_citation(self, citation_text: str) -> str:
        match = re.search(r"(21\s*cfr\s*\d+(?:\.\d+)*)", citation_text.lower())
        if not match:
            return ""
        base = re.sub(r"\s+", " ", match.group(1).strip())
        return base.upper()
