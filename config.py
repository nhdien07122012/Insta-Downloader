import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# Telegram Bot Config
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()

# Storage Channel ID (e.g. -1001234567890 or @my_channel)
# Can be integer ID or channel username
raw_channel_id = os.getenv("TELEGRAM_STORAGE_CHANNEL_ID", "").strip()
if raw_channel_id.startswith("-") and raw_channel_id.lstrip("-").isdigit():
    TELEGRAM_STORAGE_CHANNEL_ID = int(raw_channel_id)
else:
    TELEGRAM_STORAGE_CHANNEL_ID = raw_channel_id

# Allowed User IDs (comma-separated, empty = public)
allowed_ids_raw = os.getenv("ALLOWED_USER_IDS", "").strip()
ALLOWED_USER_IDS = [
    int(uid.strip())
    for uid in allowed_ids_raw.split(",")
    if uid.strip().isdigit()
]

# Instagram Downloader Config
INSTAGRAM_SESSION_ID = os.getenv("INSTAGRAM_SESSION_ID", "").strip()
COOKIES_FILE = os.getenv("COOKIES_FILE", str(BASE_DIR / "cookies.txt")).strip()

# RapidAPI (optional fallback)
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "").strip()

# Tùy chọn tự động xóa tin nhắn chứa link sau khi lưu thành công (mặc định: bật)
DELETE_LINK_MESSAGE = os.getenv("DELETE_LINK_MESSAGE", "true").strip().lower() in ["true", "1", "yes"]

# Storage & DB Config
DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "insta_storage.db")).strip()
DOWNLOAD_DIR = Path(os.getenv("TEMP_DOWNLOAD_DIR", str(BASE_DIR / "downloads")))
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


def is_user_allowed(user_id: int) -> bool:
    """Kiểm tra quyền truy cập của người dùng."""
    if not ALLOWED_USER_IDS:
        return True
    return user_id in ALLOWED_USER_IDS
