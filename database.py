import aiosqlite
from typing import List, Dict, Any, Optional
from config import DATABASE_PATH

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shortcode TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    author TEXT,
    caption TEXT,
    channel_id TEXT,
    channel_message_id INTEGER,
    total_media INTEGER DEFAULT 1,
    downloaded_by_user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    file_id TEXT NOT NULL,
    file_unique_id TEXT,
    media_type TEXT NOT NULL,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_albums (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, album_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_shortcode ON posts(shortcode);
CREATE INDEX IF NOT EXISTS idx_media_post_id ON media_items(post_id);
"""


async def init_db():
    """Khởi tạo database và các bảng cần thiết."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.executescript(CREATE_TABLES_SQL)
        await db.commit()


async def save_post(
    shortcode: str,
    url: str,
    author: Optional[str],
    caption: Optional[str],
    channel_id: Optional[str],
    channel_message_id: Optional[int],
    total_media: int = 1,
    downloaded_by_user_id: Optional[int] = None,
) -> int:
    """Lưu bài đăng vào DB hoặc cập nhật nếu đã tồn tại."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        async with db.execute(
            """
            INSERT INTO posts (shortcode, url, author, caption, channel_id, channel_message_id, total_media, downloaded_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(shortcode) DO UPDATE SET
                author = excluded.author,
                caption = excluded.caption,
                channel_id = excluded.channel_id,
                channel_message_id = excluded.channel_message_id,
                total_media = excluded.total_media
            RETURNING id;
            """,
            (
                shortcode,
                url,
                author,
                caption,
                str(channel_id) if channel_id else None,
                channel_message_id,
                total_media,
                downloaded_by_user_id,
            ),
        ) as cursor:
            row = await cursor.fetchone()
            post_id = row[0]
        await db.commit()
        return post_id


async def save_media_items(post_id: int, items: List[Dict[str, Any]]):
    """Lưu danh sách media items của 1 post."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Xóa media cũ nếu có (re-download)
        await db.execute("DELETE FROM media_items WHERE post_id = ?", (post_id,))
        for idx, item in enumerate(items):
            await db.execute(
                """
                INSERT INTO media_items (post_id, file_id, file_unique_id, media_type, file_size, width, height, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    post_id,
                    item.get("file_id"),
                    item.get("file_unique_id"),
                    item.get("media_type", "photo"),
                    item.get("file_size"),
                    item.get("width"),
                    item.get("height"),
                    idx,
                ),
            )
        await db.commit()


async def get_post_by_shortcode(shortcode: str) -> Optional[Dict[str, Any]]:
    """Lấy thông tin bài đăng theo shortcode."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM posts WHERE shortcode = ?", (shortcode,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            post = dict(row)

        async with db.execute("SELECT * FROM media_items WHERE post_id = ? ORDER BY order_index ASC", (post["id"],)) as cursor:
            media_rows = await cursor.fetchall()
            post["media"] = [dict(m) for m in media_rows]

        return post


async def get_recent_posts(limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
    """Lấy danh sách các bài đăng mới nhất."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT p.*, COUNT(m.id) as media_count 
            FROM posts p
            LEFT JOIN media_items m ON p.id = m.post_id
            GROUP BY p.id
            ORDER BY p.id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


async def get_stats() -> Dict[str, int]:
    """Lấy thống kê tổng quan."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        async with db.execute("SELECT COUNT(*) FROM posts") as cursor:
            total_posts = (await cursor.fetchone())[0]

        async with db.execute("SELECT COUNT(*) FROM media_items WHERE media_type = 'photo'") as cursor:
            total_photos = (await cursor.fetchone())[0]

        async with db.execute("SELECT COUNT(*) FROM media_items WHERE media_type = 'video'") as cursor:
            total_videos = (await cursor.fetchone())[0]

        return {
            "total_posts": total_posts,
            "total_photos": total_photos,
            "total_videos": total_videos,
            "total_media": total_photos + total_videos,
        }
