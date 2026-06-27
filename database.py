from pathlib import Path
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
# Для локального запуска база лежит рядом с проектом.
# Для хостинга можно указать HF_DB_PATH=/data/holyfake.sqlite3, если есть постоянный диск/volume.
DB_PATH = Path(os.getenv("HF_DB_PATH", str(BASE_DIR / "holyfake.sqlite3"))).resolve()
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
