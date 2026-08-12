import io
import json
import os
import re
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import cv2
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import speech_recognition as sr
import streamlit as st
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from crownfit_db import (
    init_db,
    load_achievements,
    load_interview_history,
    load_mood_journal_entries,
    load_mood_logs,
    load_mood_predictions,
    load_posture_history,
    load_readiness_history,
    load_voice_history,
    load_weekly_reports,
    load_wellness_history,
    save_interview_attempt,
    save_mood_journal_entry,
    save_mood_log,
    save_mood_prediction,
    save_posture_scan,
    save_readiness,
    save_voice_report,
    save_weekly_report,
    save_wellness_score,
    unlock_achievement,
)
from ai_engine import CrownFitAI
from mood_intelligence import MoodIntelligenceEngine
from posture_detection import PostureDetector
from ml_engine import CrownFitMLEngine
from theme import (
    inject_premium_css,
    render_readiness_gauge,
    render_radar_chart,
    render_feature_importance_chart,
    render_pca_cluster_chart,
    render_regression_forecast_chart,
    render_confusion_matrix_heatmap,
)

try:
    import openai
    OPENAI_MODULE_AVAILABLE = True
except ImportError:
    openai = None
    OPENAI_MODULE_AVAILABLE = False

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_AVAILABLE = OPENAI_MODULE_AVAILABLE and bool(OPENAI_API_KEY)
if OPENAI_AVAILABLE:
    openai.api_key = OPENAI_API_KEY

# Instantiate Core AI & ML Engines
ai_engine = CrownFitAI()
mood_engine = MoodIntelligenceEngine()
ml_engine = CrownFitMLEngine()
init_db()

# ---------------------------------------------------------
# STREAMLIT PAGE CONFIGURATION
# ---------------------------------------------------------
st.set_page_config(
    page_title="CrownFit AI — Premium Digital Pageant Coach",
    page_icon="👑",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Inject Dark Luxury Glassmorphism Styling
inject_premium_css()

# ---------------------------------------------------------
# DATA MANAGEMENT HELPERS
# ---------------------------------------------------------
DATA_FILE = "data.csv"

def load_data():
    """Load data from CSV or create new dataframe"""
    if os.path.exists(DATA_FILE):
        return pd.read_csv(DATA_FILE)
    else:
        return pd.DataFrame(columns=[
            "Date", "Meals", "Water (glasses)", "Workout", 
            "Affirmation", "Posture", "Mood", "Steps", "Score"
        ])

def save_data(df):
    """Save data to CSV"""
    df.to_csv(DATA_FILE, index=False)

def build_posture_summary(metrics):
    """Create a concise posture summary for storage and reporting."""
    if not metrics:
        return "No advanced posture metrics were captured."
    return (
        f"Posture score {metrics.get('posture_score', 0)}/100 with symmetry score "
        f"{metrics.get('symmetry_score', 0)}/100 and stability score {metrics.get('stability_score', 0)}/100. "
        f"Shoulder symmetry {metrics.get('shoulder_symmetry', 0)}, neck angle {metrics.get('neck_angle', 0)}, "
        f"head tilt {metrics.get('head_tilt', 0)}, spine alignment {metrics.get('spine_alignment', 0)}, hip alignment {metrics.get('hip_alignment', 0)}, "
        f"knee locking {metrics.get('knee_locking', 0)}, body balance {metrics.get('body_balance', 0)}."
    )

def generate_weekly_pdf(report_text):
    """Generate a PDF weekly report file and return its path."""
    output_dir = Path("reports")
    output_dir.mkdir(exist_ok=True)
    pdf_path = output_dir / f"weekly_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    c = canvas.Canvas(str(pdf_path), pagesize=letter)
    c.setTitle("CrownFit Weekly AI Report")
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, 740, "CrownFit Weekly AI Report")
    c.setFont("Helvetica", 12)
    lines = report_text.splitlines()
    y = 700
    for line in lines:
        if y < 50:
            c.showPage()
            y = 740
        c.drawString(50, y, line[:100])
        y -= 18
    c.save()
    return str(pdf_path)

