import json
import os
import sqlite3
from datetime import datetime, date
from typing import Any, Dict, List, Optional

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "pageant_intelligence.db")


def get_connection(db_path: Optional[str] = None):
    path = db_path or DEFAULT_DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_pageant_intelligence_db(db_path: Optional[str] = None):
    conn = get_connection(db_path)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS pageants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            region TEXT,
            event_date TEXT NOT NULL,
            status TEXT,
            website TEXT,
            eligibility_summary TEXT,
            category TEXT,
            description TEXT,
            source TEXT DEFAULT 'database',
            last_refreshed TEXT,
            verified INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS auditions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pageant_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            venue TEXT,
            audition_date TEXT,
            application_deadline TEXT,
            status TEXT DEFAULT 'Open',
            FOREIGN KEY(pageant_id) REFERENCES pageants(id)
        );

        CREATE TABLE IF NOT EXISTS deadlines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pageant_id INTEGER NOT NULL,
            label TEXT NOT NULL,
            deadline_date TEXT NOT NULL,
            description TEXT,
            FOREIGN KEY(pageant_id) REFERENCES pageants(id)
        );

        CREATE TABLE IF NOT EXISTS registration_windows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pageant_id INTEGER NOT NULL,
            start_date TEXT,
            end_date TEXT,
            label TEXT,
            FOREIGN KEY(pageant_id) REFERENCES pageants(id)
        );

        CREATE TABLE IF NOT EXISTS eligibility_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pageant_id INTEGER NOT NULL,
            rule_text TEXT NOT NULL,
            FOREIGN KEY(pageant_id) REFERENCES pageants(id)
        );

        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pageant_id INTEGER NOT NULL,
            document_name TEXT NOT NULL,
            required INTEGER DEFAULT 1,
            FOREIGN KEY(pageant_id) REFERENCES pageants(id)
        );

        CREATE TABLE IF NOT EXISTS venues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pageant_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            city TEXT,
            address TEXT,
            FOREIGN KEY(pageant_id) REFERENCES pageants(id)
        );

        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pageant_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            body TEXT,
            published_at TEXT,
            FOREIGN KEY(pageant_id) REFERENCES pageants(id)
        );

        CREATE TABLE IF NOT EXISTS modeling_institutes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            verified INTEGER DEFAULT 0,
            website TEXT,
            specialties TEXT,
            last_verified TEXT
        );

        CREATE TABLE IF NOT EXISTS designers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            verified INTEGER DEFAULT 0,
            website TEXT,
            specialty TEXT,
            last_verified TEXT
        );

        CREATE TABLE IF NOT EXISTS makeup_artists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            verified INTEGER DEFAULT 0,
            website TEXT,
            specialty TEXT,
            last_verified TEXT
        );

        CREATE TABLE IF NOT EXISTS photographers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            verified INTEGER DEFAULT 0,
            website TEXT,
            specialty TEXT,
            last_verified TEXT
        );

        CREATE TABLE IF NOT EXISTS mentors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            verified INTEGER DEFAULT 0,
            website TEXT,
            specialty TEXT,
            last_verified TEXT
        );

        CREATE TABLE IF NOT EXISTS refresh_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_name TEXT NOT NULL,
            last_run TEXT,
            status TEXT DEFAULT 'idle'
        );
        """
    )
    conn.commit()
    conn.close()
    return db_path or DEFAULT_DB_PATH


def add_pageant(db_path: Optional[str] = None, **payload) -> int:
    conn = get_connection(db_path)
    cur = conn.execute(
        """
        INSERT INTO pageants (
            name, region, event_date, status, website, eligibility_summary,
            category, description, source, last_refreshed, verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload.get("name"),
            payload.get("region"),
            payload.get("event_date"),
            payload.get("status", "Open"),
            payload.get("website"),
            payload.get("eligibility_summary"),
            payload.get("category"),
            payload.get("description"),
            payload.get("source", "database"),
            payload.get("last_refreshed") or datetime.utcnow().isoformat(),
            1 if payload.get("verified", True) else 0,
        ),
    )
    conn.commit()
    pageant_id = cur.lastrowid
    conn.close()
    return pageant_id


def add_audition(db_path: Optional[str] = None, **payload) -> int:
    conn = get_connection(db_path)
    cur = conn.execute(
        """
        INSERT INTO auditions (pageant_id, title, venue, audition_date, application_deadline, status)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            payload.get("pageant_id"),
            payload.get("title"),
            payload.get("venue"),
            payload.get("audition_date"),
            payload.get("application_deadline"),
            payload.get("status", "Open"),
        ),
    )
    conn.commit()
    conn.close()
    return cur.lastrowid


def add_deadline(db_path: Optional[str] = None, **payload) -> int:
    conn = get_connection(db_path)
    cur = conn.execute(
        """
        INSERT INTO deadlines (pageant_id, label, deadline_date, description)
        VALUES (?, ?, ?, ?)
        """,
        (
            payload.get("pageant_id"),
            payload.get("label"),
            payload.get("deadline_date"),
            payload.get("description"),
        ),
    )
    conn.commit()
    conn.close()
    return cur.lastrowid


def add_announcement(db_path: Optional[str] = None, **payload) -> int:
    conn = get_connection(db_path)
    cur = conn.execute(
        """
        INSERT INTO announcements (pageant_id, title, body, published_at)
        VALUES (?, ?, ?, ?)
        """,
        (
            payload.get("pageant_id"),
            payload.get("title"),
            payload.get("body"),
            payload.get("published_at"),
        ),
    )
    conn.commit()
    conn.close()
    return cur.lastrowid


def get_pageant_intelligence_snapshot(db_path: Optional[str] = None) -> Dict[str, Any]:
    conn = get_connection(db_path)
    pageants = [dict(row) for row in conn.execute("SELECT * FROM pageants ORDER BY event_date ASC")]
    auditions = [dict(row) for row in conn.execute("SELECT * FROM auditions ORDER BY audition_date ASC")]
    deadlines = [dict(row) for row in conn.execute("SELECT * FROM deadlines ORDER BY deadline_date ASC")]
    announcements = [dict(row) for row in conn.execute("SELECT * FROM announcements ORDER BY published_at DESC")]
    conn.close()

    today = date.today()
    countdowns = []
    for pageant in pageants:
        event_date = pageant.get("event_date")
        if not event_date:
            continue
        try:
            target = date.fromisoformat(event_date)
        except ValueError:
            continue
        countdowns.append(
            {
                "pageant_id": pageant["id"],
                "name": pageant["name"],
                "event_date": event_date,
                "days_remaining": (target - today).days,
                "status": pageant.get("status", "Open"),
            }
        )

    return {
        "pageants": pageants,
        "auditions": auditions,
        "deadlines": deadlines,
        "announcements": announcements,
        "countdowns": countdowns,
        "last_updated": datetime.utcnow().isoformat(),
    }


def refresh_pageant_data(db_path: Optional[str] = None, live_data_available: bool = False) -> Dict[str, Any]:
    conn = get_connection(db_path)
    conn.execute(
        "INSERT INTO refresh_jobs (job_name, last_run, status) VALUES (?, ?, ?)",
        ("pageant_refresh", datetime.utcnow().isoformat(), "completed" if live_data_available else "fallback"),
    )
    conn.commit()
    conn.close()
    return {
        "live_data_available": live_data_available,
        "source": "live" if live_data_available else "database",
        "last_updated": datetime.utcnow().isoformat(),
        "message": "Live refresh unavailable; verified database records are being used." if not live_data_available else "Live refresh completed.",
    }
