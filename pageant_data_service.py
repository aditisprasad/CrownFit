import json
import html
import os
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_PATH = Path(__file__).resolve().parent / "data" / "pageants.json"


def clean_text(raw_text: Optional[str]) -> str:
    if not raw_text:
        return ""
    text = html.unescape(str(raw_text))
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def load_pageant_data(source_path: Optional[str] = None) -> List[Dict[str, Any]]:
    path = Path(source_path) if source_path else DATA_PATH
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        pageants = json.load(f)
    for pageant in pageants:
        pageant["description"] = clean_text(pageant.get("description"))
        pageant["eligibility_summary"] = clean_text(pageant.get("eligibility_summary"))
        pageant["organizer"] = clean_text(pageant.get("organizer"))
        pageant["name"] = clean_text(pageant.get("name"))
        pageant["registration_fee"] = clean_text(pageant.get("registration_fee"))
        for announcement in pageant.get("announcements", []):
            announcement["body"] = clean_text(announcement.get("body"))
        for deadline in pageant.get("deadlines", []):
            deadline["description"] = clean_text(deadline.get("description"))
    return pageants


def save_pageant_data(pageants: List[Dict[str, Any]], source_path: Optional[str] = None) -> None:
    path = Path(source_path) if source_path else DATA_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(pageants, f, indent=2, ensure_ascii=False)


def next_item_id(items: List[Dict[str, Any]]) -> int:
    if not items:
        return 1
    return max(item.get("id", 0) for item in items) + 1


def parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return None


def get_upcoming_pageants(pageants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    today = date.today()
    upcoming = []
    for entry in pageants:
        event_date = parse_date(entry.get("event_date"))
        if event_date and event_date >= today:
            entry_copy = entry.copy()
            entry_copy["event_date"] = event_date.isoformat()
            entry_copy["days_until_event"] = (event_date - today).days
            upcoming.append(entry_copy)
    return sorted(upcoming, key=lambda p: parse_date(p["event_date"]))


def get_next_upcoming_pageant(pageants: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    upcoming = get_upcoming_pageants(pageants)
    return upcoming[0] if upcoming else None


def get_pageant_countdown(pageant: Dict[str, Any]) -> Dict[str, Any]:
    event_date = parse_date(pageant.get("event_date"))
    if not event_date:
        return {"days_remaining": None, "event_date": None}
    today = date.today()
    return {
        "event_date": event_date.isoformat(),
        "days_remaining": max(0, (event_date - today).days)
    }


def get_announcement_feed(pageants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    items = []
    for pageant in pageants:
        for announcement in pageant.get("announcements", []):
            item = announcement.copy()
            item["pageant_name"] = pageant.get("name")
            items.append(item)
    return sorted(items, key=lambda a: parse_date(a.get("published_at")) or date.min, reverse=True)


def get_deadline_list(pageants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    items = []
    for pageant in pageants:
        for deadline in pageant.get("deadlines", []):
            deadline_date = parse_date(deadline.get("deadline_date"))
            if not deadline_date:
                continue
            items.append({
                "pageant_name": pageant.get("name"),
                "label": deadline.get("label"),
                "deadline_date": deadline_date.isoformat(),
                "days_remaining": max(0, (deadline_date - date.today()).days),
                "description": deadline.get("description"),
            })
    return sorted(items, key=lambda d: d["deadline_date"])


def get_audition_list(pageants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    items = []
    for pageant in pageants:
        for audition in pageant.get("auditions", []):
            audition_date = parse_date(audition.get("audition_date"))
            if not audition_date:
                continue
            items.append({
                "pageant_name": pageant.get("name"),
                "title": audition.get("title"),
                "venue": audition.get("venue"),
                "audition_date": audition_date.isoformat(),
                "application_deadline": audition.get("application_deadline"),
                "days_until_audition": max(0, (audition_date - date.today()).days),
                "status": audition.get("status", "Open"),
            })
    return sorted(items, key=lambda a: a["audition_date"])


def get_documents_for_pageant(pageant: Dict[str, Any]) -> List[Dict[str, Any]]:
    return pageant.get("documents", [])


def add_pageant(pageant: Dict[str, Any], source_path: Optional[str] = None) -> Dict[str, Any]:
    pageants = load_pageant_data(source_path)
    pageant_id = next_item_id(pageants)
    pageant["id"] = pageant_id
    pageants.append(pageant)
    save_pageant_data(pageants, source_path)
    return pageant


def add_audition(pageant_id: int, audition: Dict[str, Any], source_path: Optional[str] = None) -> Dict[str, Any]:
    pageants = load_pageant_data(source_path)
    for pageant in pageants:
        if pageant.get("id") == pageant_id:
            auditions = pageant.setdefault("auditions", [])
            audition_id = next_item_id(auditions)
            audition["id"] = audition_id
            auditions.append(audition)
            save_pageant_data(pageants, source_path)
            return audition
    raise ValueError("Pageant not found")


def add_deadline(pageant_id: int, deadline: Dict[str, Any], source_path: Optional[str] = None) -> Dict[str, Any]:
    pageants = load_pageant_data(source_path)
    for pageant in pageants:
        if pageant.get("id") == pageant_id:
            deadlines = pageant.setdefault("deadlines", [])
            deadline_id = next_item_id(deadlines)
            deadline["id"] = deadline_id
            deadlines.append(deadline)
            save_pageant_data(pageants, source_path)
            return deadline
    raise ValueError("Pageant not found")


def add_announcement(pageant_id: int, announcement: Dict[str, Any], source_path: Optional[str] = None) -> Dict[str, Any]:
    pageants = load_pageant_data(source_path)
    for pageant in pageants:
        if pageant.get("id") == pageant_id:
            announcements = pageant.setdefault("announcements", [])
            announcement_id = next_item_id(announcements)
            announcement["id"] = announcement_id
            announcements.append(announcement)
            save_pageant_data(pageants, source_path)
            return announcement
    raise ValueError("Pageant not found")


def get_pageant_data_snapshot(source_path: Optional[str] = None) -> Dict[str, Any]:
    pageants = load_pageant_data(source_path)
    upcoming = get_upcoming_pageants(pageants)
    next_pageant = get_next_upcoming_pageant(pageants)
    return {
        "pageants": pageants,
        "upcoming_pageants": upcoming,
        "next_pageant": next_pageant,
        "next_countdown": get_pageant_countdown(next_pageant) if next_pageant else None,
        "announcements": get_announcement_feed(pageants),
        "deadlines": get_deadline_list(pageants),
        "auditions": get_audition_list(pageants),
    }
