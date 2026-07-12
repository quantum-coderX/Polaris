"""
Course search — PostgreSQL weighted full-text search (GIN-indexed) with
SQLite ILIKE fallback for the test suite.

Production index (Alembic 0002): GIN on generated ``search_vector`` column
built from title (A), short_description (B), and tags (C).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import Optional

from sqlalchemy import literal_column

from app.core.database import get_db
from app.models.course import Course, CourseLevel, CourseStatus
from app.models.review import Review

router = APIRouter(prefix="/search", tags=["Search"])


from app.schemas.course import CourseSearchResult, AutocompleteResult


# ── Full-text helpers ─────────────────────────────────────────────────────────

def _course_search_vector():
    """
    Weighted English tsvector matching the Alembic migration expression.

    title → weight A (highest), short_description → B, tags → C.

    Weights are passed via literal_column so PostgreSQL sees them as ``"char"``
    literals rather than VARCHAR bound parameters — ``setweight()`` demands
    the ``"char"`` type (see PostgreSQL docs § 12.3.1).
    """
    title_vec = func.setweight(
        func.to_tsvector("english", func.coalesce(Course.title, "")),
        literal_column("'A'"),
    )
    desc_vec = func.setweight(
        func.to_tsvector("english", func.coalesce(Course.short_description, "")),
        literal_column("'B'"),
    )
    tags_vec = func.setweight(
        func.to_tsvector("english", func.coalesce(Course.tags, "")),
        literal_column("'C'"),
    )
    return title_vec.op("||")(desc_vec).op("||")(tags_vec)


def _apply_text_search(stmt, q: str, dialect_name: str):
    """Apply full-text predicate for PostgreSQL; ILIKE fallback elsewhere."""
    if dialect_name == "postgresql":
        ts_query = func.plainto_tsquery("english", q)
        return stmt.where(_course_search_vector().op("@@")(ts_query))

    term = f"%{q}%"
    return stmt.where(
        or_(
            Course.title.ilike(term),
            Course.short_description.ilike(term),
            Course.tags.ilike(term),
        )
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/courses", response_model=list[CourseSearchResult])
async def search_courses(
    q: Optional[str] = Query(None, description="Full-text search query"),
    level: Optional[CourseLevel] = None,
    language: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_duration: Optional[int] = None,
    max_duration: Optional[int] = None,
    is_free: Optional[bool] = None,
    min_rating: Optional[float] = Query(None, ge=0.0, le=5.0, description="Minimum average rating (0–5)"),
    sort_by: Optional[str] = Query(None, description="Sort: price_asc | price_desc | newest"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Full-text search over published courses.

    PostgreSQL: ``to_tsvector`` + ``@@ plainto_tsquery`` on weighted
    title / short_description / tags (GIN-backed via ``search_vector``).

    Filters: level, language, price/duration bounds, is_free, min_rating.
    Sort: price_asc, price_desc, newest (default: id desc).
    """
    bind = db.get_bind()
    dialect_name = bind.dialect.name

    stmt = select(Course).where(Course.status == CourseStatus.published)

    if q:
        stmt = _apply_text_search(stmt, q, dialect_name)

    if level:
        stmt = stmt.where(Course.level == level)
    if language:
        stmt = stmt.where(Course.language == language)
    if min_price is not None:
        stmt = stmt.where(Course.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Course.price <= max_price)
    if min_duration is not None:
        stmt = stmt.where(Course.total_duration_minutes >= min_duration)
    if max_duration is not None:
        stmt = stmt.where(Course.total_duration_minutes <= max_duration)
    if is_free is not None:
        stmt = stmt.where(Course.is_free == is_free)

    if min_rating is not None:
        avg_subq = (
            select(
                Review.course_id,
                func.avg(Review.rating).label("avg_rating"),
            )
            .where(Review.is_approved == True)
            .group_by(Review.course_id)
            .subquery()
        )
        stmt = stmt.join(avg_subq, Course.id == avg_subq.c.course_id)
        stmt = stmt.where(avg_subq.c.avg_rating >= min_rating)

    if sort_by == "price_asc":
        stmt = stmt.order_by(Course.price.asc())
    elif sort_by == "price_desc":
        stmt = stmt.order_by(Course.price.desc())
    elif sort_by == "newest":
        stmt = stmt.order_by(Course.created_at.desc())
    elif q and dialect_name == "postgresql":
        stmt = stmt.order_by(
            func.ts_rank(_course_search_vector(), func.plainto_tsquery("english", q)).desc()
        )
    else:
        stmt = stmt.order_by(Course.id.desc())

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/autocomplete", response_model=AutocompleteResult)
async def autocomplete(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """
    Prefix-based autocomplete on course titles.
    Uses ILIKE for broad dialect compatibility (SQLite tests + PostgreSQL).
    """
    stmt = (
        select(Course.title)
        .where(
            Course.status == CourseStatus.published,
            or_(
                Course.title.ilike(f"{q}%"),
                Course.title.ilike(f"% {q}%"),
            ),
        )
        .limit(8)
    )
    result = await db.execute(stmt)
    suggestions = [row[0] for row in result.all()]
    return {"suggestions": suggestions}
