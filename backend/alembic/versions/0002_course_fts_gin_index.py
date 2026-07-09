"""Add weighted GIN full-text search index on courses

Revision ID: 0002_course_fts_gin_index
Revises: 0001_initial
Create Date: 2025-06-26 00:00:00.000000

Composite English tsvector over title (weight A), short_description (B),
and tags (C). Index is built CONCURRENTLY outside Alembic's transaction so
production writes are not blocked by an exclusive table lock.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_course_fts_gin_index"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

# Shared expression — must stay in sync with app.api.v1.search._course_search_vector()
_COURSE_SEARCH_VECTOR_SQL = """
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(tags, '')), 'C')
"""

INDEX_NAME = "idx_courses_fts_gin"


def upgrade() -> None:
    # Optional persisted tsvector column for direct column scans / future triggers.
    op.execute(
        f"""
        ALTER TABLE courses
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS ({_COURSE_SEARCH_VECTOR_SQL}) STORED
        """
    )

    # CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
    with op.get_context().autocommit_block():
        op.execute(
            f"""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS {INDEX_NAME}
            ON courses USING GIN (search_vector)
            """
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {INDEX_NAME}")

    op.execute("ALTER TABLE courses DROP COLUMN IF EXISTS search_vector")
