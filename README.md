# 👑 CrownFit - AI-Based Pageant Fitness & Confidence Tracker

**Built a digital coach for future Miss Indias — because confidence deserves data too ✨**

## 🎯 Concept

CrownFit is a personal companion app for aspiring Miss India contestants that helps track fitness, posture, and confidence-building routines with AI-powered scoring.

## ✨ Features

### 📊 Daily Tracker
- Track diet (number of meals)
- Monitor water intake (in glasses)
- Log workouts and physical activity
- Record daily affirmations
- Rate posture and mood

### 🎯 Stage Confidence Score
Generated using intelligent algorithm that combines:
- **Posture Rating** (25%): Your body alignment and positioning
- **Mood** (25%): Mental state and confidence level
- **Steps** (25%): Daily physical movement and activity
- **Hydration** (15%): Water intake throughout the day
- **Workouts** (10%): Dedicated fitness sessions

### 📈 Visualization & Analytics
- 7-day performance trend graph
- Daily activity distribution charts
- Mood analysis pie charts
- Weekly performance metrics
- Progress tracking towards goals

### 🏆 Achievement System
- 👟 **Starter**: Score 50+ (Basic fitness routine)
- 💎 **Confident**: Score 70+ (Stage ready)
- 👑 **Champion**: Score 85+ (Peak performance)
- ✨ **Legend**: Score 95+ (Elite champion)

### 📱 Dashboard
- Real-time confidence scoring
- Latest stats overview
- Weekly performance visualization
- Goal tracking and progress monitoring

## 🚀 Tech Stack

- **Backend**: Python
- **Frontend**: Streamlit (Web Interface)
- **Data**: Pandas + CSV storage
- **Visualization**: Matplotlib
- **Optional**: OpenCV (for future facial posture detection)

## 📋 Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Setup Steps

1. **Navigate to the project directory:**
   ```bash
   cd CrownFit
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the app:**
   ```bash
   streamlit run app.py
   ```

4. **Access the app:**
   - Open your browser and go to `http://localhost:8501`

## 📱 How to Use

### Dashboard (📊)
- View your latest confidence score
- Check water, steps, and mood metrics
- Monitor 7-day performance trend

### Add Entry (➕)
- Log daily metrics (meals, water, workout)
- Rate posture (1-4 scale)
- Select mood (Happy, Confident, Neutral, Nervous, Anxious)
- Add daily affirmation
- System calculates your Stage Confidence Score automatically

### Analytics (📈)
- View performance metrics (average, best score)
- Track water intake and steps over time
- Analyze mood distribution
- Filter by date range

### Goals (🎯)
- View weekly targets
- Track progress towards milestones
- Monitor 7-day averages
- See workout and hydration streaks

### About (ℹ️)
- Learn about CrownFit features
- Understand the scoring algorithm
- View tech stack information

## 📊 Data Storage

All data is stored in `data.csv` with the following columns:
- **Date**: Entry date (YYYY-MM-DD)
- **Meals**: Number of meals consumed
- **Water (glasses)**: Glasses of water consumed
- **Workout**: Yes/No indicator
- **Affirmation**: Daily confidence affirmation
- **Posture**: Rating (1-4)
- **Mood**: Selected mood (Happy, Confident, Neutral, Nervous, Anxious)
- **Steps**: Daily step count
- **Score**: Calculated Stage Confidence Score (0-100)

## 🎨 UI/UX Features

- **Golden & Pink Theme**: Premium pageant vibes
- **Emoji Icons**: Easy navigation and visual appeal
- **Real-time Score**: Instant feedback as you input data
- **Gradient Backgrounds**: Professional appearance
- **Responsive Layout**: Works on all screen sizes
- **Progress Bars**: Visual achievement tracking

## 🔮 Future Enhancements

- [ ] Facial posture detection using OpenCV
- [ ] Camera-based workout tracking
- [ ] AI-powered fitness recommendations
- [ ] Social sharing and leaderboards
- [ ] Mobile app version
- [ ] Voice-based affirmation logging
- [ ] Integration with fitness wearables

## 💡 Recruiter Appeal

**Why CrownFit stands out:**
- ✅ Combines wellness + AI vision + personal branding
- ✅ Purpose-driven application for niche audience
- ✅ Full-stack implementation (data, viz, UI)
- ✅ Production-ready Streamlit deployment
- ✅ Scalable architecture for future features
- ✅ Real data-driven insights and analytics

## 📝 License

MIT License - Feel free to use and modify

## 👑 Made with 💖 for confident queens

---

**Version**: 1.0  
**Status**: Production Ready ✨
