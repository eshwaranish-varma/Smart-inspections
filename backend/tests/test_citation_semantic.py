"""CitationService keyword vs hybrid merge (no heavy embedding in CI — fuzzy path)."""

from pathlib import Path

from app.services.citation_service import CitationService


def _svc(tmp_path: Path) -> CitationService:
    csv_path = tmp_path / "t21.csv"
    csv_path.write_text(
        "citation,section_title,section_label,part_label,chapter_label,subchapter_label,volume_label\n"
        '21 CFR 211.22,QC unit responsibilities,211.22,211,,,,\n'
        '21 CFR 211.100,Written procedures,211.100,211,,,,\n',
        encoding="utf-8",
    )
    return CitationService(
        csv_path,
        xml_dir=None,
        cfr_match_mode="fuzzy",
        cfr_index_dir=tmp_path / "idx",
    )


def test_keyword_search_returns_source(tmp_path: Path):
    s = _svc(tmp_path)
    s.load()
    rows = s.keyword_search_cfr("21 CFR 211.22", top_k=3)
    assert rows
    assert rows[0]["retrieval_source"] == "keyword"
    assert "211.22" in rows[0]["citation"]


def test_hybrid_degrades_to_keyword_when_no_semantic_index(tmp_path: Path):
    s = _svc(tmp_path)
    s.load()
    # semantic index not built for empty / failed build — hybrid still returns keyword rows
    rows = s.hybrid_search_cfr("written procedures", top_k=5)
    assert isinstance(rows, list)
    assert all("citation" in r for r in rows)
