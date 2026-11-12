import os
import html
from typing import List, Dict, Any
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputMediaPhoto,
    InputMediaVideo,
)
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

from config import (
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_STORAGE_CHANNEL_ID,
    COOKIES_FILE,
    is_user_allowed,
)
import database
from instagram import InstagramDownloader, clean_download_dir, extract_shortcode

downloader = InstagramDownloader()


def format_channel_post_link(channel_id: Any, message_id: int) -> str:
    """Tạo link chuyển hướng trực tiếp đến bài viết trong kênh Telegram."""
    str_id = str(channel_id)
    if str_id.startswith("-100"):
        clean_id = str_id[4:]
        return f"https://t.me/c/{clean_id}/{message_id}"
    elif str_id.startswith("@"):
        return f"https://t.me/{str_id[1:]}/{message_id}"
    return ""


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lệnh /start."""
    user = update.effective_user
    if not is_user_allowed(user.id):
        await update.message.reply_text("⛔ Bạn không có quyền sử dụng bot này.")
        return

    text = (
        f"Xin chào <b>{html.escape(user.first_name)}</b>! 👋\n\n"
        "📸 <b>Instagram Cloud Storage Bot</b> giúp bạn:\n"
        "• Tải toàn bộ ảnh, album (carousel), reels từ Instagram về chất lượng cao nhất.\n"
        "• Tự động sao lưu và đẩy lên <b>Kênh Telegram Lưu Trữ</b> (đóng vai trò như Cloud không giới hạn).\n"
        "• Quản lý metadata và sẵn sàng kết nối với App trên iPhone.\n\n"
        "🚀 <b>Cách sử dụng:</b>\n"
        "Chỉ cần gửi hoặc bấm <b>Chia sẻ</b> bất kỳ link Instagram nào vào đây!\n\n"
        "Các lệnh hữu ích:\n"
        "/recent - Xem các bài viết đã lưu gần đây\n"
        "/stats - Thống kê kho ảnh lưu trữ\n"
        "/status - Kiểm tra trạng thái kết nối & cookies"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lệnh /help."""
    text = (
        "📖 <b>HƯỚNG DẪN DÙNG TRÊN IPHONE:</b>\n\n"
        "<b>Cách 1: Chia sẻ trực tiếp</b>\n"
        "1. Mở Instagram trên iPhone -> Chọn bài viết muốn lưu.\n"
        "2. Bấm nút <b>Chia sẻ (Share)</b> -> Chọn ứng dụng <b>Telegram</b>.\n"
        "3. Chọn gửi vào Bot này -> Ảnh sẽ tự động được cào và lưu vào Kênh lưu trữ.\n\n"
        "<b>Cách 2: Dùng Phím tắt iOS (Shortcuts)</b>\n"
        "Tạo một Shortcut nhận URL từ Share Sheet và gọi webhook/gửi thẳng vào bot để lưu chỉ với 1 chạm.\n\n"
        "<i>Mẹo: Hãy ghim Kênh lưu trữ (Storage Channel) lên đầu danh sách chat Telegram của bạn để tiện xem lại mọi lúc!</i>"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lệnh /stats xem thống kê."""
    if not is_user_allowed(update.effective_user.id):
        return

    stats = await database.get_stats()
    text = (
        "📊 <b>THỐNG KÊ KHO LƯU TRỮ TELEGRAM:</b>\n\n"
        f"• Tổng số bài viết (Posts): <b>{stats['total_posts']}</b>\n"
        f"• Tổng số ảnh (Photos): <b>{stats['total_photos']}</b>\n"
        f"• Tổng số video/reels: <b>{stats['total_videos']}</b>\n"
        f"• Tổng tệp đa phương tiện: <b>{stats['total_media']}</b>\n"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def recent_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lệnh /recent xem các bài đăng vừa lưu."""
    if not is_user_allowed(update.effective_user.id):
        return

    posts = await database.get_recent_posts(limit=5)
    if not posts:
        await update.message.reply_text("Chưa có bài đăng nào được lưu trong kho.")
        return

    text = "🕒 <b>CÁC BÀI ĐĂNG GẦN ĐÂY:</b>\n\n"
    for p in posts:
        link = format_channel_post_link(p["channel_id"], p["channel_message_id"])
        channel_str = f"<a href='{link}'>Xem trên Kênh</a>" if link else "Đã lưu"
        author_str = f"@{p['author']}" if p["author"] else "Instagram Post"
        text += (
            f"• <b>{author_str}</b> ({p['media_count']} tệp)\n"
            f"  🔗 <a href='{p['url']}'>Link gốc</a> | ☁️ {channel_str}\n\n"
        )

    await update.message.reply_text(text, parse_mode=ParseMode.HTML, disable_web_page_preview=True)


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Kiểm tra cấu hình và tình trạng bot."""
    if not is_user_allowed(update.effective_user.id):
        return

    channel_status = (
        f"✅ Đã cấu hình ({TELEGRAM_STORAGE_CHANNEL_ID})"
        if TELEGRAM_STORAGE_CHANNEL_ID
        else "⚠️ Chưa cấu hình (ảnh sẽ gửi trực tiếp trong chat)"
    )

    has_cookies = os.path.exists(COOKIES_FILE)
    cookie_status = "✅ Đã nạp (cookies.txt)" if has_cookies else "⚠️ Chưa có (dễ bị Instagram chặn nếu tải nhiều)"

    text = (
        "⚙️ <b>TRẠNG THÁI HỆ THỐNG:</b>\n\n"
        f"• Kênh lưu trữ: {channel_status}\n"
        f"• Cookie Instagram: {cookie_status}\n"
        f"• Database: ✅ SQLite sẵn sàng\n"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def handle_instagram_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Xử lý tin nhắn chứa liên kết Instagram."""
    user = update.effective_user
    if not is_user_allowed(user.id):
        await update.message.reply_text("⛔ Bạn không có quyền sử dụng bot này.")
        return

    text = update.message.text or update.message.caption or ""
    shortcode = extract_shortcode(text)
    if not shortcode:
        return

    status_msg = await update.message.reply_text(
        "⏳ <b>Đang lấy ảnh chất lượng cao từ Instagram...</b>",
        parse_mode=ParseMode.HTML,
    )

    download_result = None
    try:
        # 1. Tải ảnh từ Instagram
        download_result = await downloader.download_post(text)
        media_files = download_result["media_files"]
        target_dir = download_result["target_dir"]

        await status_msg.edit_text(
            f"⏳ Đã tải xong <b>{len(media_files)}</b> tệp. Đang đẩy lên Kênh lưu trữ Telegram...",
            parse_mode=ParseMode.HTML,
        )

        # 2. Chuẩn bị đích lưu trữ (kênh lưu trữ hoặc chính chat hiện tại)
        destination_chat_id = TELEGRAM_STORAGE_CHANNEL_ID or update.effective_chat.id

        # 3. Chuẩn bị caption lưu trữ
        author = download_result.get("author", "")
        author_text = f"👤 Tác giả: @{author}\n" if author else ""
        raw_caption = download_result.get("caption", "").strip()
        if len(raw_caption) > 400:
            raw_caption = raw_caption[:400] + "..."

        caption_storage = (
            f"📸 <b>Instagram Lưu Trữ</b>\n"
            f"{author_text}"
            f"🔗 <a href='{download_result['url']}'>Xem trên Instagram</a>\n"
            f"📁 Số lượng: {len(media_files)} tệp\n\n"
            f"<i>{html.escape(raw_caption)}</i>"
        )

        sent_messages = []
        saved_media_records = []

        # 4. Upload lên Telegram
        # Trường hợp 1: Chỉ có 1 file
        if len(media_files) == 1:
            item = media_files[0]
            with open(item["path"], "rb") as f:
                if item["type"] == "photo":
                    msg = await context.bot.send_photo(
                        chat_id=destination_chat_id,
                        photo=f,
                        caption=caption_storage,
                        parse_mode=ParseMode.HTML,
                    )
                    file_id = msg.photo[-1].file_id
                    file_unique_id = msg.photo[-1].file_unique_id
                    file_size = msg.photo[-1].file_size
                    width = msg.photo[-1].width
                    height = msg.photo[-1].height
                else:
                    msg = await context.bot.send_video(
                        chat_id=destination_chat_id,
                        video=f,
                        caption=caption_storage,
                        parse_mode=ParseMode.HTML,
                    )
                    file_id = msg.video.file_id
                    file_unique_id = msg.video.video_id if hasattr(msg.video, 'video_id') else msg.video.file_unique_id
                    file_size = msg.video.file_size
                    width = msg.video.width
                    height = msg.video.height

                sent_messages.append(msg)
                saved_media_records.append({
                    "file_id": file_id,
                    "file_unique_id": file_unique_id,
                    "media_type": item["type"],
                    "file_size": file_size,
                    "width": width,
                    "height": height,
                })

        # Trường hợp 2: Album (Carousel) nhiều file (gửi theo nhóm tối đa 10 tệp)
        else:
            # Batch theo 10 phần tử
            chunk_size = 10
            for i in range(0, len(media_files), chunk_size):
                chunk = media_files[i:i + chunk_size]
                media_group = []
                file_handles = []

                for idx, m in enumerate(chunk):
                    fh = open(m["path"], "rb")
                    file_handles.append(fh)
                    # Chỉ gán caption vào ảnh đầu tiên của nhóm đầu
                    cap = caption_storage if (i == 0 and idx == 0) else None
                    pm = ParseMode.HTML if cap else None

                    if m["type"] == "photo":
                        media_group.append(InputMediaPhoto(media=fh, caption=cap, parse_mode=pm))
                    else:
                        media_group.append(InputMediaVideo(media=fh, caption=cap, parse_mode=pm))

                try:
                    msgs = await context.bot.send_media_group(
                        chat_id=destination_chat_id,
                        media=media_group,
                    )
                    sent_messages.extend(msgs)

                    for m_sent in msgs:
                        if m_sent.photo:
                            saved_media_records.append({
                                "file_id": m_sent.photo[-1].file_id,
                                "file_unique_id": m_sent.photo[-1].file_unique_id,
                                "media_type": "photo",
                                "file_size": m_sent.photo[-1].file_size,
                                "width": m_sent.photo[-1].width,
                                "height": m_sent.photo[-1].height,
                            })
                        elif m_sent.video:
                            saved_media_records.append({
                                "file_id": m_sent.video.file_id,
                                "file_unique_id": m_sent.video.file_unique_id,
                                "media_type": "video",
                                "file_size": m_sent.video.file_size,
                                "width": m_sent.video.width,
                                "height": m_sent.video.height,
                            })
                finally:
                    for fh in file_handles:
                        fh.close()

        # 5. Lưu vào Database
        primary_message_id = sent_messages[0].message_id if sent_messages else None
        post_id = await database.save_post(
            shortcode=shortcode,
            url=download_result["url"],
            author=author,
            caption=download_result.get("caption", ""),
            channel_id=destination_chat_id,
            channel_message_id=primary_message_id,
            total_media=len(saved_media_records),
            downloaded_by_user_id=user.id,
        )
        await database.save_media_items(post_id, saved_media_records)

        # 6. Tạo nút bấm phản hồi cho người dùng
        channel_link = format_channel_post_link(destination_chat_id, primary_message_id)
        keyboard = [
            [InlineKeyboardButton("📸 Mở bài gốc Instagram", url=download_result["url"])]
        ]
        if channel_link:
            keyboard[0].append(InlineKeyboardButton("☁️ Xem trên Kênh lưu trữ", url=channel_link))

        reply_markup = InlineKeyboardMarkup(keyboard)

        success_text = (
            f"✅ <b>ĐÃ LƯU VÀO KHO TELEGRAM THÀNH CÔNG!</b>\n\n"
            f"• Tác giả: <b>@{author or 'Instagram'}</b>\n"
            f"• Số lượng: <b>{len(saved_media_records)} tệp</b>\n"
            f"• Mã bài: <code>{shortcode}</code>\n"
        )
        await status_msg.edit_text(
            success_text,
            parse_mode=ParseMode.HTML,
            reply_markup=reply_markup,
        )

    except Exception as e:
        error_msg = f"❌ <b>Lỗi khi tải hoặc lưu ảnh:</b>\n<code>{html.escape(str(e))}</code>"
        await status_msg.edit_text(error_msg, parse_mode=ParseMode.HTML)

    finally:
        # Dọn dẹp thư mục tạm trên ổ cứng
        if download_result and "target_dir" in download_result:
            clean_download_dir(download_result["target_dir"])


def create_bot_application() -> Application:
    """Tạo và cấu hình ứng dụng Telegram Bot."""
    if not TELEGRAM_BOT_TOKEN:
        raise ValueError(
            "Chưa cấu hình TELEGRAM_BOT_TOKEN! Hãy tạo file .env và điền Token từ @BotFather."
        )

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Đăng ký các command
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("stats", stats_command))
    app.add_handler(CommandHandler("recent", recent_command))
    app.add_handler(CommandHandler("status", status_command))

    # Đăng ký message handler nhận link Instagram
    app.add_handler(
        MessageHandler(
            filters.TEXT & (~filters.COMMAND) & filters.Regex(r"instagram\.com"),
            handle_instagram_message,
        )
    )

    return app
