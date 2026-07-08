import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime, timedelta
import os
import cv2
from PIL import Image
from posture_detection import PostureDetector

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
# POSTURE DETECTION
# ---------------------------------------------------------
# Posture detection logic is implemented in posture_detection.py.
# The imported class handles MediaPipe pose detection and scoring.

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
    """
    Calculate Stage Confidence Score (0-100).
    Formula weights:
      - 25% posture
      - 25% mood
      - 25% steps
      - 15% water
      - 10% workout
    """
    posture_score = (posture / 4) * 25 if posture else 0
    mood_score = {"Happy": 25, "Neutral": 15, "Nervous": 5, "Confident": 25, "Anxious": 0}.get(mood, 0)
    steps_score = min((steps / 10000) * 25, 25) if steps > 0 else 0
    water_score = min((water / 8) * 15, 15) if water > 0 else 0
    workout_score = 10 if workout_done else 0
    
    total_score = posture_score + mood_score + steps_score + water_score + workout_score
    return min(total_score, 100)

def get_posture_chatbot_response(message, posture_score=None):
    """Return a chatbot response, using OpenAI when available."""
    prompt = message.strip()
    if not prompt:
        return "Ask me a question about posture, alignment, or how to improve your form."

    if OPENAI_AVAILABLE:
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful posture and pageant fitness assistant. "
                            "Answer user questions accurately, provide actionable health and beauty tips, "
                            "and explain things clearly. If the user asks a general lifestyle question, answer it directly."
                        )
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=350,
                temperature=0.8,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"I couldn't fetch an AI response right now. Please try again or ask a simpler question. (Error: {e})"

    prompt_lower = prompt.lower()
    if "hair" in prompt_lower or "hair care" in prompt_lower:
        return "For hair care, keep your scalp healthy by washing with a gentle shampoo, conditioning regularly, minimizing heat styling, and using a wide-tooth comb to detangle. Drink plenty of water and eat a balanced diet for strong hair."
    if "skin" in prompt_lower or "skincare" in prompt_lower or "acne" in prompt_lower:
        return "For skincare, cleanse gently, hydrate daily, and apply SPF every morning. If acne or sensitivity is an issue, use non-comedogenic products and consider seeing a dermatologist."
    if "makeup" in prompt_lower or "beauty" in prompt_lower:
        return "For makeup, start with a smooth, moisturized base, choose products that suit your skin type, and blend carefully. Highlight one feature at a time for a polished look."
    if "diet" in prompt_lower or "nutrition" in prompt_lower:
        return "A balanced diet with lean protein, fruits, vegetables, whole grains, and healthy fats supports energy, skin, hair, and recovery. Hydration is also key."
    if "sleep" in prompt_lower or "rest" in prompt_lower:
        return "Aim for 7-9 hours of sleep each night, keep a regular bedtime, and avoid screens before bed. Good sleep supports recovery, mood, and focus."
    if "confidence" in prompt_lower or "mindset" in prompt_lower:
        return "Build confidence by setting small daily goals, celebrating progress, and practicing positive self-talk. Posture and presence also influence how confident you feel."
    if "pageant" in prompt_lower or "stage" in prompt_lower:
        return "Pageant prep is about confidence, posture, and presence. Practice your walk, rehearse answers, and maintain strong alignment so you look composed on stage."
    if "shoulder" in prompt_lower:
        return "Keep your shoulders level and relaxed. Roll them back and down, then check your posture again to avoid tension."
    if "hip" in prompt_lower or "pelvis" in prompt_lower:
        return "Keep your hips square and avoid tilting. A strong core and glute activation help maintain an even stance."
    if "spine" in prompt_lower or "back" in prompt_lower:
        return "Stand tall with your spine elongated, shoulders over hips, and head aligned over your neck. Imagine a string pulling your crown upward."
    if "score" in prompt_lower:
        if posture_score is not None:
            if posture_score >= 80:
                return f"Your posture score is {posture_score}/100 — great job! Keep maintaining this alignment."
            if posture_score >= 50:
                return f"Your posture score is {posture_score}/100. You're on the right track; focus on small alignment improvements each day."
            return f"Your posture score is {posture_score}/100. Try standing straighter, keeping your shoulders level, and aligning your hips."
        return "I can help with posture advice, but first upload a photo so I can see your current alignment."
    if "improve" in prompt_lower or "better" in prompt_lower or "fix" in prompt_lower:
        return "To improve posture, practice standing with your weight distributed evenly on both feet, relax your shoulders, and engage your core. Repeat posture checks daily."
    if "tips" in prompt_lower or "advice" in prompt_lower:
        return "Keep your chin tucked slightly, shoulders relaxed, and imagine a line from your ears through your shoulders to your hips. Small corrections matter."
    if "neck" in prompt_lower:
        return "Avoid jutting your chin forward. Keep your head centered over your shoulders and your gaze level."
    if "camera" in prompt_lower or "photo" in prompt_lower or "upload" in prompt_lower:
        return "Use good lighting, stand straight, and make sure your full upper body is visible for the best posture detection."
    return "I can answer general fitness, beauty, posture, and pageant preparation questions. Ask me anything and I’ll do my best to help."
