import json
import math
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
import pandas as pd

try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    import mediapipe as mp
except ImportError:
    mp = None

try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
except ImportError:
    RandomForestRegressor = None
    SimpleImputer = None
    Pipeline = None


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_AVAILABLE = genai is not None and bool(GEMINI_API_KEY)
if GEMINI_AVAILABLE:
    genai.configure(api_key=GEMINI_API_KEY)


class MoodIntelligenceEngine:
    def __init__(self):
        self.model = None
        if GEMINI_AVAILABLE:
            try:
                self.model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception:
                self.model = None

    def _normalize_mood_df(self, mood_df: Optional[pd.DataFrame]) -> pd.DataFrame:
        if mood_df is None or mood_df.empty:
            return pd.DataFrame()

        df = mood_df.copy()
        numeric_columns = [
            "mood_score",
            "energy_level",
            "stress_level",
            "confidence_level",
            "sleep_hours",
            "water_intake",
            "workout_completed",
            "nutrition_score",
        ]
        text_to_numeric = {
            "low": 2.0,
            "moderate": 5.0,
            "medium": 5.0,
            "high": 7.0,
            "very high": 8.5,
        }

        for column in numeric_columns:
            if column not in df.columns:
                continue
            series = df[column].astype("string")
            if column == "confidence_level":
                numeric_values = pd.to_numeric(series.str.strip().str.replace(r"[^0-9.\-]", "", regex=True), errors="coerce")
                text_map = series.str.strip().str.lower().map(text_to_numeric)
                df[column] = numeric_values.fillna(text_map)
            else:
                df[column] = pd.to_numeric(series.str.strip().str.replace(r"[^0-9.\-]", "", regex=True), errors="coerce")

        return df

    def _call_gemini(self, prompt: str) -> Optional[str]:
        if not self.model:
            return None
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception:
            return None

    def analyze_mood_entry(self, mood_entry: Dict[str, Any]) -> Dict[str, Any]:
        prompt = (
            "You are a wellness intelligence analyst for a pageant fitness tracker. "
            "Analyze the user's mood journal and produce valid JSON only with these keys: "
            "emotional_tone, sentiment, stress_indicators, motivation_level, confidence_assessment, anxiety_indicators, burnout_indicators, "
            "mood_summary, possible_reasons, positive_observations, areas_needing_improvement, personalized_advice. "
            "Use the supplied daily metrics and journal text to identify emotional state and actionable recommendations."
            f"\n\nMood metrics: mood_score={mood_entry.get('mood_score')}, energy_level={mood_entry.get('energy_level')}, "
            f"stress_level={mood_entry.get('stress_level')}, confidence_level={mood_entry.get('confidence_level')}, "
            f"sleep_hours={mood_entry.get('sleep_hours')}, water_intake={mood_entry.get('water_intake')}, "
            f"workout_completed={mood_entry.get('workout_completed')}, notes={mood_entry.get('notes', '')}."
        )
        ai_text = self._call_gemini(prompt)
        if ai_text:
            parsed = self._parse_ai_json(ai_text)
            if parsed:
                return parsed
        return self._fallback_mood_analysis(mood_entry)

    def _parse_ai_json(self, text: str) -> Optional[Dict[str, Any]]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        try:
            parsed = json.loads(cleaned)
        except Exception:
            try:
                start = cleaned.find("{")
                end = cleaned.rfind("}")
                if start != -1 and end != -1:
                    parsed = json.loads(cleaned[start:end + 1])
                else:
                    return None
            except Exception:
                return None

        if isinstance(parsed, dict):
            if "confidence_level" in parsed and not isinstance(parsed.get("confidence_level"), (int, float)):
                parsed["confidence_assessment"] = parsed.get("confidence_level")
                parsed["confidence_level_ai"] = parsed.get("confidence_level")
                parsed.pop("confidence_level", None)
        return parsed

    def _fallback_mood_analysis(self, mood_entry: Dict[str, Any]) -> Dict[str, Any]:
        mood_score = float(mood_entry.get("mood_score", 5) or 5)
        stress = float(mood_entry.get("stress_level", 5) or 5)
        energy = float(mood_entry.get("energy_level", 5) or 5)
        confidence = float(mood_entry.get("confidence_level", 5) or 5)
        sleep = float(mood_entry.get("sleep_hours", 6) or 6)
        water = float(mood_entry.get("water_intake", 0) or 0)
        workout_completed = bool(mood_entry.get("workout_completed", False))
        notes = (mood_entry.get("notes") or "").lower()

        emotional_tone = "positive" if mood_score >= 7 else "neutral" if mood_score >= 4 else "negative"
        sentiment = "positive" if mood_score >= 7 else "neutral" if mood_score >= 4 else "negative"
        stress_indicators = []
        anxiety_indicators = []
        burnout_indicators = []
        motivation_level = "high" if energy >= 7 and mood_score >= 6 else "moderate" if energy >= 4 else "low"
        confidence_level_ai = "high" if confidence >= 7 else "moderate" if confidence >= 4 else "low"

        if stress >= 7:
            stress_indicators.append("stress is elevated and recovery time is limited")
        if sleep < 6.5:
            stress_indicators.append("poor recovery sleep is reducing emotional resilience")
        if "anxious" in notes or "worried" in notes or "overwhelmed" in notes:
            anxiety_indicators.append("journal language suggests anticipatory worry or pressure")
        if "burnout" in notes or "exhausted" in notes or "tired" in notes:
            burnout_indicators.append("fatigue language points to depleted energy reserves")
        if water < 6:
            burnout_indicators.append("hydration is below the ideal range for recovery")

        if not stress_indicators:
            stress_indicators.append("stress is stable and manageable")
        if not anxiety_indicators:
            anxiety_indicators.append("no strong anxiety markers were detected in the journal")
        if not burnout_indicators:
            burnout_indicators.append("no burnout warning markers were detected")

        reasons = []
        if sleep < 7:
            reasons.append("insufficient rest may be reducing resilience")
        if stress >= 7:
            reasons.append("high pressure is affecting emotional stability")
        if energy < 5:
            reasons.append("low energy may be slowing motivation")
        if workout_completed is False:
            reasons.append("missing movement may be preventing an energy reset")

        if not reasons:
            reasons.append("the current routine is balanced and sustainable")

        positive_obs = []
        if mood_score >= 6:
            positive_obs.append("the mood profile shows healthy optimism and forward momentum")
        if confidence >= 6:
            positive_obs.append("confidence remains stable across the day")
        if water >= 6:
            positive_obs.append("hydration is supporting better recovery and focus")

        if not positive_obs:
            positive_obs.append("no major positive signals were present, but a small habit reset could help")

        improvements = []
        if sleep < 7:
            improvements.append("increase sleep by at least 1 hour tonight")
        if stress >= 7:
            improvements.append("reduce pressure with a 3-minute breathing break and a simpler task list")
        if water < 8:
            improvements.append("increase hydration to 8 glasses to support energy and focus")
        if confidence < 6:
            improvements.append("complete one confidence-building practice exercise before the next interview session")

        if not improvements:
            improvements.append("maintain the current routine and keep tracking consistency")

        advice = self._build_advice(mood_score, stress, confidence, sleep, water, energy)
        return {
            "emotional_tone": emotional_tone,
            "sentiment": sentiment,
            "stress_indicators": stress_indicators,
            "motivation_level": motivation_level,
            "confidence_assessment": confidence_level_ai,
            "confidence_level_ai": confidence_level_ai,
            "anxiety_indicators": anxiety_indicators,
            "burnout_indicators": burnout_indicators,
            "mood_summary": (
                f"You appear {motivation_level} and {confidence_level_ai} today. "
                f"The current pattern suggests {', '.join(stress_indicators[:2])}."
            ),
            "possible_reasons": reasons,
            "positive_observations": positive_obs,
            "areas_needing_improvement": improvements,
            "personalized_advice": advice,
        }

    def _build_advice(self, mood_score, stress, confidence, sleep, water, energy) -> str:
        if stress >= 7 and sleep < 6.5:
            return "Consider reducing pressure with a short breathing cycle and increasing sleep by one hour tonight to support emotional control."
        if mood_score >= 7 and confidence >= 6:
            return "Keep your current momentum and use a short confidence routine before your next challenge to protect consistency."
        if energy < 5:
            return "Take a gentle walk, drink water, and prioritize a restorative evening to reset your energy baseline."
        return "Keep your routine simple: hydrate consistently, sleep earlier, and complete one small confidence-building action before the day ends."

    def analyze_selfie(self, image_bytes: bytes) -> Dict[str, Any]:
        try:
            if not image_bytes:
                return {
                    "emotion": "neutral",
                    "smile_intensity": 0.0,
                    "eye_openness": 0.0,
                    "head_orientation": "centered",
                    "confidence_boost": 0.0,
                }

            encoded = np.frombuffer(image_bytes, dtype=np.uint8)
            image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
            if image is None:
                return {
                    "emotion": "neutral",
                    "smile_intensity": 0.0,
                    "eye_openness": 0.0,
                    "head_orientation": "centered",
                    "confidence_boost": 0.0,
                }

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

            if len(faces) == 0:
                return {
                    "emotion": "neutral",
                    "smile_intensity": 0.0,
                    "eye_openness": 0.0,
                    "head_orientation": "centered",
                    "confidence_boost": 0.0,
                }

            x, y, w, h = faces[0]
            mouth_roi = gray[y + int(h * 0.55): y + int(h * 0.78), x + int(w * 0.20): x + int(w * 0.80)]
            eye_roi = gray[y + int(h * 0.18): y + int(h * 0.45), x + int(w * 0.12): x + int(w * 0.88)]
            mouth_width = max(1, mouth_roi.shape[1])
            mouth_height = max(1, mouth_roi.shape[0] // 3)
            eye_mean = float(eye_roi.mean()) if eye_roi.size else 128.0

            smile_intensity = round(min(1.0, max(0.0, (mouth_width / max(1, mouth_height * 2.6)) * 0.45)), 2)
            eye_openness = round(min(1.0, max(0.0, (eye_mean / 255.0) * 0.95)), 2)
            face_center = (x + w / 2) - (image.shape[1] / 2)
            head_orientation = "tilted" if abs(face_center) > image.shape[1] * 0.1 else "centered"
            if smile_intensity > 0.45 and eye_openness > 0.48:
                emotion = "positive"
            elif eye_openness < 0.35:
                emotion = "tired"
            else:
                emotion = "neutral"

            return {
                "emotion": emotion,
                "smile_intensity": smile_intensity,
                "eye_openness": eye_openness,
                "head_orientation": head_orientation,
                "confidence_boost": round(smile_intensity * 0.7 + eye_openness * 0.3, 2),
            }
        except Exception:
            return {
                "emotion": "neutral",
                "smile_intensity": 0.0,
                "eye_openness": 0.0,
                "head_orientation": "centered",
                "confidence_boost": 0.0,
            }

    def calculate_wellness_score(self, mood_entry: Dict[str, Any]) -> Dict[str, Any]:
        mood = float(mood_entry.get("mood_score", 5) or 5)
        energy = float(mood_entry.get("energy_level", 5) or 5)
        sleep = float(mood_entry.get("sleep_hours", 6) or 6)
        stress = float(mood_entry.get("stress_level", 5) or 5)
        workout = 1 if mood_entry.get("workout_completed") else 0
        water = float(mood_entry.get("water_intake", 0) or 0)
        confidence = float(mood_entry.get("confidence_level", 5) or 5)
        nutrition = min(10, max(0, float(mood_entry.get("nutrition_score", 6) or 6)))

        mood_component = (mood / 10) * 20
        energy_component = (energy / 10) * 15
        sleep_component = min(15, (sleep / 8) * 15)
        stress_component = (max(0, 10 - stress) / 10) * 15
        workout_component = workout * 10
        water_component = min(10, (water / 8) * 10)
        confidence_component = (confidence / 10) * 15
        nutrition_component = (nutrition / 10) * 15

        score = round(mood_component + energy_component + sleep_component + stress_component + workout_component + water_component + confidence_component + nutrition_component, 1)
        price = min(100, max(0, score))
        explanation = (
            f"Your wellness score is {price}/100. This combines mood stability, energy, sleep quality, hydration, confidence, and movement consistency."
        )
        return {
            "score": float(price),
            "explanation": explanation,
        }

    def build_emotional_report(
        self,
        journal_text: str,
        face_metrics: Optional[Dict[str, Any]] = None,
        mood_df: Optional[pd.DataFrame] = None,
        legacy_df: Optional[pd.DataFrame] = None,
        posture_score: Optional[float] = None,
    ) -> Dict[str, Any]:
        mood_df = self._normalize_mood_df(mood_df)
        legacy_df = legacy_df.copy() if legacy_df is not None and not legacy_df.empty else pd.DataFrame()
        face_metrics = face_metrics or {}

        history_payload = {
            "mood_score": 6,
            "energy_level": 6,
            "stress_level": 5,
            "confidence_level": 6,
            "sleep_hours": 7,
            "water_intake": 7,
            "workout_completed": True,
            "notes": journal_text or "",
            "nutrition_score": 6,
        }

        if not mood_df.empty:
            mood_df["created_at"] = pd.to_datetime(mood_df["created_at"], errors="coerce")
            mood_df = mood_df.dropna(subset=["created_at"]).sort_values("created_at")
            history_payload["mood_score"] = float(mood_df["mood_score"].mean()) if "mood_score" in mood_df.columns else 6
            history_payload["energy_level"] = float(mood_df["energy_level"].mean()) if "energy_level" in mood_df.columns else 6
            history_payload["stress_level"] = float(mood_df["stress_level"].mean()) if "stress_level" in mood_df.columns else 5
            history_payload["confidence_level"] = float(mood_df["confidence_level"].mean()) if "confidence_level" in mood_df.columns else 6
            history_payload["sleep_hours"] = float(mood_df["sleep_hours"].mean()) if "sleep_hours" in mood_df.columns else 7
            history_payload["water_intake"] = float(mood_df["water_intake"].mean()) if "water_intake" in mood_df.columns else 7
            history_payload["workout_completed"] = bool(mood_df["workout_completed"].mean() > 0.5) if "workout_completed" in mood_df.columns else True
            history_payload["notes"] = journal_text or ""

        analysis = self.analyze_mood_entry(history_payload)
        if face_metrics:
            face_confidence_boost = float(face_metrics.get("confidence_boost", 0.0))
            confidence = round(np.clip(history_payload["confidence_level"] + face_confidence_boost * 2, 1, 10), 1)
            motivation = round(np.clip(history_payload["energy_level"] + float(face_metrics.get("smile_intensity", 0.0)) * 1.5, 1, 10), 1)
            stress = round(np.clip(history_payload["stress_level"] + (1.0 - float(face_metrics.get("eye_openness", 0.0))) * 2, 1, 10), 1)
        else:
            confidence = round(history_payload["confidence_level"], 1)
            motivation = round(history_payload["energy_level"], 1)
            stress = round(history_payload["stress_level"], 1)

        if posture_score is None and not legacy_df.empty:
            posture_score = legacy_df["Score"].mean() if "Score" in legacy_df.columns else 72
        posture_score = float(posture_score or 72)
        correlations = self.calculate_correlations(mood_df, legacy_df) if not mood_df.empty and not legacy_df.empty else {"insights": ["Add a few more wellness entries to unlock richer correlations."], "pairs": []}
        predictions = self.train_prediction_model(mood_df) if not mood_df.empty else {
            "predicted_mood": 7,
            "stress_probability": 0.42,
            "motivation_score": 6,
            "confidence_score": 7,
            "burnout_risk": 0.3,
            "prediction_confidence": 0.55,
        }
        recommendations = self.generate_recommendations(history_payload, analysis)
        wellness = self.calculate_wellness_score(history_payload)

        summary_text = analysis.get("mood_summary", "Your current emotional pattern is balanced and actionable.")
        ai_insights = [
            summary_text,
            analysis.get("personalized_advice", recommendations.get("sleep_recommendation", "Keep a consistent bedtime.")),
        ]
        behavioral_patterns = [
            f"Workout consistency looks {'strong' if history_payload['workout_completed'] else 'light'} for this week's rhythm.",
            f"Hydration is currently trending around {history_payload['water_intake']} glasses.",
            f"Average sleep in your recent history is {history_payload['sleep_hours']:.1f} hours.",
        ]
        if face_metrics:
            behavioral_patterns.append(
                f"Facial signal indicates {face_metrics.get('emotion', 'neutral')} expression with smile intensity {face_metrics.get('smile_intensity', 0.0)} and eye openness {face_metrics.get('eye_openness', 0.0)}."
            )

        return {
            "overall_mood": analysis.get("sentiment", "neutral").capitalize(),
            "confidence": round(confidence, 1),
            "motivation": round(motivation, 1),
            "stress": round(stress, 1),
            "emotional_summary": summary_text,
            "ai_insights": ai_insights,
            "behavioral_patterns": behavioral_patterns,
            "recommendations": recommendations,
            "tomorrow_prediction": predictions,
            "burnout_risk": predictions.get("burnout_risk", 0.3),
            "wellness_score": wellness.get("score", 0.0),
            "wellness_explanation": wellness.get("explanation", ""),
            "facial_metrics": face_metrics,
            "correlation_insights": correlations.get("insights", []),
            "posture_score": round(posture_score, 1),
            "trend_data": self.compute_mood_trends(mood_df),
        }

    def compute_mood_trends(self, mood_df: pd.DataFrame) -> Dict[str, Any]:
        mood_df = self._normalize_mood_df(mood_df)
        if mood_df.empty:
            return {"mood_series": [], "stress_series": [], "confidence_series": [], "energy_series": [], "weekly_avg": {}, "monthly_avg": {}, "calendar": []}

        mood_df = mood_df.copy()
        mood_df["created_at"] = pd.to_datetime(mood_df["created_at"], errors="coerce")
        mood_df = mood_df.dropna(subset=["created_at"]).sort_values("created_at")

        weekly = mood_df.groupby(pd.Grouper(key="created_at", freq="W"))[["mood_score", "stress_level", "confidence_level", "energy_level"]].mean().round(1)
        monthly = mood_df.groupby(pd.Grouper(key="created_at", freq="M"))[["mood_score", "stress_level", "confidence_level", "energy_level"]].mean().round(1)

        return {
            "mood_series": [
                {"date": row["created_at"].strftime("%Y-%m-%d"), "value": float(row["mood_score"])}
                for _, row in mood_df.iterrows()
            ],
            "stress_series": [
                {"date": row["created_at"].strftime("%Y-%m-%d"), "value": float(row["stress_level"])}
                for _, row in mood_df.iterrows()
            ],
            "confidence_series": [
                {"date": row["created_at"].strftime("%Y-%m-%d"), "value": float(row["confidence_level"])}
                for _, row in mood_df.iterrows()
            ],
            "energy_series": [
                {"date": row["created_at"].strftime("%Y-%m-%d"), "value": float(row["energy_level"])}
                for _, row in mood_df.iterrows()
            ],
            "weekly_avg": weekly.to_dict(orient="index"),
            "monthly_avg": monthly.to_dict(orient="index"),
            "calendar": mood_df[["created_at", "mood_score", "stress_level", "energy_level", "confidence_level"]].to_dict(orient="records"),
        }

    def calculate_correlations(self, mood_df: pd.DataFrame, legacy_df: pd.DataFrame) -> Dict[str, Any]:
        records = []
        if mood_df.empty or legacy_df.empty:
            return {"insights": ["Not enough data to calculate mood correlations yet."], "pairs": records}

        mood_df = mood_df.copy()
        legacy_df = legacy_df.copy()
        mood_df["created_at"] = pd.to_datetime(mood_df["created_at"], errors="coerce")
        legacy_df["Date"] = pd.to_datetime(legacy_df["Date"], errors="coerce")
        mood_df = mood_df.dropna(subset=["created_at"])
        legacy_df = legacy_df.dropna(subset=["Date"])

        if mood_df.empty or legacy_df.empty:
            return {"insights": ["Not enough aligned data to calculate similar-day correlations yet."], "pairs": records}

        merged = pd.merge_asof(
            mood_df.sort_values("created_at"),
            legacy_df.sort_values("Date"),
            left_on="created_at",
            right_on="Date",
            direction="nearest",
        )

        numeric_cols = [
            "mood_score",
            "stress_level",
            "confidence_level",
            "energy_level",
            "sleep_hours",
            "water_intake",
            "workout_completed",
            "Score",
            "Steps",
            "Water (glasses)",
        ]
        available_cols = [col for col in numeric_cols if col in merged.columns]
        if len(available_cols) < 2:
            return {"insights": ["Not enough aligned data to calculate similar-day correlations yet."], "pairs": records}

        merged = merged[available_cols].dropna()
        if merged.empty:
            return {"insights": ["Not enough aligned data to calculate similar-day correlations yet."], "pairs": records}

        if "workout_completed" in merged.columns:
            workout_corr = merged["mood_score"].corr(merged["workout_completed"])
            records.append({"label": "Mood vs Workout", "value": round(workout_corr, 2) if pd.notna(workout_corr) else 0})
        if "sleep_hours" in merged.columns:
            sleep_corr = merged["mood_score"].corr(merged["sleep_hours"])
            records.append({"label": "Mood vs Sleep", "value": round(sleep_corr, 2) if pd.notna(sleep_corr) else 0})
        if "water_intake" in merged.columns:
            water_corr = merged["mood_score"].corr(merged["water_intake"])
            records.append({"label": "Mood vs Water Intake", "value": round(water_corr, 2) if pd.notna(water_corr) else 0})
        if "Score" in merged.columns:
            posture_corr = merged["mood_score"].corr(merged["Score"])
            records.append({"label": "Mood vs Fitness Progress", "value": round(posture_corr, 2) if pd.notna(posture_corr) else 0})

        insights = []
        if records:
            top_pair = max(records, key=lambda item: abs(item["value"]))
            if top_pair["value"] > 0.35:
                insights.append(
                    f"Strong positive correlation detected between {top_pair['label']} — this suggests your daily habits are reinforcing positive mood."
                )
            elif top_pair["value"] < -0.35:
                insights.append(
                    f"An inverse pattern emerges for {top_pair['label']} — try adjusting the related habit to stabilize mood."
                )
            else:
                insights.append("The current data shows a mild to moderate relationship between your mood and recovery habits.")

        if "sleep_hours" in merged.columns and merged["sleep_hours"].mean() > 7.5:
            insights.append("On days where you slept more than 7.5 hours, your confidence remained stable and your emotional resilience improved.")

        return {"insights": insights, "pairs": records}

    def train_prediction_model(self, mood_df: pd.DataFrame) -> Dict[str, Any]:
        if mood_df.empty or RandomForestRegressor is None:
            return {
                "predicted_mood": 6,
                "stress_probability": 0.45,
                "motivation_score": 6,
                "confidence_score": 6,
                "burnout_risk": 0.3,
                "prediction_confidence": 0.55,
            }

        df = self._normalize_mood_df(mood_df)
        df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
        df = df.dropna(subset=["created_at"]).sort_values("created_at")

        if len(df) < 5:
            return {
                "predicted_mood": int(round(df["mood_score"].mean())) if not df.empty else 6,
                "stress_probability": round(max(0.1, min(0.9, 1 - (df["confidence_level"].mean() / 10))), 2) if not df.empty else 0.45,
                "motivation_score": int(round(df["energy_level"].mean())) if not df.empty else 6,
                "confidence_score": int(round(df["confidence_level"].mean())) if not df.empty else 6,
                "burnout_risk": round(max(0.1, min(0.9, 1 - (df["sleep_hours"].mean() / 10))), 2) if not df.empty else 0.3,
                "prediction_confidence": 0.58,
            }

        features = [
            "mood_score",
            "energy_level",
            "stress_level",
            "confidence_level",
            "sleep_hours",
            "water_intake",
            "workout_completed",
        ]
        target_cols = ["mood_score", "stress_level", "energy_level", "confidence_level"]
        training_data = df[features].copy()
        training_data["workout_completed"] = pd.to_numeric(training_data["workout_completed"], errors="coerce").fillna(0)
        training_data = training_data.apply(pd.to_numeric, errors="coerce")
        df = df[features + target_cols].apply(pd.to_numeric, errors="coerce")
        training_data = training_data.fillna(training_data.median(numeric_only=True))
        df = df.fillna(df.median(numeric_only=True))

        imputer = SimpleImputer(strategy="median")
        model = Pipeline([
            ("imputer", imputer),
            ("regressor", RandomForestRegressor(n_estimators=200, random_state=42)),
        ])

        y = df[target_cols]
        model.fit(training_data, y)

        latest = training_data.iloc[-1].to_dict()
        prediction = model.predict(pd.DataFrame([latest]))[0]
        stress_probability = max(0.1, min(0.95, prediction[1] / 10))
        burnout_risk = max(0.1, min(0.95, max(0, 1 - (prediction[4] / 10)) if False else (1 - (prediction[4] / 10))))
        if prediction[0] < 4:
            burnout_risk = min(0.95, burnout_risk + 0.15)

        result = {
            "predicted_mood": int(round(np.clip(prediction[0], 1, 10))),
            "stress_probability": round(stress_probability, 2),
            "motivation_score": int(round(np.clip(prediction[2], 1, 10))),
            "confidence_score": int(round(np.clip(prediction[3], 1, 10))),
            "burnout_risk": round(np.clip(burnout_risk, 0.1, 0.95), 2),
            "prediction_confidence": round(min(0.92, 0.64 + (len(df) / 40)), 2),
        }
        return result

    def generate_recommendations(self, mood_entry: Dict[str, Any], mood_analysis: Dict[str, Any]) -> Dict[str, Any]:
        mood_score = float(mood_entry.get("mood_score", 5) or 5)
        stress = float(mood_entry.get("stress_level", 5) or 5)
        confidence = float(mood_entry.get("confidence_level", 5) or 5)
        sleep = float(mood_entry.get("sleep_hours", 6) or 6)
        water = float(mood_entry.get("water_intake", 0) or 0)
        energy = float(mood_entry.get("energy_level", 5) or 5)

        recommendations = {
            "affirmation": "I am grounded, capable, and growing every day.",
            "breathing_exercise": "Try 4-count breathing for 2 minutes: inhale for 4, hold for 4, exhale for 6.",
            "meditation_suggestion": "Use a 5-minute grounding meditation with a soft body scan and one slow breath rhythm.",
            "workout_intensity": "Keep the session moderate and focused on mobility if your energy is below 6.",
            "interview_practice": "Do one 2-minute answer and one 1-minute self-introduction to improve confidence flow.",
            "confidence_exercise": "Stand tall, breathe slowly, and say your top three strengths out loud.",
            "hydration_reminder": "Have a glass of water immediately and continue at 30-minute intervals.",
            "sleep_recommendation": "Aim for a screen-free wind-down 60 minutes before bed.",
        }

        if stress >= 7:
            recommendations["breathing_exercise"] = "Take a 3-minute square breathing routine: inhale 4, hold 4, exhale 6, repeat 5 cycles."
        if mood_score < 5:
            recommendations["affirmation"] = "I can reset my day with one calm choice at a time."
        if confidence < 5:
            recommendations["interview_practice"] = "Practice one personalized answer using the STAR framework and keep your pacing slow and steady."
        if sleep < 6.5:
            recommendations["sleep_recommendation"] = "Target an earlier bedtime and protect one hour of deep recovery before tomorrow."
        if water < 7:
            recommendations["hydration_reminder"] = "Drink a full glass now, then another before your next work block."
        if energy < 5:
            recommendations["workout_intensity"] = "Opt for light mobility work or a short deliberate walk instead of a high-intensity session."

        return recommendations

    def extract_keywords(self, notes: str) -> List[str]:
        if not notes:
            return []
        matches = re.findall(r"\b[a-zA-Z]{4,}\b", notes.lower())
        stop_words = {"today", "about", "after", "their", "there", "would", "could", "feel", "really", "because", "should", "these", "those", "from", "with", "that", "this", "very", "have", "been", "been", "into", "more"}
        keywords = [word for word in matches if word not in stop_words]
        return list(dict.fromkeys(keywords))[:8]
