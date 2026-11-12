import os
import re
import sys
import json
import shutil
import asyncio
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

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
        pass

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

        clean_url = f"https://www.instagram.com/p/{shortcode}/"

        # Phương pháp 1: gallery-dl (Tối ưu nhất cho ảnh, album/carousel và video Instagram)
        try:
            return self._download_with_gallery_dl(clean_url, shortcode, target_dir)
        except Exception as e_gdl:
            print(f"[gallery-dl Error] {e_gdl}. Đang thử phương pháp dự phòng...")

        # Phương pháp 2: yt-dlp (Tốt cho Reels và Video)
        try:
            return self._download_with_ytdlp(clean_url, shortcode, target_dir)
        except Exception as e_yt:
            print(f"[yt-dlp Error] {e_yt}")

        # Phương pháp 3: RapidAPI nếu có cấu hình
        if RAPIDAPI_KEY:
            try:
                return self._download_with_rapidapi(clean_url, shortcode, target_dir)
            except Exception as e_api:
                print(f"[RapidAPI Error] {e_api}")

        # Nếu tất cả đều thất bại
        raise RuntimeError(
            "Không thể tải ảnh từ Instagram. "
            "Vui lòng kiểm tra lại file 'cookies.txt' để đảm bảo cookie Instagram vẫn còn hạn."
        )

    def _download_with_gallery_dl(self, url: str, shortcode: str, target_dir: Path) -> Dict[str, Any]:
        """Tải ảnh và video chất lượng gốc bằng gallery-dl."""
        # 1. Lấy metadata trước
        json_cmd = [
            sys.executable, "-m", "gallery_dl",
            "-j",
            url,
        ]
        if os.path.exists(COOKIES_FILE):
            json_cmd.extend(["--cookies", COOKIES_FILE])

        res_json = subprocess.run(json_cmd, capture_output=True, text=True, encoding="utf-8")
        author = ""
        caption = ""

        if res_json.returncode == 0 and res_json.stdout.strip():
            try:
                data = json.loads(res_json.stdout)
                for item in data:
                    if isinstance(item, list) and len(item) >= 2 and item[0] == 2:
                        meta = item[1]
                        author = meta.get("username", "") or meta.get("fullname", "")
                        caption = meta.get("description", "") or ""
                        break
            except Exception as e:
                print(f"[Warning] Parse metadata gallery-dl error: {e}")

        # 2. Tải các file media về target_dir
        dl_cmd = [
            sys.executable, "-m", "gallery_dl",
            "-D", str(target_dir),
            "--filename", "{num}_{filename}.{extension}",
            "--no-part",
            url,
        ]
        if os.path.exists(COOKIES_FILE):
            dl_cmd.extend(["--cookies", COOKIES_FILE])

        res_dl = subprocess.run(dl_cmd, capture_output=True, text=True, encoding="utf-8")
        if res_dl.returncode != 0:
            err_msg = res_dl.stderr.strip() or res_dl.stdout.strip()
            raise RuntimeError(f"gallery-dl download failed: {err_msg}")

        # 3. Thu thập danh sách file đã tải
        media_files = []
        # Quét tất cả file trong target_dir (và cả thư mục con nếu gallery-dl tạo)
        for file in sorted(target_dir.rglob("*.*")):
            if file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                media_files.append({"path": str(file), "type": "photo"})
            elif file.suffix.lower() in [".mp4", ".mov"]:
                media_files.append({"path": str(file), "type": "video"})

        if not media_files:
            raise RuntimeError("Không tìm thấy file ảnh hoặc video nào được tải về.")

        return {
            "shortcode": shortcode,
            "url": url,
            "author": author,
            "caption": caption,
            "media_files": media_files,
            "target_dir": target_dir,
        }

    def _download_with_ytdlp(self, url: str, shortcode: str, target_dir: Path) -> Dict[str, Any]:
        import yt_dlp
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
        for file in sorted(target_dir.rglob("*.*")):
            if file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                media_files.append({"path": str(file), "type": "photo"})
            elif file.suffix.lower() in [".mp4", ".mov"]:
                media_files.append({"path": str(file), "type": "video"})

        if not media_files:
            raise RuntimeError("yt-dlp không tải được file media nào.")

        return {
            "shortcode": shortcode,
            "url": url,
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
