from sqlmodel import create_engine, SQLModel
from app.config import settings

# The engine is the entry point to our database
engine = create_engine(settings.DATABASE_URL, echo=True)

def create_db_and_tables():
    # This function creates the database tables based on your SQLModel models
    SQLModel.metadata.create_all(engine)