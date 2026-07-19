# Each microservice imports only its own router modules directly.
# This __init__ deliberately imports nothing — it avoids triggering
# a full import cascade (including gamification, quizzes, etc.) in
# services that don't need those modules.
__all__ = [
    "auth", "users", "courses", "lessons", "enrollments",
    "payments", "reviews", "qa", "search", "notifications",
    "admin", "quizzes", "certificates", "gamification",
]