# 📸 Instagram to Telegram Cloud Storage & Downloader

Hệ thống tự động tải ảnh, album (carousel), reels từ Instagram và lưu trữ lên **Kênh Telegram Riêng Tư (Cloud Storage)** không giới hạn dung lượng, kèm theo cơ sở dữ liệu SQLite quản lý metadata để sẵn sàng kết nối với App iPhone (Telegram Mini App / PWA / Flutter).

---

## 🏗️ Cấu trúc thư mục

```
Insta-Downloader/
├── .env.example              # Mẫu cấu hình môi trường
├── .env                      # File cấu hình thực tế (chứa token, channel id)
├── requirements.txt          # Thư viện phụ thuộc
├── config.py                 # Quản lý cài đặt & nạp biến môi trường
├── database.py               # Quản lý SQLite DB (posts, media_items, albums)
├── instagram.py              # Bộ cào & tải ảnh từ Instagram (Instaloader + yt-dlp)
├── bot.py                    # Logic Telegram Bot (nhận link, upload Telegram, phản hồi)
└── main.py                   # Điểm khởi chạy ứng dụng
```

---

## 🚀 Hướng dẫn cài đặt & Chạy Bot

### Bước 1: Kích hoạt môi trường Python
Môi trường ảo `venv` đã được thiết lập sẵn trong dự án:
```powershell
.\venv\Scripts\activate
```
*(Nếu cài trên máy mới: `python -m venv venv` và `pip install -r requirements.txt`)*

---

### Bước 2: Tạo Bot Telegram & Lấy Token
1. Mở ứng dụng Telegram, tìm và chat với **[@BotFather](https://t.me/BotFather)**.
2. Gửi lệnh `/newbot` và đặt tên cho bot của bạn (ví dụ: `MyInstaSaverBot`).
3. BotFather sẽ gửi lại một **API Token** (dạng `1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ`).
4. Mở file `.env` và dán vào:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
   ```

---

### Bước 3: Tạo Kênh Lưu Trữ Telegram (Cloud Storage)
1. Trên Telegram, tạo một **Kênh Riêng Tư (New Channel -> Private)**, ví dụ đặt tên: *"Kho Ảnh Instagram"*.
2. Vào phần cài đặt kênh -> **Administrators** -> **Add Admin** -> Tìm tên bot bạn vừa tạo và cấp quyền đăng bài.
3. Lấy **Channel ID**:
   * Cách nhanh nhất: Forward 1 tin nhắn bất kỳ từ Kênh sang bot **[@userinfobot](https://t.me/userinfobot)** hoặc **[@JsonDumpBot](https://t.me/JsonDumpBot)**.
   * Bạn sẽ nhận được ID kênh dạng số âm, ví dụ: `-1002345678901`.
4. Dán ID này vào `.env`:
   ```env
   TELEGRAM_STORAGE_CHANNEL_ID=-1002345678901
   ```

---

### Bước 4: (Rất quan trọng) Cấu hình Cookie Instagram
Do Instagram chặn các bot ẩn danh, để bot tải được ảnh ổn định 100%:
* **Cách 1 (Khuyên dùng):** 
  1. Cài tiện ích trình duyệt Chrome/Edge/Firefox: **"Get cookies.txt LOCALLY"**.
  2. Đăng nhập tài khoản Instagram trên trình duyệt.
  3. Bấm vào icon tiện ích -> Bấm **Export** để tải về file `cookies.txt`.
  4. Đổi tên/copy file đó vào ngay thư mục gốc của dự án: `Insta-Downloader/cookies.txt`.
* **Cách 2:** Lấy cookie `sessionid` từ Developer Tools (F12 -> Application -> Cookies -> `sessionid`) và điền vào `.env`:
  ```env
  INSTAGRAM_SESSION_ID=your_session_id_here
  ```

---

### Bước 5: Khởi chạy Bot
```powershell
python main.py
```

Khi màn hình hiện:
```
🚀 INSTAGRAM TELEGRAM STORAGE BOT ĐÃ KHỞI CHẠY!
📦 Kênh lưu trữ: -100xxxxxxxxxx
📱 Sẵn sàng nhận link từ iPhone (Share Sheet / Telegram App)
```
Nghĩa là Bot đã sẵn sàng nhận link!

---

## 📱 Cách dùng từ iPhone

1. **Cách 1 - Chia sẻ trực tiếp:**
   * Mở bài viết bất kỳ trên Instagram trên iPhone.
   * Bấm nút **Share (Chia sẻ)** -> Chọn **Telegram**.
   * Chọn gửi vào Bot bạn vừa tạo.
   * Bot sẽ tự động tải toàn bộ ảnh gốc và đẩy vào Kênh lưu trữ, đồng thời gửi lại thông báo kèm nút mở trực tiếp bài viết.

2. **Cách 2 - Dùng Phím tắt iOS (Shortcuts):**
   * Bạn có thể tạo 1 phím tắt iOS để khi bấm Share trên Instagram, URL được gửi tự động đến bot mà không cần chọn thủ công.

---

## 📋 Các lệnh điều khiển trong Bot
* `/start`: Giới thiệu và hướng dẫn.
* `/help`: Hướng dẫn chi tiết cách chia sẻ từ iPhone.
* `/recent`: Danh sách các bài đăng vừa lưu kèm link xem trực tiếp trên kênh.
* `/stats`: Thống kê tổng số ảnh, video đã lưu vào kho.
* `/status`: Kiểm tra tình trạng kết nối kênh và trạng thái nạp cookies.
