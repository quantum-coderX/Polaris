"""Initial schema — all models

Revision ID: 0001_initial
Revises: 
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('username', sa.String(100), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('student', 'mentor', 'admin', name='userrole'), nullable=False, server_default='student'),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('bio', sa.String(1000), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_approved', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('totp_secret', sa.String(64), nullable=True),
        sa.Column('is_2fa_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_id', 'users', ['id'])

    # ── courses ───────────────────────────────────────────────────────────────
    op.create_table(
        'courses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(300), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('short_description', sa.String(500), nullable=True),
        sa.Column('thumbnail_url', sa.String(500), nullable=True),
        sa.Column('promo_video_url', sa.String(500), nullable=True),
        sa.Column('price', sa.Numeric(10, 2), nullable=True, server_default='0'),
        sa.Column('currency', sa.String(3), nullable=True, server_default='USD'),
        sa.Column('level', sa.Enum('beginner', 'intermediate', 'advanced', name='courselevel'), nullable=True, server_default='beginner'),
        sa.Column('language', sa.String(50), nullable=True, server_default='English'),
        sa.Column('status', sa.Enum('draft', 'pending', 'published', 'rejected', 'archived', name='coursestatus'), nullable=True, server_default='draft'),
        sa.Column('tags', sa.String(500), nullable=True),
        sa.Column('requirements', sa.Text(), nullable=True),
        sa.Column('what_you_learn', sa.Text(), nullable=True),
        sa.Column('total_duration_minutes', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_lessons', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('is_free', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('mentor_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['mentor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_courses_id', 'courses', ['id'])
    op.create_index('ix_courses_title', 'courses', ['title'])
    op.create_index('ix_courses_slug', 'courses', ['slug'], unique=True)

    # ── modules ────────────────────────────────────────────────────────────────
    op.create_table(
        'modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_modules_id', 'modules', ['id'])

    # ── lessons ────────────────────────────────────────────────────────────────
    op.create_table(
        'lessons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('lesson_type', sa.Enum('video', 'pdf', 'document', 'text', name='lessontype'), nullable=True, server_default='video'),
        sa.Column('media_url', sa.String(500), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('is_published', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_preview', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['module_id'], ['modules.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_lessons_id', 'lessons', ['id'])

    # ── lesson_attachments ────────────────────────────────────────────────────
    op.create_table(
        'lesson_attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lesson_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('file_url', sa.String(500), nullable=True),
        sa.Column('file_type', sa.String(50), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── enrollments ───────────────────────────────────────────────────────────
    op.create_table(
        'enrollments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('active', 'completed', 'suspended', 'refunded', name='enrollmentstatus'), nullable=True, server_default='active'),
        sa.Column('progress_percent', sa.Numeric(5, 2), nullable=True, server_default='0'),
        sa.Column('certificate_url', sa.String(500), nullable=True),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id']),
        sa.ForeignKeyConstraint(['student_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_enrollments_id', 'enrollments', ['id'])

    # ── lesson_progress ───────────────────────────────────────────────────────
    op.create_table(
        'lesson_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('enrollment_id', sa.Integer(), nullable=False),
        sa.Column('lesson_id', sa.Integer(), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('watch_time_seconds', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['enrollment_id'], ['enrollments.id']),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── payments ───────────────────────────────────────────────────────────────
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('enrollment_id', sa.Integer(), nullable=True),
        sa.Column('provider', sa.Enum('stripe', 'paypal', name='paymentprovider'), nullable=True),
        sa.Column('provider_session_id', sa.String(255), nullable=True),
        sa.Column('provider_payment_id', sa.String(255), nullable=True),
        sa.Column('amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('currency', sa.String(3), nullable=True, server_default='USD'),
        sa.Column('status', sa.Enum('pending', 'completed', 'refunded', 'failed', 'disputed', name='paymentstatus'), nullable=True, server_default='pending'),
        sa.Column('refund_reason', sa.String(500), nullable=True),
        sa.Column('refunded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id']),
        sa.ForeignKeyConstraint(['enrollment_id'], ['enrollments.id']),
        sa.ForeignKeyConstraint(['student_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payments_id', 'payments', ['id'])

    # ── reviews ────────────────────────────────────────────────────────────────
    op.create_table(
        'reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('is_approved', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('is_reported', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('report_reason', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id']),
        sa.ForeignKeyConstraint(['student_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_reviews_id', 'reviews', ['id'])

    # ── qa_messages ────────────────────────────────────────────────────────────
    op.create_table(
        'qa_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('upvotes', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['author_id'], ['users.id']),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id']),
        sa.ForeignKeyConstraint(['parent_id'], ['qa_messages.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_qa_messages_id', 'qa_messages', ['id'])

    # ── notifications ──────────────────────────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('enrollment', 'new_lesson', 'qa_answer', 'refund', 'announcement', 'certificate', name='notificationtype'), nullable=True),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('action_url', sa.String(500), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_id', 'notifications', ['id'])

    # ── quizzes ────────────────────────────────────────────────────────────────
    op.create_table(
        'quizzes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lesson_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('pass_score', sa.Integer(), nullable=True, server_default='70'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quizzes_id', 'quizzes', ['id'])

    # ── quiz_questions ─────────────────────────────────────────────────────────
    op.create_table(
        'quiz_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quiz_id', sa.Integer(), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('question_type', sa.Enum('multiple_choice', 'short_answer', name='quizquestiontype'), nullable=True),
        sa.Column('options', sa.Text(), nullable=True),
        sa.Column('correct_answer', sa.Text(), nullable=True),
        sa.Column('points', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('order', sa.Integer(), nullable=True, server_default='0'),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── quiz_attempts ──────────────────────────────────────────────────────────
    op.create_table(
        'quiz_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quiz_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Numeric(5, 2), nullable=True),
        sa.Column('passed', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('answers', sa.Text(), nullable=True),
        sa.Column('attempted_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id']),
        sa.ForeignKeyConstraint(['student_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── streaks ────────────────────────────────────────────────────────────────
    op.create_table(
        'streaks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('current_streak', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('longest_streak', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('last_activity_date', sa.Date(), nullable=True),
        sa.Column('streak_freezes_available', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_streaks_id', 'streaks', ['id'])

    # ── points_ledger ──────────────────────────────────────────────────────────
    op.create_table(
        'points_ledger',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('reason', sa.Enum('lesson_complete', 'quiz_pass', 'streak_bonus', 'enrollment', 'streak_freeze_purchase', name='pointreason'), nullable=True),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('reference_id', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_points_ledger_id', 'points_ledger', ['id'])

    # ── leaderboard_entries ────────────────────────────────────────────────────
    op.create_table(
        'leaderboard_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('scope', sa.Enum('global', 'course', name='leaderboardscope'), nullable=True, server_default='global'),
        sa.Column('scope_id', sa.Integer(), nullable=True),
        sa.Column('period', sa.Enum('all_time', 'weekly', 'monthly', name='leaderboardperiod'), nullable=True, server_default='all_time'),
        sa.Column('total_points', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('rank', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_leaderboard_entries_id', 'leaderboard_entries', ['id'])


def downgrade() -> None:
    op.drop_table('leaderboard_entries')
    op.drop_table('points_ledger')
    op.drop_table('streaks')
    op.drop_table('quiz_attempts')
    op.drop_table('quiz_questions')
    op.drop_table('quizzes')
    op.drop_table('notifications')
    op.drop_table('qa_messages')
    op.drop_table('reviews')
    op.drop_table('payments')
    op.drop_table('lesson_progress')
    op.drop_table('enrollments')
    op.drop_table('lesson_attachments')
    op.drop_table('lessons')
    op.drop_table('modules')
    op.drop_table('courses')
    op.drop_table('users')

    # Drop custom enum types
    op.execute('DROP TYPE IF EXISTS userrole')
    op.execute('DROP TYPE IF EXISTS courselevel')
    op.execute('DROP TYPE IF EXISTS coursestatus')
    op.execute('DROP TYPE IF EXISTS lessontype')
    op.execute('DROP TYPE IF EXISTS enrollmentstatus')
    op.execute('DROP TYPE IF EXISTS paymentprovider')
    op.execute('DROP TYPE IF EXISTS paymentstatus')
    op.execute('DROP TYPE IF EXISTS notificationtype')
    op.execute('DROP TYPE IF EXISTS quizquestiontype')
    op.execute('DROP TYPE IF EXISTS pointreason')
    op.execute('DROP TYPE IF EXISTS leaderboardscope')
    op.execute('DROP TYPE IF EXISTS leaderboardperiod')
