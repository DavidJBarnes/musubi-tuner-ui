"""Shared test fixtures for the backend test suite."""

from collections.abc import Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db

# Use StaticPool so all connections share the same in-memory database
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Yield a test database session."""
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


def _noop_reconcile():
    pass


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Yield a test client with DB override and mocked lifespan concerns."""

    def _override_get_db() -> Generator[Session, None, None]:
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    from app.main import app

    app.dependency_overrides[get_db] = _override_get_db

    # Patch engine in main.py (for _migrate_columns/create_all), SessionLocal in job_runner,
    # and reconcile_jobs to be a no-op during lifespan startup
    import app.services.job_runner as jr
    original = jr.reconcile_jobs
    jr.reconcile_jobs = _noop_reconcile

    with (
        patch("app.main.engine", engine),
        patch("app.services.job_runner.SessionLocal", TestSession),
    ):
        try:
            with TestClient(app, raise_server_exceptions=False) as c:
                yield c
        finally:
            jr.reconcile_jobs = original

    app.dependency_overrides.clear()
