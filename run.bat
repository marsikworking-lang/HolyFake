@echo off
cd /d %~dp0
if not exist .venv (
  py -m venv .venv
)
call .venv\Scripts\activate
pip install -r requirements.txt
start http://127.0.0.1:8000
uvicorn main:app --reload
pause
