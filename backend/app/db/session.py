from sqlmodel import SQLModel, Session, create_engine
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres@localhost/cactus_dev")

engine = create_engine(DATABASE_URL, echo=True)

# Dependency for FastAPI routes
def get_session():
    with Session(engine) as session:
        yield session

# Create tables on startup
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
