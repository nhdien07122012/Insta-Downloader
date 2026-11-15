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
    BotCommand,
    BotCommandScopeDefault,
    BotCommandScopeAllChatAdministrators,
    MenuButtonCommands,
)
from telegram.error import RetryAfter, TimedOut, NetworkError
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
from instagram import (
    InstagramDownloader,
    clean_download_dir,
    extract_shortcode,
    extract_all_media_targets,
)

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
        "/scan - Quét & tự động tải toàn bộ link tồn đọng trên Kênh\n"
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


# Giới hạn xử lý an toàn: Mỗi thời điểm xử lý 1 tác vụ tải/đẩy ảnh để bảo vệ RAM chip S905W trên TX3 Mini
# và triệt tiêu hoàn toàn lỗi Telegram Flood Control (HTTP 429) khi người dùng gửi dồn dập nhiều link.
PROCESS_SEMAPHORE = asyncio.Semaphore(1)


async def safe_send_photo(
    bot, chat_id: Any, photo: Any, caption: str = None, parse_mode: Any = None, retries: int = 3
):
    """Gửi ảnh an toàn, tự động xử lý Telegram Flood Control (429) và timeout mạng."""
    for attempt in range(retries):
        try:
            return await bot.send_photo(
                chat_id=chat_id,
                photo=photo,
                caption=caption,
                parse_mode=parse_mode,
                write_timeout=180.0,
                read_timeout=180.0,
            )
        except RetryAfter as e:
            wait_time = int(e.retry_after) + 1
            logger.warning(f"⚠️ Telegram Flood Control: Đợi {wait_time}s trước khi gửi lại ảnh...")
            await asyncio.sleep(wait_time)
            if hasattr(photo, "seek"):
                photo.seek(0)
        except (TimedOut, NetworkError) as e:
            if attempt == retries - 1:
                raise
            logger.warning(f"⚠️ Mạng gián đoạn ({e}), thử lại lần {attempt + 2}/{retries}...")
            await asyncio.sleep(2)
            if hasattr(photo, "seek"):
                photo.seek(0)


async def safe_send_video(
    bot,
    chat_id: Any,
    video: Any,
    caption: str = None,
    parse_mode: Any = None,
    supports_streaming: bool = True,
    duration: int = None,
    width: int = None,
    height: int = None,
    retries: int = 3,
):
    """Gửi video an toàn, tự động xử lý Telegram Flood Control (429) và timeout mạng."""
    for attempt in range(retries):
        try:
            return await bot.send_video(
                chat_id=chat_id,
                video=video,
                caption=caption,
                parse_mode=parse_mode,
                supports_streaming=supports_streaming,
                duration=duration,
                width=width,
                height=height,
                write_timeout=300.0,
                read_timeout=300.0,
            )
        except RetryAfter as e:
            wait_time = int(e.retry_after) + 1
            logger.warning(f"⚠️ Telegram Flood Control: Đợi {wait_time}s trước khi gửi lại video...")
            await asyncio.sleep(wait_time)
            if hasattr(video, "seek"):
                video.seek(0)
        except (TimedOut, NetworkError) as e:
            if attempt == retries - 1:
                raise
            await asyncio.sleep(3)
            if hasattr(video, "seek"):
                video.seek(0)


async def safe_send_media_group(bot, chat_id: Any, media: list, retries: int = 3):
    """Gửi album ảnh/video an toàn, tự động xử lý Telegram Flood Control (429) và timeout mạng."""
    for attempt in range(retries):
        try:
            return await bot.send_media_group(
                chat_id=chat_id,
                media=media,
                write_timeout=300.0,
                read_timeout=300.0,
            )
        except RetryAfter as e:
            wait_time = int(e.retry_after) + 1
            logger.warning(f"⚠️ Telegram Flood Control: Đợi {wait_time}s trước khi gửi lại album...")
            await asyncio.sleep(wait_time)
            for m in media:
                if hasattr(m, "media") and hasattr(m.media, "seek"):
                    m.media.seek(0)
        except (TimedOut, NetworkError) as e:
            if attempt == retries - 1:
                raise
            await asyncio.sleep(3)
            for m in media:
                if hasattr(m, "media") and hasattr(m.media, "seek"):
                    m.media.seek(0)


