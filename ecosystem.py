"""
ecosystem.py
────────────
CrownFit AI Pageant Ecosystem Module
Features Discover Pageants, Smart Roadmap, Modelling Institutes, Mentor Connect,
Community Social Feed, Opportunity Hub, AI Eligibility Checker, Scikit-Learn Pageant Niche Matcher,
Deadline Tracker, Document Vault, Portfolio Builder, Advanced Interview Simulator, Wardrobe Planner,
Networking Circles, Event Calendar, Marketplace, Achievement Wall, and Future Integration Architecture.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------
# 1. DISCOVER PAGEANTS DATA & HELPERS
# ---------------------------------------------------------
def get_discover_pageants() -> List[Dict[str, Any]]:
    """Load discover pageants from the authoritative JSON data source.

    Falls back to an empty list if no data present. This prevents any hardcoded
    pageant names or fabricated deadlines in the UI.
    """
    try:
        from pageant_data_service import load_pageant_data, get_upcoming_pageants
        pageants = load_pageant_data()
        upcoming = get_upcoming_pageants(pageants)
        results = []
        for p in upcoming:
            results.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "category": p.get("category", ""),
                "location": ", ".join(filter(None, [p.get("city"), p.get("state")])) or p.get("country"),
                "eligibility_age": f"{p.get('min_age', '')} – {p.get('max_age', '')} years" if p.get('min_age') else "",
                "min_height": f"{p.get('min_height_cm', '')} cm" if p.get('min_height_cm') else "",
                "deadline_date": p.get("registration_closes") or p.get("finale_date") or None,
                "fee": p.get("registration_fee") or "",
                "website": p.get("official_website") or p.get("official_application_url"),
                "readiness_match": p.get("readiness_match", 0),
                "recommended": p.get("is_verified", False),
                "banner_icon": p.get("logo_emoji", ""),
                "description": p.get("description", ""),
            })
        return results
    except Exception:
        return []

# ---------------------------------------------------------
# 2. SMART PAGEANT PREPARATION ROADMAP
# ---------------------------------------------------------
def get_smart_preparation_roadmap(pageant_name: str) -> Dict[str, Any]:
    return {
        "pageant_name": pageant_name,
        "days_remaining": 120,
        "progress_percentage": 68,
        "weeks": [
            {
                "week_number": 1,
                "title": "Week 1: Physical Foundation & Wellness",
                "items": ["✔ Diaphragm Core Fitness", "✔ High-Hydration Nutrition Plan", "✔ Barrier Repair Skincare Routine"]
            },
            {
                "week_number": 2,
                "title": "Week 2: Ramp Walk & Speech Framing",
                "items": ["✔ 180° Posture Stance Rehearsal", "✔ Miss India Q&A Opening Statements", "✔ Global Current Affairs Review"]
            },
            {
                "week_number": 3,
                "title": "Week 3: Voice Modulation & Stage Presence",
                "items": ["✔ Pitch Stability Drills", "✔ Diaphragm Projection & Pause Control", "✔ Mirror Smile Expressions"]
            },
            {
                "week_number": 4,
                "title": "Week 4: Mock Jury & Digital Portfolio",
                "items": ["✔ Live Simulated Jury Panel Q&A", "✔ High-Fashion Digital Comp Card Shoot", "✔ Final Wardrobe Fitting"]
            }
        ],
        "daily_checklist": [
            {"task": "15-Minute Standing Wall Posture Drill", "done": True},
            {"task": "3-Minute Mirror Smile & Eye Contact Exercise", "done": True},
            {"task": "Drink 3 Liters of Water", "done": True},
            {"task": "Record 2-Minute Speech Answer on Voice Analyzer", "done": False},
            {"task": "Read Daily Global Current Affairs Briefing", "done": False}
        ],
        "ai_recommendation": "Focus on Week 3 voice projection. Your posture readiness is elite at 86/100, but expanding vocabulary phrasing will push your readiness to 95%."
    }

# ---------------------------------------------------------
# 3. MODELLING INSTITUTES MARKETPLACE
# ---------------------------------------------------------
def get_modelling_institutes() -> List[Dict[str, Any]]:
    return [
        {
            "name": "Tiara Pageant & Runway Academy",
            "rating": 4.9,
            "location": "Pune & Mumbai",
            "fees": "₹45,000",
            "courses": ["Ramp Walk Mastery", "Pageant Q&A Grooming", "Camera Confidence"],
            "mentors": "Ritika Ramtri, Fashion Choreographers",
            "website": "https://thetiara.net",
            "available_seats": 6,
            "specialization": "Runway Coaching & Pageant Mentorship",
            "icon": "👠"
        },
        {
            "name": "Cocoaberry Talent & Pageant Training",
            "rating": 4.8,
            "location": "Mumbai, Maharashtra",
            "fees": "₹60,000",
            "courses": ["Runway Stance", "Public Speaking", "Personality Development"],
            "mentors": "Alesia Raut, Anjali Raut",
            "website": "https://cocoaberry.in",
            "available_seats": 4,
            "specialization": "High Fashion Choreography & Personality Development",
            "icon": "👑"
        },
        {
            "name": "Pageant Grooming School of India",
            "rating": 4.7,
            "location": "New Delhi",
            "fees": "₹38,000",
            "courses": ["Interview Framing", "Evening Gown Grace", "Photoshoot Posing"],
            "mentors": "Lt. Dr. Rita Gangwani",
            "website": "https://pageantgrooming.com",
            "available_seats": 8,
            "specialization": "Public Speaking & Image Consulting",
            "icon": "✨"
        }
    ]

# ---------------------------------------------------------
# 4. MENTOR CONNECT MARKETPLACE
# ---------------------------------------------------------
def get_mentors() -> List[Dict[str, Any]]:
    return [
        {
            "name": "Alesia Raut",
            "role": "Supermodel & Official Fashion Choreographer",
            "experience": "18+ Years",
            "rating": 4.95,
            "languages": "English, Hindi",
            "availability": "Available Next Tuesday",
            "specialty": "Ramp Walk & Stage Presence",
            "avatar_icon": "👠"
        },
        {
            "name": "Dr. Rashmi Shetty",
            "role": "Celebrity Dermatologist & Skincare Coach",
            "experience": "15+ Years",
            "rating": 4.90,
            "languages": "English, Hindi, Kannada",
            "availability": "Available Tomorrow",
            "specialty": "Skin Radiance & HD Camera Prep",
            "avatar_icon": "✨"
        },
        {
            "name": "Lt. Dr. Rita Gangwani",
            "role": "Pageant Jury & Voice Modulation Master",
            "experience": "20+ Years",
            "rating": 4.98,
            "languages": "English, Hindi",
            "availability": "Available Friday",
            "specialty": "Q&A Framing & Soft Skills",
            "avatar_icon": "👑"
        },
        {
            "name": "Pooja Makhija",
            "role": "Celebrity Nutritionist & Wellness Coach",
            "experience": "14+ Years",
            "rating": 4.88,
            "languages": "English, Hindi",
            "availability": "Available Thursday",
            "specialty": "Competition Nutrition & Energy Retention",
            "avatar_icon": "🥗"
        }
    ]

# ---------------------------------------------------------
# 5. COMMUNITY SOCIAL FEED & POSTS
# ---------------------------------------------------------
def get_community_posts() -> List[Dict[str, Any]]:
    return [
        {
            "author": "Sophia Roy",
            "role": "Miss India Contender",
            "time": "2 hours ago",
            "content": "Just completed my 14-day CrownFit Posture Challenge! My shoulder symmetry score improved from 72 to 88 according to OpenCV landmarks. Keep pushing, queens! 👑",
            "likes": 42,
            "comments": 9,
            "badge": "Perfect Posture 🧍",
            "icon": "👑"
        },
        {
            "author": "Priya Sharma",
            "role": "Model & Finalist",
            "time": "5 hours ago",
            "content": "Aced my mock interview prompt on climate leadership using the STAR format structure! CrownFit's voice analyzer recorded 92% pitch stability today.",
            "likes": 65,
            "comments": 14,
            "badge": "Voice Master 🎤",
            "icon": "✨"
        }
    ]

# ---------------------------------------------------------
# 6. OPPORTUNITY HUB (Casting Calls & Brand Deals)
# ---------------------------------------------------------
def get_opportunity_hub() -> List[Dict[str, Any]]:
    return [
        {
            "title": "Nykaa Luxury Cosmetics Campaign",
            "type": "Brand Collaboration",
            "payout": "₹50,000 / Shoot",
            "location": "Mumbai",
            "requirements": "Strong facial symmetry, expressive smile, clear skin.",
            "deadline": "3 Days Left",
            "icon": "💄"
        },
        {
            "title": "Bombay Times Fashion Week Casting",
            "type": "Fashion Week Runway",
            "payout": "₹35,000 / Walk",
            "location": "Mumbai",
            "requirements": "Height 5'8\"+, confident catwalk stride.",
            "deadline": "7 Days Left",
            "icon": "👠"
        },
        {
            "title": "Vogue India Digital Cover Search",
            "type": "Magazine Shoot",
            "payout": "Feature Cover + ₹1,00,000",
            "location": "New Delhi",
            "requirements": "Unique editorial features, high camera presence.",
            "deadline": "10 Days Left",
            "icon": "📸"
        }
    ]

# ---------------------------------------------------------
# 7. AI ELIGIBILITY CHECKER
# ---------------------------------------------------------
def ai_eligibility_check(age: int, height_cm: float, country: str, education: str, experience: str) -> Dict[str, Any]:
    """Compute eligibility against verified pageants loaded from the data service.

    This avoids returning any hardcoded pageant names or fabricated guidance.
    """
    eligible = []
    nearly_eligible = []
    missing_reqs = []
    try:
        from pageant_data_service import load_pageant_data
        pageants = load_pageant_data()
        for p in pageants:
            min_age = p.get("min_age")
            max_age = p.get("max_age")
            min_height = p.get("min_height_cm")
            name = p.get("name")
            if min_age and max_age and min_height:
                if min_age <= age <= max_age and height_cm >= min_height:
                    eligible.append(name)
                else:
                    # record near-eligibility if within 2 years or 5 cm
                    if (min_age and abs(age - min_age) <= 2) or (min_height and abs(height_cm - min_height) <= 5):
                        nearly_eligible.append(name)
                    if min_height and height_cm < min_height:
                        missing_reqs.append(f"{name} requires minimum height of {min_height} cm.")
        # Always provide neutral suggestions
        suggestions = [
            "Follow posture micro-exercises to improve measured posture and poise.",
            "Prepare a digital comp card with high-resolution headshots and full-body shots.",
            "Practice STAR-format answers for interview readiness."
        ]
        return {
            "eligible_pageants": eligible,
            "nearly_eligible": nearly_eligible,
            "missing_reqs": missing_reqs,
            "qualification_suggestions": suggestions
        }
    except Exception:
        return {
            "eligible_pageants": [],
            "nearly_eligible": [],
            "missing_reqs": [],
            "qualification_suggestions": [
                "Complete your contestant profile and check the Verified Pageant Discovery portal for official requirements."
            ]
        }

# ---------------------------------------------------------
# 8. SCIKIT-LEARN PAGEANT NICHE MATCHING MODEL
# ---------------------------------------------------------
class CrownFitNicheMatcherML:
    """Scikit-Learn Random Forest Classifier to match contender profile to optimal modelling niche."""
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.niches = ["High Fashion Runway", "Commercial & Print", "Fitness & Athletic", "Beauty & Luxury Cosmetics", "Editorial Vogue"]
        self._fit_synthetic_model()

    def _fit_synthetic_model(self):
        np.random.seed(42)
        # Features: Height (cm), Confidence (1-10), Posture (1-100), Smile (1-100), Body Fitness (1-10)
        X_train = np.array([
            [178, 9.0, 92, 85, 9.0], # Fashion
            [165, 8.5, 80, 95, 8.0], # Commercial
            [170, 9.5, 88, 80, 9.5], # Fitness
            [163, 8.0, 85, 98, 7.5], # Beauty
            [176, 9.2, 94, 82, 8.5], # Editorial
            [180, 9.5, 95, 80, 8.8], # Fashion
            [162, 7.8, 78, 92, 7.0], # Commercial
            [168, 8.8, 86, 90, 9.2]  # Fitness
        ])
        y_train = np.array([0, 1, 2, 3, 4, 0, 1, 2])
        
        X_scaled = self.scaler.fit_transform(X_train)
        self.model.fit(X_scaled, y_train)

    def predict_niche(self, height_cm: float, confidence: float, posture_score: float, smile_score: float, fitness_level: float) -> Dict[str, Any]:
        sample = np.array([[height_cm, confidence, posture_score, smile_score, fitness_level]])
        sample_scaled = self.scaler.transform(sample)
        
        pred_idx = self.model.predict(sample_scaled)[0]
        probs = self.model.predict_proba(sample_scaled)[0]
        
        best_niche = self.niches[pred_idx]
        confidence_pct = round(float(np.max(probs)) * 100, 1)
        
        niche_scores = {self.niches[i]: round(float(probs[i]) * 100, 1) for i in range(len(self.niches))}
        
        return {
            "best_niche": best_niche,
            "match_confidence": confidence_pct,
            "niche_scores": niche_scores,
            "ml_explanation": f"Based on your height of {height_cm} cm and posture symmetry of {posture_score:.0f}/100, Scikit-Learn classifies your highest market value in {best_niche}."
        }

# ---------------------------------------------------------
# 9. DEADLINE TRACKER & DOCUMENT VAULT HELPERS
# ---------------------------------------------------------
def get_deadline_tracker() -> List[Dict[str, Any]]:
    now = datetime.now()
    return [
        {"item": "Miss India Audition Registration", "type": "Application", "date": (now + timedelta(days=12)).strftime("%Y-%m-%d"), "status": "Pending", "days_left": 12},
        {"item": "High-Res Comp Card Portfolio Submission", "type": "Document", "date": (now + timedelta(days=5)).strftime("%Y-%m-%d"), "status": "Urgent", "days_left": 5},
        {"item": "National Finale Travel & Hotel Booking", "type": "Travel", "date": (now + timedelta(days=30)).strftime("%Y-%m-%d"), "status": "Upcoming", "days_left": 30},
        {"item": "Dermatology Skin Barrier Checkup", "type": "Fitness/Health", "date": (now + timedelta(days=8)).strftime("%Y-%m-%d"), "status": "Scheduled", "days_left": 8}
    ]

def get_document_vault() -> List[Dict[str, Any]]:
    return [
        {"name": "Official Passport Copy.pdf", "category": "Identity", "uploaded_date": "2026-07-15", "size": "1.2 MB", "verified": True},
        {"name": "High-Res Digital Comp Card.pdf", "category": "Portfolio", "uploaded_date": "2026-08-01", "size": "3.8 MB", "verified": True},
        {"name": "Miss India Audition Headshots.zip", "category": "Headshots", "uploaded_date": "2026-08-03", "size": "14.5 MB", "verified": True},
        {"name": "Fitness & Medical Clearance.pdf", "category": "Health", "uploaded_date": "2026-07-28", "size": "850 KB", "verified": True}
    ]

# ---------------------------------------------------------
# 10. WARDROBE PLANNER & MARKETPLACE HELPERS
# ---------------------------------------------------------
def get_wardrobe_planner() -> Dict[str, Any]:
    return {
        "categories": {
            "Ramp Walk & Audition Outfit": ["Classic Black Bodycon Dress", "Nude Runway Stiletto Heels (4 inch)"],
            "Cocktail & Jury Interview": ["Emerald Satin Wrap Gown", "Rose Gold Diamond Drop Earrings"],
            "National Finale Evening Gown": ["Custom Sequin Magenta Train Gown", "Crystal Crown Heels"],
            "Casual Athletic Workout": ["High-Waist Compression Leggings", "Breathable Mesh Runner Sneakers"]
        },
        "ai_outfit_recommendation": "For your upcoming Miss India Jury Interview, select the Emerald Satin Wrap Gown with 4-inch Nude Stilettos to accentuate neck posture and crown poise."
    }

def get_marketplace_products() -> List[Dict[str, Any]]:
    return [
        {"title": "Pro Runway Stiletto Heels (4.5 in)", "category": "Footwear", "price": "₹4,999", "rating": 4.9, "icon": "👠"},
        {"title": "HD Stage Makeup Contour & Highlight Palette", "category": "Makeup", "price": "₹2,850", "rating": 4.8, "icon": "💄"},
        {"title": "Crown Fit Diaphragm Breath Trainer", "category": "Voice & Fitness", "price": "₹1,499", "rating": 4.95, "icon": "🎤"},
        {"title": "The Art of Pageant Q&A Masterclass Book", "category": "Books & Courses", "price": "₹999", "rating": 4.90, "icon": "📚"}
    ]

# ---------------------------------------------------------
# 11. FUTURE ARCHITECTURE ROADMAP
# ---------------------------------------------------------
def get_future_architecture_roadmap() -> List[Dict[str, Any]]:
    return [
        {"category": "Payment Gateways", "integrations": "Stripe, Razorpay", "status": "Ready for API Keys", "purpose": "Institute bookings & mentor session payments."},
        {"category": "Video Calls", "integrations": "Zoom SDK, Google Meet API", "status": "Architecture Designed", "purpose": "Live 1-on-1 virtual pageant coaching."},
        {"category": "Calendar Sync", "integrations": "Google Calendar, Apple iCal", "status": "Architecture Designed", "purpose": "Automated pageant audition & workout sync."},
        {"category": "Health Sensors", "integrations": "Apple HealthKit, Google Fit, Oura API", "status": "Data Schema Ready", "purpose": "Biometric sleep & HRV stress import."},
        {"category": "Notifications & Social", "integrations": "WhatsApp Business API, Firebase Push, Instagram Graph", "status": "Architecture Designed", "purpose": "Daily mission alerts & social portfolio sync."}
    ]