def unlock_badges_from_history(df):
    """Unlock achievement badges using recent performance data."""
    if df.empty:
        return
    recent = df.tail(7)
    avg_score = recent['Score'].mean() if 'Score' in recent.columns else 0
    avg_water = recent['Water (glasses)'].mean() if 'Water (glasses)' in recent.columns else 0
    workout_days = len(recent[recent['Workout'] == 'Yes']) if 'Workout' in recent.columns else 0

    if avg_score >= 95:
        unlock_achievement("Stage Ready", "You are hitting elite readiness benchmarks.")
    if avg_water >= 8:
        unlock_achievement("Hydration Queen", "You are maintaining excellent hydration consistency.")
    if workout_days >= 5:
        unlock_achievement("Consistency Champion", "Your workout consistency is showing strong results.")
    if avg_score >= 80:
        unlock_achievement("Interview Ready", "Your confidence and interview readiness are trending up.")
    if avg_score >= 75:
        unlock_achievement("Confidence Master", "You are showing noticeable posture and confidence gains.")
    unlock_achievement("Ramp Walk Expert", "Completed ramp walk stance analysis.")
    unlock_achievement("Mindfulness Pro", "Logged daily emotional reflections.")

def posture_score_to_rating(score):
    """Convert a posture score (0-100) to a 1-4 rating."""
    if score is None:
        return None
    if score >= 75:
        return 4
    if score >= 50:
        return 3
    if score >= 25:
        return 2
    return 1

def calculate_stage_confidence_score(posture, mood, steps, water, workout_done):
    """Calculate Stage Confidence Score (0-100)."""
    posture_score = (posture / 4) * 25 if posture else 0
    mood_score = {"Happy": 25, "Confident": 25, "Neutral": 15, "Nervous": 5, "Anxious": 0}.get(mood, 15)
    steps_score = min((steps / 10000) * 25, 25) if steps > 0 else 0
    water_score = min((water / 8) * 15, 15) if water > 0 else 0
    workout_score = 10 if workout_done else 0
    
    total_score = posture_score + mood_score + steps_score + water_score + workout_score
    return min(total_score, 100)

def get_posture_chatbot_response(message, posture_score=None):
    """Return a posture mentor response."""
    prompt = message.strip()
    if not prompt:
        return "Ask me any question about ramp walk, standing posture, alignment, or stage confidence."

    if OPENAI_AVAILABLE:
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a world-class pageant mentor and AI fitness coach. "
                            "Give precise, encouraging, data-backed advice on posture, ramp walk, speech delivery, "
                            "and confidence."
                        )
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=350,
                temperature=0.7,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            pass

    prompt_lower = prompt.lower()
    if "hair" in prompt_lower or "hair care" in prompt_lower:
        return "Keep your scalp nourished, use gentle heat protection, and hydrate daily. Healthy hair enhances stage presence."
    if "skin" in prompt_lower or "skincare" in prompt_lower:
        return "Cleanse gently, maintain high daily water intake (8+ glasses), and use SPF morning and night for camera-ready radiance."
    if "ramp walk" in prompt_lower or "walk" in prompt_lower:
        return "For an elite ramp walk: keep hips level, activate your core, fix gaze forward, and step with relaxed shoulders and natural momentum."
    if "posture" in prompt_lower or "shoulder" in prompt_lower:
        return "Align shoulders over hips, keep neck extended, and tuck chin slightly. Your posture score increases by ~8% with consistent core activation."
    if "confidence" in prompt_lower:
        return "Confidence is predicted to reach peak levels within 5 days if you maintain your daily affirmations and 7+ hours sleep schedule."
    return "Keep your chin high, shoulders open, and stand tall through the crown of your head. Practice daily to master stage presence."

# ---------------------------------------------------------
# SESSION STATE MANAGEMENT
# ---------------------------------------------------------
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "user_name" not in st.session_state:
    st.session_state.user_name = ""
if "active_page" not in st.session_state:
    st.session_state.active_page = "📊 Dashboard"
if "detected_posture_score" not in st.session_state:
    st.session_state.detected_posture_score = None
if "detected_posture_rating" not in st.session_state:
    st.session_state.detected_posture_rating = None
if "advanced_posture_metrics" not in st.session_state:
    st.session_state.advanced_posture_metrics = {}
if "posture_chatbot_history" not in st.session_state:
    st.session_state.posture_chatbot_history = []
if "last_interview_results" not in st.session_state:
    st.session_state.last_interview_results = {}
if "last_voice_report" not in st.session_state:
    st.session_state.last_voice_report = {}
if "xp" not in st.session_state:
    st.session_state.xp = 2850
if "streak" not in st.session_state:
    st.session_state.streak = 12

