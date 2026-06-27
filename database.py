from pathlib import Path
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent

# Нужно для старых функций сайта, например локальных резервных копий.
DB_PATH = Path(
    os.getenv("HF_DB_PATH", str(BASE_DIR / "holyfake.sqlite3"))
).resolve()
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# На Render берем PostgreSQL из DATABASE_URL.
# Локально, если DATABASE_URL нет, используем SQLite.
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{DB_PATH}"

# Некоторые сервисы дают postgres://, а SQLAlchemy нужен postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}

# Только для SQLite. Для PostgreSQL это нельзя использовать.
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
