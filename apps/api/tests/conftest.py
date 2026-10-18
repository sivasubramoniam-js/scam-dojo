"""Pytest configuration and shared fixtures."""

import pytest_asyncio

from app.deps import _local_repo


@pytest_asyncio.fixture(autouse=True)
async def init_test_database() -> None:
    """Ensure SQLite tables are initialized before every test."""
    await _local_repo.init_tables()
