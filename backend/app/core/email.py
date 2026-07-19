"""
Email notification helper.

Uses aiosmtplib for async SMTP delivery.
When SMTP_HOST is empty (dev/local), emails are printed to the console
instead of being sent — zero config needed for development.
"""
import logging
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_email(
    to: str,
    subject: str,
    html_body: str,
) -> None:
    """
    Send an HTML email to `to`.
    Falls back to console log if SMTP is unconfigured.
    Never raises — email failure must never break the calling flow.
    """
    if not settings.SMTP_HOST:
        # Dev mode: log to console instead of sending
        logger.info(
            "📧 [DEV EMAIL] To: %s | Subject: %s\n%s",
            to, subject, html_body,
        )
        return

    try:
        import aiosmtplib

        msg = EmailMessage()
        msg["From"] = settings.EMAILS_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(html_body, subtype="html")

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=True,
        )
        logger.info("📧 Email sent to %s — %s", to, subject)
    except Exception as exc:
        logger.warning("📧 Email delivery failed to %s: %s", to, exc)


# ── Themed email templates ────────────────────────────────────────────────────

def _wrap_template(title: str, content: str) -> str:
    """Wrap content in a minimal dark-themed HTML email."""
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Inter,Segoe UI,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#161628;border-radius:16px;border:1px solid #2d2d4e;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c63ff,#a78bfa);padding:32px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
                ✦ Polaris
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">
                Online Learning Platform
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              {content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #2d2d4e;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">
                © 2025 Polaris Learning Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def enrollment_email(student_name: str, course_title: str, course_url: str) -> str:
    content = f"""
      <h2 style="margin:0 0 12px;color:#a78bfa;font-size:22px;">🎉 You're enrolled!</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">{student_name}</strong>,</p>
      <p style="color:#94a3b8;margin:0 0 24px;">
        You've successfully enrolled in <strong style="color:#e2e8f0;">{course_title}</strong>.
        Start learning at your own pace — your progress is saved automatically.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{course_url}"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6c63ff,#a78bfa);
                  color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
          Start Learning →
        </a>
      </div>
    """
    return _wrap_template("Enrollment Confirmed – Polaris", content)


def new_lesson_email(student_name: str, course_title: str, lesson_title: str, learn_url: str) -> str:
    content = f"""
      <h2 style="margin:0 0 12px;color:#a78bfa;font-size:22px;">📚 New lesson available!</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">{student_name}</strong>,</p>
      <p style="color:#94a3b8;margin:0 0 24px;">
        A new lesson has been published in <strong style="color:#e2e8f0;">{course_title}</strong>:
        <br><strong style="color:#e2e8f0;">{lesson_title}</strong>
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{learn_url}"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6c63ff,#a78bfa);
                  color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
          Watch Lesson →
        </a>
      </div>
    """
    return _wrap_template("New Lesson – Polaris", content)


def qa_answer_email(student_name: str, course_title: str, answer_preview: str, qa_url: str) -> str:
    content = f"""
      <h2 style="margin:0 0 12px;color:#a78bfa;font-size:22px;">💬 Your question was answered!</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">{student_name}</strong>,</p>
      <p style="color:#94a3b8;margin:0 0 12px;">
        Someone replied to your question in <strong style="color:#e2e8f0;">{course_title}</strong>:
      </p>
      <blockquote style="margin:0 0 24px;padding:16px;background:#1e1e38;border-left:4px solid #6c63ff;
                          border-radius:0 8px 8px 0;color:#94a3b8;font-style:italic;">
        "{answer_preview[:200]}…"
      </blockquote>
      <div style="text-align:center;margin:24px 0;">
        <a href="{qa_url}"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6c63ff,#a78bfa);
                  color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
          View Reply →
        </a>
      </div>
    """
    return _wrap_template("Q&A Reply – Polaris", content)


def refund_email(student_name: str, course_title: str, amount: float, currency: str) -> str:
    content = f"""
      <h2 style="margin:0 0 12px;color:#f59e0b;font-size:22px;">💸 Refund Processed</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">{student_name}</strong>,</p>
      <p style="color:#94a3b8;margin:0 0 24px;">
        Your refund of <strong style="color:#e2e8f0;">{currency} {amount:.2f}</strong> for
        <strong style="color:#e2e8f0;">{course_title}</strong> has been processed.
        Please allow 5–10 business days for the amount to appear on your statement.
      </p>
      <p style="color:#64748b;font-size:13px;margin:0;">
        If you believe this was an error, please contact support.
      </p>
    """
    return _wrap_template("Refund Processed – Polaris", content)
