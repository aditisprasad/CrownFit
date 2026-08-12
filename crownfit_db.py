import json
import os
import sqlite3
from datetime import datetime, date, timedelta
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(__file__), "crownfit.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_table_columns(conn, table_name, column_defs):
    existing_columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()}
    for name, data_type, default in column_defs:
        if name not in existing_columns:
            default_clause = f" DEFAULT {default}" if default is not None else ""
            conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {name} {data_type}{default_clause}")


def ensure_user_profile_columns(conn):
    ensure_table_columns(conn, "user_profile", [
        ("tagline", "TEXT", "''"),
        ("bio", "TEXT", "''"),
        ("location", "TEXT", "''"),
        ("country", "TEXT", "'India'"),
        ("state", "TEXT", "''"),
        ("city", "TEXT", "''"),
        ("pin_code", "TEXT", "''"),
        ("latitude", "REAL", None),
        ("longitude", "REAL", None),
        ("age", "INTEGER", None),
        ("date_of_birth", "TEXT", "''"),
        ("bust_inches", "REAL", None),
        ("waist_inches", "REAL", None),
        ("hips_inches", "REAL", None),
        ("shoe_size", "TEXT", "''"),
        ("eye_color", "TEXT", "''"),
        ("hair_color", "TEXT", "''"),
        ("education_json", "TEXT", "'[]'"),
        ("languages_json", "TEXT", "'[]'"),
        ("skills_json", "TEXT", "'[]'"),
        ("achievements_json", "TEXT", "'[]'"),
        ("competition_history_json", "TEXT", "'[]'"),
        ("portfolio_photos_json", "TEXT", "'[]'"),
        ("videos_json", "TEXT", "'[]'"),
        ("certificates_json", "TEXT", "'[]'"),
        ("awards_json", "TEXT", "'[]'"),
        ("social_links_json", "TEXT", "'{}'"),
        ("resume_url", "TEXT", "''"),
        ("comp_card_json", "TEXT", "'{}'"),
        ("completion_percentage", "REAL", "0.0"),
    ])


def ensure_institute_columns(conn):
    ensure_table_columns(conn, "institutes", [
        ("country", "TEXT", "'India'"),
        ("state", "TEXT", "''"),
        ("city", "TEXT", "''"),
        ("pin_code", "TEXT", "''"),
        ("address", "TEXT", "''"),
        ("latitude", "REAL", None),
        ("longitude", "REAL", None),
        ("logo_url", "TEXT", "''"),
        ("photos_json", "TEXT", "'[]'"),
        ("website", "TEXT", "''"),
        ("instagram", "TEXT", "''"),
        ("phone", "TEXT", "''"),
        ("email", "TEXT", "''"),
        ("courses_json", "TEXT", "'[]'"),
        ("fees", "TEXT", "''"),
        ("upcoming_batches_json", "TEXT", "'[]'"),
        ("reviews_json", "TEXT", "'[]'"),
        ("rating", "REAL", "0"),
        ("description", "TEXT", "''"),
        ("booking_url", "TEXT", "''"),
        ("google_maps_url", "TEXT", "''"),
        ("status", "TEXT", "'Approved'"),
    ])


def ensure_professional_columns(conn):
    ensure_table_columns(conn, "professionals", [
        ("country", "TEXT", "'India'"),
        ("state", "TEXT", "''"),
        ("city", "TEXT", "''"),
        ("pin_code", "TEXT", "''"),
        ("address", "TEXT", "''"),
        ("latitude", "REAL", None),
        ("longitude", "REAL", None),
        ("photo_url", "TEXT", "''"),
        ("portfolio_json", "TEXT", "'[]'"),
        ("website", "TEXT", "''"),
        ("instagram", "TEXT", "''"),
        ("phone", "TEXT", "''"),
        ("email", "TEXT", "''"),
        ("bio", "TEXT", "''"),
        ("languages_json", "TEXT", "'[]'"),
        ("experience_years", "REAL", None),
        ("specialization", "TEXT", "''"),
        ("rating", "REAL", "0"),
        ("reviews_count", "INTEGER", "0"),
        ("hourly_pricing", "TEXT", "''"),
        ("fee_category", "TEXT", "''"),
        ("availability_type", "TEXT", "''"),
        ("travel_available", "INTEGER", "0"),
        ("services_json", "TEXT", "'[]'"),
        ("pricing_summary", "TEXT", "''"),
        ("booking_url", "TEXT", "''"),
        ("google_maps_url", "TEXT", "''"),
        ("status", "TEXT", "'Approved'"),
    ])


