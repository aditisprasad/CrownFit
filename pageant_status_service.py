from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pageant_data_service import load_pageant_data, parse_date


class PageantStatusService:
    @staticmethod
    def determine_registration_status(pageant: Dict[str, Any]) -> Dict[str, Any]:
        """Return a normalized status object for a single pageant.

        Fields returned:
          - official_name
          - organizer
          - registration_status (Open|Closed|Awaiting Official Announcement|Upcoming)
          - registration_opens
          - registration_closes
          - official_url
          - last_updated
          - verified
        """
        today = date.today()
        name = pageant.get("name")
        organizer = pageant.get("organizer") or pageant.get("organiser") or ""
        official_url = pageant.get("official_website") or pageant.get("website") or pageant.get("official_application_url")
        last_updated = pageant.get("last_updated")
        verified = bool(pageant.get("is_verified", pageant.get("verified", False)))

        # Try registration windows first
        reg_windows = pageant.get("registration_windows") or pageant.get("registration_windows_raw") or []
        opens = None
        closes = None
        if reg_windows:
            # pick the earliest start and latest end
            for w in reg_windows:
                s = parse_date(w.get("start_date") if isinstance(w.get("start_date"), str) else w.get("opens"))
                e = parse_date(w.get("end_date") if isinstance(w.get("end_date"), str) else w.get("closes"))
                if s and (opens is None or s < opens):
                    opens = s
                if e and (closes is None or e > closes):
                    closes = e

        # Fallback to single fields
        if not opens and pageant.get("registration_opens"):
            opens = parse_date(pageant.get("registration_opens"))
        if not closes and pageant.get("registration_closes"):
            closes = parse_date(pageant.get("registration_closes"))

        status = "Awaiting Official Announcement"
        if opens and closes:
            if opens <= today <= closes:
                status = "Open"
            elif today < opens:
                status = "Upcoming"
            else:
                status = "Closed"
        elif opens and not closes:
            # If only opens is known
            if today >= opens:
                status = "Open"
            else:
                status = "Upcoming"
        elif closes and not opens:
            # Only close known — be conservative: if today <= closes treat as Awaiting/Unknown
            if today <= closes:
                status = "Awaiting Official Announcement"
            else:
                status = "Closed"
        else:
            status = "Awaiting Official Announcement"

        return {
            "official_name": name,
            "organizer": organizer,
            "registration_status": status,
            "registration_opens": opens.isoformat() if opens else None,
            "registration_closes": closes.isoformat() if closes else None,
            "official_url": official_url,
            "last_updated": last_updated,
            "verified": verified,
        }

    @staticmethod
    def get_status_snapshot(source_path: Optional[str] = None) -> Dict[str, Any]:
        pageants = load_pageant_data(source_path)
        statuses = []
        for p in pageants:
            statuses.append(PageantStatusService.determine_registration_status(p))
        return {
            "pageants": pageants,
            "statuses": statuses,
            "last_updated": datetime.utcnow().isoformat(),
        }
