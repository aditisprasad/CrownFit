import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from digital_twin import CrownFitAIDigitalTwin


def test_digital_twin_predicts_expected_shapes():
    twin = CrownFitAIDigitalTwin()
    result = twin.fit_digital_twin()
    assert result["status"] == "trained"

    readiness = twin.predict_readiness_30_days({
        "Sleep": 7.8,
        "Water": 8.0,
        "Workout": 1.0,
        "Steps": 9200.0,
        "Mood": 8.5,
        "Stress": 3.2,
        "Confidence": 9.2,
        "Posture": 86.0,
        "Interview": 88.0,
        "Voice": 88.0,
        "Nutrition": 85.0,
    })
    assert readiness["current_readiness"] > 0
    assert readiness["forecast_30_days"] >= readiness["current_readiness"]

    forecast = twin.forecast_confidence_and_metrics(days_ahead=7)
    assert len(forecast["Mood"]) == 7
    assert len(forecast["Interview"]) == 7

    insights = twin.generate_ai_coach_insights()
    assert len(insights) >= 3