def ensure_mentor_columns(conn):
    ensure_table_columns(conn, "mentors", [
        ("country", "TEXT", "'India'"),
        ("state", "TEXT", "''"),
        ("city", "TEXT", "''"),
        ("pin_code", "TEXT", "''"),
        ("address", "TEXT", "''"),
        ("latitude", "REAL", None),
        ("longitude", "REAL", None),
        ("availability_type", "TEXT", "''"),
        ("services_json", "TEXT", "'[]'"),
        ("booking_url", "TEXT", "''"),
    ])


def get_cached_providers(city, state, country, category, search_query, ttl_hours=24):
    init_db()
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM provider_search_cache WHERE city = ? AND state = ? AND country = ? AND provider_category = ? AND search_query = ?",
            (city or '', state or '', country or '', category or '', search_query or '')
        ).fetchall()
        if not rows:
            return []
        cached_at = None
        providers = []
        for row in rows:
            row = dict(row)
            try:
                cached_at = datetime.fromisoformat(row["cached_at"])
            except Exception:
                return []
            if datetime.utcnow() - cached_at > timedelta(hours=ttl_hours):
                return []
            row["opening_hours"] = json.loads(row.get("opening_hours_json") or "{}")
            row["place_types"] = json.loads(row.get("place_types") or "[]")
            row["raw_json"] = json.loads(row.get("raw_json") or "{}")
            providers.append(row)
        return providers