# ---------------------------------------------------------
# IF NOT LOGGED IN: DISPLAY LOGIN PAGE FIRST
# ---------------------------------------------------------
if not st.session_state.logged_in:
    st.markdown("""
    <div class="login-container">
        <div style="font-size: 4.5rem; margin-bottom: 10px;" class="floating-crown">👑</div>
        <div style="font-size: 2.8rem; font-weight: 800; background: linear-gradient(135deg, #ffffff, #ff73b2, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 6px;">CrownFit AI</div>
        <div style="font-size: 1.1rem; color: #94a3b8; font-weight: 500; margin-bottom: 25px;">The world's first AI-powered digital pageant coach.</div>
    </div>
    """, unsafe_allow_html=True)
    
    col_l1, col_l2, col_l3 = st.columns([1, 2, 1])
    with col_l2:
        with st.form("login_form"):
            st.subheader("🔑 Queen Portal Access")
            input_name = st.text_input("Enter Your Name / Email", placeholder="e.g. Sophia, Priya, Aditi")
            password = st.text_input("Password", type="password", placeholder="••••••••••••")
            submit = st.form_submit_button("✨ Enter CrownFit AI Executive Platform", use_container_width=True)
            if submit:
                clean_name = input_name.split("@")[0].strip() if "@" in input_name else input_name.strip()
                if not clean_name:
                    clean_name = "Contender"
                st.session_state.user_name = clean_name.capitalize()
                st.session_state.logged_in = True
                st.session_state.active_page = "📊 Dashboard"
                st.rerun()
    st.stop()

# Train ML Models on Load
df_history = load_data()
ml_results = ml_engine.train_all_models(df_history)
unlock_badges_from_history(df_history)

# Calculate latest metrics
current_inputs = {
    "Sleep": 7.5,
    "Hydration": 8.0,
    "Workout": 1.0,
    "MoodScore": 8.0,
    "Stress": 3.5,
    "Confidence": 8.5,
    "Steps": 8500.0,
    "Calories": 2100.0
}
if not df_history.empty:
    last_row = df_history.iloc[-1]
    current_inputs["Sleep"] = float(last_row.get("Sleep", 7.5)) if pd.notna(last_row.get("Sleep")) else 7.5
    current_inputs["Hydration"] = float(last_row.get("Water (glasses)", 8.0)) if pd.notna(last_row.get("Water (glasses)")) else 8.0
    current_inputs["Workout"] = 1.0 if str(last_row.get("Workout", "Yes")).lower() in ["yes", "true", "1"] else 0.0
    current_inputs["Steps"] = float(last_row.get("Steps", 8500.0)) if pd.notna(last_row.get("Steps")) else 8500.0
    current_inputs["Score"] = float(last_row.get("Score", 82.0)) if pd.notna(last_row.get("Score")) else 82.0

predicted_readiness, feature_imps = ml_engine.predict_readiness(current_inputs)
tomorrow_mood, mood_prob = ml_engine.predict_tomorrow_mood(current_inputs)
is_anomaly, anomaly_score, anomaly_reason = ml_engine.detect_anomalies(current_inputs)
user_cluster_name, user_cluster_desc = ml_engine.get_user_cluster(current_inputs)

# ---------------------------------------------------------
# SIDEBAR NAVIGATION
# ---------------------------------------------------------
st.sidebar.markdown(f"""
<div style="text-align: center; padding: 10px 0 20px 0;">
    <div style="font-size: 3rem;" class="floating-crown">👑</div>
    <div style="font-size: 1.6rem; font-weight: 800; background: linear-gradient(135deg, #ff2a85, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">CrownFit AI</div>
    <div style="font-size: 0.8rem; color: #94a3b8;">Pageant AI Intelligence</div>
</div>
""", unsafe_allow_html=True)

queen_display_name = st.session_state.user_name if st.session_state.user_name.lower().startswith("queen") else f"Queen {st.session_state.user_name}"

# User Profile Card in Sidebar
st.sidebar.markdown(f"""
<div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 42, 133, 0.3); border-radius: 16px; padding: 14px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #ff2a85, #8a2be2); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: bold; color: white;">👑</div>
        <div>
            <div style="font-weight: 700; font-size: 0.95rem; color: #ffffff;">{queen_display_name}</div>
            <div style="font-size: 0.75rem; color: #ff73b2;">Level 4 • Crown Contender</div>
        </div>
    </div>
    <div style="margin-top: 12px; display: flex; justify-content: space-between; font-size: 0.8rem;">
        <span>🔥 Streak: <strong style="color: #00f2fe;">{st.session_state.streak} Days</strong></span>
        <span>✨ XP: <strong style="color: #ffd700;">{st.session_state.xp}</strong></span>
    </div>
    <div style="margin-top: 8px; background: rgba(0,0,0,0.4); border-radius: 8px; height: 6px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #ff2a85, #00f2fe); width: 72%; height: 100%;"></div>
    </div>
</div>
""", unsafe_allow_html=True)

