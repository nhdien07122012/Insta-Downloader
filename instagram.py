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

# Regex tìm kiếm link Instagram (post hoặc reel, hỗ trợ cả định dạng share mới)
INSTA_URL_PATTERN = re.compile(
    r"https?://(?:www\.)?instagram\.com/(?:share/)?(?:p|reel|tv)/([a-zA-Z0-9_-]+)/?",
    re.IGNORECASE,
)

# Regex tìm kiếm link Twitter / X (tweet hoặc status)
TWITTER_URL_PATTERN = re.compile(
    r"https?://(?:www\.|mobile\.)?(?:twitter|x)\.com/(?:#!/)?(?:i/)?(?:web/)?(?:([a-zA-Z0-9_]+)/)?status(?:es)?/(\d+)",
    re.IGNORECASE,
)


def extract_media_target(url_or_text: str) -> Optional[Dict[str, Any]]:
    """Trích xuất thông tin bài viết từ link Instagram hoặc Twitter/X."""
    # 0. Giải mã link rút gọn t.co nếu có
    tco_match = re.search(r"https?://t\.co/[a-zA-Z0-9]+", url_or_text)
    if tco_match:
        try:
            import requests
            r = requests.head(tco_match.group(0), allow_redirects=True, timeout=5)
            if r.status_code in (200, 301, 302, 307, 308) and r.url:
                url_or_text = r.url
        except Exception:
            pass

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
        username = tw_match.group(1) or "i"
        tweet_id = tw_match.group(2)
        return {
            "platform": "twitter",
            "id": tweet_id,
            "username": username,
            "url": f"https://x.com/{username}/status/{tweet_id}",
        }

    return None


def extract_all_media_targets(url_or_text: str) -> List[Dict[str, Any]]:
    """Trích xuất tất cả các bài viết từ văn bản chứa một hoặc nhiều link Instagram hoặc Twitter/X."""
    targets = []
    seen_ids = set()

    # 1. Instagram links
    for m in INSTA_URL_PATTERN.finditer(url_or_text):
        shortcode = m.group(1)
        if shortcode not in seen_ids:
            seen_ids.add(shortcode)
            targets.append({
                "platform": "instagram",
                "id": shortcode,
                "url": f"https://www.instagram.com/p/{shortcode}/",
            })

    # 2. Twitter / X links
    for m in TWITTER_URL_PATTERN.finditer(url_or_text):
        username = m.group(1) or "i"
        tweet_id = m.group(2)
        if tweet_id not in seen_ids:
            seen_ids.add(tweet_id)
            targets.append({
                "platform": "twitter",
                "id": tweet_id,
                "username": username,
                "url": f"https://x.com/{username}/status/{tweet_id}",
            })

    # 3. t.co links
    for m in re.finditer(r"https?://t\.co/[a-zA-Z0-9]+", url_or_text):
        tco_url = m.group(0)
        try:
            import requests
            r = requests.head(tco_url, allow_redirects=True, timeout=5)
            if r.status_code in (200, 301, 302, 307, 308) and r.url:
                sub_targets = extract_all_media_targets(r.url)
                for st in sub_targets:
                    if st["id"] not in seen_ids:
                        seen_ids.add(st["id"])
                        targets.append(st)
        except Exception:
            pass

    return targets


def extract_shortcode(url_or_text: str) -> Optional[str]:
    """Trích xuất mã bài viết từ Instagram hoặc Twitter/X (tương thích ngược hoàn toàn)."""
    target = extract_media_target(url_or_text)
    if target:
        return target["id"]
    return None


