import sys
print("Python:", sys.version)
print("Executable:", sys.executable)
try:
    import streamlit
    print("Streamlit:", streamlit.__version__)
except Exception as e:
    print("Streamlit import error:", e)
