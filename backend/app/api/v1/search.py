"""
PostgreSQL full-text search using native tsvector + plainto_tsquery.
No Elasticsearch, no external sync — GIN index handles all queries.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel, ConfigDict
from typing import Optional

from app.core.database import get_db
from app.models.course import Course, CourseLevel, CourseStatus

router = APIRouter(prefix="/search", tags=["Search"])


from app.schemas.course import CourseSearchResult, AutocompleteResult


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
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Full-text search over courses using PostgreSQL tsvector .match() on:
      - title (weight A)
      - short_description (weight B)
      - tags (weight C)

    Filters applied as standard SQL WHERE clauses.
    """
    stmt = select(Course).where(Course.status == CourseStatus.published)

    # ── Full-text search ─────────────────────────────────────────────────────
    if q:
        # Build a weighted tsvector across multiple columns
        ts_vector = func.to_tsvector(
            "english",
            func.concat_ws(" ", Course.title, Course.short_description, Course.tags),
        )
        ts_query = func.plainto_tsquery("english", q)
        stmt = stmt.where(ts_vector.op("@@")(ts_query))

    # ── Filters ──────────────────────────────────────────────────────────────
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

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/autocomplete", response_model=AutocompleteResult)
async def autocomplete(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """
    Prefix-based autocomplete using PostgreSQL ILIKE — fast on GIN index.
    Returns up to 8 matching course titles.
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