def compress_video_to_size(video_path: Path, max_size_mb: float = 48.5) -> Path:
    """Tương thích ngược: Không nén video vì bot chuyển sang chế độ chuyên biệt chỉ lưu trữ ảnh."""
    return video_path


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

        # Nếu là Twitter / X: Sử dụng bộ cào Twitter chuyên dụng (chỉ tải ảnh)
        if platform == "twitter":
            return self._download_twitter(clean_url, item_id, target_dir)

        # Nếu là Instagram:
        # Phương pháp 1: gallery-dl (Tối ưu cho ảnh đơn và album/carousel Instagram)
        try:
            res = self._download_with_gallery_dl(clean_url, item_id, target_dir)
            res["platform"] = "instagram"
            return res
        except Exception as e_gdl:
            print(f"[gallery-dl Error] {e_gdl}. Đang thử phương pháp dự phòng Instaloader...")

        # Phương pháp 2: Instaloader (Chuyên biệt cho ảnh bài viết Instagram)
        try:
            res = self._download_with_instaloader(item_id, target_dir)
            return res
        except Exception as e_il:
            print(f"[Instaloader Error] {e_il}")

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
            "Không tìm thấy ảnh nào từ bài viết Instagram này (hoặc bài viết là Video/Reel). "
            "Bot hiện chuyên biệt hóa chỉ lưu trữ ẢNH chất lượng cao để Box TX3 Mini chạy nhanh nhất."
        )

    def _download_twitter(self, url: str, tweet_id: str, target_dir: Path) -> Dict[str, Any]:
        """Tải ảnh chất lượng gốc (Full Resolution orig) từ Twitter (X)."""
        import requests

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        # 1. Thử dùng fxtwitter/vxtwitter API (tải ảnh gốc orig 100%, không cần login)
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

                        # Chỉ lọc lấy ẢNH (photos), bỏ qua video để Box TX3 Mini chạy siêu tốc
                        items_to_download = []
                        if "photos" in media_info and media_info["photos"]:
                            items_to_download = media_info["photos"]
                        elif "all" in media_info and media_info["all"]:
                            items_to_download = [item for item in media_info["all"] if item.get("type") == "photo"]

                        # Hỗ trợ ảnh từ Link Card Preview nếu tweet chia sẻ link web (như GestaltX/Silzee)
                        if not items_to_download and "card" in tweet and tweet["card"]:
                            card = tweet["card"]
                            if isinstance(card, dict) and "image" in card and card["image"]:
                                card_img = card["image"]
                                card_url = card_img.get("url") if isinstance(card_img, dict) else str(card_img)
                                if card_url:
                                    card_url_orig = re.sub(r"name=\w+", "name=orig", card_url)
                                    items_to_download.append({
                                        "type": "photo",
                                        "url": card_url_orig,
                                    })

                        # Nếu bài viết chỉ có video/gif mà không có ảnh nào
                        has_video = "videos" in media_info or any(m.get("type") in ("video", "gif") for m in media_info.get("all", []))
                        if not items_to_download and has_video:
                            raise RuntimeError(
                                "Bài viết này là Video. Bot hiện tại chuyên biệt hóa chỉ lưu trữ ẢNH chất lượng cao (để Box TX3 Mini chạy nhanh 1-2 giây và không tốn CPU)."
                            )

                        media_files = []
                        for idx, item in enumerate(items_to_download):
                            m_url = item.get("url")
                            if not m_url:
                                continue

                            # Luôn lấy ảnh chất lượng gốc sắc nét nhất (name=orig)
                            if "twimg.com" in m_url and "name=" in m_url:
                                m_url = re.sub(r"name=\w+", "name=orig", m_url)

                            file_path = target_dir / f"{idx}_photo.jpg"
                            r_file = requests.get(m_url, headers=headers, timeout=30)
                            if r_file.status_code == 200:
                                with open(file_path, "wb") as f:
                                    f.write(r_file.content)
                                if file_path.exists() and file_path.stat().st_size > 100:
                                    media_files.append({
                                        "path": str(file_path),
                                        "type": "photo",
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
            except RuntimeError:
                raise
            except Exception as e_api:
                print(f"[Warning] Twitter API {api_url} failed: {e_api}")

        # 2. Phương pháp dự phòng: gallery-dl (chỉ tải ảnh)
        try:
            res = self._download_with_gallery_dl(url, tweet_id, target_dir)
            res["platform"] = "twitter"
            return res
        except Exception as e_gdl:
            print(f"[gallery-dl Twitter Error] {e_gdl}")

        raise RuntimeError(
            "Bài viết này là Video hoặc không chứa ảnh. Bot hiện tại chỉ hỗ trợ lưu trữ ẢNH chất lượng cao."
        )

    def _download_with_gallery_dl(self, url: str, shortcode: str, target_dir: Path) -> Dict[str, Any]:
        """Tải ảnh chất lượng gốc bằng gallery-dl (bỏ qua video)."""
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

        # 2. Tải các file ảnh về target_dir (lọc chỉ tải ảnh)
        dl_cmd = [
            sys.executable, "-m", "gallery_dl",
            "-D", str(target_dir),
            "--filename", "{num}_{filename}.{extension}",
            "--filter", "extension in ('jpg', 'jpeg', 'png', 'webp')",
            "--no-part",
            url,
        ]
        if os.path.exists(COOKIES_FILE):
            dl_cmd.extend(["--cookies", COOKIES_FILE])

        res_dl = subprocess.run(dl_cmd, capture_output=True, text=True, encoding="utf-8")
        if res_dl.returncode != 0:
            err_msg = res_dl.stderr.strip() or res_dl.stdout.strip()
            raise RuntimeError(f"gallery-dl download failed: {err_msg}")

        # 3. Thu thập danh sách file ảnh đã tải
        media_files = []
        for file in sorted(target_dir.rglob("*.*")):
            if file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                media_files.append({"path": str(file), "type": "photo"})

        if not media_files:
            raise RuntimeError("Bài viết này là Video/Reel hoặc không có ảnh. Bot hiện chỉ hỗ trợ lưu trữ ẢNH chất lượng cao.")

        return {
            "shortcode": shortcode,
            "url": url,
            "author": author,
            "caption": caption,
            "media_files": media_files,
            "target_dir": target_dir,
        }

    def _download_with_instaloader(self, shortcode: str, target_dir: Path) -> Dict[str, Any]:
        """Tải ảnh bài viết Instagram bằng Instaloader (bỏ qua video)."""
        import instaloader
        L = instaloader.Instaloader(
            dirname_pattern=str(target_dir),
            filename_pattern="{target}_{shortcode}",
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
        )
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        if post.is_video:
            raise RuntimeError("Bài viết Instagram này là Video/Reel. Bot hiện tại chỉ hỗ trợ lưu trữ ẢNH chất lượng cao để Box TX3 Mini chạy nhanh nhất.")

        L.download_post(post, target=str(target_dir))

        media_files = []
        for file in sorted(target_dir.rglob("*.*")):
            if file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                media_files.append({"path": str(file), "type": "photo"})

        if not media_files:
            raise RuntimeError("Không tìm thấy ảnh nào để tải từ bài viết Instagram này.")

        return {
            "platform": "instagram",
            "shortcode": shortcode,
            "url": f"https://www.instagram.com/p/{shortcode}/",
            "author": post.owner_username or "",
            "caption": post.caption or "",
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
