from sqlmodel import SQLModel, Session, create_engine
import os

# Prefer env DATABASE_URL; otherwise use a local SQLite file for easy testing
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_SQLITE_PATH = os.path.join(BACKEND_DIR, "cactus.db")
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{DEFAULT_SQLITE_PATH}"

# For SQLite, we need check_same_thread=False for FastAPI's threaded server
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        echo=True,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(DATABASE_URL, echo=True)

# Dependency for FastAPI routes
def get_session():
    with Session(engine) as session:
        yield session

# Create tables on startup
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
