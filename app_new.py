import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime, timedelta
import os
import json
import cv2
from PIL import Image
import mediapipe as mp

# ---------------------------------------------------------
# PAGE CONFIG
# ---------------------------------------------------------
st.set_page_config(
    page_title="CrownFit - AI Pageant Fitness Tracker",
    page_icon="👑",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ---------------------------------------------------------
# CUSTOM CSS
# ---------------------------------------------------------
st.markdown("""
    <style>
    .stApp {
        background-color: #e91e63;
    }
    [data-testid="stSidebar"] {
        background-color: #F3E5FF;
    }
    .main-title {
        text-align: center;
        color: #ffffff;
        font-size: 3em;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        margin-bottom: 10px;
    }
    .tagline {
        text-align: center;
        color: #ffffff;
        font-size: 1.2em;
        margin-bottom: 30px;
        font-weight: 600;
    }
    .score-card {
        background: linear-gradient(135deg, #ff69b4 0%, #ff1493 100%);
        color: #ffffff;
        padding: 20px;
        border-radius: 15px;
        text-align: center;
        font-size: 2em;
        font-weight: bold;
        margin: 20px 0;
        box-shadow: 0 4px 15px rgba(255, 20, 147, 0.3);
    }
    [data-testid="stMetricValue"] {
        color: #ffffff !important;
    }
    [data-testid="stMetricLabel"] {
        color: #ffffff !important;
    }
    h1, h2, h3 {
        color: #ffffff !important;
    }
    p {
        color: #ffffff !important;
    }
    body {
        color: #ffffff;
    }
    [data-testid="stSidebar"] p {
        color: #000000 !important;
    }
    [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2 {
        color: #000000 !important;
    }
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] {
        color: #000000 !important;
    }
    </style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------
# POSTURE DETECTION CLASS
# ---------------------------------------------------------
class PostureDetector:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
    
    def calculate_angle(self, a, b, c):
        """Calculate angle between three points"""
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)
        
        ba = a - b
        bc = c - b
        
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        return np.degrees(angle)
    
    def detect_posture(self, image):
        """Detect posture from image and return score"""
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(image_rgb)
        
        posture_score = 0
        feedback = []
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Get key points
            left_shoulder = [landmarks[11].x, landmarks[11].y]
            right_shoulder = [landmarks[12].x, landmarks[12].y]
            left_hip = [landmarks[23].x, landmarks[23].y]
            right_hip = [landmarks[24].x, landmarks[24].y]
            head = [landmarks[0].x, landmarks[0].y]
            
            # Check spine alignment (neck to hip)
            left_spine_angle = self.calculate_angle(left_shoulder, left_hip, head)
            right_spine_angle = self.calculate_angle(right_shoulder, right_hip, head)
            
            # Check shoulder level
            shoulder_diff = abs(left_shoulder[1] - right_shoulder[1])
            
            # Check hip level
            hip_diff = abs(left_hip[1] - right_hip[1])
            
            # Calculate posture score (0-100)
            spine_score = 100 - abs(175 - (left_spine_angle + right_spine_angle) / 2) / 1.75
            spine_score = max(0, min(100, spine_score))
            
            alignment_score = 100 - (shoulder_diff + hip_diff) * 500
            alignment_score = max(0, min(100, alignment_score))
            
            posture_score = int((spine_score + alignment_score) / 2)
            
            # Generate feedback
            if spine_score < 70:
                feedback.append("📌 Keep your spine straighter!")
            else:
                feedback.append("✅ Great spine alignment!")
            
            if shoulder_diff > 0.1:
                feedback.append("⚖️ Level your shoulders!")
            else:
                feedback.append("✅ Perfect shoulder alignment!")
            
            if hip_diff > 0.1:
                feedback.append("⚖️ Keep your hips level!")
            else:
                feedback.append("✅ Perfect hip alignment!")
            
            # Draw pose on image
            annotated_image = image.copy()
            self.mp_drawing.draw_landmarks(
                annotated_image,
                results.pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                self.mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2)
            )
            
            return posture_score, feedback, annotated_image
        
        return 0, ["No pose detected. Please position yourself clearly in frame."], image

# ---------------------------------------------------------
# DATA MANAGEMENT
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

def calculate_stage_confidence_score(posture, mood, steps, water, workout_done):
    """
    Calculate Stage Confidence Score (0-100)
    Formula: (Posture × 25) + (Mood × 25) + (Steps/100 × 25) + (Water × 5) + (Workout × 20)
    """
    posture_score = min(posture * 25, 25) if posture else 0
    mood_score = {"Happy": 25, "Neutral": 15, "Nervous": 5, "Confident": 25, "Anxious": 0}.get(mood, 0)
    steps_score = min((steps / 100) * 25, 25) if steps > 0 else 0
    water_score = min(water * 5, 25)
    workout_score = 20 if workout_done else 0
    
    total_score = posture_score + mood_score + steps_score + water_score + workout_score
    return min(total_score, 100)

# ---------------------------------------------------------
# SIDEBAR NAVIGATION
# ---------------------------------------------------------
st.sidebar.markdown("# 👑 CrownFit 👑")
st.sidebar.markdown("---")

page = st.sidebar.radio(
    "Navigate to:",
    ["📊 Dashboard", "➕ Add Entry", "📈 Analytics", "🎯 Goals", "📸 Posture Check", "ℹ️ About"]
)

# ---------------------------------------------------------
# MAIN PAGE
# ---------------------------------------------------------
st.markdown('<div class="main-title">👑 CrownFit 👑</div>', unsafe_allow_html=True)
st.markdown('<div class="tagline"> Fitness designed for queens in the making ✨</div>', unsafe_allow_html=True)
st.markdown("---")

# ---------------------------------------------------------
# PAGE: DASHBOARD
# ---------------------------------------------------------
if page == "📊 Dashboard":
    st.header("📊 Your Fitness Dashboard")
    
    df = load_data()
    
    if len(df) == 0:
        st.info("👋 Welcome! Start by adding your first entry to track your journey.")
    else:
        # Latest Stats
        latest = df.iloc[-1]
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "🎯 Today's Score",
                f"{latest['Score']:.0f}/100" if pd.notna(latest['Score']) else "N/A",
                delta="Stage Ready!" if pd.notna(latest['Score']) and latest['Score'] >= 70 else "Keep going!"
            )
        
        with col2:
            st.metric(
                "💧 Water Intake",
                f"{latest['Water (glasses)']:.0f} glasses" if pd.notna(latest['Water (glasses)']) else "0 glasses"
            )
        
        with col3:
            st.metric(
                "🚶 Steps",
                f"{latest['Steps']:.0f}" if pd.notna(latest['Steps']) else "0"
            )
        
        with col4:
            mood_emoji = {"Happy": "😊", "Confident": "💪", "Neutral": "😐", "Nervous": "😰", "Anxious": "😟"}.get(latest['Mood'], "😊")
            st.metric(
                "😊 Mood",
                f"{mood_emoji} {latest['Mood']}" if pd.notna(latest['Mood']) else "Not logged"
            )
        
        # Weekly Performance Graph
        st.subheader("📈 Weekly Performance")
        
        df['Date'] = pd.to_datetime(df['Date'])
        last_7_days = df[df['Date'] >= datetime.now() - timedelta(days=7)].copy()
        
        if len(last_7_days) > 0:
            fig, ax = plt.subplots(figsize=(12, 5))
            ax.plot(last_7_days['Date'], last_7_days['Score'], marker='o', linewidth=2.5, 
                   color='#ff1493', markersize=8, label='Confidence Score')
            ax.fill_between(last_7_days['Date'], last_7_days['Score'], alpha=0.3, color='#ff69b4')
            ax.set_ylabel('Score (0-100)', fontsize=12, color='#ffffff')
            ax.set_xlabel('Date', fontsize=12, color='#ffffff')
            ax.set_ylim(0, 100)
            ax.grid(True, alpha=0.3, color='#ff69b4')
            ax.legend()
            fig.patch.set_facecolor('#e91e63')
            ax.set_facecolor('#c2185b')
            plt.tight_layout()
            st.pyplot(fig)
        else:
            st.info("Not enough data yet. Add entries to see your weekly performance!")

# ---------------------------------------------------------
# PAGE: ADD ENTRY
# ---------------------------------------------------------
elif page == "➕ Add Entry":
    st.header("➕ Log Your Progress")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("🍽️ Nutrition & Hydration")
        meals = st.number_input("Number of meals today:", min_value=0, max_value=6, step=1)
        water = st.slider("Water intake (glasses):", 0, 15, 8)
    
    with col2:
        st.subheader("💪 Physical Activity")
        workout = st.selectbox("Did you workout today?", ["Yes", "No"])
        workout_done = workout == "Yes"
        steps = st.number_input("Steps walked today:", min_value=0, step=100)
    
    st.subheader("🧠 Mental & Posture")
    col1, col2 = st.columns(2)
    
    with col1:
        posture = st.slider("Posture rating (1-4, where 4 is excellent):", 1, 4, 3)
        mood = st.selectbox("How's your mood?", ["Happy", "Confident", "Neutral", "Nervous", "Anxious"])
    
    with col2:
        affirmation = st.text_area("Daily affirmation:", placeholder="E.g., 'I am strong and confident'")
    
    # Calculate Score
    score = calculate_stage_confidence_score(posture, mood, steps, water, workout_done)
    
    st.markdown(f'<div class="score-card">🎯 Your Stage Confidence Score: {score:.0f}/100</div>', 
                unsafe_allow_html=True)
    
    # Submit Button
    if st.button("✅ Save Entry", key="save_entry", use_container_width=True):
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
        
        st.success("✨ Entry saved successfully!")
        st.balloons()

# ---------------------------------------------------------
# PAGE: ANALYTICS
# ---------------------------------------------------------
elif page == "📈 Analytics":
    st.header("📈 Detailed Analytics")
    
    df = load_data()
    
    if len(df) == 0:
        st.info("No data yet. Start logging to see analytics!")
    else:
        df['Date'] = pd.to_datetime(df['Date'])
        
        # Filters
        col1, col2 = st.columns(2)
        with col1:
            date_range = st.date_input(
                "Select date range:",
                value=(datetime.now() - timedelta(days=30), datetime.now()),
                max_value=datetime.now()
            )
        
        # Filter data
        if isinstance(date_range, tuple) and len(date_range) == 2:
            filtered_df = df[(df['Date'].dt.date >= date_range[0]) & (df['Date'].dt.date <= date_range[1])]
        else:
            filtered_df = df
        
        if len(filtered_df) > 0:
            # Performance Metrics
            st.subheader("📊 Performance Metrics")
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                avg_score = filtered_df['Score'].mean()
                st.metric("Average Score", f"{avg_score:.0f}/100")
            
            with col2:
                max_score = filtered_df['Score'].max()
                st.metric("Best Score", f"{max_score:.0f}/100")
            
            with col3:
                avg_water = filtered_df['Water (glasses)'].mean()
                st.metric("Avg Water", f"{avg_water:.1f} glasses")
            
            with col4:
                avg_steps = filtered_df['Steps'].mean()
                st.metric("Avg Steps", f"{avg_steps:.0f}")
            
            # Charts
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("Confidence Score Trend")
                fig, ax = plt.subplots(figsize=(10, 5))
                ax.plot(filtered_df['Date'], filtered_df['Score'], marker='o', color='#ff1493', linewidth=2.5)
                ax.fill_between(filtered_df['Date'], filtered_df['Score'], alpha=0.3, color='#ff69b4')
                ax.set_ylabel('Score', color='#ffffff')
                ax.set_xlabel('Date', color='#ffffff')
                ax.grid(True, alpha=0.3, color='#ff69b4')
                fig.patch.set_facecolor('#e91e63')
                ax.set_facecolor('#c2185b')
                plt.tight_layout()
                st.pyplot(fig)
            
            with col2:
                st.subheader("Daily Activity Distribution")
                fig, ax = plt.subplots(figsize=(10, 5))
                ax.bar(filtered_df['Date'], filtered_df['Steps'], color='#ff69b4', alpha=0.7, label='Steps')
                ax.bar(filtered_df['Date'], filtered_df['Water (glasses)'] * 200, color='#ff1493', alpha=0.7, label='Water (glasses × 200)')
                ax.set_ylabel('Count', color='#ffffff')
                ax.set_xlabel('Date', color='#ffffff')
                ax.legend()
                ax.grid(True, alpha=0.3, color='#ff69b4')
                fig.patch.set_facecolor('#e91e63')
                ax.set_facecolor('#c2185b')
                plt.tight_layout()
                st.pyplot(fig)
            
            # Mood Analysis
            st.subheader("😊 Mood Distribution")
            mood_counts = filtered_df['Mood'].value_counts()
            fig, ax = plt.subplots(figsize=(10, 5))
            colors = ['#ff1493', '#ff69b4', '#ffb3d9', '#ffd6e8', '#fff0f5']
            ax.pie(mood_counts, labels=mood_counts.index, autopct='%1.1f%%', colors=colors, startangle=90)
            fig.patch.set_facecolor('#e91e63')
            st.pyplot(fig)
        else:
            st.warning("No data in selected date range.")

# ---------------------------------------------------------
# PAGE: GOALS
# ---------------------------------------------------------
elif page == "🎯 Goals":
    st.header("🎯 Your Pageant Fitness Goals")
    
    st.subheader("✨ Weekly Targets")
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.info("💧 **Water Goal**: 8+ glasses daily")
    
    with col2:
        st.info("🚶 **Steps Goal**: 10,000+ daily")
    
    with col3:
        st.info("💪 **Workout Goal**: 5+ days/week")
    
    st.subheader("🏆 Confidence Milestones")
    
    milestones = [
        ("👟 Starter", "Score 50+ (Basic fitness routine)", 50),
        ("💎 Confident", "Score 70+ (Stage ready)", 70),
        ("👑 Champion", "Score 85+ (Peak performance)", 85),
        ("✨ Legend", "Score 95+ (Elite champion)", 95),
    ]
    
    for emoji_title, desc, target in milestones:
        st.write(f"**{emoji_title}** - {desc}")
        st.progress(min(target / 100, 1.0), text=f"{target} points")
    
    # Progress Tracker
    st.subheader("📈 Your Progress")
    df = load_data()
    
    if len(df) > 0:
        df['Date'] = pd.to_datetime(df['Date'])
        last_7_days = df[df['Date'] >= datetime.now() - timedelta(days=7)]
        
        if len(last_7_days) > 0:
            col1, col2, col3 = st.columns(3)
            
            with col1:
                avg_score = last_7_days['Score'].mean()
                progress = min(avg_score / 85, 1.0)
                st.metric("7-Day Avg Score", f"{avg_score:.0f}/100")
                st.progress(progress)
            
            with col2:
                water_days = len(last_7_days[last_7_days['Water (glasses)'] >= 8])
                st.metric("Days with 8+ Glasses", f"{water_days}/7")
                st.progress(water_days / 7)
            
            with col3:
                workout_days = len(last_7_days[last_7_days['Workout'] == 'Yes'])
                st.metric("Workout Days", f"{workout_days}/7")
                st.progress(workout_days / 7)
    else:
        st.info("Start logging to track your progress!")

# ---------------------------------------------------------
# PAGE: POSTURE CHECK (OpenCV)
# ---------------------------------------------------------
elif page == "📸 Posture Check":
    st.header("📸 AI Posture Detection")
    st.info("💡 Use your camera or upload a photo to get real-time posture feedback powered by MediaPipe!")
    
    posture_detector = PostureDetector()
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📷 Upload Photo")
        uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])
        
        if uploaded_file is not None:
            image = Image.open(uploaded_file)
            image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            posture_score, feedback, annotated_image = posture_detector.detect_posture(image_cv)
            
            st.image(annotated_image, caption="Pose Detection Result", use_column_width=True)
            
            with col2:
                st.subheader("📊 Results")
                st.markdown(f'<div class="score-card">Posture Score: {posture_score}/100</div>', 
                           unsafe_allow_html=True)
                
                st.subheader("💬 Feedback")
                for item in feedback:
                    st.write(item)
                
                # Option to save this posture rating
                if st.button("💾 Use this posture score for today", use_container_width=True):
                    st.session_state.detected_posture = posture_score
                    st.success(f"✅ Posture score {posture_score}/100 saved! Go to 'Add Entry' to save your daily log.")
    
    # Display info
    st.subheader("ℹ️ How It Works")
    st.markdown("""
    - **Spine Alignment**: Detects if your spine is straight (ideal: 170-180°)
    - **Shoulder Level**: Ensures both shoulders are at the same height
    - **Hip Level**: Checks if hips are properly aligned
    - **Overall Score**: Combines all metrics for your posture rating
    
    **Tips for best results:**
    - Stand straight and face the camera
    - Ensure good lighting
    - Full body should be visible in frame
    - Keep a confident stance
    """)

# ---------------------------------------------------------
# PAGE: ABOUT
# ---------------------------------------------------------
elif page == "ℹ️ About":
    st.header("About CrownFit")
    
    st.markdown("""
    ### 👑 Your Personal Pageant Fitness Companion
    
    CrownFit is an AI-powered fitness and confidence tracking app designed specifically for aspiring Miss India contestants.
    
    #### 🎯 What We Offer:
    - **Daily Tracking**: Diet, water intake, workouts, and confidence affirmations
    - **Stage Confidence Score**: AI-generated score based on posture, mood, and physical activity
    - **Analytics & Insights**: Beautiful visualizations to track your progress
    - **Goal Setting**: Milestone-based achievements to keep you motivated
    - **AI Posture Detection**: Real-time posture feedback using MediaPipe
    
    #### 💡 How It Works:
    The Stage Confidence Score combines:
    - **Posture Rating** (25%): Your body positioning and alignment
    - **Mood Tracking** (25%): Mental state and confidence level
    - **Steps & Activity** (25%): Daily physical movement
    - **Hydration** (15%): Water intake
    - **Workouts** (10%): Dedicated fitness sessions
    
    #### 🚀 Features:
    - 📊 Real-time confidence scoring
    - 📈 Weekly performance tracking
    - 🎨 Beautiful data visualizations
    - 🏆 Achievement milestones
    - 💪 Personalized fitness coaching
    - 📸 AI-powered posture detection
    
    
    **Tagline**: * Fitness designed for queens in the making ✨*
    
    Made with 💖 for confident queens
    """)
    
    st.divider()
    st.success("Version 2.0 - AI Posture Detection Enabled ✨")