def cache_provider_results(cache_entries):
    init_db()
    with get_connection() as conn:
        for entry in cache_entries:
            conn.execute(
                """
                INSERT OR REPLACE INTO provider_search_cache (
                    place_id, provider_category, search_query, city, state, country,
                    name, address, latitude, longitude, google_maps_url, phone, website,
                    opening_hours_json, rating, user_ratings_total, price_level, photo_url,
                    place_types, cached_at, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entry.get("place_id"),
                    entry.get("provider_category"),
                    entry.get("search_query"),
                    entry.get("city"),
                    entry.get("state"),
                    entry.get("country"),
                    entry.get("name"),
                    entry.get("address"),
                    entry.get("latitude"),
                    entry.get("longitude"),
                    entry.get("google_maps_url"),
                    entry.get("phone"),
                    entry.get("website"),
                    json.dumps(entry.get("opening_hours", {})),
                    entry.get("rating"),
                    entry.get("user_ratings_total"),
                    entry.get("price_level"),
                    entry.get("photo_url"),
                    json.dumps(entry.get("place_types", [])),
                    datetime.utcnow().isoformat(),
                    json.dumps(entry.get("raw_json", {})),
                )
            )
        conn.commit()


def save_provider_bookmark(user_id: int, provider: dict):
    init_db()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO saved_providers (
                user_id, place_id, provider_category, name, address, latitude, longitude,
                google_maps_url, phone, website, rating, user_ratings_total, price_level,
                photo_url, saved_at, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                provider.get("place_id"),
                provider.get("provider_category"),
                provider.get("name"),
                provider.get("address"),
                provider.get("latitude"),
                provider.get("longitude"),
                provider.get("google_maps_url"),
                provider.get("phone"),
                provider.get("website"),
                provider.get("rating"),
                provider.get("user_ratings_total"),
                provider.get("price_level"),
                provider.get("photo_url"),
                datetime.utcnow().isoformat(),
                provider.get("notes", "")
            )
        )
        conn.commit()


def remove_provider_bookmark(user_id: int, place_id: str):
    init_db()
    with get_connection() as conn:
        conn.execute("DELETE FROM saved_providers WHERE user_id = ? AND place_id = ?", (user_id, place_id))
        conn.commit()


def get_saved_providers(user_id: int = 1):
    init_db()
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM saved_providers WHERE user_id = ? ORDER BY saved_at DESC", (user_id,)).fetchall()
        return [dict(row) for row in rows]


def is_provider_bookmarked(user_id: int, place_id: str) -> bool:
    init_db()
    with get_connection() as conn:
        row = conn.execute("SELECT 1 FROM saved_providers WHERE user_id = ? AND place_id = ?", (user_id, place_id)).fetchone()
        return bool(row)


def init_db():
    # Initialize database schema. No demo pageant seeding performed here.
    with get_connection() as conn:
        conn.executescript(r"""
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            updated_at TEXT NOT NULL,
            name TEXT,
            tagline TEXT,
            bio TEXT,
            target_competition TEXT,
            location TEXT,
            country TEXT,
            state TEXT,
            city TEXT,
            age INTEGER,
            date_of_birth TEXT,
            height_cm REAL,
            weight_kg REAL,
            bust_inches REAL,
            waist_inches REAL,
            hips_inches REAL,
            shoe_size TEXT,
            eye_color TEXT,
            hair_color TEXT,
            education_json TEXT,
            languages_json TEXT,
            skills_json TEXT,
            achievements_json TEXT,
            competition_history_json TEXT,
            portfolio_photos_json TEXT,
            videos_json TEXT,
            certificates_json TEXT,
            awards_json TEXT,
            social_links_json TEXT,
            resume_url TEXT,
            comp_card_json TEXT,
            daily_water_target REAL,
            daily_sleep_target REAL,
            completion_percentage REAL DEFAULT 0.0
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            title TEXT,
            message TEXT,
            category TEXT,
            is_read INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS pageants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            organizer TEXT,
            logo_url TEXT,
            banner_url TEXT,
            registration_status TEXT,
            registration_opens TEXT,
            registration_closes TEXT,
            state_auditions_json TEXT,
            national_auditions_json TEXT,
            finale_date TEXT,
            min_height_cm REAL,
            min_age INTEGER,
            max_age INTEGER,
            country TEXT,
            state TEXT,
            city TEXT,
            official_website TEXT,
            official_application_url TEXT,
            required_documents_json TEXT,
            registration_fee TEXT,
            last_updated TEXT,
            is_verified INTEGER DEFAULT 0,
            description TEXT,
            category TEXT
        );

        CREATE TABLE IF NOT EXISTS posture_scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            posture_score REAL,
            symmetry_score REAL,
            stability_score REAL,
            shoulder_symmetry REAL,
            neck_angle REAL,
            head_tilt REAL,
            spine_alignment REAL,
            hip_alignment REAL,
            knee_locking REAL,
            body_balance REAL,
            feedback_json TEXT,
            summary TEXT
        );

        CREATE TABLE IF NOT EXISTS readiness_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            readiness_score REAL,
            weakest_area TEXT,
            strongest_area TEXT,
            predicted_readiness_date TEXT,
            trend TEXT,
            recommendations_json TEXT
        );

        CREATE TABLE IF NOT EXISTS interview_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            question TEXT,
            answer TEXT,
            communication REAL,
            confidence REAL,
            grammar REAL,
            vocabulary REAL,
            emotional_intelligence REAL,
            originality REAL,
            overall_score REAL,
            suggestions_json TEXT,
            transcript TEXT
        );

        CREATE TABLE IF NOT EXISTS voice_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            transcript TEXT,
            speaking_speed REAL,
            pause_frequency REAL,
            filler_words INTEGER,
            confidence REAL,
            clarity REAL,
            report_json TEXT
        );

        CREATE TABLE IF NOT EXISTS weekly_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            title TEXT,
            report_text TEXT,
            pdf_path TEXT
        );

        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            badge TEXT,
            description TEXT,
            unlocked INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS institutes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            name TEXT NOT NULL,
            verified INTEGER DEFAULT 0,
            country TEXT DEFAULT 'India',
            state TEXT,
            city TEXT,
            pin_code TEXT,
            address TEXT,
            latitude REAL,
            longitude REAL,
            logo_url TEXT,
            photos_json TEXT,
            website TEXT,
            instagram TEXT,
            phone TEXT,
            email TEXT,
            courses_json TEXT,
            fees TEXT,
            upcoming_batches_json TEXT,
            reviews_json TEXT,
            rating REAL DEFAULT 0,
            description TEXT,
            booking_url TEXT,
            google_maps_url TEXT,
            status TEXT DEFAULT 'Approved'
        );

        CREATE TABLE IF NOT EXISTS professionals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            name TEXT NOT NULL,
            profession_type TEXT,
            verified INTEGER DEFAULT 0,
            country TEXT DEFAULT 'India',
            state TEXT,
            city TEXT,
            pin_code TEXT,
            address TEXT,
            latitude REAL,
            longitude REAL,
            photo_url TEXT,
            portfolio_json TEXT,
            website TEXT,
            instagram TEXT,
            phone TEXT,
            email TEXT,
            bio TEXT,
            languages_json TEXT,
            experience_years REAL,
            specialization TEXT,
            rating REAL DEFAULT 0,
            reviews_count INTEGER DEFAULT 0,
            hourly_pricing TEXT,
            fee_category TEXT,
            availability_type TEXT,
            travel_available INTEGER DEFAULT 0,
            services_json TEXT,
            pricing_summary TEXT,
            booking_url TEXT,
            google_maps_url TEXT,
            status TEXT DEFAULT 'Approved'
        );

        CREATE TABLE IF NOT EXISTS provider_search_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            place_id TEXT UNIQUE,
            provider_category TEXT,
            search_query TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            name TEXT,
            address TEXT,
            latitude REAL,
            longitude REAL,
            google_maps_url TEXT,
            phone TEXT,
            website TEXT,
            opening_hours_json TEXT,
            rating REAL,
            user_ratings_total INTEGER,
            price_level INTEGER,
            photo_url TEXT,
            place_types TEXT,
            cached_at TEXT NOT NULL,
            raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS saved_providers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            place_id TEXT,
            provider_category TEXT,
            name TEXT,
            address TEXT,
            latitude REAL,
            longitude REAL,
            google_maps_url TEXT,
            phone TEXT,
            website TEXT,
            rating REAL,
            user_ratings_total INTEGER,
            price_level INTEGER,
            photo_url TEXT,
            saved_at TEXT NOT NULL,
            notes TEXT,
            UNIQUE(user_id, place_id)
        );

        CREATE TABLE IF NOT EXISTS mentors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            name TEXT NOT NULL,
            photo_url TEXT,
            bio TEXT,
            titles_won_json TEXT,
            experience_years REAL,
            languages_json TEXT,
            achievements_json TEXT,
            students_trained_count INTEGER DEFAULT 0,
            availability_json TEXT,
            hourly_pricing TEXT,
            rating REAL DEFAULT 0,
            reviews_count INTEGER DEFAULT 0,
            portfolio_json TEXT,
            instagram TEXT,
            website TEXT,
            specialty TEXT,
            availability_type TEXT,
            country TEXT DEFAULT 'India',
            state TEXT,
            city TEXT,
            pin_code TEXT,
            address TEXT,
            latitude REAL,
            longitude REAL,
            status TEXT DEFAULT 'Approved',
            booking_url TEXT,
            services_json TEXT
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            provider_type TEXT,
            provider_name TEXT,
            service_name TEXT,
            booking_date TEXT,
            time_slot TEXT,
            status TEXT DEFAULT 'Upcoming',
            price TEXT,
            notes TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT,
            category TEXT,
            event_date TEXT,
            event_time TEXT,
            description TEXT,
            location TEXT,
            is_synced INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS mood_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            mood_emoji TEXT,
            mood_score REAL,
            energy_level REAL,
            stress_level REAL,
            confidence_level REAL,
            sleep_hours REAL,
            water_intake REAL,
            workout_completed INTEGER,
            notes TEXT,
            nutrition_score REAL,
            mood_summary TEXT,
            sentiment TEXT,
            stress_indicators_json TEXT,
            motivation_level REAL,
            confidence_level_ai REAL,
            anxiety_indicators_json TEXT,
            burnout_indicators_json TEXT,
            personalized_advice TEXT
        );

        PRAGMA user_version = 1;
        """)
        ensure_user_profile_columns(conn)
        ensure_institute_columns(conn)
        ensure_professional_columns(conn)
        ensure_mentor_columns(conn)
        conn.commit()


def seed_db_data(conn):
    # No-op seeding: authoritative pageant and institute data are managed
    # by PageantDataService (JSON files). This prevents accidental
    # insertion of demo or fabricated event data into the production DB.
    return


def get_user_profile(user_id=1):
    init_db()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM user_profile WHERE id = ?", (user_id,)).fetchone()
        if not row:
            # Initialize EMPTY profile so contestants build their profile cleanly
            conn.execute("""
                INSERT INTO user_profile (
                    id, updated_at, name, tagline, bio, target_competition, location, country, state, city,
                    age, date_of_birth, height_cm, weight_kg, bust_inches, waist_inches, hips_inches,
                    shoe_size, eye_color, hair_color, education_json, languages_json, skills_json,
                    achievements_json, competition_history_json, portfolio_photos_json, videos_json,
                    certificates_json, awards_json, social_links_json, resume_url, comp_card_json,
                    daily_water_target, daily_sleep_target, completion_percentage
                ) VALUES (
                    ?, ?, '', '', '', '', '', 'India', '', '',
                    NULL, '', NULL, NULL, NULL, NULL, NULL,
                    '', '', '', '[]', '[]', '[]',
                    '[]', '[]', '[]', '[]',
                    '[]', '[]', '{}', '', '{}',
                    8.0, 8.0, 0.0
                )
            """, (user_id, datetime.now().isoformat()))
            conn.commit()
            row = conn.execute("SELECT * FROM user_profile WHERE id = ?", (user_id,)).fetchone()

        data = dict(row)
        # Parse JSON fields safely
        for k in ["education", "languages", "skills", "achievements", "competition_history",
                  "portfolio_photos", "videos", "certificates", "awards"]:
            json_key = f"{k}_json"
            if json_key in data and data[json_key]:
                try:
                    data[k] = json.loads(data[json_key])
                except Exception:
                    data[k] = []
            else:
                data[k] = []

        for dict_k in ["social_links", "comp_card"]:
            dict_json_key = f"{dict_k}_json"
            if dict_json_key in data and data[dict_json_key]:
                try:
                    data[dict_k] = json.loads(data[dict_json_key])
                except Exception:
                    data[dict_k] = {}
            else:
                data[dict_k] = {}

        # Compute dynamic Profile Completion Percentage based on completed sections
        sections = [
            bool(data.get("name")),
            bool(data.get("bio")),
            bool(data.get("target_competition")),
            bool(data.get("height_cm")),
            bool(data.get("bust_inches")),
            bool(data.get("education")),
            bool(data.get("languages")),
            bool(data.get("skills")),
            bool(data.get("achievements")),
            bool(data.get("competition_history")),
            bool(data.get("portfolio_photos")),
            bool(data.get("videos")),
            bool(data.get("certificates")),
            bool(data.get("awards")),
            bool(data.get("social_links")),
        ]
        completion_pct = round((sum(sections) / len(sections)) * 100, 1)
        data["completion_percentage"] = completion_pct
        return data


def save_user_profile(user_id=1, profile_dict=None):
    if not profile_dict:
        return
    init_db()
    with get_connection() as conn:
        conn.execute("""
            UPDATE user_profile SET
                updated_at = ?,
                name = ?,
                tagline = ?,
                bio = ?,
                target_competition = ?,
                location = ?,
                country = ?,
                state = ?,
                city = ?,
                pin_code = ?,
                latitude = ?,
                longitude = ?,
                age = ?,
                date_of_birth = ?,
                height_cm = ?,
                weight_kg = ?,
                bust_inches = ?,
                waist_inches = ?,
                hips_inches = ?,
                shoe_size = ?,
                eye_color = ?,
                hair_color = ?,
                education_json = ?,
                languages_json = ?,
                skills_json = ?,
                achievements_json = ?,
                competition_history_json = ?,
                portfolio_photos_json = ?,
                videos_json = ?,
                certificates_json = ?,
                awards_json = ?,
                social_links_json = ?,
                resume_url = ?,
                comp_card_json = ?,
                daily_water_target = ?,
                daily_sleep_target = ?,
                completion_percentage = ?
            WHERE id = ?
        """, (
            datetime.now().isoformat(),
            profile_dict.get("name", ""),
            profile_dict.get("tagline", ""),
            profile_dict.get("bio", ""),
            profile_dict.get("target_competition", ""),
            profile_dict.get("location", ""),
            profile_dict.get("country", "India"),
            profile_dict.get("state", ""),
            profile_dict.get("city", ""),
            profile_dict.get("pin_code", ""),
            profile_dict.get("latitude"),
            profile_dict.get("longitude"),
            profile_dict.get("age"),
            profile_dict.get("date_of_birth", ""),
            profile_dict.get("height_cm"),
            profile_dict.get("weight_kg"),
            profile_dict.get("bust_inches"),
            profile_dict.get("waist_inches"),
            profile_dict.get("hips_inches"),
            profile_dict.get("shoe_size", ""),
            profile_dict.get("eye_color", ""),
            profile_dict.get("hair_color", ""),
            json.dumps(profile_dict.get("education", [])),
            json.dumps(profile_dict.get("languages", [])),
            json.dumps(profile_dict.get("skills", [])),
            json.dumps(profile_dict.get("achievements", [])),
            json.dumps(profile_dict.get("competition_history", [])),
            json.dumps(profile_dict.get("portfolio_photos", [])),
            json.dumps(profile_dict.get("videos", [])),
            json.dumps(profile_dict.get("certificates", [])),
            json.dumps(profile_dict.get("awards", [])),
            json.dumps(profile_dict.get("social_links", {})),
            profile_dict.get("resume_url", ""),
            json.dumps(profile_dict.get("comp_card", {})),
            profile_dict.get("daily_water_target", 8.0),
            profile_dict.get("daily_sleep_target", 8.0),
            profile_dict.get("completion_percentage", 0.0),
            user_id
        ))
        conn.commit()


def save_posture_scan(payload):
    init_db()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO posture_scans (
                created_at, posture_score, symmetry_score, stability_score,
                shoulder_symmetry, neck_angle, head_tilt, spine_alignment,
                hip_alignment, knee_locking, body_balance, feedback_json, summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["created_at"],
                payload["posture_score"],
                payload["symmetry_score"],
                payload["stability_score"],
                payload["shoulder_symmetry"],
                payload["neck_angle"],
                payload["head_tilt"],
                payload["spine_alignment"],
                payload["hip_alignment"],
                payload["knee_locking"],
                payload["body_balance"],
                json.dumps(payload.get("feedback", [])),
                payload.get("summary", ""),
            ),
        )
        conn.commit()


def load_posture_history():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM posture_scans ORDER BY id ASC", conn)


def save_interview_attempt(payload):
    init_db()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO interview_attempts (
                created_at, question, answer, communication, confidence, grammar,
                vocabulary, emotional_intelligence, originality, overall_score,
                suggestions_json, transcript
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["created_at"],
                payload.get("question", ""),
                payload.get("answer", ""),
                payload.get("communication"),
                payload.get("confidence"),
                payload.get("grammar"),
                payload.get("vocabulary"),
                payload.get("emotional_intelligence"),
                payload.get("originality"),
                payload.get("overall_score"),
                json.dumps(payload.get("suggestions", [])),
                payload.get("transcript", ""),
            ),
        )
        conn.commit()


def load_interview_history():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM interview_attempts ORDER BY id ASC", conn)


def save_voice_report(payload):
    init_db()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO voice_reports (
                created_at, transcript, speaking_speed, pause_frequency,
                filler_words, confidence, clarity, report_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["created_at"],
                payload.get("transcript", ""),
                payload.get("speaking_speed"),
                payload.get("pause_frequency"),
                payload.get("filler_words"),
                payload.get("confidence"),
                payload.get("clarity"),
                json.dumps(payload.get("report", {})),
            ),
        )
        conn.commit()


def load_voice_history():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM voice_reports ORDER BY id ASC", conn)


def save_readiness(payload):
    init_db()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO readiness_scores (
                created_at, readiness_score, weakest_area, strongest_area,
                predicted_readiness_date, trend, recommendations_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["created_at"],
                payload.get("readiness_score"),
                payload.get("weakest_area", ""),
                payload.get("strongest_area", ""),
                payload.get("predicted_readiness_date", ""),
                payload.get("trend", ""),
                json.dumps(payload.get("recommendations", [])),
            ),
        )
        conn.commit()


def load_readiness_history():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM readiness_scores ORDER BY id ASC", conn)


def save_weekly_report(payload):
    init_db()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO weekly_reports (created_at, title, report_text, pdf_path)
            VALUES (?, ?, ?, ?)
            """,
            (
                payload["created_at"],
                payload.get("title", "Weekly AI Report"),
                payload.get("report_text", ""),
                payload.get("report_text", ""),
                payload.get("pdf_path", ""),
            ),
        )
        conn.commit()


