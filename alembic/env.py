import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Alembic Config object
config = context.config

# Set up loggers from the .ini file
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import Base and all models so autogenerate can detect them
from app.core.config import get_settings  # noqa: E402
from app.db.database import Base, normalize_database_url  # noqa: E402
import app.db.models  # noqa: E402, F401  — registers all ORM models on Base.metadata

target_metadata = Base.metadata

# Prefer DATABASE_URL from the environment / .env over the (empty) alembic.ini value
_database_url = get_settings().get("database_url") or config.get_main_option("sqlalchemy.url")
if not _database_url:
    raise RuntimeError("DATABASE_URL is not set. Add it to your .env file before running migrations.")
config.set_main_option("sqlalchemy.url", normalize_database_url(_database_url).replace("%", "%%"))


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no DB connection needed)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations using an async engine (required for asyncpg)."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
