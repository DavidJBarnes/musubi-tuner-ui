from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import config

engine = create_engine(
    f"sqlite:///{config.data_dir / 'musubi_tuner.db'}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
