import os
import asyncio
from dotenv import load_dotenv
from telegram import Bot

load_dotenv()
token = os.getenv("TELEGRAM_BOT_TOKEN")


async def main():
    if not token or "your_telegram" in token:
        print("Vui lòng điền TELEGRAM_BOT_TOKEN vào file .env trước.")
        return

    bot = Bot(token)
    print("⏳ Đang quét các cập nhật gần đây...")
    updates = await bot.get_updates()

    channels_found = {}
    for u in updates:
        chat = u.effective_chat
        if chat and str(chat.type) in ["channel", "supergroup"]:
            channels_found[chat.id] = chat.title

    if not channels_found:
        print("⚠️ Chưa thấy kênh nào gửi tin nhắn gần đây.")
        print("Mẹo: Hãy mở Kênh của bạn, gõ 1 chữ bất kỳ rồi chạy lại lệnh này.")
        return

    print("\n🎉 TÌM THẤY CÁC KÊNH SAU:")
    for cid, title in channels_found.items():
        print(f"👉 Tên Kênh: '{title}'")
        print(f"   ID Kênh:  {cid}\n")


if __name__ == "__main__":
    asyncio.run(main())
