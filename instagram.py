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

# Regex tìm kiếm link Twitter / X (tweet hoặc status)
TWITTER_URL_PATTERN = re.compile(
    r"https?://(?:www\.|mobile\.)?(?:twitter|x)\.com/(?:#!/)?([a-zA-Z0-9_]+)/status(?:es)?/(\d+)",
    re.IGNORECASE,
)


def extract_media_target(url_or_text: str) -> Optional[Dict[str, Any]]:
    """Trích xuất thông tin bài viết từ link Instagram hoặc Twitter/X."""
    # 1. Kiểm tra link Instagram
    insta_match = INSTA_URL_PATTERN.search(url_or_text)
    if insta_match:
        shortcode = insta_match.group(1)
        return {
            "platform": "instagram",
            "id": shortcode,
            "url": f"https://www.instagram.com/p/{shortcode}/",
        }

    # 2. Kiểm tra link Twitter / X
    tw_match = TWITTER_URL_PATTERN.search(url_or_text)
    if tw_match:
        username = tw_match.group(1)
        tweet_id = tw_match.group(2)
        return {
            "platform": "twitter",
            "id": tweet_id,
            "username": username,
            "url": f"https://x.com/{username}/status/{tweet_id}",
        }

    return None


def extract_shortcode(url_or_text: str) -> Optional[str]:
    """Trích xuất mã bài viết từ Instagram hoặc Twitter/X (tương thích ngược hoàn toàn)."""
    target = extract_media_target(url_or_text)
    if target:
        return target["id"]
    return None


class InstagramDownloader:
    def __init__(self):
        pass

    async def download_post(self, url: str) -> Dict[str, Any]:
        """
        Tải post / carousel / reel từ Instagram hoặc tweet/video từ Twitter (X).
        Chạy trong thread executor để không block asyncio loop.
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._download_sync, url)

    def _download_sync(self, url: str) -> Dict[str, Any]:
        target = extract_media_target(url)
        if not target:
            raise ValueError("Đường dẫn không hợp lệ. Vui lòng gửi link bài viết Instagram hoặc Twitter/X.")

        platform = target["platform"]
        item_id = target["id"]
        target_dir = DOWNLOAD_DIR / f"{platform}_{item_id}"
        target_dir.mkdir(parents=True, exist_ok=True)

        clean_url = target["url"]

        # Nếu là Twitter / X: Sử dụng bộ cào Twitter chuyên dụng
        if platform == "twitter":
            return self._download_twitter(clean_url, item_id, target_dir)

        # Nếu là Instagram:
        # Phương pháp 1: gallery-dl (Tối ưu cho ảnh, album/carousel và video Instagram)
        try:
            res = self._download_with_gallery_dl(clean_url, item_id, target_dir)
            res["platform"] = "instagram"
            return res
        except Exception as e_gdl:
            print(f"[gallery-dl Error] {e_gdl}. Đang thử phương pháp dự phòng yt-dlp...")

        # Phương pháp 2: yt-dlp (Tốt cho Reels và Video)
        try:
            res = self._download_with_ytdlp(clean_url, item_id, target_dir)
            res["platform"] = "instagram"
            return res
        except Exception as e_yt:
            print(f"[yt-dlp Error] {e_yt}")

        # Phương pháp 3: RapidAPI nếu có cấu hình (chỉ cho Instagram)
        if RAPIDAPI_KEY:
            try:
                res = self._download_with_rapidapi(clean_url, item_id, target_dir)
                res["platform"] = "instagram"
                return res
            except Exception as e_api:
                print(f"[RapidAPI Error] {e_api}")

        # Nếu tất cả đều thất bại
        raise RuntimeError(
            "Không thể tải media từ Instagram. "
            "Vui lòng kiểm tra lại liên kết hoặc file 'cookies.txt'."
        )

    def _download_twitter(self, url: str, tweet_id: str, target_dir: Path) -> Dict[str, Any]:
        """Tải ảnh và video chất lượng cao từ Twitter (X)."""
        import requests

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        # 1. Thử dùng fxtwitter/vxtwitter API (tải ảnh gốc orig 100%, video mp4, không cần login)
        api_endpoints = [
            f"https://api.fxtwitter.com/status/{tweet_id}",
            f"https://api.vxtwitter.com/status/{tweet_id}",
        ]

        for api_url in api_endpoints:
            try:
                resp = requests.get(api_url, headers=headers, timeout=12)
                if resp.status_code == 200:
                    data = resp.json()
                    tweet = data.get("tweet")
                    if tweet:
                        author = (
                            tweet.get("author", {}).get("screen_name", "")
                            or tweet.get("author", {}).get("name", "")
                        )
                        caption = tweet.get("text", "") or ""
                        media_info = tweet.get("media", {}) or {}

                        items_to_download = []
                        if "all" in media_info and media_info["all"]:
                            items_to_download = media_info["all"]
                        elif "photos" in media_info or "videos" in media_info:
                            items_to_download = media_info.get("photos", []) + media_info.get("videos", [])

                        media_files = []
                        for idx, item in enumerate(items_to_download):
                            m_type = item.get("type", "photo")
                            is_video = m_type in ("video", "gif")
                            m_url = item.get("url")

                            # Nếu video, lấy url có bitrate cao nhất
                            if is_video and "variants" in item:
                                variants = [v for v in item["variants"] if v.get("content_type") == "video/mp4"]
                                if variants:
                                    variants.sort(key=lambda x: x.get("bitrate", 0), reverse=True)
                                    m_url = variants[0].get("url", m_url)

                            if not m_url:
                                continue

                            ext = "mp4" if is_video else "jpg"
                            file_path = target_dir / f"{idx}_{m_type}.{ext}"

                            r_file = requests.get(m_url, headers=headers, timeout=60, stream=True)
                            if r_file.status_code == 200:
                                with open(file_path, "wb") as f:
                                    for chunk in r_file.iter_content(chunk_size=65536):
                                        if chunk:
                                            f.write(chunk)
                                media_files.append({
                                    "path": str(file_path),
                                    "type": "video" if is_video else "photo",
                                })

                        if media_files:
                            return {
                                "platform": "twitter",
                                "shortcode": tweet_id,
                                "url": url,
                                "author": author,
                                "caption": caption,
                                "media_files": media_files,
                                "target_dir": target_dir,
                            }
            except Exception as e_api:
                print(f"[Warning] Twitter API {api_url} failed: {e_api}")

        # 2. Phương pháp dự phòng 1: yt-dlp
        try:
            res = self._download_with_ytdlp(url, tweet_id, target_dir)
            res["platform"] = "twitter"
            return res
        except Exception as e_yt:
            print(f"[yt-dlp Twitter Error] {e_yt}")

        # 3. Phương pháp dự phòng 2: gallery-dl
        try:
            res = self._download_with_gallery_dl(url, tweet_id, target_dir)
            res["platform"] = "twitter"
            return res
        except Exception as e_gdl:
            print(f"[gallery-dl Twitter Error] {e_gdl}")

        raise RuntimeError(
            "Không thể tải ảnh hoặc video từ bài viết Twitter (X) này. "
            "Có thể tweet ở chế độ riêng tư (private) hoặc không chứa ảnh/video."
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
                        author = (
                            meta.get("username", "")
                            or meta.get("user", {}).get("screen_name", "")
                            or meta.get("author", {}).get("name", "")
                            or meta.get("fullname", "")
                        )
                        caption = (
                            meta.get("description", "")
                            or meta.get("content", "")
                            or meta.get("tweet-text", "")
                            or ""
                        )
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
