@echo off
cd /d C:\Projects\CrownFit
set PYTHONPATH=C:\Projects\CrownFit\venv\Lib\site-packages
"C:\Users\aditi\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe" -m streamlit run app.py --server.headless false
pause
