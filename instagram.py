import os
import re
import shutil
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
import instaloader
import yt_dlp

from config import (
    BASE_DIR,
    DOWNLOAD_DIR,
    INSTAGRAM_SESSION_ID,
    COOKIES_FILE,
    RAPIDAPI_KEY,
)

# Regex tìm kiếm link Instagram (post hoặc reel)
INSTA_URL_PATTERN = re.compile(
    r"https?://(?:www\.)?instagram\.com/(?:p|reel|tv)/([a-zA-Z0-9_-]+)/?",
    re.IGNORECASE,
)


def extract_shortcode(url_or_text: str) -> Optional[str]:
    """Trích xuất shortcode từ link Instagram."""
    match = INSTA_URL_PATTERN.search(url_or_text)
    if match:
        return match.group(1)
    return None


class InstagramDownloader:
    def __init__(self):
        self.loader = instaloader.Instaloader(
            download_pictures=True,
            download_videos=True,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            post_metadata_txt_pattern="",
        )
        self._setup_session()

    def _setup_session(self):
        """Cấu hình session/cookie nếu có."""
        # Kiểm tra file cookies.txt
        if os.path.exists(COOKIES_FILE):
            try:
                # yt-dlp và instaloader đều có thể dùng cookies.txt
                # Với instaloader, đọc cookie netscape hoặc sessionid
                import http.cookiejar
                cj = http.cookiejar.MozillaCookieJar(COOKIES_FILE)
                cj.load(ignore_discard=True, ignore_expires=True)
                self.loader.context._session.cookies = cj
            except Exception as e:
                print(f"[Warning] Không thể nạp cookies.txt: {e}")

        # Hoặc dùng sessionid trực tiếp từ .env
        elif INSTAGRAM_SESSION_ID:
            self.loader.context._session.cookies.set(
                "sessionid", INSTAGRAM_SESSION_ID, domain=".instagram.com"
            )

    async def download_post(self, url: str) -> Dict[str, Any]:
        """
        Tải post / carousel / reel từ Instagram.
        Chạy trong thread executor để không block asyncio loop.
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._download_sync, url)

    def _download_sync(self, url: str) -> Dict[str, Any]:
        shortcode = extract_shortcode(url)
        if not shortcode:
            raise ValueError("Đường dẫn Instagram không hợp lệ. Hãy kiểm tra lại link.")

        target_dir = DOWNLOAD_DIR / shortcode
        target_dir.mkdir(parents=True, exist_ok=True)

        # Thử Phương pháp 1: Instaloader
        try:
            return self._download_with_instaloader(shortcode, target_dir)
        except Exception as e_insta:
            print(f"[Instaloader Error] {e_insta}. Đang thử yt-dlp...")

        # Thử Phương pháp 2: yt-dlp
        try:
            return self._download_with_ytdlp(url, shortcode, target_dir)
        except Exception as e_yt:
            print(f"[yt-dlp Error] {e_yt}")

        # Thử Phương pháp 3: RapidAPI nếu có cấu hình
        if RAPIDAPI_KEY:
            try:
                return self._download_with_rapidapi(url, shortcode, target_dir)
            except Exception as e_api:
                print(f"[RapidAPI Error] {e_api}")

        # Nếu cả 3 đều thất bại do Instagram chặn
        raise RuntimeError(
            "Không thể tải ảnh từ Instagram. "
            "Instagram hiện yêu cầu đăng nhập/cookie đối với các yêu cầu tự động. "
            "Vui lòng thêm file 'cookies.txt' hoặc 'INSTAGRAM_SESSION_ID' trong file .env."
        )

    def _download_with_instaloader(self, shortcode: str, target_dir: Path) -> Dict[str, Any]:
        post = instaloader.Post.from_shortcode(self.loader.context, shortcode)

        # Download các file của post vào target_dir
        self.loader.dirname_pattern = str(target_dir)
        self.loader.download_post(post, target=str(target_dir))

        # Tìm các file ảnh / video đã tải
        media_files = []
        for file in sorted(target_dir.iterdir()):
            if file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                media_files.append({"path": str(file), "type": "photo"})
            elif file.suffix.lower() in [".mp4", ".mov"]:
                media_files.append({"path": str(file), "type": "video"})

        if not media_files:
            raise RuntimeError("Không tìm thấy file ảnh hoặc video nào được tải về.")

        caption = post.caption if post.caption else ""
        author = post.owner_username if post.owner_username else ""

        return {
            "shortcode": shortcode,
            "url": f"https://www.instagram.com/p/{shortcode}/",
            "author": author,
            "caption": caption,
            "media_files": media_files,
            "target_dir": target_dir,
        }

    def _download_with_ytdlp(self, url: str, shortcode: str, target_dir: Path) -> Dict[str, Any]:
        outtmpl = str(target_dir / "%(id)s_%(autonumber)s.%(ext)s")
        ydl_opts = {
            "outtmpl": outtmpl,
            "quiet": True,
            "no_warnings": True,
        }
        if os.path.exists(COOKIES_FILE):
            ydl_opts["cookiefile"] = COOKIES_FILE

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            caption = info.get("description", "") or info.get("title", "")
            author = info.get("uploader", "") or info.get("channel", "")

        media_files = []
        for file in sorted(target_dir.iterdir()):
            if file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                media_files.append({"path": str(file), "type": "photo"})
            elif file.suffix.lower() in [".mp4", ".mov"]:
                media_files.append({"path": str(file), "type": "video"})

        if not media_files:
            raise RuntimeError("yt-dlp không tải được file media nào.")

        return {
            "shortcode": shortcode,
            "url": f"https://www.instagram.com/p/{shortcode}/",
            "author": author,
            "caption": caption,
            "media_files": media_files,
            "target_dir": target_dir,
        }

    def _download_with_rapidapi(self, url: str, shortcode: str, target_dir: Path) -> Dict[str, Any]:
        import requests
        headers = {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "instagram-downloader-download-instagram-videos-stories.p.rapidapi.com"
        }
        api_url = "https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index"
        resp = requests.get(api_url, headers=headers, params={"url": url}, timeout=15)
        if not resp.ok:
            raise RuntimeError(f"RapidAPI failed: {resp.text}")

        data = resp.json()
        media_urls = []
        if "media" in data and isinstance(data["media"], list):
            media_urls = data["media"]
        elif "media" in data and isinstance(data["media"], str):
            media_urls = [data["media"]]

        media_files = []
        for idx, m_url in enumerate(media_urls):
            file_path = target_dir / f"media_{idx}.jpg"
            r = requests.get(m_url, timeout=20)
            if r.ok:
                with open(file_path, "wb") as f:
                    f.write(r.content)
                media_files.append({"path": str(file_path), "type": "photo"})

        return {
            "shortcode": shortcode,
            "url": url,
            "author": data.get("author", {}).get("username", ""),
            "caption": data.get("title", ""),
            "media_files": media_files,
            "target_dir": target_dir,
        }


def clean_download_dir(target_dir: Path):
    """Xóa thư mục tạm sau khi đã đẩy ảnh lên Telegram."""
    try:
        if target_dir and target_dir.exists():
            shutil.rmtree(target_dir)
    except Exception as e:
        print(f"[Warning] Không thể xóa thư mục tạm {target_dir}: {e}")
