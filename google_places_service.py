import json
import os
import requests
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
GOOGLE_PLACES_BASE_URL = "https://maps.googleapis.com/maps/api/place"
GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

SUPPORTED_PROVIDER_CATEGORIES = {
    "Modelling Institutes": ["beauty_salon", "point_of_interest", "school"],
    "Runway Coaches": ["beauty_salon", "point_of_interest"],
    "Pageant Coaches": ["point_of_interest", "beauty_salon"],
    "Image Consultants": ["beauty_salon"],
    "Public Speaking Coaches": ["point_of_interest"],
    "Fashion Designers": ["store", "clothing_store"],
    "Boutique Designers": ["clothing_store", "store"],
    "Evening Gown Designers": ["clothing_store", "store"],
    "National Costume Designers": ["clothing_store", "store"],
    "Makeup Artists": ["beauty_salon"],
    "Hair Stylists": ["beauty_salon"],
    "Portfolio Photographers": ["photographer", "point_of_interest"],
    "Fashion Photographers": ["photographer", "point_of_interest"],
    "Fitness Coaches": ["gym", "health"],
    "Nutritionists": ["doctor", "health"]
}

GENERIC_PLACE_TYPES = ["beauty_salon", "health", "store", "point_of_interest", "gym"]

CITY_AUTOCOMPLETE_URL = f"{GOOGLE_PLACES_BASE_URL}/autocomplete/json"
PLACE_SEARCH_URL = f"{GOOGLE_PLACES_BASE_URL}/textsearch/json"
PLACE_DETAILS_URL = f"{GOOGLE_PLACES_BASE_URL}/details/json"
PLACE_PHOTO_URL = f"{GOOGLE_PLACES_BASE_URL}/photo"


class GooglePlacesService:
    @staticmethod
    def is_configured() -> bool:
        return bool(GOOGLE_PLACES_API_KEY)

    @staticmethod
    def build_place_photo_url(photo_reference: str, max_width: int = 600) -> str:
        return f"{PLACE_PHOTO_URL}?maxwidth={max_width}&photoreference={photo_reference}&key={GOOGLE_PLACES_API_KEY}"

    @staticmethod
    def build_maps_url(place_id: str) -> str:
        return f"https://www.google.com/maps/search/?api=1&query=Google&query_place_id={place_id}"

    @staticmethod
    def search_places(query: str, location: Optional[str] = None, radius: int = 25000, open_now: bool = False, page_token: Optional[str] = None) -> Dict[str, Any]:
        params = {
            "key": GOOGLE_PLACES_API_KEY,
            "query": query,
            "radius": radius,
            "language": "en",
            "type": "establishment"
        }
        if location:
            params["query"] = f"{query} in {location}"
        if open_now:
            params["opennow"] = "true"
        if page_token:
            params["pagetoken"] = page_token

        response = requests.get(PLACE_SEARCH_URL, params=params, timeout=20)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def reverse_geocode(latitude: float, longitude: float) -> Dict[str, Any]:
        params = {
            "key": GOOGLE_PLACES_API_KEY,
            "latlng": f"{latitude},{longitude}",
            "language": "en"
        }
        response = requests.get(GOOGLE_GEOCODE_URL, params=params, timeout=20)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def geocode_location(address: str) -> Optional[Dict[str, float]]:
        if not address:
            return None
        params = {
            "key": GOOGLE_PLACES_API_KEY,
            "address": address,
            "language": "en"
        }
        response = requests.get(GOOGLE_GEOCODE_URL, params=params, timeout=20)
        response.raise_for_status()
        data = response.json()
        if data.get("status") != "OK" or not data.get("results"):
            return None
        location = data["results"][0].get("geometry", {}).get("location")
        if not location:
            return None
        return {"lat": location.get("lat"), "lng": location.get("lng")}

    @staticmethod
    def get_place_details(place_id: str) -> Dict[str, Any]:
        params = {
            "key": GOOGLE_PLACES_API_KEY,
            "place_id": place_id,
            "fields": ",".join([
                "place_id",
                "name",
                "formatted_address",
                "formatted_phone_number",
                "international_phone_number",
                "website",
                "geometry",
                "opening_hours",
                "rating",
                "user_ratings_total",
                "price_level",
                "photos",
                "types"
            ])
        }
        response = requests.get(PLACE_DETAILS_URL, params=params, timeout=20)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def normalize_place_result(result: Dict[str, Any], provider_category: str, search_query: str, city: str, state: str, country: str) -> Dict[str, Any]:
        location = result.get("geometry", {}).get("location", {})
        photos = result.get("photos") or []
        photo_url = ""
        if photos:
            photo_url = GooglePlacesService.build_place_photo_url(photos[0].get("photo_reference", ""))

        url = GooglePlacesService.build_maps_url(result.get("place_id", ""))
        address = result.get("formatted_address") or result.get("vicinity") or ""
        return {
            "place_id": result.get("place_id"),
            "provider_category": provider_category,
            "search_query": search_query,
            "city": city,
            "state": state,
            "country": country,
            "name": result.get("name"),
            "category": provider_category,
            "address": address,
            "latitude": location.get("lat"),
            "longitude": location.get("lng"),
            "google_maps_url": url,
            "phone": result.get("formatted_phone_number") or result.get("international_phone_number") or "",
            "website": result.get("website", ""),
            "opening_hours": result.get("opening_hours", {}),
            "rating": result.get("rating"),
            "user_ratings_total": result.get("user_ratings_total"),
            "price_level": result.get("price_level"),
            "photo_url": photo_url,
            "place_types": result.get("types", []),
            "verified_badge": True,
            "raw_json": result
        }

    @staticmethod
    def search_verified_providers(
        provider_category: str,
        city: str,
        state: str,
        country: str = "India",
        open_now: bool = False,
        radius_meters: int = 25000,
        search_text: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if not GooglePlacesService.is_configured():
            return []

        search_query = search_text or provider_category
        location_text = f"{city}, {state}, {country}" if state else f"{city}, {country}"
        geocoded = GooglePlacesService.geocode_location(location_text)
        location = None
        if geocoded:
            location = f"{geocoded['lat']},{geocoded['lng']}"

        results: List[Dict[str, Any]] = []
        next_page_token = None
        attempts = 0

        while attempts < 3:
            response = GooglePlacesService.search_places(
                search_query,
                location=location,
                radius=radius_meters,
                open_now=open_now,
                page_token=next_page_token
            )
            for result in response.get("results", []):
                normalized = GooglePlacesService.normalize_place_result(result, provider_category, search_query, city, state, country)
                if geocoded and normalized.get("latitude") is not None and normalized.get("longitude") is not None:
                    normalized["distance_km"] = GooglePlacesService.compute_distance_km(
                        geocoded["lat"], geocoded["lng"], normalized["latitude"], normalized["longitude"]
                    )
                results.append(normalized)
            next_page_token = response.get("next_page_token")
            if not next_page_token:
                break
            attempts += 1
            time.sleep(2)

        if not results and radius_meters < 100000:
            radius_meters = min(100000, radius_meters * 2)
            return GooglePlacesService.search_verified_providers(
                provider_category,
                city,
                state,
                country,
                open_now,
                radius_meters,
                search_text
            )

        return results

    @staticmethod
    def compute_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        from math import radians, cos, sin, asin, sqrt
        if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
            return 0.0
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
        c = 2 * asin(sqrt(a))
        return round(6371.0 * c, 2)