# ---------------------------------------------------------
# SESSION STATE / SIDEBAR NAVIGATION
# ---------------------------------------------------------
if "detected_posture_score" not in st.session_state:
    st.session_state.detected_posture_score = None
if "detected_posture_rating" not in st.session_state:
    st.session_state.detected_posture_rating = None
if "posture_chatbot_history" not in st.session_state:
    st.session_state.posture_chatbot_history = []

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
st.markdown('<div class="tagline">Built a digital coach for future Miss Indias — because confidence deserves data too ✨</div>', unsafe_allow_html=True)
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
        default_posture = st.session_state.detected_posture_rating or 3
        posture = st.slider("Posture rating (1-4, where 4 is excellent):", 1, 4, default_posture)
        if st.session_state.detected_posture_score is not None:
            st.info(
                f"Detected posture score {st.session_state.detected_posture_score}/100 has been saved. "
                f"Rating {st.session_state.detected_posture_rating} will be used unless adjusted."
            )
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
    posture_score = None
    
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
                    st.session_state.detected_posture_score = posture_score
                    st.session_state.detected_posture_rating = posture_score_to_rating(posture_score)
                    st.success(f"✅ Posture score {posture_score}/100 saved! Go to 'Add Entry' to save your daily log.")
    
    st.subheader("🤖 Posture Coach Chatbot")
    if OPENAI_AVAILABLE:
        st.success("OpenAI chatbot enabled: ask anything and get a broader answer.")
    else:
        st.info("OpenAI not enabled. The chatbot can still answer common posture and beauty questions locally.")
    st.markdown("Ask the assistant for posture tips, alignment advice, or support with your score.")
    
    chat_col1, chat_col2 = st.columns([3, 1])
    with chat_col1:
        user_query = st.text_input("Ask the coach a question:", key="posture_chatbot_query")
        if st.button("Send", key="posture_chatbot_send"):
            if user_query.strip():
                assistant_response = get_posture_chatbot_response(user_query, posture_score or st.session_state.detected_posture_score)
                st.session_state.posture_chatbot_history.append(("You", user_query.strip()))
                st.session_state.posture_chatbot_history.append(("Coach", assistant_response))
            else:
                st.warning("Please type a question before sending.")
    with chat_col2:
        if st.button("Clear chat", key="posture_chatbot_clear"):
            st.session_state.posture_chatbot_history = []

    if st.session_state.posture_chatbot_history:
        for speaker, message in st.session_state.posture_chatbot_history:
            if speaker == "You":
                st.markdown(f"**You:** {message}")
            else:
                st.markdown(f"**Coach:** {message}")
    else:
        st.info("Start the conversation by asking the coach about shoulders, hips, spine, or score improvement.")
    
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
    
    #### 📱 Tech Stack:
    - Python + Streamlit (Web Interface)
    - Pandas (Data Management)
    - Matplotlib (Visualizations)
    - MediaPipe + OpenCV (AI Posture Detection)
    
    ---
    
    **Tagline**: *Built a digital coach for future Miss Indias — because confidence deserves data too ✨*
    
    Made with 💖 for confident queens
    """)
    
    st.divider()
    st.success("Version 2.0 - AI Posture Detection Enabled ✨")
