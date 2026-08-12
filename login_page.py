"""
login_page.py
─────────────
Animated Landing & Login Page for CrownFit AI - The World's First AI-Powered Pageant Operating System.
Called by app.py before any other content is rendered.
"""

import streamlit as st
from crownfit_db import save_user_profile


def show_login_page() -> None:
    """Render the animated CrownFit AI Landing & Login page."""

    # ── Landing Page Header & Hero Section ──────────────────────────────────
    st.markdown(
        """
        <div style="text-align: center; max-width: 900px; margin: 20px auto 40px auto; padding: 0 15px;">
            <div style="font-size: 5rem; margin-bottom: 12px;" class="floating-crown">👑</div>
            <div style="
                font-size: 3.5rem;
                font-weight: 900;
                background: linear-gradient(135deg, #ffffff 0%, #ff73b2 40%, #a855f7 70%, #00f2fe 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                letter-spacing: -1px;
                line-height: 1.15;
                margin-bottom: 14px;
            ">CrownFit AI</div>
            <div style="font-size: 1.35rem; color: #94a3b8; font-weight: 500; margin-bottom: 24px;">
                The World's First AI-Powered Pageant Operating System.
            </div>
            <!-- Feature badges removed as requested -->
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Statistics Section ──────────────────────────────────────────────────
    col_stat1, col_stat2 = st.columns(2)
    with col_stat1:
        st.markdown(
            """
            <div class="glass-card" style="text-align: center; padding: 20px;">
                <div style="font-size: 2.2rem; font-weight: 800; color: #00f2fe;">95%</div>
                <div style="font-size: 0.9rem; color: #cbd5e1; font-weight: 600;">Prediction Accuracy</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with col_stat2:
        st.markdown(
            """
            <div class="glass-card" style="text-align: center; padding: 20px;">
                <div style="font-size: 2.2rem; font-weight: 800; color: #a855f7;">24/7</div>
                <div style="font-size: 0.9rem; color: #cbd5e1; font-weight: 600;">Digital Miss India Coach</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Feature Grid Cards ─────────────────────────────────────────────────
    st.markdown(
        """
        <div style="text-align: center; margin-bottom: 20px;">
            <h3 style="color: #ffffff; font-weight: 800;">🚀 Operating System Core Modules</h3>
        </div>
        """,
        unsafe_allow_html=True,
    )

    f1, f2, f3, f4, f5 = st.columns(5)
    with f1:
        st.markdown(
            """
            <div class="kpi-card" style="text-align: center;">
                <div style="font-size: 1.8rem; margin-bottom: 8px;">🧠</div>
                <div style="font-size: 0.9rem; font-weight: 700; color: #ffffff;">Mood AI</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">NLP & Selfie Analysis</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with f2:
        st.markdown(
            """
            <div class="kpi-card" style="text-align: center;">
                <div style="font-size: 1.8rem; margin-bottom: 8px;">👁️</div>
                <div style="font-size: 0.9rem; font-weight: 700; color: #ffffff;">Computer Vision</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">OpenCV Posture Scan</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with f3:
        st.markdown(
            """
            <div class="kpi-card" style="text-align: center;">
                <div style="font-size: 1.8rem; margin-bottom: 8px;">🤖</div>
                <div style="font-size: 0.9rem; font-weight: 700; color: #ffffff;">Machine Learning</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">6 Scikit-Learn Models</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with f4:
        st.markdown(
            """
            <div class="kpi-card" style="text-align: center;">
                <div style="font-size: 1.8rem; margin-bottom: 8px;">🎙️</div>
                <div style="font-size: 0.9rem; font-weight: 700; color: #ffffff;">Voice Analysis</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">Pitch & Speech Clarity</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with f5:
        st.markdown(
            """
            <div class="kpi-card" style="text-align: center;">
                <div style="font-size: 1.8rem; margin-bottom: 8px;">👑</div>
                <div style="font-size: 0.9rem; font-weight: 700; color: #ffffff;">Readiness Index</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">Stage Ready Forecast</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Centered Login Form ──────────────────────────────────────────
    _, col_mid, _ = st.columns([1, 2, 1])
    with col_mid:
        with st.form("login_form", clear_on_submit=False):
            input_name = st.text_input(
                "Enter Your Name",
                placeholder="e.g. Sophia, Priya, Isabella …",
            )
            password = st.text_input(
                "Password",
                type="password",
                placeholder="••••••••••••",
            )
            submit = st.form_submit_button(
                "👑 Log in",
                use_container_width=True,
            )

            if submit:
                raw = input_name.strip()
                if "@" in raw:
                    raw = raw.split("@")[0].strip()
                clean_name = raw.capitalize() if raw else "Contender"

                st.session_state.user_name = clean_name
                st.session_state.logged_in = True
                st.session_state.active_page = "📊 Home Dashboard"
                # Persist the entered name into the user_profile (id=1)
                try:
                    save_user_profile(user_id=1, profile_dict={"name": clean_name})
                except Exception:
                    # Non-fatal: DB may be initializing elsewhere
                    pass
                st.rerun()

    # Block further execution on this render loop
    st.stop()