def load_weekly_reports():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM weekly_reports ORDER BY id ASC", conn)


def unlock_achievement(badge, description):
    init_db()
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM achievements WHERE badge = ?",
            (badge,),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE achievements SET unlocked = 1, description = ?, created_at = ? WHERE badge = ?",
                (description, datetime.now().isoformat(), badge),
            )
        else:
            conn.execute(
                "INSERT INTO achievements (created_at, badge, description, unlocked) VALUES (?, ?, ?, 1)",
                (datetime.now().isoformat(), badge, description),
            )
        conn.commit()


def load_achievements():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM achievements ORDER BY id ASC", conn)


def save_mood_log(payload):
    init_db()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO mood_logs (
                created_at, mood_emoji, mood_score, energy_level, stress_level,
                confidence_level, sleep_hours, water_intake, workout_completed,
                notes, nutrition_score, mood_summary, sentiment,
                stress_indicators, motivation_level, confidence_level_ai,
                anxiety_indicators, burnout_indicators, personalized_advice
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["created_at"],
                payload.get("mood_emoji", "😊"),
                payload.get("mood_score"),
                payload.get("energy_level"),
                payload.get("stress_level"),
                payload.get("confidence_level"),
                payload.get("sleep_hours"),
                payload.get("water_intake"),
                int(bool(payload.get("workout_completed"))),
                payload.get("notes", ""),
                payload.get("nutrition_score"),
                payload.get("mood_summary", ""),
                payload.get("sentiment", ""),
                json.dumps(payload.get("stress_indicators", [])),
                payload.get("motivation_level", ""),
                payload.get("confidence_level_ai", ""),
                json.dumps(payload.get("anxiety_indicators", [])),
                json.dumps(payload.get("burnout_indicators", [])),
                payload.get("personalized_advice", ""),
            ),
        )
        conn.commit()
        return cursor.lastrowid


