import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pageant_intelligence import (
    init_pageant_intelligence_db,
    add_pageant,
    add_audition,
    add_deadline,
    add_announcement,
    get_pageant_intelligence_snapshot,
    refresh_pageant_data,
)


def test_pageant_intelligence_snapshot_uses_database_records(tmp_path):
    db_path = tmp_path / "crownfit_pageants.db"
    init_pageant_intelligence_db(str(db_path))

    pageant_id = add_pageant(
        db_path=str(db_path),
        name="National Pageant Open",
        region="Mumbai",
        event_date="2026-10-15",
        status="Open",
        website="https://example.org",
        eligibility_summary="Open to ages 18-30",
        category="National",
        description="National open call",
    )
    add_audition(
        db_path=str(db_path),
        pageant_id=pageant_id,
        title="Open Audition",
        venue="Mumbai",
        audition_date="2026-09-20",
        application_deadline="2026-09-10",
    )
    add_deadline(
        db_path=str(db_path),
        pageant_id=pageant_id,
        label="Registration Deadline",
        deadline_date="2026-09-10",
        description="Register before the deadline",
    )
    add_announcement(
        db_path=str(db_path),
        pageant_id=pageant_id,
        title="Applications Open",
        body="Applications are now open.",
        published_at="2026-08-01",
    )

    snapshot = get_pageant_intelligence_snapshot(str(db_path))

    assert snapshot["pageants"][0]["name"] == "National Pageant Open"
    assert snapshot["countdowns"][0]["days_remaining"] >= 0
    assert snapshot["announcements"][0]["title"] == "Applications Open"


def test_refresh_pageant_data_falls_back_to_verified_database(tmp_path):
    db_path = tmp_path / "crownfit_pageants.db"
    init_pageant_intelligence_db(str(db_path))
    add_pageant(
        db_path=str(db_path),
        name="Regional Gala",
        region="Delhi",
        event_date="2026-11-01",
        status="Open",
        website="https://example.org",
        eligibility_summary="Open to ages 18-28",
        category="Regional",
        description="Regional gala",
    )

    result = refresh_pageant_data(str(db_path), live_data_available=False)

    assert result["live_data_available"] is False
    assert result["source"] == "database"
    assert result["last_updated"]
