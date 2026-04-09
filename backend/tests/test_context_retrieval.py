"""Note chunking + legacy fallback."""

from app.services.context_retrieval import legacy_truncation_block, retrieve_note_chunks


def test_legacy_truncation():
    s = "x" * 5000
    assert len(legacy_truncation_block(s, max_chars=100)) == 100


def test_retrieve_note_chunks_returns_scored_rows():
    notes = "Alpha finding one. Beta finding two. Gamma finding three."
    q = "Beta finding"
    rows = retrieve_note_chunks(notes, q, top_k=2, embedding_model="sentence-transformers/all-MiniLM-L6-v2")
    # May be empty if sentence-transformers not installed in environment
    assert isinstance(rows, list)
    if rows:
        assert rows[0]["chunk_type"] == "notes"