async def process_single_target(
    bot,
    target: Dict[str, Any],
    destination_chat_id: Any,
    original_msg_chat_id: Any = None,
    original_msg_id: Any = None,
    user: Any = None,
    status_msg: Any = None,
) -> bool:
    """Tải và đẩy 1 bài viết (Instagram hoặc Twitter/X) lên Kênh lưu trữ (khóa tuần tự Semaphore)."""
    async with PROCESS_SEMAPHORE:
        target_url = target["url"]
        shortcode = target["id"]
        download_result = None

        try:
            download_result = await downloader.download_post(target_url)
            media_files = download_result["media_files"]
            platform = download_result.get("platform", "instagram")
            platform_name = "Twitter (X)" if platform == "twitter" else "Instagram"
            platform_icon = "🐦" if platform == "twitter" else "📸"

            # Xóa tin nhắn link gốc sau khi tải thành công
            if original_msg_chat_id and original_msg_id:
                try:
                    await bot.delete_message(chat_id=original_msg_chat_id, message_id=original_msg_id)
                    logger.info(f"🗑️ Đã xóa tin nhắn link gốc (chat_id={original_msg_chat_id}, ID: {original_msg_id})")
                except Exception as e_del:
                    logger.debug(f"Không thể xóa tin nhắn link gốc: {e_del}")

            if status_msg:
                try:
                    await status_msg.edit_text(
                        f"⏳ Đã tải xong <b>{len(media_files)}</b> tệp từ {platform_name}. Đang đẩy lên Kênh lưu trữ...",
                        parse_mode=ParseMode.HTML,
                    )
                except Exception:
                    pass

            # Chuẩn bị caption
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

            # Upload lên Telegram
            if len(media_files) == 1:
                item = media_files[0]
                with open(item["path"], "rb") as f:
                    if item["type"] == "photo":
                        m_sent = await safe_send_photo(
                            bot=bot,
                            chat_id=destination_chat_id,
                            photo=f,
                            caption=caption_storage,
                            parse_mode=ParseMode.HTML,
                        )
                        file_id = m_sent.photo[-1].file_id
                        file_unique_id = m_sent.photo[-1].file_unique_id
                        file_size = m_sent.photo[-1].file_size
                        width = m_sent.photo[-1].width
                        height = m_sent.photo[-1].height
                    else:
                        v_meta = get_video_meta(item["path"])
                        m_sent = await safe_send_video(
                            bot=bot,
                            chat_id=destination_chat_id,
                            video=f,
                            caption=caption_storage,
                            parse_mode=ParseMode.HTML,
                            supports_streaming=True,
                            duration=v_meta["duration"],
                            width=v_meta["width"],
                            height=v_meta["height"],
                        )
                        v_obj = m_sent.video or m_sent.animation or m_sent.document
                        file_id = v_obj.file_id if v_obj else ""
                        file_unique_id = v_obj.file_unique_id if v_obj else ""
                        file_size = getattr(v_obj, "file_size", 0) or 0
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
                        msgs = await safe_send_media_group(
                            bot=bot,
                            chat_id=destination_chat_id,
                            media=media_group,
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

            # Lưu vào Database
            primary_message_id = sent_messages[0].message_id if sent_messages else None
            user_id_val = user.id if user else None
            post_id = await database.save_post(
                shortcode=shortcode,
                url=download_result["url"],
                author=author,
                caption=download_result.get("caption", ""),
                channel_id=destination_chat_id,
                channel_message_id=primary_message_id,
                total_media=len(saved_media_records),
                downloaded_by_user_id=user_id_val,
            )
            await database.save_media_items(post_id, saved_media_records)

            # Phản hồi trong chat riêng nếu có
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

            return True

        finally:
            if download_result and "target_dir" in download_result:
                clean_download_dir(download_result["target_dir"])
            # Giãn cách 0.8 giây để Telegram API và CPU hạ nhiệt an toàn
            await asyncio.sleep(0.8)


async def handle_instagram_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Xử lý tin nhắn chứa liên kết Instagram hoặc Twitter/X (cả từ chat riêng và từ kênh lưu trữ)."""
    msg = update.effective_message
    if not msg:
        return

    text = msg.text or msg.caption or ""
    targets = extract_all_media_targets(text)
    if not targets:
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
            f"⏳ <b>Đang lấy media từ {len(targets)} liên kết...</b>" if len(targets) > 1 else "⏳ <b>Đang lấy media chất lượng cao từ liên kết...</b>",
            parse_mode=ParseMode.HTML,
        )

    destination_chat_id = update.effective_chat.id if is_channel else (TELEGRAM_STORAGE_CHANNEL_ID or update.effective_chat.id)

    success_count = 0
    for target in targets:
        try:
            ok = await process_single_target(
                bot=context.bot,
                target=target,
                destination_chat_id=destination_chat_id,
                original_msg_chat_id=msg.chat_id,
                original_msg_id=msg.message_id,
                user=user,
                status_msg=status_msg if len(targets) == 1 else None,
            )
            if ok:
                success_count += 1
        except Exception as e:
            logger.error(f"Lỗi khi xử lý link {target.get('url')}: {e}", exc_info=True)
            if status_msg and len(targets) == 1:
                await status_msg.edit_text(f"❌ <b>Lỗi khi tải hoặc lưu ảnh:</b>\n<code>{html.escape(str(e))}</code>", parse_mode=ParseMode.HTML)
            elif is_channel:
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

    # Nếu có nhiều link trong 1 tin nhắn, báo tổng kết trong chat riêng
    if status_msg and len(targets) > 1:
        await status_msg.edit_text(
            f"✅ <b>Đã xử lý xong {success_count}/{len(targets)} bài viết!</b>",
            parse_mode=ParseMode.HTML,
        )


async def scan_and_process_channel_backlog(bot, limit: int = 60) -> int:
    """
    Quét ngược các tin nhắn trong kênh lưu trữ để phát hiện và xử lý toàn bộ các link
    Instagram & Twitter/X chưa được xử lý (ví dụ lúc bot offline hoặc gửi qua phím tắt).
    Sử dụng kỹ thuật forwardMessage để đọc nội dung tin nhắn trong kênh.
    """
    if not TELEGRAM_STORAGE_CHANNEL_ID:
        logger.warning("Chưa cấu hình TELEGRAM_STORAGE_CHANNEL_ID để quét kênh.")
        return 0

    channel_id = TELEGRAM_STORAGE_CHANNEL_ID
    # 1. Gửi tin nhắn canary để lấy message_id cao nhất hiện tại của kênh
    try:
        canary = await bot.send_message(chat_id=channel_id, text="🔍 [Scanner Active]")
        highest_id = canary.message_id
        await bot.delete_message(chat_id=channel_id, message_id=highest_id)
    except Exception as e_canary:
        logger.warning(f"Không thể lấy message_id cao nhất trong kênh: {e_canary}")
        return 0

    start_id = max(1, highest_id - limit)
    logger.info(f"🔎 Bắt đầu quét kênh {channel_id} từ message_id {start_id} đến {highest_id} (tối đa {limit} tin)...")

    processed_count = 0
    for mid in range(start_id, highest_id):
        try:
            # Dùng forwardMessage tạm thời vào kênh để đọc được text của tin nhắn
            fwd = await bot.forward_message(
                chat_id=channel_id,
                from_chat_id=channel_id,
                message_id=mid,
            )
            raw_text = (fwd.text or fwd.caption or "").strip()
            fwd_id = fwd.message_id
            # Xóa ngay tin nhắn forward tạm
            await bot.delete_message(chat_id=channel_id, message_id=fwd_id)

            # Dọn dẹp tin nhắn lệnh /scan cũ nếu còn tồn tại trong kênh (bất kể viết hoa /Scan hay /scan)
            if raw_text.lower().startswith("/scan"):
                try:
                    await bot.delete_message(chat_id=channel_id, message_id=mid)
                except Exception:
                    pass
                continue

            # Bỏ qua nếu tin nhắn này là bài đăng đã lưu của bot (có chứa 'Lưu Trữ' hoặc không có link)
            if "Lưu Trữ" in raw_text and ("Tác giả:" in raw_text or "Số lượng:" in raw_text):
                continue

            targets = extract_all_media_targets(raw_text)
            if targets:
                logger.info(f"🎯 Phát hiện {len(targets)} link tồn đọng tại message_id {mid}: {raw_text[:60]}")
                for target in targets:
                    try:
                        success = await process_single_target(
                            bot=bot,
                            target=target,
                            destination_chat_id=channel_id,
                            original_msg_chat_id=channel_id,
                            original_msg_id=mid,
                        )
                        if success:
                            processed_count += 1
                    except Exception as e_proc:
                        logger.error(f"Lỗi khi xử lý link tồn đọng {target['url']}: {e_proc}")

                # Đảm bảo tin nhắn link gốc được xóa sau khi xử lý
                try:
                    await bot.delete_message(chat_id=channel_id, message_id=mid)
                except Exception:
                    pass

            await asyncio.sleep(0.05)  # Tránh flood rate limit của Telegram

        except Exception:
            # Tin nhắn không tồn tại hoặc đã bị xóa -> bỏ qua
            continue

    logger.info(f"✅ Quét xong kênh! Đã xử lý thành công {processed_count} bài viết tồn đọng.")
    return processed_count


async def scan_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lệnh /scan: Quét và xử lý các link tồn đọng trên Kênh lưu trữ. Hỗ trợ tùy chỉnh số lượng, vd: /scan 20"""
    chat = update.effective_chat
    msg = update.effective_message
    user = update.effective_user

    # Bỏ qua nếu từ user không được cấp phép trong chat riêng
    if user and not is_user_allowed(user.id):
        return

    # Nếu gửi trong channel: chỉ cho phép từ kênh lưu trữ chính
    if chat and chat.type == ChatType.CHANNEL:
        if TELEGRAM_STORAGE_CHANNEL_ID and chat.id != TELEGRAM_STORAGE_CHANNEL_ID:
            return

    # Mặc định quét siêu nhanh 20 tin gần nhất; người dùng có thể truyền tham số vd: /scan 10, /scan 50
    scan_limit = 20
    arg_val = None
    if context.args and len(context.args) > 0:
        arg_val = context.args[0]
    elif msg and msg.text:
        parts = msg.text.strip().split()
        if len(parts) > 1 and parts[1].isdigit():
            arg_val = parts[1]

    if arg_val:
        try:
            scan_limit = min(300, max(5, int(arg_val)))
        except ValueError:
            pass

    status_msg = None
    if chat:
        try:
            status_msg = await context.bot.send_message(
                chat_id=chat.id,
                text=f"🔍 <b>Đang quét {scan_limit} tin nhắn gần nhất trong kênh...</b>",
                parse_mode=ParseMode.HTML,
            )
        except Exception as e:
            logger.warning(f"Không thể gửi thông báo scan: {e}")

    count = await scan_and_process_channel_backlog(context.bot, limit=scan_limit)

    if status_msg and chat:
        try:
            if count > 0:
                await status_msg.edit_text(
                    f"🎉 <b>Quét hoàn tất ({scan_limit} tin gần nhất)!</b>\nĐã phát hiện và tải thành công <b>{count}</b> bài viết tồn đọng vào kho.",
                    parse_mode=ParseMode.HTML,
                )
            else:
                await status_msg.edit_text(
                    f"✅ <b>Kênh lưu trữ sạch sẽ!</b> Không có link tồn đọng nào trong {scan_limit} tin gần nhất.",
                    parse_mode=ParseMode.HTML,
                )

            # Tự động xóa tin nhắn /scan và status_msg sau 10 giây nếu gửi trong channel
            if chat.type == ChatType.CHANNEL:
                await asyncio.sleep(10)
                if msg:
                    try:
                        await msg.delete()
                    except Exception:
                        pass
                try:
                    await status_msg.delete()
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Lỗi khi cập nhật kết quả scan: {e}")


async def post_init_callback(application: Application):
    """Chạy sau khi bot khởi động: Đồng bộ menu lệnh bot lên Telegram và quét dọn kênh ngầm."""
    # 1. Đăng ký menu lệnh với Telegram (Hiển thị nút Menu trong chat và gợi ý khi gõ / trong kênh)
    bot_commands = [
        BotCommand("scan", "Quét & tải link tồn đọng (mặc định 20 tin, vd: /scan 50)"),
        BotCommand("stats", "Xem thống kê kho ảnh lưu trữ"),
        BotCommand("recent", "Xem danh sách bài đăng đã lưu gần nhất"),
        BotCommand("status", "Kiểm tra trạng thái bot và dung lượng ổ cứng"),
        BotCommand("help", "Xem hướng dẫn sử dụng bot"),
    ]
    try:
        await application.bot.set_my_commands(bot_commands)
        await application.bot.set_my_commands(bot_commands, scope=BotCommandScopeAllChatAdministrators())
        await application.bot.set_chat_menu_button(menu_button=MenuButtonCommands())
        logger.info("✅ Đã đồng bộ menu lệnh và nút Menu bot lên Telegram thành công!")
    except Exception as e:
        logger.warning(f"Lỗi khi đồng bộ menu lệnh bot: {e}")

    # 2. Tự động quét 30 tin nhắn gần nhất lúc khởi động để dọn sạch link tồn đọng
    async def _auto_scan():
        await asyncio.sleep(5)  # Đợi bot ổn định kết nối
        logger.info("🚀 Tự động kích hoạt quét link tồn đọng trên kênh lưu trữ khi khởi động...")
        try:
            count = await scan_and_process_channel_backlog(application.bot, limit=30)
            if count > 0:
                logger.info(f"🎉 Tự động dọn dẹp và xử lý thành công {count} bài viết tồn đọng trên kênh!")
        except Exception as e:
            logger.warning(f"Lỗi khi tự động quét kênh lúc khởi động: {e}")

    asyncio.create_task(_auto_scan())


def create_bot_application() -> Application:
    """Tạo và cấu hình ứng dụng Telegram Bot."""
    if not TELEGRAM_BOT_TOKEN:
        raise ValueError(
            "Chưa cấu hình TELEGRAM_BOT_TOKEN! Hãy tạo file .env và điền Token từ @BotFather."
        )

    # Tăng timeout lên 300 giây để TX3 Mini upload các album ảnh 4K qua Wi-Fi không bị ngắt TimedOut
    request = HTTPXRequest(
        connect_timeout=60.0,
        read_timeout=300.0,
        write_timeout=300.0,
        pool_timeout=60.0,
    )

    # Kích hoạt concurrent_updates=3: Cho phép TX3 Mini xử lý đồng thời 3 link song song
    app = (
        Application.builder()
        .token(TELEGRAM_BOT_TOKEN)
        .request(request)
        .concurrent_updates(3)
        .post_init(post_init_callback)
        .build()
    )

    # Đăng ký các command (dùng filters.ALL để nhận lệnh từ cả Chat riêng, Nhóm và Kênh Lưu Trữ channel_post)
    app.add_handler(CommandHandler("start", start_command, filters=filters.ALL))
    app.add_handler(CommandHandler("help", help_command, filters=filters.ALL))
    app.add_handler(CommandHandler("scan", scan_command, filters=filters.ALL))
    app.add_handler(CommandHandler("stats", stats_command, filters=filters.ALL))
    app.add_handler(CommandHandler("recent", recent_command, filters=filters.ALL))
    app.add_handler(CommandHandler("status", status_command, filters=filters.ALL))

    # Đảm bảo lệnh /scan luôn được bắt kể cả khi gửi dạng văn bản thường trong Kênh (hỗ trợ cả /Scan chữ hoa do bàn phím iOS)
    app.add_handler(MessageHandler(filters.Regex(re.compile(r"^/scan(?:\s|@|$)", re.IGNORECASE)), scan_command))

    # Đăng ký message handler nhận link Instagram & Twitter/X (cả tin nhắn thường, caption và tin trong channel)
    url_pattern = re.compile(r"(instagram\.com|twitter\.com|x\.com|t\.co)", re.IGNORECASE)
    media_filter = (
        (filters.Regex(url_pattern) | filters.CaptionRegex(url_pattern))
        & (~filters.Regex(r"^/"))
    )
    app.add_handler(MessageHandler(media_filter, handle_instagram_message))

    return app