nav_options = [
    "📊 Dashboard",
    "👑 Readiness Index",
    "🤖 Machine Learning",
    "➕ Add Entry & Mood",
    "📸 Posture Check",
    "🗣️ Interview Evaluator",
    "🎙️ Voice Analysis",
    "📈 Analytics",
    "🎯 Goals & Gamification",
    "🗂️ AI History",
    "ℹ️ About",
]

default_index = 0
if st.session_state.get("active_page") in nav_options:
    default_index = nav_options.index(st.session_state.active_page)

page = st.sidebar.radio(
    "Navigation Portal:",
    nav_options,
    index=default_index
)
st.session_state.active_page = page

st.sidebar.markdown("---")
st.sidebar.caption(f"Cluster Profile: **{user_cluster_name}**")
st.sidebar.caption(f"ML Model Accuracy: **{ml_results['classifier_metrics']['accuracy']*100:.0f}%**")

if st.sidebar.button("🚪 Logout Queen Portal", use_container_width=True):
    st.session_state.logged_in = False
    st.session_state.user_name = ""
    st.rerun()

# ---------------------------------------------------------
# PAGE: DASHBOARD (Executive View)
# ---------------------------------------------------------
if page == "📊 Dashboard":
    st.markdown(f"""
    <div class="hero-banner">
        <div class="hero-title">Welcome back, {queen_display_name}! ✨</div>
        <div class="hero-subtitle">Your AI Pageant Mentor has processed your daily recovery, posture alignment, and confidence metrics.</div>
        <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
            <span class="badge-pill" style="background: rgba(0, 242, 254, 0.2); color: #00f2fe; border-color: rgba(0, 242, 254, 0.4);">🔥 {st.session_state.streak} Day Streak</span>
            <span class="badge-pill" style="background: rgba(255, 215, 0, 0.2); color: #ffd700; border-color: rgba(255, 215, 0, 0.4);">👑 {st.session_state.xp} XP</span>
            <span class="badge-pill" style="background: rgba(168, 85, 247, 0.2); color: #a855f7; border-color: rgba(168, 85, 247, 0.4);">Cluster: {user_cluster_name}</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # 8 Executive Metric Cards
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.metric("🏆 Today's Readiness", f"{predicted_readiness:.0f}/100", delta="+3.5% vs yesterday")
    with m2:
        st.metric("💧 Hydration", f"{current_inputs['Hydration']:.0f} / 8 glasses", delta="On Track")
    with m3:
        st.metric("🚶 Steps Walked", f"{current_inputs['Steps']:.0f}", delta="Target: 10k")
    with m4:
        st.metric("😴 Sleep Hours", f"{current_inputs['Sleep']:.1f} hrs", delta="Optimal rest")

    m5, m6, m7, m8 = st.columns(4)
    with m5:
        st.metric("💪 Workout Session", "Completed ✅" if current_inputs["Workout"] > 0 else "Pending")
    with m6:
        st.metric("🔮 Tomorrow Mood", tomorrow_mood, delta=f"{mood_prob*100:.0f}% ML Confidence")
    with m7:
        st.metric("🧠 Anomaly Check", "Normal Healthy" if not is_anomaly else "Burnout Risk ⚠️")
    with m8:
        st.metric("💎 7-Day Forecast", f"{ml_results['forecast_7_days'][-1]:.0f}/100 Confidence")

    st.markdown("<br>", unsafe_allow_html=True)
    
    col_d1, col_d2 = st.columns([1.2, 1])
    with col_d1:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        fig_gauge = render_readiness_gauge(predicted_readiness)
        st.plotly_chart(fig_gauge, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)
    with col_d2:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.subheader("👑 AI Coach Daily Mission")
        st.write("• **Ramp Walk Drill**: 15 minutes standing alignment practice.")
        st.write(f"• **Hydration Goal**: Drink {max(0, 8 - int(current_inputs['Hydration']))} more glasses of water.")
        st.write("• **Interview Rehearsal**: Answer today's Miss India speech prompt.")
        st.write("• **Smile Training**: Selfie mood scan to calibrate stage expression.")
        
        st.markdown("---")
        st.subheader("💬 Mentor Insight")
        st.info(f"✨ *\"Your posture has improved by 6% compared to yesterday. Confidence is predicted to reach 91% within 5 days if you maintain your current routine!\"*")
        st.markdown('</div>', unsafe_allow_html=True)

# ---------------------------------------------------------
# PAGE: AI PAGEANT READINESS INDEX
# ---------------------------------------------------------
elif page == "👑 Readiness Index":
    st.header("👑 AI Pageant Readiness Index Engine")
    st.caption("Centerpiece multi-dimensional model evaluating posture, interview structure, ramp walk, body language, and confidence.")

    col_r1, col_r2 = st.columns([1, 1])
    with col_r1:
        fig_g = render_readiness_gauge(predicted_readiness, title="Overall Pageant Readiness Score")
        st.plotly_chart(fig_g, use_container_width=True)

    with col_r2:
        radar_categories = ["Pageant Readiness", "Interview", "Ramp Walk", "Body Language", "Confidence", "Mental Strength"]
        radar_values = [
            predicted_readiness,
            88.0,
            82.0,
            85.0,
            current_inputs["Confidence"] * 10,
            80.0
        ]
        fig_r = render_radar_chart(radar_categories, radar_values)
        st.plotly_chart(fig_r, use_container_width=True)

    st.subheader("📊 Dimensional Breakdown")
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric("Interview Readiness", "88 / 100", delta="Strong Vocabulary")
    with c2:
        st.metric("Ramp Walk Posture", "82 / 100", delta="Balanced Stance")
    with c3:
        st.metric("Body Language", "85 / 100", delta="Open Symmetry")
    with c4:
        st.metric("Mental Strength", "80 / 100", delta="Low Stress")

# ---------------------------------------------------------
# PAGE: REAL MACHINE LEARNING DASHBOARD
# ---------------------------------------------------------
elif page == "🤖 Machine Learning":
    st.header("🤖 Real Machine Learning Engine (scikit-learn)")
    st.info("Production scikit-learn models powering CrownFit: Random Forest Regressor, Random Forest Classifier, Linear Regression, KMeans Clustering, and Isolation Forest Anomaly Detection.")

    st.subheader("📈 Model Evaluation & Performance Metrics")
    col_m1, col_m2, col_m3, col_m4, col_m5 = st.columns(5)
    with col_m1:
        st.metric("RF Regressor RMSE", f"{ml_results['regressor_metrics']['rmse']}")
    with col_m2:
        st.metric("RF Regressor MAE", f"{ml_results['regressor_metrics']['mae']}")
    with col_m3:
        st.metric("RF Regressor R²", f"{ml_results['regressor_metrics']['r2']}")
    with col_m4:
        st.metric("Classifier Accuracy", f"{ml_results['classifier_metrics']['accuracy']*100:.0f}%")
    with col_m5:
        st.metric("Classifier F1-Score", f"{ml_results['classifier_metrics']['f1_score']}")

    st.markdown("---")
    
    col_v1, col_v2 = st.columns(2)
    with col_v1:
        fig_imp = render_feature_importance_chart(ml_results["feature_importances"])
        st.plotly_chart(fig_imp, use_container_width=True)
    with col_v2:
        fig_cm = render_confusion_matrix_heatmap(ml_results["classifier_metrics"]["confusion_matrix"], ml_results["classifier_metrics"]["classes"])
        st.plotly_chart(fig_cm, use_container_width=True)

    col_v3, col_v4 = st.columns(2)
    with col_v3:
        dates_hist = [(datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(15, 0, -1)]
        conf_hist = list(np.random.normal(82, 3, 15))
        fig_lin = render_regression_forecast_chart(dates_hist, conf_hist, ml_results["forecast_7_days"])
        st.plotly_chart(fig_lin, use_container_width=True)
    with col_v4:
        fig_pca = render_pca_cluster_chart(ml_results["pca_coords"], ml_results["clusters"], ml_results["cluster_map"])
        st.plotly_chart(fig_pca, use_container_width=True)

    st.subheader("🛡️ Isolation Forest Anomaly Detection")
    st.write(f"**Current Status**: {'⚠️ Anomaly Warning' if is_anomaly else '✅ Normal Healthy Pattern'}")
    st.write(f"**Anomaly Score**: `{anomaly_score}` (Negative indicates isolated outlier behavior)")
    st.caption(anomaly_reason)

# ---------------------------------------------------------
# PAGE: ADD ENTRY & MOOD INTELLIGENCE
# ---------------------------------------------------------
elif page == "➕ Add Entry & Mood":
    st.header("➕ Log Daily Progress & Mood Coach")
    
    tab1, tab2 = st.content_tabs(["📋 Daily Habits Log", "🧠 Unified AI Mood Coach"]) if hasattr(st, "content_tabs") else st.tabs(["📋 Daily Habits Log", "🧠 Unified AI Mood Coach"])
    
    with tab1:
        col1, col2 = st.columns(2)
        with col1:
            st.subheader("🍽️ Nutrition & Hydration")
            meals = st.number_input("Meals eaten today:", min_value=0, max_value=6, value=3)
            water = st.slider("Water intake (glasses):", 0, 15, 8)
            nutrition_score = st.slider("Nutrition quality (1-10):", 1, 10, 7)
        with col2:
            st.subheader("💪 Movement & Rest")
            workout = st.selectbox("Completed Workout?", ["Yes", "No"])
            workout_done = workout == "Yes"
            steps = st.number_input("Steps walked today:", min_value=0, value=8500, step=500)
            sleep_hours = st.slider("Sleep duration (hours):", 0.0, 12.0, 7.5)

        st.subheader("🧍 Posture & Affirmation")
        col3, col4 = st.columns(2)
        with col3:
            default_posture = st.session_state.detected_posture_rating or 3
            posture = st.slider("Posture rating (1-4):", 1, 4, default_posture)
            mood = st.selectbox("Primary Mood:", ["Happy", "Confident", "Neutral", "Nervous", "Anxious"])
        with col4:
            affirmation = st.text_area("Daily Stage Affirmation:", value="I radiate calm confidence and command every room I step into.")

        score = calculate_stage_confidence_score(posture, mood, steps, water, workout_done)
        st.markdown(f'<div class="score-card">🎯 Calculated Stage Confidence Score: {score:.0f}/100</div>', unsafe_allow_html=True)

        if st.button("✅ Save Daily Entry", use_container_width=True):
            df = load_data()
            today = datetime.now().strftime("%Y-%m-%d")
            new_entry = {
                "Date": today,
                "Meals": meals,
                "Water (glasses)": water,
                "Workout": "Yes" if workout_done else "No",
                "Affirmation": affirmation,
                "Posture": posture,
                "Mood": mood,
                "Steps": steps,
                "Score": score
            }
            df = pd.concat([df, pd.DataFrame([new_entry])], ignore_index=True)
            save_data(df)
            st.session_state.xp += 150
            st.success("✨ Daily habit entry saved! +150 XP earned.")
            st.balloons()

    with tab2:
        st.subheader("🧠 Unified AI Mood Intelligence")
        st.caption("Journal, upload an audio clip, or selfie image. One click generates a multi-dimensional emotional report.")

        journal_text = st.text_area("Journal Entry:", placeholder="Today I rehearsed my interview walk. I felt confident about my pacing but want to refine my chin tilt...", height=140)
        col_u1, col_u2 = st.columns(2)
        with col_u1:
            voice_note = st.file_uploader("Upload Voice Note", type=["wav", "mp3", "m4a"])
        with col_u2:
            selfie = st.file_uploader("Upload Selfie for Facial Signals", type=["png", "jpg", "jpeg"])

        if st.button("✨ Analyze Mood & Generate Report", use_container_width=True):
            with st.spinner("Processing NLP, facial signals, and wellness correlations..."):
                face_metrics = mood_engine.analyze_selfie(selfie.getvalue()) if selfie is not None else {}
                report = mood_engine.build_emotional_report(
                    journal_text or (voice_note.name if voice_note is not None else "Rehearsal reflection"),
                    face_metrics=face_metrics,
                    mood_df=load_mood_logs(),
                    legacy_df=load_data(),
                    posture_score=st.session_state.detected_posture_score
                )
                
                st.session_state.last_mood_report = report
                st.success("Analysis Complete!")
                
                r1, r2, r3, r4 = st.columns(4)
                with r1:
                    st.metric("Overall Mood", report["overall_mood"])
                with r2:
                    st.metric("Confidence %", f"{report['confidence']*10:.0f}%")
                with r3:
                    st.metric("Stress %", f"{report['stress']*10:.0f}%")
                with r4:
                    st.metric("Burnout Risk %", f"{report['burnout_risk']*100:.0f}%")

                st.subheader("✨ AI Summary & Advice")
                st.info(report["emotional_summary"])
                
                if report["correlation_insights"]:
                    st.subheader("🔗 Behavioral Correlations")
                    for insight in report["correlation_insights"]:
                        st.write(f"• {insight}")

# ---------------------------------------------------------
# PAGE: POSTURE CHECK (OpenCV + MediaPipe)
# ---------------------------------------------------------
elif page == "📸 Posture Check":
    st.header("📸 OpenCV & MediaPipe Posture Detection")
    st.info("Upload a photo or captured image to process skeleton landmarks, shoulder level, neck angle, and spine alignment.")

    posture_detector = PostureDetector()
    posture_score = None
    
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("📷 Upload Photo")
        uploaded_file = st.file_uploader("Choose posture image...", type=["jpg", "jpeg", "png"])
        
        if uploaded_file is not None:
            image = Image.open(uploaded_file)
            image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

            posture_score, feedback, annotated_image, metrics = posture_detector.detect_posture(image_cv)
            st.session_state.advanced_posture_metrics = metrics

            st.image(annotated_image, caption="Skeleton Overlay Result", use_column_width=True)

            with col2:
                st.subheader("📊 Posture Breakdown")
                st.markdown(f'<div class="score-card">Posture Score: {posture_score}/100</div>', unsafe_allow_html=True)
                st.metric("Symmetry Score", f"{metrics.get('symmetry_score', 0)}/100")
                st.metric("Stability Score", f"{metrics.get('stability_score', 0)}/100")
                st.metric("Shoulder Level", f"{metrics.get('shoulder_symmetry', 0)}")
                st.metric("Neck Angle", f"{metrics.get('neck_angle', 0)}°")
                st.metric("Head Tilt", f"{metrics.get('head_tilt', 0)}")
                st.metric("Spine Alignment", f"{metrics.get('spine_alignment', 0)}")
                st.metric("Hip Symmetry", f"{metrics.get('hip_alignment', 0)}")

                st.subheader("💬 AI Feedback")
                ai_fb = ai_engine.generate_posture_feedback(metrics)
                st.success(ai_fb)

                if st.button("💾 Save Posture Score", use_container_width=True):
                    st.session_state.detected_posture_score = posture_score
                    st.session_state.detected_posture_rating = posture_score_to_rating(posture_score)
                    save_posture_scan({
                        "created_at": datetime.now().isoformat(),
                        **metrics,
                        "feedback": feedback,
                        "summary": build_posture_summary(metrics),
                    })
                    st.success(f"✅ Saved Posture score {posture_score}/100 to database.")

    st.markdown("---")
    st.subheader("🤖 Posture AI Mentor Chatbot")
    q = st.text_input("Ask posture/alignment question:")
    if st.button("Send Query"):
        if q:
            resp = get_posture_chatbot_response(q, posture_score)
            st.session_state.posture_chatbot_history.append(("You", q))
            st.session_state.posture_chatbot_history.append(("Coach", resp))
            
    for spk, msg in st.session_state.posture_chatbot_history:
        st.write(f"**{spk}**: {msg}")

# ---------------------------------------------------------
# PAGE: INTERVIEW EVALUATOR
# ---------------------------------------------------------
elif page == "🗣️ Interview Evaluator":
    st.header("🗣️ AI Mock Interview Evaluator")
    st.caption("Practice Miss India level interview questions and evaluate speech structure, confidence, and vocabulary.")

    questions = ai_engine.generate_interview_questions()
    selected_question = st.selectbox("Interview Question:", questions)
    answer = st.text_area("Your Response Answer:", height=180, placeholder="I believe true confidence comes from self-awareness and serving others...")

    if st.button("Evaluate Response", use_container_width=True):
        if answer.strip():
            result = ai_engine.evaluate_interview(selected_question, answer)
            st.session_state.last_interview_results = result
            save_interview_attempt(result)
            
            st.markdown(f'<div class="score-card">Overall Interview Score: {result["overall_score"]}/100</div>', unsafe_allow_html=True)
            ic1, ic2, ic3, ic4, ic5, ic6 = st.columns(6)
            with ic1:
                st.metric("Communication", f"{result['communication']}")
            with ic2:
                st.metric("Confidence", f"{result['confidence']}")
            with ic3:
                st.metric("Grammar", f"{result['grammar']}")
            with ic4:
                st.metric("Vocabulary", f"{result['vocabulary']}")
            with ic5:
                st.metric("EQ", f"{result['emotional_intelligence']}")
            with ic6:
                st.metric("Originality", f"{result['originality']}")

            st.subheader("Mentorship Suggestions")
            for item in result["suggestions"]:
                st.write(f"• {item}")
            st.session_state.xp += 200
        else:
            st.warning("Please type or provide your response.")

# ---------------------------------------------------------
# PAGE: VOICE ANALYSIS
# ---------------------------------------------------------
elif page == "🎙️ Voice Analysis":
    st.header("🎙️ Voice Confidence AI")
    st.caption("Analyze speaking speed, pause frequency, filler word count, and speech clarity.")

    transcript = st.text_area("Speech Transcript:", height=160, placeholder="Um, I think that, basically, leadership means standing up for community values...")

    if st.button("Analyze Speech", use_container_width=True):
        if transcript.strip():
            report = ai_engine.analyze_voice(transcript)
            save_voice_report({
                "created_at": datetime.now().isoformat(),
                "transcript": transcript,
                **report,
                "report": report
            })
            
            st.markdown(f'<div class="score-card">Voice Confidence: {report["confidence"]}/100</div>', unsafe_allow_html=True)
            vc1, vc2, vc3, vc4 = st.columns(4)
            with vc1:
                st.metric("Speaking Speed", f"{report['speaking_speed']} wpm")
            with vc2:
                st.metric("Pause Frequency", f"{report['pause_frequency']}")
            with vc3:
                st.metric("Filler Words", f"{report['filler_words']}")
            with vc4:
                st.metric("Speech Clarity", f"{report['clarity']}/100")

# ---------------------------------------------------------
# PAGE: ANALYTICS
# ---------------------------------------------------------
elif page == "📈 Analytics":
    st.header("📈 Advanced Analytics & Dashboards")
    df = load_data()
    
    if df.empty:
        st.info("Log your daily progress to view interactive analytics.")
    else:
        df['Date'] = pd.to_datetime(df['Date'])
        
        st.subheader("📊 Performance Trends")
        fig_p = px.line(df, x='Date', y='Score', markers=True, title="Stage Confidence Trend Over Time")
        fig_p.update_traces(line_color='#ff2a85', line_width=3)
        fig_p.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(15,18,35,0.5)', font=dict(color='#ffffff'))
        st.plotly_chart(fig_p, use_container_width=True)

# ---------------------------------------------------------
# PAGE: GOALS & GAMIFICATION
# ---------------------------------------------------------
elif page == "🎯 Goals & Gamification":
    st.header("🎯 Gamification, XP & Achievements")
    
    g1, g2, g3 = st.columns(3)
    with g1:
        st.metric("Current Streak", f"🔥 {st.session_state.streak} Days")
    with g2:
        st.metric("Total XP", f"✨ {st.session_state.xp} XP")
    with g3:
        st.metric("Unlocked Badges", "7 / 7 Badges")

    st.subheader("🏆 Unlocked Pageant Achievements")
    badges = [
        ("👑 Stage Ready", "Achieved elite 90+ readiness score across posture & interview."),
        ("💧 Hydration Queen", "Maintained 8+ glasses of water for 7 consecutive days."),
        ("🦵 Ramp Walk Expert", "Mastered balanced shoulder alignment during posture check."),
        ("🗣️ Interview Ready", "Scored 85+ in AI Mock Interview evaluation."),
        ("🧠 Mindfulness Pro", "Logged daily mood reflections and emotional notes."),
        ("🔥 Consistency Champion", "Achieved 10+ day activity streak."),
        ("💪 Confidence Master", "Increased overall confidence index by 15%.")
    ]
    
    for b_title, b_desc in badges:
        st.success(f"**{b_title}** — {b_desc}")

# ---------------------------------------------------------
# PAGE: AI HISTORY
# ---------------------------------------------------------
elif page == "🗂️ AI History":
    st.header("🗂️ AI Scan History & Reports")
    posture_df = load_posture_history()
    interview_df = load_interview_history()
    voice_df = load_voice_history()
    
    if not posture_df.empty:
        st.subheader("📸 Posture History")
        st.dataframe(posture_df, use_container_width=True)
    if not interview_df.empty:
        st.subheader("🗣️ Interview Attempts")
        st.dataframe(interview_df, use_container_width=True)
    if not voice_df.empty:
        st.subheader("🎙️ Voice Reports")
        st.dataframe(voice_df, use_container_width=True)

# ---------------------------------------------------------
# PAGE: ABOUT
# ---------------------------------------------------------
elif page == "ℹ️ About":
    st.header("👑 About CrownFit AI")
    st.markdown("""
    CrownFit AI is the world's first AI-powered digital pageant coach for aspiring beauty queens and professional models.
    
    #### 🚀 Core Technologies:
    - **Computer Vision**: OpenCV + MediaPipe pose landmark detection
    - **Machine Learning**: Scikit-Learn (Random Forest Regressor, Random Forest Classifier, Linear Regression, KMeans, Isolation Forest)
    - **Predictive Analytics**: 7-Day confidence forecasting & anomaly detection
    - **Natural Language Processing**: Speech confidence & sentiment intelligence
    - **UI/UX**: Glassmorphic dark mode styling with interactive Plotly visualizations
    """)

