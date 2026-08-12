"""
CrownFit AI - Premium UI Theme & Visualizations
Glassmorphism, Neon Glows, Dark Mode Aesthetics, Plotly Charts & Interactive Gauges
Design Language inspired by Linear, Vercel, Apple Health, Oura Ring, Notion AI, and InterviewOS.
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import numpy as np
import pandas as pd
from typing import Dict, Any, List


def inject_premium_css():
    """Inject ultra-premium Vercel/Apple/Oura/InterviewOS-grade Glassmorphism CSS."""
    css = """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap');
    
    * {
        font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Overall Dark Application Canvas */
    .stApp {
        background-color: #06070d;
        background-image: 
            radial-gradient(at 0% 0%, rgba(255, 42, 133, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(138, 43, 226, 0.18) 0px, transparent 50%),
            radial-gradient(at 50% 100%, rgba(0, 242, 254, 0.10) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(255, 42, 133, 0.10) 0px, transparent 50%);
        background-attachment: fixed;
        color: #f1f5f9;
    }

    /* Hide standard Streamlit header/footer noise for clean luxury feel */
    header[data-testid="stHeader"] {
        background: transparent !important;
    }
    footer {visibility: hidden;}

    /* Sidebar Custom Glass Styling */
    [data-testid="stSidebar"] {
        background: rgba(10, 12, 24, 0.85) !important;
        backdrop-filter: blur(25px) !important;
        -webkit-backdrop-filter: blur(25px) !important;
        border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
    }
    
    [data-testid="stSidebar"] * {
        color: #f1f5f9 !important;
    }

    /* Radio Navigation item styling */
    [data-testid="stSidebar"] div[role="radiogroup"] > label {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 14px;
        padding: 10px 14px;
        margin-bottom: 6px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
    }
    
    [data-testid="stSidebar"] div[role="radiogroup"] > label:hover {
        background: rgba(255, 42, 133, 0.15);
        border-color: rgba(255, 42, 133, 0.4);
        transform: translateX(4px);
    }
    
    [data-testid="stSidebar"] div[role="radiogroup"] input:checked + div {
        color: #ff73b2 !important;
        font-weight: 700;
    }

    /* Glass Cards */
    .glass-card {
        background: rgba(18, 22, 42, 0.65);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 22px;
        padding: 24px;
        box-shadow: 0 10px 35px 0 rgba(0, 0, 0, 0.4);
        transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        margin-bottom: 20px;
    }

    .glass-card:hover {
        transform: translateY(-4px);
        border-color: rgba(255, 42, 133, 0.35);
        box-shadow: 0 14px 45px 0 rgba(255, 42, 133, 0.2);
    }

    /* Top Hero Card */
    .hero-banner {
        background: linear-gradient(135deg, rgba(255, 42, 133, 0.22) 0%, rgba(138, 43, 226, 0.22) 50%, rgba(0, 242, 254, 0.15) 100%);
        backdrop-filter: blur(25px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 26px;
        padding: 36px 32px;
        box-shadow: 0 12px 45px rgba(0, 0, 0, 0.45);
        margin-bottom: 25px;
        position: relative;
        overflow: hidden;
    }

    .hero-title {
        font-size: 2.7rem;
        font-weight: 800;
        background: linear-gradient(135deg, #ffffff 0%, #ff73b2 50%, #00f2fe 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 8px;
        letter-spacing: -0.8px;
    }

    .hero-subtitle {
        font-size: 1.15rem;
        color: #94a3b8;
        font-weight: 400;
        margin-bottom: 0;
    }

    /* Small KPI Cards (InterviewOS style) */
    .kpi-card {
        background: rgba(20, 24, 46, 0.7);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 18px;
        padding: 16px 18px;
        transition: all 0.25s ease;
        position: relative;
        overflow: hidden;
        margin-bottom: 12px;
    }

    .kpi-card:hover {
        transform: translateY(-3px);
        border-color: rgba(0, 242, 254, 0.4);
        box-shadow: 0 8px 30px rgba(0, 242, 254, 0.15);
    }

    .kpi-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
    }

    .kpi-icon {
        font-size: 1.3rem;
        background: rgba(255, 255, 255, 0.06);
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .kpi-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.8px;
    }

    .kpi-value {
        font-size: 1.55rem;
        font-weight: 800;
        color: #ffffff;
        margin-top: 2px;
    }

    .kpi-trend {
        font-size: 0.75rem;
        font-weight: 600;
        margin-top: 4px;
    }

    .trend-up {
        color: #00f2fe;
    }
    .trend-down {
        color: #ff2a85;
    }

    /* Streamlit Metric Overrides */
    [data-testid="stMetric"] {
        background: rgba(20, 24, 46, 0.7) !important;
        border: 1px solid rgba(255, 255, 255, 0.09) !important;
        border-radius: 18px !important;
        padding: 16px 20px !important;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.25) !important;
        transition: all 0.25s ease !important;
    }

    [data-testid="stMetric"]:hover {
        border-color: rgba(255, 42, 133, 0.4) !important;
        transform: translateY(-2px) !important;
    }

    [data-testid="stMetricValue"] {
        color: #00f2fe !important;
        font-size: 1.75rem !important;
        font-weight: 800 !important;
    }

    [data-testid="stMetricLabel"] {
        color: #cbd5e1 !important;
        font-size: 0.88rem !important;
        font-weight: 600 !important;
    }

    /* Custom Gradient Buttons */
    div.stButton > button {
        background: linear-gradient(135deg, #ff2a85 0%, #a855f7 100%) !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 14px !important;
        padding: 12px 28px !important;
        font-weight: 700 !important;
        font-size: 1rem !important;
        letter-spacing: 0.5px !important;
        box-shadow: 0 6px 25px rgba(255, 42, 133, 0.4) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    div.stButton > button:hover {
        transform: translateY(-2px) scale(1.02) !important;
        box-shadow: 0 10px 35px rgba(255, 42, 133, 0.65) !important;
        background: linear-gradient(135deg, #ff4093 0%, #b866ff 100%) !important;
    }

    /* Text Inputs, Text Area, Select Box styling */
    .stTextInput input, .stTextArea textarea, .stSelectbox select, .stNumberInput input {
        background: rgba(15, 18, 35, 0.85) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-radius: 14px !important;
        color: #f1f5f9 !important;
        padding: 12px 14px !important;
    }

    .stTextInput input:focus, .stTextArea textarea:focus {
        border-color: #ff2a85 !important;
        box-shadow: 0 0 16px rgba(255, 42, 133, 0.45) !important;
    }

    /* Floating crown & decorative sparkles */
    @keyframes float {
        0% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-10px) rotate(3deg); }
        100% { transform: translateY(0px) rotate(0deg); }
    }

    @keyframes pulseGlow {
        0% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
        100% { opacity: 0.6; transform: scale(1); }
    }

    .floating-crown {
        animation: float 4s ease-in-out infinite;
        display: inline-block;
    }

    .pulse-glow {
        animation: pulseGlow 3s ease-in-out infinite;
    }

    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        background-color: rgba(15, 18, 35, 0.65);
        border-radius: 16px;
        padding: 6px;
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .stTabs [data-baseweb="tab"] {
        color: #94a3b8;
        border-radius: 12px;
        padding: 10px 20px;
        font-weight: 600;
    }

    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, rgba(255, 42, 133, 0.35) 0%, rgba(168, 85, 247, 0.35) 100%) !important;
        color: #ffffff !important;
        border: 1px solid rgba(255, 42, 133, 0.5) !important;
    }

    /* Landing / Login Card Specific */
    .login-container {
        max-width: 580px;
        margin: 30px auto;
        background: rgba(18, 22, 42, 0.88);
        backdrop-filter: blur(30px);
        border: 1px solid rgba(255, 42, 133, 0.35);
        border-radius: 30px;
        padding: 42px;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.65), 0 0 50px rgba(255, 42, 133, 0.25);
        text-align: center;
    }

    .badge-pill {
        display: inline-block;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        background: rgba(255, 42, 133, 0.15);
        color: #ff73b2;
        border: 1px solid rgba(255, 42, 133, 0.3);
        margin: 4px;
    }

    /* Progress bar custom styling */
    .mission-progress-bar {
        height: 10px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        overflow: hidden;
        margin: 12px 0;
    }

    .mission-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff2a85, #a855f7, #00f2fe);
        border-radius: 6px;
        transition: width 0.5s ease;
    }

    /* Mission Item Styling */
    .mission-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        margin-bottom: 8px;
        transition: all 0.2s ease;
    }
    .mission-item:hover {
        background: rgba(0, 242, 254, 0.08);
        border-color: rgba(0, 242, 254, 0.25);
    }
    </style>
    """
    st.markdown(css, unsafe_allow_html=True)


def render_readiness_gauge(score: float, title: str = "Pageant Readiness Index"):
    """Render a large luxury animated circular gauge using Plotly."""
    score = float(score)
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=score,
        title={'text': f"<b>{title}</b>", 'font': {'size': 20, 'color': '#ffffff', 'family': 'Outfit'}},
        delta={'reference': 75, 'increasing': {'color': '#00f2fe'}},
        number={'suffix': "/100", 'font': {'size': 44, 'color': '#ff73b2', 'family': 'Outfit', 'weight': 'bold'}},
        gauge={
            'axis': {'range': [0, 100], 'tickwidth': 2, 'tickcolor': "rgba(255, 255, 255, 0.3)"},
            'bar': {'color': "#ff2a85", 'thickness': 0.25},
            'bgcolor': "rgba(20, 24, 45, 0.6)",
            'borderwidth': 2,
            'bordercolor': "rgba(255, 255, 255, 0.1)",
            'steps': [
                {'range': [0, 50], 'color': 'rgba(239, 68, 68, 0.25)'},
                {'range': [50, 75], 'color': 'rgba(234, 179, 8, 0.25)'},
                {'range': [75, 90], 'color': 'rgba(168, 85, 247, 0.25)'},
                {'range': [90, 100], 'color': 'rgba(0, 242, 254, 0.3)'}
            ],
            'threshold': {
                'line': {'color': "#00f2fe", 'width': 4},
                'thickness': 0.8,
                'value': 90
            }
        }
    ))

    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font={'color': "#f1f5f9", 'family': "Outfit"},
        margin=dict(l=20, r=20, t=50, b=20),
        height=290
    )
    return fig


def render_radar_chart(categories: List[str], values: List[float], title: str = "Readiness Breakdown"):
    """Render a Plotly dark radar chart for multi-dimensional readiness."""
    fig = go.Figure()

    fig.add_trace(go.Scatterpolar(
        r=values + [values[0]],
        theta=categories + [categories[0]],
        fill='toself',
        fillcolor='rgba(255, 42, 133, 0.25)',
        line=dict(color='#ff2a85', width=3),
        name='Current Index'
    ))

    fig.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 100],
                color='rgba(255, 255, 255, 0.4)',
                gridcolor='rgba(255, 255, 255, 0.1)'
            ),
            angularaxis=dict(
                color='#f1f5f9',
                gridcolor='rgba(255, 255, 255, 0.1)',
                tickfont=dict(size=12, family='Outfit')
            ),
            bgcolor='rgba(15, 18, 35, 0.5)'
        ),
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        title=dict(text=title, font=dict(size=18, color='#ffffff', family='Outfit')),
        margin=dict(l=40, r=40, t=40, b=40),
        height=340
    )
    return fig


def render_feature_importance_chart(importances: Dict[str, float]):
    """Render horizontal bar chart for ML Feature Importances."""
    df_imp = pd.DataFrame(list(importances.items()), columns=['Feature', 'Importance']).sort_values('Importance', ascending=True)
    
    fig = px.bar(
        df_imp,
        x='Importance',
        y='Feature',
        orientation='h',
        color='Importance',
        color_continuous_scale=['#8a2be2', '#ff2a85', '#00f2fe'],
        title="<b>ML Feature Importance (Random Forest)</b>"
    )
    
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(15, 18, 35, 0.5)',
        font=dict(color='#f1f5f9', family='Outfit'),
        coloraxis_showscale=False,
        margin=dict(l=20, r=20, t=40, b=20),
        height=320,
        xaxis=dict(gridcolor='rgba(255,255,255,0.1)'),
        yaxis=dict(gridcolor='rgba(255,255,255,0.1)')
    )
    return fig


def render_pca_cluster_chart(pca_coords: List[List[float]], clusters: List[int], cluster_map: Dict[int, str]):
    """Render 2D PCA projection scatter plot for KMeans user clusters."""
    pca_arr = np.array(pca_coords)
    cluster_names = [cluster_map.get(c, f"Cluster {c}") for c in clusters]
    
    df_cluster = pd.DataFrame({
        'PCA1': pca_arr[:, 0],
        'PCA2': pca_arr[:, 1],
        'Cluster': cluster_names
    })
    
    fig = px.scatter(
        df_cluster,
        x='PCA1',
        y='PCA2',
        color='Cluster',
        color_discrete_sequence=['#00f2fe', '#ff2a85', '#a855f7', '#ffd700'],
        title="<b>KMeans PCA 2D Behavioral Clusters</b>",
        hover_data=['Cluster']
    )
    
    fig.update_traces(marker=dict(size=12, opacity=0.8, line=dict(width=1, color='#ffffff')))
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(15, 18, 35, 0.5)',
        font=dict(color='#f1f5f9', family='Outfit'),
        margin=dict(l=20, r=20, t=40, b=20),
        height=340,
        xaxis=dict(gridcolor='rgba(255,255,255,0.1)'),
        yaxis=dict(gridcolor='rgba(255,255,255,0.1)')
    )
    return fig


def render_regression_forecast_chart(historical_dates: List[str], historical_scores: List[float], forecast_scores: List[float]):
    """Render 7-day Linear Regression confidence forecast graph."""
    last_date = pd.to_datetime(historical_dates[-1]) if historical_dates else pd.to_datetime('now')
    future_dates = [(last_date + pd.Timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, 8)]
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=historical_dates[-15:],
        y=historical_scores[-15:],
        mode='lines+markers',
        name='Historical Confidence',
        line=dict(color='#ff2a85', width=3),
        marker=dict(size=8, color='#ff73b2')
    ))
    
    # Bridge line
    fig.add_trace(go.Scatter(
        x=[historical_dates[-1], future_dates[0]],
        y=[historical_scores[-1], forecast_scores[0]],
        mode='lines',
        showlegend=False,
        line=dict(color='#00f2fe', width=3, dash='dash')
    ))
    
    fig.add_trace(go.Scatter(
        x=future_dates,
        y=forecast_scores,
        mode='lines+markers',
        name='7-Day ML Forecast',
        line=dict(color='#00f2fe', width=3, dash='dot'),
        marker=dict(size=9, color='#00f2fe', symbol='star')
    ))
    
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(15, 18, 35, 0.5)',
        font=dict(color='#f1f5f9', family='Outfit'),
        title="<b>Linear Regression: 7-Day Confidence Forecast</b>",
        margin=dict(l=20, r=20, t=40, b=20),
        height=320,
        xaxis=dict(gridcolor='rgba(255,255,255,0.1)'),
        yaxis=dict(gridcolor='rgba(255,255,255,0.1)', range=[0, 100])
    )
    return fig


def render_confusion_matrix_heatmap(matrix: List[List[int]], classes: List[str]):
    """Render confusion matrix heatmap for Mood Classifier."""
    fig = px.imshow(
        matrix,
        x=classes,
        y=classes,
        color_continuous_scale=['#0f1223', '#8a2be2', '#ff2a85'],
        text_auto=True,
        title="<b>Random Forest Mood Classifier Confusion Matrix</b>"
    )
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(15, 18, 35, 0.5)',
        font=dict(color='#f1f5f9', family='Outfit'),
        margin=dict(l=20, r=20, t=40, b=20),
        height=320
    )
    return fig


def render_decision_tree_graph(tree_rules: List[Dict[str, Any]]):
    """Render horizontal bar chart for Decision Tree Habit Recommendations."""
    df_tree = pd.DataFrame(tree_rules)
    fig = px.bar(
        df_tree,
        x="TargetValue",
        y="Habit",
        color="Impact",
        color_continuous_scale=["#a855f7", "#00f2fe"],
        title="<b>Decision Tree: Personalized Habit Impact Rules</b>",
        orientation="h"
    )
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(15, 18, 35, 0.5)',
        font=dict(color='#f1f5f9', family='Outfit'),
        margin=dict(l=20, r=20, t=40, b=20),
        height=300
    )
    return fig


def render_multi_metric_trend_chart(df: pd.DataFrame):
    """Render executive multi-metric trend chart for Analytics Page."""
    fig = go.Figure()
    
    if "Date" in df.columns:
        x_vals = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
    else:
        x_vals = list(range(len(df)))

    if "Score" in df.columns:
        fig.add_trace(go.Scatter(x=x_vals, y=df["Score"], mode="lines+markers", name="Readiness Score", line=dict(color="#ff2a85", width=3)))
    if "Water (glasses)" in df.columns:
        fig.add_trace(go.Scatter(x=x_vals, y=df["Water (glasses)"] * 10, mode="lines+markers", name="Hydration (% of target)", line=dict(color="#00f2fe", width=2)))
    if "Sleep" in df.columns:
        fig.add_trace(go.Scatter(x=x_vals, y=df["Sleep"] * 10, mode="lines+markers", name="Sleep (scaled)", line=dict(color="#a855f7", width=2)))
        
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(15, 18, 35, 0.5)',
        font=dict(color='#f1f5f9', family='Outfit'),
        title="<b>Executive Readiness & Wellness Trends Over Time</b>",
        margin=dict(l=20, r=20, t=40, b=20),
        height=350,
        xaxis=dict(gridcolor='rgba(255,255,255,0.1)'),
        yaxis=dict(gridcolor='rgba(255,255,255,0.1)', range=[0, 100])
    )
    return fig
