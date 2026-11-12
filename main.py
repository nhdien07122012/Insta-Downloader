import sys
import os
import shutil
import asyncio
import logging
from pathlib import Path

from config import (
    BASE_DIR,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_STORAGE_CHANNEL_ID,
    DATABASE_PATH,
)
import database
from bot import create_bot_application

# Thiết lập logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("InstaDownloader")


async def async_main():
    # Kiểm tra file .env
    env_file = BASE_DIR / ".env"
    env_example = BASE_DIR / ".env.example"
    if not env_file.exists():
        if env_example.exists():
            shutil.copy(env_example, env_file)
            logger.info("Đã tạo file .env từ .env.example. Vui lòng mở .env và điền TELEGRAM_BOT_TOKEN!")
        else:
            logger.warning("Không tìm thấy file .env.")

    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "your_telegram_bot_token_here":
        print("\n" + "=" * 60)
        print("⚠️  CHƯA CẤU HÌNH TELEGRAM BOT TOKEN!")
        print("1. Mở Telegram, chat với @BotFather để tạo một bot mới.")
        print("2. Copy Token được cấp và dán vào biến TELEGRAM_BOT_TOKEN trong file .env.")
        print("3. (Khuyên dùng) Tạo một Kênh Telegram (Private Channel), add bot làm Admin,")
        print("   sau đó điền Channel ID vào TELEGRAM_STORAGE_CHANNEL_ID trong .env.")
        print("=" * 60 + "\n")
        sys.exit(1)

    # 1. Khởi tạo Database
    logger.info("Đang khởi tạo cơ sở dữ liệu...")
    await database.init_db()
    logger.info(f"Cơ sở dữ liệu sẵn sàng: {DATABASE_PATH}")

    # 2. Khởi tạo Telegram Bot
    logger.info("Đang khởi động Telegram Bot...")
    app = create_bot_application()

    # In thông tin cấu hình
    print("\n" + "-" * 50)
    print("🚀 INSTAGRAM TELEGRAM STORAGE BOT ĐÃ KHỞI CHẠY!")
    print(f"📦 Kênh lưu trữ: {TELEGRAM_STORAGE_CHANNEL_ID or 'Lưu tại chat riêng'}")
    print("📱 Sẵn sàng nhận link từ iPhone (Share Sheet / Telegram App)")
    print("-" * 50 + "\n")

    # 3. Chạy bot polling
    await app.initialize()
    await app.start()
    await app.updater.start_polling(allowed_updates=["message", "callback_query"])

    # Giữ bot chạy liên tục
    stop_event = asyncio.Event()
    try:
        await stop_event.wait()
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        logger.info("Đang dừng bot...")
        await app.updater.stop()
        await app.stop()
        await app.shutdown()


def main():
    try:
        asyncio.run(async_main())
    except KeyboardInterrupt:
        print("\nBot đã dừng.")


if __name__ == "__main__":
    main()
