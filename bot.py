import os
import html
import logging
from typing import List, Dict, Any
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputMediaPhoto,
    InputMediaVideo,
)
from telegram.request import HTTPXRequest
from telegram.constants import ParseMode, ChatType
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
    DELETE_LINK_MESSAGE,
    is_user_allowed,
)
import database
from instagram import InstagramDownloader, clean_download_dir, extract_shortcode

logger = logging.getLogger("InstaBot")
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
    if user and not is_user_allowed(user.id):
        await update.message.reply_text("⛔ Bạn không có quyền sử dụng bot này.")
        return

    first_name = html.escape(user.first_name) if user else "bạn"
    text = (
        f"Xin chào <b>{first_name}</b>! 👋\n\n"
        "📸 <b>Instagram Cloud Storage Bot</b> giúp bạn:\n"
        "• Tải toàn bộ ảnh, album (carousel), reels từ Instagram về chất lượng cao nhất.\n"
        "• Tự động sao lưu và đẩy lên <b>Kênh Telegram Lưu Trữ</b> (đóng vai trò như Cloud không giới hạn).\n"
        "• Quản lý metadata và sẵn sàng kết nối với App trên iPhone.\n\n"
        "🚀 <b>Cách sử dụng:</b>\n"
        "• Cách 1: Gửi hoặc bấm <b>Chia sẻ</b> link Instagram vào khung chat này với Bot!\n"
        "• Cách 2: Dán link Instagram thẳng vào Kênh lưu trữ của bạn (Bot sẽ tự cào và thay thế bằng album ảnh gốc).\n\n"
        "Các lệnh hữu ích:\n"
        "/recent - Xem các bài viết đã lưu gần đây\n"
        "/stats - Thống kê kho ảnh lưu trữ\n"
        "/status - Kiểm tra trạng thái kết nối & cookies"
    )
    if update.message:
        await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lệnh /help."""
    text = (
        "📖 <b>HƯỚNG DẪN DÙNG TRÊN IPHONE:</b>\n\n"
        "<b>Cách 1: Gửi cho Bot</b>\n"
        "1. Mở Instagram trên iPhone -> Chọn bài viết muốn lưu.\n"
        "2. Bấm nút <b>Chia sẻ (Share)</b> -> Chọn <b>Telegram</b>.\n"
        "3. Chọn gửi vào Bot này -> Ảnh sẽ tự động được cào và lưu vào Kênh lưu trữ.\n\n"
        "<b>Cách 2: Gửi thẳng vào Kênh lưu trữ</b>\n"
        "Dán bất kỳ link Instagram nào vào Kênh lưu trữ, Bot sẽ tự động tải ảnh gốc và đăng vào Kênh cho bạn!\n"
    )
    if update.message:
        await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lệnh /stats xem thống kê."""
    user = update.effective_user
    if user and not is_user_allowed(user.id):
        return

    stats = await database.get_stats()
    text = (
        "📊 <b>THỐNG KÊ KHO LƯU TRỮ TELEGRAM:</b>\n\n"
        f"• Tổng số bài viết (Posts): <b>{stats['total_posts']}</b>\n"
        f"• Tổng số ảnh (Photos): <b>{stats['total_photos']}</b>\n"
        f"• Tổng số video/reels: <b>{stats['total_videos']}</b>\n"
        f"• Tổng tệp đa phương tiện: <b>{stats['total_media']}</b>\n"
    )
    if update.message:
        await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def recent_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lệnh /recent xem các bài đăng vừa lưu."""
    user = update.effective_user
    if user and not is_user_allowed(user.id):
        return

    posts = await database.get_recent_posts(limit=5)
    if not posts:
        if update.message:
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

    if update.message:
        await update.message.reply_text(text, parse_mode=ParseMode.HTML, disable_web_page_preview=True)


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Kiểm tra cấu hình và tình trạng bot."""
    user = update.effective_user
    if user and not is_user_allowed(user.id):
        return

    channel_status = (
        f"✅ Đã cấu hình ({TELEGRAM_STORAGE_CHANNEL_ID})"
        if TELEGRAM_STORAGE_CHANNEL_ID
        else "⚠️ Chưa cấu hình"
    )

    has_cookies = os.path.exists(COOKIES_FILE)
    cookie_status = "✅ Đã nạp (cookies.txt)" if has_cookies else "⚠️ Chưa có file cookies.txt"

    text = (
        "⚙️ <b>TRẠNG THÁI HỆ THỐNG:</b>\n\n"
        f"• Kênh lưu trữ: {channel_status}\n"
        f"• Cookie Instagram: {cookie_status}\n"
        f"• Database: ✅ SQLite sẵn sàng\n"
    )
    if update.message:
        await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def handle_instagram_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Xử lý tin nhắn chứa liên kết Instagram (cả từ chat riêng và từ kênh lưu trữ)."""
    msg = update.effective_message
    if not msg:
        return

    text = msg.text or msg.caption or ""
    shortcode = extract_shortcode(text)
    if not shortcode:
        return

    is_channel = update.channel_post is not None or (update.effective_chat and update.effective_chat.type == ChatType.CHANNEL)
    user = update.effective_user

    # Nếu từ chat riêng, kiểm tra quyền
    if not is_channel and user and not is_user_allowed(user.id):
        await msg.reply_text("⛔ Bạn không có quyền sử dụng bot này.")
        return

    status_msg = None
    if not is_channel:
        status_msg = await msg.reply_text(
            "⏳ <b>Đang lấy ảnh chất lượng cao từ Instagram...</b>",
            parse_mode=ParseMode.HTML,
        )

    download_result = None
    try:
        # 1. Tải ảnh từ Instagram
        download_result = await downloader.download_post(text)
        media_files = download_result["media_files"]

        # Xóa ngay tin nhắn chứa link sau khi đã tải ảnh về máy thành công
        # Đảm bảo tin nhắn link biến mất ngay lập tức, không phụ thuộc vào thời gian upload
        if is_channel or DELETE_LINK_MESSAGE:
            try:
                await context.bot.delete_message(chat_id=msg.chat_id, message_id=msg.message_id)
                logger.info(f"🗑️ Đã xóa tin nhắn link gốc (ID: {msg.message_id})")
            except Exception as e_del:
                logger.warning(f"⚠️ Không thể xóa tin nhắn link (ID: {msg.message_id}): {e_del}")

        if status_msg:
            await status_msg.edit_text(
                f"⏳ Đã tải xong <b>{len(media_files)}</b> tệp. Đang đẩy lên Kênh lưu trữ Telegram...",
                parse_mode=ParseMode.HTML,
            )

        # 2. Xác định kênh nhận ảnh
        # Nếu link gửi thẳng vào kênh -> đích là chính kênh đó.
        # Nếu gửi trong chat riêng -> đích là TELEGRAM_STORAGE_CHANNEL_ID (hoặc chat riêng nếu chưa set kênh)
        if is_channel:
            destination_chat_id = update.effective_chat.id
        else:
            destination_chat_id = TELEGRAM_STORAGE_CHANNEL_ID or update.effective_chat.id

        # 3. Chuẩn bị caption
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
                    m_sent = await context.bot.send_photo(
                        chat_id=destination_chat_id,
                        photo=f,
                        caption=caption_storage,
                        parse_mode=ParseMode.HTML,
                        write_timeout=120.0,
                        read_timeout=120.0,
                    )
                    file_id = m_sent.photo[-1].file_id
                    file_unique_id = m_sent.photo[-1].file_unique_id
                    file_size = m_sent.photo[-1].file_size
                    width = m_sent.photo[-1].width
                    height = m_sent.photo[-1].height
                else:
                    m_sent = await context.bot.send_video(
                        chat_id=destination_chat_id,
                        video=f,
                        caption=caption_storage,
                        parse_mode=ParseMode.HTML,
                        write_timeout=120.0,
                        read_timeout=120.0,
                    )
                    file_id = m_sent.video.file_id
                    file_unique_id = m_sent.video.file_unique_id
                    file_size = m_sent.video.file_size
                    width = m_sent.video.width
                    height = m_sent.video.height

                sent_messages.append(m_sent)
                saved_media_records.append({
                    "file_id": file_id,
                    "file_unique_id": file_unique_id,
                    "media_type": item["type"],
                    "file_size": file_size,
                    "width": width,
                    "height": height,
                })

        # Trường hợp 2: Album nhiều file (batch theo 10 phần tử)
        else:
            chunk_size = 10
            for i in range(0, len(media_files), chunk_size):
                chunk = media_files[i:i + chunk_size]
                media_group = []
                file_handles = []

                for idx, m in enumerate(chunk):
                    fh = open(m["path"], "rb")
                    file_handles.append(fh)
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
                        write_timeout=120.0,
                        read_timeout=120.0,
                    )
                    sent_messages.extend(msgs)

                    for m_s in msgs:
                        if m_s.photo:
                            saved_media_records.append({
                                "file_id": m_s.photo[-1].file_id,
                                "file_unique_id": m_s.photo[-1].file_unique_id,
                                "media_type": "photo",
                                "file_size": m_s.photo[-1].file_size,
                                "width": m_s.photo[-1].width,
                                "height": m_s.photo[-1].height,
                            })
                        elif m_s.video:
                            saved_media_records.append({
                                "file_id": m_s.video.file_id,
                                "file_unique_id": m_s.video.file_unique_id,
                                "media_type": "video",
                                "file_size": m_s.video.file_size,
                                "width": m_s.video.width,
                                "height": m_s.video.height,
                            })
                finally:
                    for fh in file_handles:
                        fh.close()

        # 5. Lưu vào Database
        primary_message_id = sent_messages[0].message_id if sent_messages else None
        user_id = user.id if user else None
        post_id = await database.save_post(
            shortcode=shortcode,
            url=download_result["url"],
            author=author,
            caption=download_result.get("caption", ""),
            channel_id=destination_chat_id,
            channel_message_id=primary_message_id,
            total_media=len(saved_media_records),
            downloaded_by_user_id=user_id,
        )
        await database.save_media_items(post_id, saved_media_records)

        # 6. Phản hồi và Dọn dẹp tin nhắn chứa link
        # Xóa tin nhắn link thô để Kênh lưu trữ luôn sạch đẹp, chỉ hiển thị Album ảnh
        if is_channel or DELETE_LINK_MESSAGE:
            try:
                chat_id_to_delete = msg.chat_id
                msg_id_to_delete = msg.message_id
                logger.info(f"Đang tiến hành xóa tin nhắn link (chat_id={chat_id_to_delete}, msg_id={msg_id_to_delete})...")
                await context.bot.delete_message(chat_id=chat_id_to_delete, message_id=msg_id_to_delete)
                logger.info(f"🗑️ Đã xóa tin nhắn link gốc (ID: {msg_id_to_delete}) thành công.")
            except Exception as e:
                logger.error(
                    f"⚠️ Không thể xóa tin nhắn link: {e}. "
                    "Hãy kiểm tra quyền 'Delete messages' của Bot trong cài đặt Kênh!",
                    exc_info=True
                )

        # Nếu gửi trong chat riêng: Cập nhật status_msg kèm nút bấm
        if status_msg:
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
        logger.error(f"Error handling Instagram message: {e}", exc_info=True)
        if status_msg:
            error_msg = f"❌ <b>Lỗi khi tải hoặc lưu ảnh:</b>\n<code>{html.escape(str(e))}</code>"
            await status_msg.edit_text(error_msg, parse_mode=ParseMode.HTML)

    finally:
        if download_result and "target_dir" in download_result:
            clean_download_dir(download_result["target_dir"])


def create_bot_application() -> Application:
    """Tạo và cấu hình ứng dụng Telegram Bot."""
    if not TELEGRAM_BOT_TOKEN:
        raise ValueError(
            "Chưa cấu hình TELEGRAM_BOT_TOKEN! Hãy tạo file .env và điền Token từ @BotFather."
        )

    # Tăng timeout lên 120 giây để TX3 Mini upload các album ảnh 4K/video nặng qua Wi-Fi không bị ngắt TimedOut
    request = HTTPXRequest(
        connect_timeout=30.0,
        read_timeout=120.0,
        write_timeout=120.0,
        pool_timeout=30.0,
    )

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).request(request).build()

    # Đăng ký các command
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("stats", stats_command))
    app.add_handler(CommandHandler("recent", recent_command))
    app.add_handler(CommandHandler("status", status_command))

    # Đăng ký message handler nhận link Instagram (cả tin nhắn thường và tin trong channel)
    insta_filter = (filters.TEXT | filters.CAPTION) & (~filters.COMMAND) & filters.Regex(r"instagram\.com")
    app.add_handler(MessageHandler(insta_filter, handle_instagram_message))

    return app
