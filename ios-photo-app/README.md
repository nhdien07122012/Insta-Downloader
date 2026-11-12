# 🍎 iOS Photo Gallery for Telegram Cloud (Giao diện Apple Photos)

Ứng dụng xem và quản lý ảnh được thiết kế theo đúng ngôn ngữ thiết kế **Apple Photos trên iOS**, kết nối trực tiếp đến **Kênh Telegram Lưu Trữ** thông qua giao thức MTProto (tương tự như `Telegram-Drive`), không phụ thuộc vào server trung gian.

---

## ✨ Điểm nổi bật & Trải nghiệm chuẩn Apple Photos

* **Giao diện chuẩn iOS:** Chế độ Dark Mode màu đen sâu (OLED), hiệu ứng kính mờ (frosted glass blur), font chữ Apple SF Pro.
* **Lưới ảnh (Photo Grid):** Chia 3 cột tỉ lệ vuông chuẩn iOS, phân chia theo từng nhóm ngày ("Hôm nay", "Hôm qua", "Ngày tháng năm").
* **Hỗ trợ Album / Carousel:** Tự động nhận diện bài viết nhiều ảnh trên Instagram và hiển thị huy hiệu 2 ô vuông góc trên bên phải.
* **Trình xem ảnh toàn màn hình (Photo Viewer):**
  * Vuốt ngang (Swipe left/right) để chuyển ảnh liên tục.
  * Phóng to thu nhỏ (Pinch to zoom / Double tap).
  * Chạm nhẹ vào giữa ảnh để ẩn/hiện thanh công cụ.
  * Bấm nút **"i"** để xem thông tin tác giả Instagram (`@username`), caption bài viết và link bài gốc.
  * Bấm nút **Tải về** để lưu ảnh gốc về thư viện ảnh iPhone (Camera Roll).
  * Bấm nút **Chia sẻ** để mở iOS Share Sheet gốc.
* **Hoạt động trực tiếp 4G/5G:** Không cần mở VPN hay bật Tailscale khi ra ngoài đường vì ứng dụng giao tiếp thẳng với Telegram Cloud CDN.

---

## 🚀 Cách chạy thử nghiệm trên máy tính

1. Di chuyển vào thư mục:
   ```bash
   cd ios-photo-app
   ```
2. Khởi chạy server phát triển với cờ `--host` để mở được từ điện thoại:
   ```bash
   npm run dev -- --host
   ```
3. Màn hình sẽ hiển thị đường link dạng:
   * `http://localhost:5173/` (xem trên máy tính)
   * `http://192.168.1.x:5173/` (mở trên iPhone qua Wi-Fi)

---

## 📱 Cách ghim ra Màn hình chính iPhone (Add to Home Screen)

1. Trên iPhone, mở trình duyệt **Safari** và truy cập vào đường link của ứng dụng.
2. Bấm vào biểu tượng **Chia sẻ (Share)** (hình ô vuông có mũi tên chỉ lên) ở thanh dưới cùng Safari.
3. Cuộn xuống và chọn **"Thêm vào Màn hình chính" (Add to Home Screen)**.
4. Đặt tên là **"Ảnh"** hoặc **"Insta Photos"** rồi bấm **Thêm (Add)**.
5. 👉 Ra màn hình chính iPhone: Bạn sẽ thấy một biểu tượng app **Apple Photos** độc lập. Bấm vào mở lên sẽ **chạy toàn màn hình, không còn thanh địa chỉ Safari**, cảm giác vuốt chạm mượt mà 100% như app native!

---

## 🔑 Hướng dẫn lấy `API_ID` & `API_HASH` (Dùng 1 lần duy nhất)

Để ứng dụng tự động đọc trực tiếp kho ảnh từ kênh Telegram của bạn:

1. Dùng trình duyệt vào trang: **[https://my.telegram.org/](https://my.telegram.org/)**
2. Nhập số điện thoại Telegram của bạn và mã xác nhận gửi trong app Telegram.
3. Chọn mục **API development tools**.
4. Điền tiêu đề ứng dụng (ví dụ: `MyPhotos`) và tên ngắn (ví dụ: `myphotos`), chọn Platform: `Other`.
5. Bấm **Create application**.
6. Bạn sẽ nhận được 2 thông số:
   * **`api_id`**: Dạng số (ví dụ: `28471923`)
   * **`api_hash`**: Dạng chuỗi 32 ký tự (ví dụ: `c9f823a8b...`)
7. Mở app trên iPhone -> Bấm vào biểu tượng **Bánh răng (Settings)** ở góc trên bên phải -> Dán `api_id` và `api_hash` vào -> Bấm **Lưu & Kết nối**.