def load_mood_logs():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM mood_logs ORDER BY id ASC", conn)


def save_mood_journal_entry(payload):
    init_db()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO mood_journal_entries (created_at, mood_log_id, journal_text, highlights_json, monthly_summary)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                payload["created_at"],
                payload.get("mood_log_id"),
                payload.get("journal_text", ""),
                json.dumps(payload.get("highlights", [])),
                payload.get("monthly_summary", ""),
            ),
        )
        conn.commit()


def load_mood_journal_entries():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM mood_journal_entries ORDER BY id ASC", conn)


def save_mood_prediction(payload):
    init_db()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO mood_predictions (
                created_at, predicted_mood, stress_probability, motivation_score,
                confidence_score, burnout_risk, prediction_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["created_at"],
                payload.get("predicted_mood"),
                payload.get("stress_probability"),
                payload.get("motivation_score"),
                payload.get("confidence_score"),
                payload.get("burnout_risk"),
                payload.get("prediction_confidence"),
            ),
        )
        conn.commit()
        return cursor.lastrowid


def load_mood_predictions():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM mood_predictions ORDER BY id ASC", conn)


def save_wellness_score(payload):
    init_db()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO wellness_scores (created_at, wellness_score, weekly_trend, monthly_trend, explanation)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                payload["created_at"],
                payload.get("wellness_score"),
                payload.get("weekly_trend"),
                payload.get("monthly_trend"),
                payload.get("explanation", ""),
            ),
        )
        conn.commit()
        return cursor.lastrowid


def load_wellness_history():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM wellness_scores ORDER BY id ASC", conn)


def add_notification(title, message, category="AI Insight"):
    init_db()
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO notifications (created_at, title, message, category, is_read) VALUES (?, ?, ?, ?, 0)",
            (datetime.now().isoformat(), title, message, category)
        )
        conn.commit()


def load_notifications():
    init_db()
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM notifications ORDER BY id DESC LIMIT 15", conn)
