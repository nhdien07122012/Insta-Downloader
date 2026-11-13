import os
import re
import html
import asyncio
import logging
import shutil
import subprocess
import json
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


async def self_destruct_message(bot, chat_id: Any, message_id: int, delay: int = 15):
    """Tự động xóa tin nhắn cảnh báo sau một khoảng thời gian để giữ sạch kênh."""
    try:
        await asyncio.sleep(delay)
        await bot.delete_message(chat_id=chat_id, message_id=message_id)
    except Exception:
        pass


def get_video_meta(video_path: str) -> dict:
    """Trích xuất độ phân giải và thời lượng video bằng ffprobe nếu có."""
    meta = {"width": None, "height": None, "duration": None}
    ffprobe_bin = shutil.which("ffprobe")
    if not ffprobe_bin or not os.path.exists(video_path):
        return meta
    try:
        cmd = [
            ffprobe_bin, "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,duration:format=duration",
            "-of", "json",
            video_path,
        ]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
        if r.returncode == 0:
            data = json.loads(r.stdout)
            streams = data.get("streams", [])
            fmt = data.get("format", {})
            if streams:
                w = streams[0].get("width")
                h = streams[0].get("height")
                dur = streams[0].get("duration")
                if w and int(w) > 0:
                    meta["width"] = int(w)
                if h and int(h) > 0:
                    meta["height"] = int(h)
                if dur and dur != "N/A":
                    meta["duration"] = int(float(dur))
            if not meta["duration"]:
                dur = fmt.get("duration")
                if dur and dur != "N/A":
                    meta["duration"] = int(float(dur))
    except Exception:
        pass
    return meta


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lệnh /start."""
    user = update.effective_user
    if user and not is_user_allowed(user.id):
        await update.message.reply_text("⛔ Bạn không có quyền sử dụng bot này.")
        return

    first_name = html.escape(user.first_name) if user else "bạn"
    text = (
        f"Xin chào <b>{first_name}</b>! 👋\n\n"
        "📸 <b>Media Cloud Storage Bot (Instagram & Twitter/X)</b> giúp bạn:\n"
        "• Tải toàn bộ ảnh, video, reels và album (carousel) từ Instagram & Twitter/X với chất lượng gốc.\n"
        "• Tự động sao lưu và đẩy lên <b>Kênh Telegram Lưu Trữ</b> (đóng vai trò như Cloud không giới hạn).\n"
        "• Quản lý metadata và xem ảnh/video trực tiếp trên App iPhone.\n\n"
        "🚀 <b>Cách sử dụng:</b>\n"
        "• Cách 1: Gửi hoặc bấm <b>Chia sẻ</b> link Instagram hoặc Twitter/X vào khung chat này với Bot!\n"
        "• Cách 2: Dán link thẳng vào Kênh lưu trữ của bạn (Bot sẽ tự cào và thay thế bằng ảnh/video gốc).\n\n"
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
            "⏳ <b>Đang lấy media chất lượng cao từ liên kết...</b>",
            parse_mode=ParseMode.HTML,
        )

    download_result = None
    try:
        # 1. Tải ảnh/video từ Instagram hoặc Twitter/X
        download_result = await downloader.download_post(text)
        media_files = download_result["media_files"]
        platform = download_result.get("platform", "instagram")
        platform_name = "Twitter (X)" if platform == "twitter" else "Instagram"
        platform_icon = "🐦" if platform == "twitter" else "📸"

        # Xóa ngay tin nhắn chứa link sau khi đã tải ảnh về máy thành công
        # Đảm bảo tin nhắn link biến mất ngay lập tức, không phụ thuộc vào thời gian upload
        if is_channel or DELETE_LINK_MESSAGE:
            try:
                await context.bot.delete_message(chat_id=msg.chat_id, message_id=msg.message_id)
                logger.info(f"🗑️ Đã xóa tin nhắn link gốc (chat_id={msg.chat_id}, ID: {msg.message_id})")
            except Exception as e_del:
                err_str = str(e_del).lower()
                if "message can't be deleted" in err_str and not is_channel:
                    logger.debug("Tin nhắn trong chat riêng không thể xóa (giới hạn chính sách Telegram Bot API).")
                else:
                    logger.warning(f"⚠️ Không thể xóa tin nhắn link (ID: {msg.message_id}): {e_del}")

        if status_msg:
            await status_msg.edit_text(
                f"⏳ Đã tải xong <b>{len(media_files)}</b> tệp từ {platform_name}. Đang đẩy lên Kênh lưu trữ Telegram...",
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
            f"{platform_icon} <b>{platform_name} Lưu Trữ</b>\n"
            f"{author_text}"
            f"🔗 <a href='{download_result['url']}'>Xem trên {platform_name}</a>\n"
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
                    file_size_bytes = os.path.getsize(item["path"])
                    if file_size_bytes > 50 * 1024 * 1024:
                        size_mb = file_size_bytes / (1024 * 1024)
                        warn_caption = (
                            f"{caption_storage}\n\n"
                            f"⚠️ <b>Video có dung lượng {size_mb:.1f}MB</b> (vượt quá giới hạn 50MB của Telegram Bot API).\n"
                            f"💡 <i>Gợi ý: Cài đặt ffmpeg trên TX3 Mini (<code>sudo apt-get install -y ffmpeg</code>) để Bot tự động nén video dài về dưới 50MB.</i>"
                        )
                        m_sent = await context.bot.send_message(
                            chat_id=destination_chat_id,
                            text=warn_caption,
                            parse_mode=ParseMode.HTML,
                            disable_web_page_preview=False,
                        )
                        file_id = ""
                        file_unique_id = ""
                        file_size = file_size_bytes
                        width = 0
                        height = 0
                    else:
                        v_meta = get_video_meta(item["path"])
                        m_sent = await context.bot.send_video(
                            chat_id=destination_chat_id,
                            video=f,
                            caption=caption_storage,
                            parse_mode=ParseMode.HTML,
                            supports_streaming=True,
                            duration=v_meta["duration"],
                            width=v_meta["width"],
                            height=v_meta["height"],
                            write_timeout=300.0,
                            read_timeout=300.0,
                        )
                        v_obj = m_sent.video or m_sent.animation or m_sent.document
                        file_id = v_obj.file_id if v_obj else ""
                        file_unique_id = v_obj.file_unique_id if v_obj else ""
                        file_size = getattr(v_obj, "file_size", 0) or file_size_bytes
                        width = getattr(v_obj, "width", 0) or v_meta["width"] or 0
                        height = getattr(v_obj, "height", 0) or v_meta["height"] or 0

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
                        v_meta = get_video_meta(m["path"])
                        media_group.append(InputMediaVideo(
                            media=fh,
                            caption=cap,
                            parse_mode=pm,
                            supports_streaming=True,
                            duration=v_meta["duration"],
                            width=v_meta["width"],
                            height=v_meta["height"],
                        ))

                try:
                    msgs = await context.bot.send_media_group(
                        chat_id=destination_chat_id,
                        media=media_group,
                        write_timeout=300.0,
                        read_timeout=300.0,
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
                        else:
                            v_obj = m_s.video or m_s.animation or m_s.document
                            if v_obj:
                                saved_media_records.append({
                                    "file_id": v_obj.file_id,
                                    "file_unique_id": v_obj.file_unique_id,
                                    "media_type": "video",
                                    "file_size": getattr(v_obj, "file_size", 0) or 0,
                                    "width": getattr(v_obj, "width", 0) or 0,
                                    "height": getattr(v_obj, "height", 0) or 0,
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

        # 6. Phản hồi cho người dùng nếu gửi trong chat riêng
        if status_msg:
            channel_link = format_channel_post_link(destination_chat_id, primary_message_id)
            keyboard = [
                [InlineKeyboardButton(f"{platform_icon} Mở bài gốc {platform_name}", url=download_result["url"])]
            ]
            if channel_link:
                keyboard[0].append(InlineKeyboardButton("☁️ Xem trên Kênh lưu trữ", url=channel_link))

            reply_markup = InlineKeyboardMarkup(keyboard)
            success_text = (
                f"✅ <b>ĐÃ LƯU VÀO KHO TELEGRAM THÀNH CÔNG!</b>\n\n"
                f"• Tác giả: <b>@{author or platform_name}</b>\n"
                f"• Số lượng: <b>{len(saved_media_records)} tệp</b>\n"
                f"• Mã bài: <code>{shortcode}</code>\n"
            )
            await status_msg.edit_text(
                success_text,
                parse_mode=ParseMode.HTML,
                reply_markup=reply_markup,
            )

    except Exception as e:
        logger.error(f"Error handling media message: {e}", exc_info=True)
        if status_msg:
            error_msg = f"❌ <b>Lỗi khi tải hoặc lưu ảnh:</b>\n<code>{html.escape(str(e))}</code>"
            await status_msg.edit_text(error_msg, parse_mode=ParseMode.HTML)
        elif is_channel:
            # Gửi thông báo lỗi tạm thời vào kênh và tự động xóa sau 15 giây để admin biết nguyên nhân lỗi
            try:
                err_noti = await context.bot.send_message(
                    chat_id=msg.chat_id,
                    text=f"⚠️ <b>Không thể xử lý liên kết:</b>\n<code>{html.escape(str(e))}</code>",
                    parse_mode=ParseMode.HTML,
                    reply_to_message_id=msg.message_id,
                )
                asyncio.create_task(self_destruct_message(context.bot, msg.chat_id, err_noti.message_id, delay=15))
            except Exception:
                pass

    finally:
        if download_result and "target_dir" in download_result:
            clean_download_dir(download_result["target_dir"])


def create_bot_application() -> Application:
    """Tạo và cấu hình ứng dụng Telegram Bot."""
    if not TELEGRAM_BOT_TOKEN:
        raise ValueError(
            "Chưa cấu hình TELEGRAM_BOT_TOKEN! Hãy tạo file .env và điền Token từ @BotFather."
        )

    # Tăng timeout lên 300 giây để TX3 Mini upload các album ảnh 4K/video dài nặng qua Wi-Fi không bị ngắt TimedOut
    request = HTTPXRequest(
        connect_timeout=60.0,
        read_timeout=300.0,
        write_timeout=300.0,
        pool_timeout=60.0,
    )

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).request(request).build()

    # Đăng ký các command
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("stats", stats_command))
    app.add_handler(CommandHandler("recent", recent_command))
    app.add_handler(CommandHandler("status", status_command))

    # Đăng ký message handler nhận link Instagram & Twitter/X (cả tin nhắn thường, caption và tin trong channel)
    url_pattern = re.compile(r"(instagram\.com|twitter\.com|x\.com|t\.co)", re.IGNORECASE)
    media_filter = (
        (filters.Regex(url_pattern) | filters.CaptionRegex(url_pattern))
        & (~filters.COMMAND)
    )
    app.add_handler(MessageHandler(media_filter, handle_instagram_message))

    return app
