"""
CrownFit AI - AI Engine & Personal Pageant Mentor
Powered by Gemini AI / Rule-Based Fallbacks for Pageant Mentorship, Interview Evaluation, Voice Analysis, and Readiness Scoring.
"""

import os
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

import numpy as np
import pandas as pd

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    genai = None
    GEMINI_AVAILABLE = False


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class CrownFitAI:
    """
    Personal Pageant Mentor & AI Intelligence Engine.
    Provides context-aware coaching by tracking user goals, weaknesses, streak, and performance metrics.
    """
    def __init__(self):
        self.model = None
        if GEMINI_AVAILABLE and GEMINI_API_KEY:
            try:
                self.model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception:
                self.model = None

    def _call_gemini(self, prompt: str) -> Optional[str]:
        if not self.model:
            return None
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception:
            return None

    def chat_with_mentor(self, user_message: str, context: Dict[str, Any] = None) -> str:
        """
        Personal Pageant Mentor response with memory of user progress, goals, weaknesses, and recent scores.
        """
        if not user_message.strip():
            return "Ask me anything about ramp walk alignment, interview framing, voice delivery, or stage presence."

        ctx = context or {}
        user_name = ctx.get("user_name", "Queen")
        readiness = ctx.get("readiness", 91.0)
        streak = ctx.get("streak", 12)
        weakness = ctx.get("weakness", "Shoulder Symmetry & Pause Control")
        # Do not default to any specific pageant name; the UI should pass a verified competition name
        competition = ctx.get("competition", "")

        system_prompt = (
            f"You are the Lead Mentor for CrownFit AI, a digital pageant coach training {user_name} for {competition}. "
            f"User Profile: Today's Readiness = {readiness}/100, Streak = {streak} days, Weakness Focus = '{weakness}'. "
            f"Provide encouraging, data-backed, pageant-specific advice on stance, speech, mindset, or stage confidence. "
            f"Keep responses under 150 words and end with a motivating tip."
        )

        full_prompt = f"{system_prompt}\n\nUser Question: {user_message}"
        ai_response = self._call_gemini(full_prompt)

        if ai_response:
            return ai_response

        # Fallback Rule-Based Mentor Responses
        msg_lower = user_message.lower()
        if "walk" in msg_lower or "ramp" in msg_lower or "catwalk" in msg_lower:
            return (
                f"👑 **Ramp Walk Masterclass**: {user_name}, maintain an open chest with shoulders relaxed back. "
                f"Glance 5 degrees above eye level to project crown authority. Your posture score of {ctx.get('posture_score', 86)}/100 "
                f"shows great stability—focus on smooth hip turnover!"
            )
        elif "interview" in msg_lower or "answer" in msg_lower or "speech" in msg_lower or "q&a" in msg_lower:
            return (
                f"🎤 **Miss India Q&A Framing**: Always open with a strong declarative stance. "
                f"For instance, 'I believe true leadership is measured by impact.' Pause 1.5 seconds after your opening line "
                f"to let the judges absorb your warmth and composure."
            )
        elif "nervous" in msg_lower or "anxious" in msg_lower or "confidence" in msg_lower:
            return (
                f"✨ **Mindset Reset**: Your {streak}-day consistency proves your dedication! "
                f"Take 3 deep diaphragm breaths before stepping onto the stage. Remember: judges respond to authenticity and eye contact over perfection."
            )
        elif "skin" in msg_lower or "hair" in msg_lower or "beauty" in msg_lower or "makeup" in msg_lower:
            return (
                "💖 **Stage Radiance**: High hydration (8+ glasses daily) creates HD camera bounce. "
                "Pair consistency with screen-free sleep wind-down to keep eyes vibrant for close-up interviews."
            )
        else:
            return (
                f"👑 Keep your chin level, shoulders open, and lead with purpose, {user_name}! "
                f"Your 7-day forecast indicates steady readiness gains if you complete today's mission drills."
            )

    def generate_posture_feedback(self, metrics: Dict[str, Any]) -> str:
        base_prompt = (
            "You are a senior AI posture mentor for Miss India contenders. "
            "Provide one concise actionable feedback paragraph referencing posture landmarks and giving a practical fix."
        )
        prompt = (
            f"{base_prompt}\n\n"
            f"Metrics: shoulder_symmetry={metrics.get('shoulder_symmetry')}, "
            f"neck_angle={metrics.get('neck_angle')}, head_tilt={metrics.get('head_tilt')}, "
            f"spine_alignment={metrics.get('spine_alignment')}, hip_alignment={metrics.get('hip_alignment')}, "
            f"body_balance={metrics.get('body_balance')}."
        )
        ai_text = self._call_gemini(prompt)
        if ai_text:
            return ai_text
        return self._fallback_posture_feedback(metrics)

    def _fallback_posture_feedback(self, metrics: Dict[str, Any]) -> str:
        issues = []
        if metrics.get("shoulder_symmetry", 100) < 80:
            issues.append("left shoulder position is slightly dropped")
        if metrics.get("head_tilt", 100) < 80:
            issues.append("head tilt tilts toward the dominant side")
        if metrics.get("spine_alignment", 100) < 85:
            issues.append("spine alignment requires core stabilization")
        if metrics.get("hip_alignment", 100) < 85:
            issues.append("hip balance requires even weight transfer")
        if not issues:
            return "Your posture is well balanced! Maintain your crown alignment and keep your shoulders relaxed."
        return (
            f"Noticeable posture observations: {', '.join(issues[:3])}. "
            f"Focus on shoulder blade retraction, core engagement, and 15-minute standing wall drills."
        )

    def generate_interview_questions(self) -> List[str]:
        prompt = (
            "Generate 3 high-caliber pageant interview questions designed for a Miss India personality assessment. "
            "Return JSON array of strings."
        )
        ai_text = self._call_gemini(prompt)
        if ai_text:
            try:
                cleaned = ai_text.replace("```json", "").replace("```", "").strip()
                import json
                parsed = json.loads(cleaned)
                if isinstance(parsed, list) and len(parsed) >= 3:
                    return parsed[:3]
            except Exception:
                pass
        return [
            "How would you define true grace and leadership in modern society?",
            "What is one social cause you are passionate about, and how will you use your crown to amplify it?",
            "Tell us about a personal setback that shaped your confidence into a strength."
        ]

    def evaluate_interview(self, question: str, answer: str, transcript: str = "") -> Dict[str, Any]:
        score_map = self._rule_based_interview_scores(answer)
        suggestions = self._build_interview_suggestions(score_map)
        return {
            "communication": score_map["communication"],
            "confidence": score_map["confidence"],
            "grammar": score_map["grammar"],
            "vocabulary": score_map["vocabulary"],
            "emotional_intelligence": score_map["emotional_intelligence"],
            "originality": score_map["originality"],
            "overall_score": round(sum(score_map.values()) / 6, 1),
            "suggestions": suggestions,
            "question": question,
            "answer": answer,
            "transcript": transcript,
        }

    def _rule_based_interview_scores(self, answer: str) -> Dict[str, float]:
        normalized = answer.lower()
        words = len(re.findall(r"\b\w+\b", normalized))
        filler_penalty = len(re.findall(r"\b(um|uh|like|basically|you know)\b", normalized))
        punctuation_bonus = 1 if "." in answer or "!" in answer else 0
        
        grammar_score = min(100, 65 + min(words, 50) * 0.4 + punctuation_bonus * 5)
        vocabulary_score = min(100, 60 + min(words, 60) * 0.35 + (1 if len(set(re.findall(r"\b\w+\b", normalized))) > 15 else 0) * 10)
        confidence_score = min(100, 62 + (1 if len(answer.split()) > 25 else 0) * 10 + (1 if "i believe" in normalized or "my vision" in normalized else 0) * 8)
        communication_score = min(100, 60 + min(words, 40) * 0.5 - filler_penalty * 4)
        emotional_score = min(100, 58 + (1 if any(k in normalized for k in ["because", "experience", "learned", "community", "values", "impact"]) else 0) * 16)
        originality_score = min(100, 55 + min(words, 40) * 0.4 + (1 if len(answer) > 80 else 0) * 10)
        
        return {
            "communication": round(communication_score, 1),
            "confidence": round(confidence_score, 1),
            "grammar": round(grammar_score, 1),
            "vocabulary": round(vocabulary_score, 1),
            "emotional_intelligence": round(emotional_score, 1),
            "originality": round(originality_score, 1),
        }

    def _build_interview_suggestions(self, score_map: Dict[str, float]) -> List[str]:
        suggestions = []
        for metric, value in score_map.items():
            if value < 75:
                suggestions.append(f"Refine {metric.replace('_', ' ')} by structuring your speech with an emphatic opening statement and a strong closing reflection.")
        if not suggestions:
            suggestions.append("Your response demonstrates elite pageant articulation. Maintain a calm posture and steady eye contact.")
        return suggestions

    def analyze_voice(self, transcript: str) -> Dict[str, Any]:
        words = re.findall(r"\b\w+\b", transcript)
        word_count = len(words)
        speaking_speed = round(word_count / 0.6, 1) if word_count > 0 else 135.0  # Words per minute estimation
        pause_frequency = round(len(re.findall(r"\s{2,}|[,;]\s*", transcript)), 2)
        filler_words = len(re.findall(r"\b(um|uh|like|you know|basically)\b", transcript.lower()))
        
        clarity = min(100, 68 + max(0, 20 - filler_words * 4) + min(12, word_count // 5))
        confidence = min(100, 65 + max(0, 20 - pause_frequency * 2) - filler_words * 3)
        energy = min(100, 70 + min(20, word_count // 3))
        pitch_stability = max(50, 92 - pause_frequency * 4 - filler_words * 2)
        interview_readiness = round((clarity * 0.35 + confidence * 0.35 + energy * 0.3), 1)

        return {
            "speaking_speed": speaking_speed,
            "pause_frequency": pause_frequency,
            "filler_words": filler_words,
            "confidence": round(confidence, 1),
            "clarity": round(clarity, 1),
            "energy": round(energy, 1),
            "pitch_stability": round(pitch_stability, 1),
            "interview_readiness": interview_readiness
        }
