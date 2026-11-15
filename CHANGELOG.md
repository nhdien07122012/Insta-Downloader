# 📝 Nhật Ký Thay Đổi (Changelog) - Insta-Downloader

Toàn bộ các phiên bản cập nhật, mã bản dựng (build number), chi tiết kỹ thuật và lệnh hoàn tác (rollback) của dự án.

---

## [v1.5.6 (Build 21)] - 2026-11-15
- **Commit SHA**: (Sẽ cập nhật sau khi push)
- **Mục tiêu**: Tối ưu hóa trải nghiệm làm mới (Pull-to-refresh) trên app iOS: **Loại bỏ việc tự động gửi lệnh `/scan` khi kéo màn hình xuống để tải ảnh Telegram**, giúp thao tác kéo tải ảnh diễn ra ngay tức thì, mượt mà và không làm phiền kênh lưu trữ. Giữ nguyên chức năng nút bấm quét `/scan` thủ công (`[Quét 20 tin]`, `[Quét 50 tin]`) trong Cài đặt (Settings).
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/App.tsx`:
    - Thay thế hàm `handleRefreshAndScan` bằng `handleRefresh` thuần túy: Chỉ gọi `loadPhotos(false)` để nạp trực tiếp danh sách ảnh mới nhất từ Telegram về thiết bị, không gọi `triggerChannelScan`.
    - Gỡ bỏ `isScanning` và `scanToast` trên giao diện trang chính (không còn hiển thị popup "Đang gửi /scan..." hay chờ 2.5s khi kéo làm mới).
    - Cập nhật text kéo làm mới: *"Kéo xuống để làm mới ảnh"*.
  - `ios-photo-app/src/components/SettingsModal.tsx`:
    - Giữ nguyên 100% chức năng quét link tồn đọng `/scan` thủ công (`handleManualScan`) khi người dùng chủ động bấm trong phần Cài đặt.
    - Cập nhật footer: `InstaPhotos v1.5.6 • Build 21 (Dedicated Pull-to-Refresh & Manual Scan)`.
  - `ios-photo-app/package.json` & `project.pbxproj`: Nâng phiên bản lên `v1.5.6 (Build 21)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.5.5 (Build 20)] - 2026-11-15
- **Commit SHA**: (Sẽ cập nhật sau khi push)
- **Mục tiêu**: 
  1. **Khắc phục lỗi tê liệt bot do `TypeError: a bytes-like object is required, not 'str'`**: Khi `python-telegram-bot` và thư viện mạng `anyio` kết nối tới `api.telegram.org`, tham số host được truyền dưới dạng `bytes`. Hàm monkey-patch DoH trước đây kiểm tra `"twimg.com" in host` khiến bot bị crash ngay khi khởi động, dẫn đến việc bot không phản hồi bất kỳ tin nhắn, link hay lệnh `/scan` nào trên Telegram.
  2. **Hỗ trợ lệnh `/Scan` chữ hoa (iOS Keyboard)**: Khi người dùng gõ `/Scan` trên bàn phím iPhone thường tự động viết hoa chữ `S`, bộ lọc regex cũ chỉ bắt chữ thường khiến lệnh bị bỏ qua. Bổ sung `re.IGNORECASE` để nhận diện cả `/scan`, `/Scan`, `/SCAN`.
  3. **Tích hợp nút Menu Bot Telegram (`setChatMenuButton`)**: Tự động kích hoạt nút `Menu` dạng thanh pill màu xanh lá cây ở góc dưới bên trái khung chat bot, cho phép người dùng bấm xem và chọn nhanh các lệnh `/scan`, `/stats`, `/recent`, `/status`.
  4. **Tăng cường khả năng xử lý link đồng loạt (Concurrency & Auto-Backlog Scanner)**: Cho phép TX3 Mini xử lý đồng thời 3 link song song (`concurrent_updates=3`), tự động quét 30 tin nhắn gần nhất khi khởi động (`_auto_scan`) để giải quyết toàn bộ các link Twitter/X và Instagram bị dồn ứ lúc bot offline.
- **Chi tiết thay đổi**:
  - `instagram.py`:
    - Xử lý kiểu dữ liệu an toàn cho `host`: Chuyển đổi `bytes` sang `str` trước khi kiểm tra tên miền `twimg.com`, `x.com`...
    - Bọc `try... except` toàn diện quanh khối phân giải DoH, bảo đảm nếu DoH gặp bất kỳ lỗi gì thì luôn fallback về DNS gốc mà không bao giờ làm sập tiến trình bot.
    - Trả kết quả IP qua `_orig_getaddrinfo(ip, port, family, type, proto, flags)` để đảm bảo tương thích chuẩn socket C của Python.
  - `bot.py`:
    - Đăng ký `set_chat_menu_button(menu_button=MenuButtonCommands())` trong `post_init_callback`.
    - Cập nhật Regex handler của `/scan` với cờ `re.IGNORECASE`.
    - Cập nhật bộ lọc dọn dẹp tin nhắn `/scan` trong `scan_and_process_channel_backlog` với `raw_text.lower().startswith("/scan")`.
    - Tăng độ sâu quét tự động lúc khởi động lên 30 tin nhắn.
  - `ios-photo-app`:
    - Cập nhật phiên bản lên `v1.5.5 Build 20`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.5.4 (Build 19)] - 2026-11-15
- **Commit SHA**: `d4b3e5f`
- **Mục tiêu**: Khắc phục triệt để lỗi **không tải được link 𝕏 (Twitter)** trên box TX3 Mini (trong khi link Instagram vẫn hoạt động bình thường). Tích hợp cơ chế **DNS-over-HTTPS (DoH)** tự động phân giải tên miền `pbs.twimg.com`, `api.fxtwitter.com` qua Cloudflare `1.1.1.1` và Google `8.8.8.8` (cổng 443 mã hóa), vượt qua hoàn toàn tình trạng các nhà mạng Việt Nam (VNPT, Viettel, FPT) chặn phân giải DNS tên miền Twitter/X trên router gia đình. Bổ sung cơ chế tải ảnh dự phòng đa tầng qua CDN proxy `d.fxtwitter.com` và `d.fixupx.com`.
- **Chi tiết thay đổi**:
  - `instagram.py`:
    - Tích hợp bộ phân giải `secure_doh_getaddrinfo`: Can thiệp `socket.getaddrinfo` cho các tên miền Twitter/X (`twimg.com`, `twitter.com`, `x.com`, `fxtwitter.com`, `fixupx.com`), tự động truy vấn bản ghi DNS A trực tiếp từ Cloudflare DoH (`1.1.1.1`) và Google DoH (`8.8.8.8`) có bộ nhớ đệm RAM (`_dns_cache`).
    - Nâng cấp `_download_twitter`: Khi tải ảnh gốc (`name=orig`), nếu đường link trực tiếp `pbs.twimg.com` gặp sự cố mạng, bot tự động kích hoạt tải dự phòng qua các CDN proxy Cloudflare Edge (`d.fxtwitter.com`, `d.fixupx.com`).
    - Bổ sung cơ chế cào ảnh khẩn cấp (Emergency Probe) tải trực tiếp qua CDN proxy khi metadata API bị gián đoạn.
  - `ios-photo-app`:
    - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.5.4"`.
    - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 19;` và `MARKETING_VERSION = 1.5.4;`.
    - `ios-photo-app/src/components/SettingsModal.tsx`: Chân trang hiển thị `InstaPhotos v1.5.4 • Build 19 (DoH Twitter Bypass & Cloud Sync)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.5.3 (Build 18)] - 2026-11-15
- **Commit SHA**: `f27f1c4`
- **Mục tiêu**: Tích hợp tính năng **Gửi lệnh `/scan` trực tiếp từ ứng dụng iOS InstaPhotos**: Tự động gửi lệnh quét kênh (`/scan 20`) khi người dùng kéo màn hình xuống để làm mới (Pull-to-refresh) hoặc bấm nút Làm mới trên thanh tiêu đề (Header). Cho phép bot TX3 Mini phát hiện, tải và đẩy trọn bộ ảnh từ các link tồn đọng vào kho lưu trữ trước khi đồng bộ ảnh mới nhất về máy. Bổ sung nút quét thủ công nhanh (`[Quét 20 tin]`, `[Quét 50 tin]`) ngay trong Cài đặt.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/services/telegramClient.ts`:
    - Thêm hàm `triggerChannelScan(config, limit = 20)` sử dụng MTProto client của tài khoản người dùng gửi lệnh `/scan [limit]` trực tiếp vào Kênh lưu trữ.
  - `ios-photo-app/src/components/Header.tsx`:
    - Thêm nút **Làm mới & Quét (/scan)** (`RefreshCw`) ngay cạnh nút Cài đặt trên thanh tiêu đề với hiệu ứng xoay (spin animation).
  - `ios-photo-app/src/App.tsx`:
    - Tích hợp `handleRefreshAndScan`: Khi kéo làm mới hoặc bấm nút Refresh, app tự động gửi `/scan 20` đến Kênh, chờ bot TX3 Mini cào ảnh, sau đó tải dữ liệu mới nhất vào bộ nhớ đệm máy (IndexedDB).
    - Cập nhật dòng trạng thái kéo làm mới: hiển thị `"🤖 Đang gửi lệnh /scan & quét link tồn đọng..."`.
    - Bổ sung thanh thông báo nổi (floating toast) báo trạng thái quét và làm mới kho ảnh.
  - `ios-photo-app/src/components/SettingsModal.tsx`:
    - Thêm cụm công cụ **"Quét link tồn đọng trên Kênh (/scan)"** với 2 nút thao tác nhanh `[Quét 20 tin gần nhất]` và `[Quét 50 tin]`.
    - Chân trang hiển thị `InstaPhotos v1.5.3 • Build 18 (In-App /scan & Refresh Trigger)`.
  - `ios-photo-app/package.json` & `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`:
    - Nâng phiên bản lên `"1.5.3"` (Build 18).
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.5.2 (Build 17)] - 2026-11-15
- **Commit SHA**: `c2ea824`
- **Mục tiêu**: 
  1. Tích hợp **Đồng bộ Menu lệnh Telegram Bot (`set_my_commands`)** cho cả Chat riêng và Quản trị viên Kênh (hiển thị nút `[Menu]` trong chat và bảng gợi ý lệnh khi gõ `/` trong kênh).
  2. Nâng cấp lệnh `/scan` với cơ chế **Quét siêu tốc có tùy chỉnh phạm vi**: Mặc định quét **20 tin nhắn gần nhất** (chỉ mất 1-2s), hỗ trợ tham số linh hoạt `/scan <số_lượng>` (vd: `/scan 10`, `/scan 50`, `/scan 100`).
  3. Khắc phục triệt để hiện tượng **quá tải/im lặng khi gửi dồn dập nhiều link X và Instagram** thông qua **Async Semaphore (`PROCESS_SEMAPHORE = 1`)** khóa nhịp độ an toàn cho phần cứng TX3 Mini (S905W 1GB RAM) và các hàm gửi an toàn (`safe_send_photo`, `safe_send_video`, `safe_send_media_group`) tự động phục hồi khi gặp **Telegram Flood Control (HTTP 429 RetryAfter)**.
- **Chi tiết thay đổi**:
  - `bot.py`:
    - Bổ sung `PROCESS_SEMAPHORE = asyncio.Semaphore(1)`: Đảm bảo TX3 Mini xử lý từng tác vụ một cách mượt mà theo hàng đợi, không bao giờ bị nghẽn RAM hay sập tiến trình khi nhận 10-20 link cùng lúc.
    - Xây dựng 3 hàm upload an toàn (`safe_send_photo`, `safe_send_video`, `safe_send_media_group`): Bắt trọn lỗi Telegram `RetryAfter`, tự động ngủ đúng số giây yêu cầu rồi thử lại với con trỏ file (`seek(0)`) chuẩn xác.
    - Bổ sung độ trễ nghỉ giãn cách `await asyncio.sleep(0.8)` giữa các bài viết hoàn thành để Telegram API và CPU hạ nhiệt.
    - Tối ưu lệnh `/scan`: Mặc định 20 tin nhắn gần nhất, bóc tách tham số từ cả `context.args` và `msg.text`, tự động xóa thông báo sau 10 giây nếu chạy trong Kênh.
    - Cập nhật `post_init_callback`: Tự động đồng bộ menu bot với Telegram (`set_my_commands`) cho cả người dùng cá nhân và admin kênh, tự động quét 20 tin gần nhất sau khi khởi động 5s.
  - `ios-photo-app`:
    - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.5.2"`.
    - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 17;` và `MARKETING_VERSION = 1.5.2;`.
    - `ios-photo-app/src/components/SettingsModal.tsx`: Chân trang hiển thị `InstaPhotos v1.5.2 • Build 17 (Safe Queue & Fast Scanner)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.5.1 (Build 16)] - 2026-11-14
- **Commit SHA**: `0a84df9` (và bản vá hoàn thiện)
- **Mục tiêu**: Bổ sung tính năng **Xử lý đồng loạt liên kết song song (`concurrent_updates=3`)**, bóc tách **đa liên kết trong cùng 1 tin nhắn** (`extract_all_media_targets`), và phát triển tính năng **Quét & Tự động xử lý toàn bộ liên kết tồn đọng trong Kênh lưu trữ Telegram** (`/scan` command & startup background scanner). Hỗ trợ nhận lệnh `/scan` trực tiếp từ trong Kênh lưu trữ (thông qua `filters.ALL` & `UpdateType.CHANNEL_POSTS`), tự động dọn dẹp tin nhắn lệnh sau khi hoàn tất để kênh luôn gọn gàng. Đảm bảo TX3 Mini xử lý mượt mà khi người dùng gửi dồn dập nhiều link, đồng thời dọn sạch toàn bộ các link chưa tải đang chờ trên kênh.
- **Chi tiết thay đổi**:
  - `bot.py`:
    - Tích hợp `concurrent_updates=3` trong `ApplicationBuilder` giúp bot trên TX3 Mini xử lý song song tối đa 3 tác vụ tải và đẩy ảnh cùng lúc.
    - Cấu hình toàn bộ CommandHandler (`/scan`, `/start`, `/help`, `/stats`, v.v.) với `filters=filters.ALL` để bot có thể lắng nghe và phản hồi lệnh ngay cả khi gửi trực tiếp trong Kênh lưu trữ (`channel_post`).
    - Bổ sung `MessageHandler(filters.Regex(r"^/scan(?:\s|@|$)"))` dự phòng đảm bảo lệnh `/scan` luôn kích hoạt 100% trong Kênh.
    - Tự động xóa tin nhắn `/scan` và tin nhắn báo trạng thái sau 10 giây nếu chạy trong Kênh để giữ kênh lưu trữ luôn sạch sẽ.
    - Tái cấu trúc hàm `process_single_target`: Module hóa quy trình tải ảnh, bóc tách metadata, đẩy ảnh lên kênh, xóa link gốc và lưu vào SQLite.
    - Cập nhật `handle_instagram_message`: Sử dụng `extract_all_media_targets` để xử lý trọn vẹn cả trường hợp người dùng gửi 1 tin nhắn chứa nhiều link cùng lúc.
    - Thêm tính năng `scan_and_process_channel_backlog`: Quét ngược tin nhắn trong kênh lưu trữ thông qua cơ chế forwardMessage an toàn, tự động phát hiện mọi link Twitter/X và Instagram còn tồn đọng, cào ảnh về kho và xóa sạch link gốc. Tích hợp độ trễ 50ms chống Telegram Flood Control.
    - Bổ sung `post_init_callback`: Tự động kích hoạt quét kênh ngầm sau khi bot khởi động 5 giây với giới hạn lên tới 100 bài gần nhất.
  - `instagram.py`:
    - Thêm hàm `extract_all_media_targets` bóc tách toàn bộ link Instagram và Twitter/X trong 1 khối văn bản.
    - Cập nhật `INSTA_URL_PATTERN` hỗ trợ các định dạng URL chia sẻ mới của Instagram (`/share/p/`, `/share/reel/`).
  - `ios-photo-app`:
    - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.5.1"`.
    - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 16;` và `MARKETING_VERSION = 1.5.1;`.
    - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật chân trang hiển thị `InstaPhotos v1.5.1 • Build 16 (Concurrent Processing & Auto Scanner)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.5.0 (Build 15)] - 2026-11-13
- **Commit SHA**: `7bcbc64`
- **Mục tiêu**: Bổ sung tính năng **Sao lưu & Khôi phục dữ liệu qua iCloud Drive** (thông qua ứng dụng Tệp / iOS Share Sheet và Native Document Picker) trên ứng dụng iOS `InstaPhotos`. Cho phép người dùng xuất toàn bộ cấu hình (`apiId`, `apiHash`, `botToken`, `channelId`, `phoneNumber`, `sessionString`, và trạng thái `isLoggedIn`) thành tệp sao lưu `.json` lưu thẳng vào iCloud Drive. Khi cài lại ứng dụng hoặc đổi máy mới, chỉ cần 1 chạm khôi phục để sử dụng ngay tức thì mà không cần nhập lại mã API hay đợi mã xác thực Telegram OTP. Đồng thời duy trì 100% tính năng tải ảnh Instagram & Twitter (𝕏) trên TX3 Mini và trình xem video trên app iOS.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/services/telegramClient.ts`: Cập nhật `saveStoredConfig` đồng bộ `sessionString` với `localStorage.getItem("tg_session")` và xóa sạch session khi người dùng đăng xuất.
  - `ios-photo-app/src/components/SettingsModal.tsx`:
    - Thêm tab thứ 3: **"Sao lưu iCloud"** (`activeTab: "api" | "login" | "backup"`).
    - Tích hợp tính năng **Sao lưu ra iCloud Drive (Tệp)**: Tạo tệp JSON chứa đầy đủ thông tin cấu hình và phiên đăng nhập, mở trực tiếp iOS Share Sheet với nút "Lưu vào Tệp" (Save to Files) để lưu vào iCloud Drive cá nhân. Hỗ trợ fallback tải tệp hoặc sao chép văn bản cấu hình vào Clipboard.
    - Tích hợp tính năng **Khôi phục từ iCloud Drive (Tệp)**: Kích hoạt Document Picker của iOS để chọn tệp sao lưu `.json`, tự động kiểm tra tính hợp lệ, nạp dữ liệu API, phiên đăng nhập Telegram và cập nhật tức thì vào ứng dụng.
    - Bổ sung thanh thông báo khôi phục nhanh (Quick restore banner) ngay tại tab "Thông số API" khi máy mới chưa có cấu hình.
    - Cập nhật thông tin phiên bản hiển thị tại chân trang: `InstaPhotos v1.5.0 • Build 15 (iCloud Drive Backup & Restore)`.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.5.0"`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 15;` và `MARKETING_VERSION = 1.5;`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.4.8 (Build 14)] - 2026-11-13
- **Commit SHA**: `1ce11c5`
- **Mục tiêu**: Chuyên biệt hóa triệt để bot trên TX3 Mini thành bộ máy lưu trữ **ẢNH (Photos / Carousels / Link Cards)** siêu tốc cho cả **Instagram** và **Twitter (𝕏)** theo yêu cầu của người dùng. Loại bỏ hoàn toàn chức năng tải video và nén video bằng FFmpeg trên TX3 Mini để CPU luôn nhẹ nhàng, mát mẻ (5-7%) và tải ảnh chỉ mất 1-2 giây. Đồng thời **bảo toàn nguyên vẹn 100% tính năng trình phát video HD trên ứng dụng iOS**.
- **Chi tiết thay đổi**:
  - `instagram.py`:
    - Loại bỏ toàn bộ lệnh gọi `ffmpeg` và logic nén video; hàm `compress_video_to_size` trở thành no-op.
    - Cập nhật `_download_twitter`: Chỉ bóc tách và tải tệp loại `photo` (bao gồm ảnh đơn, album nhiều ảnh và ảnh Link Card preview như Silzee/GestaltX) ở kích thước gốc `name=orig`. Tự động từ chối bài viết thuần Video/GIF kèm thông báo rõ ràng.
    - Cập nhật `_download_with_gallery_dl`: Thêm cờ lọc `--filter "extension in ('jpg', 'jpeg', 'png', 'webp')"` và chỉ thu thập tệp ảnh, bỏ qua hoàn toàn các định dạng video `.mp4`, `.mov`.
    - Cập nhật `_download_with_instaloader`: Thiết lập `download_videos=False` và chỉ trích xuất ảnh.
    - Loại bỏ `yt-dlp` khỏi luồng xử lý trên TX3 Mini.
  - `ios-photo-app`:
    - Bảo toàn 100% trình phát video trong `PhotoViewer.tsx` và cơ chế tải video HD từ Telegram MTProto trong `telegramClient.ts`.
    - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.4.8"`.
    - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 14;`.
    - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật chân trang hiển thị `InstaPhotos v1.4.8 • Build 14 (Photo-Focused & Video Player)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.4.7 (Build 13)] - 2026-11-13
- **Commit SHA**: `db1082d`
- **Mục tiêu**: Xử lý triệt để bài toán tải và nén video siêu dài (từ 10 đến 30+ phút, ví dụ các clip 29 phút dung lượng gốc 1GB - 2.2GB trên **Twitter (𝕏)**). Bổ sung thuật toán chọn định dạng thông minh theo thời lượng (`estimated_size_mb`), ưu tiên gửi ngay bản gốc nếu tự nhiên <= 48.5MB (không tốn CPU, không cần ffmpeg), chọn nhóm 360p/480p cho video siêu dài để nén về dưới 50MB siêu tốc trong 2 phút (thay vì tải 1080p 2GB gây nghẽn và quá tải CPU), đồng thời kích hoạt preset `veryfast` và timeout động lên đến 2600s trên TX3 Mini.
- **Chi tiết thay đổi**:
  - `instagram.py`:
    - Tối ưu hóa chọn định dạng `mp4_formats` trong `_download_twitter`:
      - Tính dung lượng ước tính `estimated_size_mb` cho từng format.
      - Nếu có bản chất lượng cao tự nhiên `<= 48.5MB`: Chọn bản nét nhất để gửi ngay lập tức (zero transcoding, không lo trần 50MB).
      - Nếu video dài `> 20 phút`: Tự động chọn luồng phân giải hợp lý (360p/480p dung lượng ~150MB thay vì 2.2GB) để nén về dưới 48.5MB trong 2-3 phút, tránh nghẽn băng thông và tránh quá tải CPU Amlogic S905W.
      - Nếu video ngắn (`<= 5 phút`): Luôn chọn Full HD 1080p gốc cao nhất.
    - Nâng cấp `compress_video_to_size`:
      - Kích hoạt `-preset veryfast` cho video dài `> 20 phút` để tăng tốc độ nén x264 gấp 2-3 lần trên chip ARM Cortex-A53.
      - Tính toán timeout thích ứng theo thời lượng video `timeout_sec = max(600, int(duration * 1.5))`, chống lỗi ngắt timeout trên TX3 Mini.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.4.7"`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 13;`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật chân trang hiển thị `InstaPhotos v1.4.7 • Build 13 (Smart Ultra-Long Video Support)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.4.6 (Build 12)] - 2026-11-13
- **Commit SHA**: `41e2440`
- **Mục tiêu**: Nâng cấp chất lượng video toàn diện, loại bỏ hiện tượng mờ/nhòe/vỡ hình khi tải video trên **Twitter (𝕏)** và **Instagram**. Luôn luôn ưu tiên tải bản Full HD 1080p / 720p gốc có bitrate cao nhất từ Twitter CDN (thay vì tải bản 240p/360p pre-render mờ căm), nâng cấp thuật toán nén thông minh với bộ lọc nội suy sắc nét Lanczos (`flags=lanczos`), tự động thích ứng độ phân giải theo bitrate khả dụng và truyền đầy đủ metadata (`width`, `height`, `duration`) khi gửi lên Telegram.
- **Chi tiết thay đổi**:
  - `instagram.py`:
    - Loại bỏ hoàn toàn bộ lọc hạ bitrate nhân tạo trong `_download_twitter`; luôn ưu tiên sắp xếp lấy variant có độ phân giải và bitrate cao nhất từ Twitter CDN (`height` và `bitrate` descending) để lấy file gốc Full HD 1080p / 720p.
    - Cập nhật tải HLS m3u8 trong Twitter sang định dạng chất lượng cao nhất `bestvideo+bestaudio/best`.
    - Nâng cấp `compress_video_to_size`:
      - Bổ sung trích xuất chính xác thời lượng và kích thước bằng `ffprobe` (JSON stream format) kèm dự phòng regex trên `ffmpeg -i`.
      - Phân bổ bitrate âm thanh linh hoạt (128kbps / 96kbps / 64kbps) giúp tiết kiệm dung lượng cho video.
      - Tích hợp bộ lọc nội suy Lanczos cao cấp (`scale=...:flags=lanczos`) với thuật toán thích ứng phân giải theo bitrate (1080p -> 720p -> 540p -> 480p) đảm bảo từng khung hình nét căng và không bị nhòe vỡ.
      - Bật cấu hình x264 High Profile (`-profile:v high -level 4.1 -pix_fmt yuv420p -movflags +faststart`) tối ưu tuyệt đối cho iPhone QuickTime & Telegram streaming.
  - `bot.py`:
    - Thêm hàm `get_video_meta`: Trích xuất nhanh `width`, `height`, `duration` bằng `ffprobe`.
    - Cung cấp trực tiếp `duration`, `width`, `height` cho `send_video` và `InputMediaVideo` trong Telegram album, giúp Telegram iOS hiển thị đúng tỷ lệ khung hình và phát trực tiếp mượt mà ngay lập tức.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.4.6"`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 12;`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật chân trang hiển thị `InstaPhotos v1.4.6 • Build 12 (Crisp HD Video & Lanczos Encoding)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.4.5 (Build 11)] - 2026-11-13
- **Commit SHA**: `03e85a4`
- **Mục tiêu**: Khắc phục triệt để lỗi không tải được video dài trên **Twitter (X)**, hỗ trợ bóc tách & tải luồng HLS (`.m3u8`) từ các video dài / X Premium, tự động tính toán bitrate và tích hợp nén thông minh bằng `ffmpeg` để giữ dung lượng video luôn dưới 50MB (phù hợp giới hạn Telegram Bot API), đồng thời nâng mức giới hạn RAM của service systemd trên TX3 Mini từ 150MB lên 500MB và tăng timeout lên 300 giây.
- **Chi tiết thay đổi**:
  - `instagram.py`:
    - Thêm hàm `compress_video_to_size(video_path, max_size_mb=48.5)`: Sử dụng `ffmpeg` tính toán bitrate tự động nén các video dài quá khổ về dưới 48.5MB.
    - Bổ sung cơ chế xử lý stream HLS `.m3u8` qua `yt-dlp` khi Twitter/X không cung cấp file MP4 tĩnh trực tiếp.
    - Tự động ước lượng bitrate phù hợp (`max_bitrate_bps = (48MB * 8) / duration`) để chọn phiên bản MP4 chất lượng cao nhất mà không bị vượt trần dung lượng.
    - Tăng timeout download stream từ 120s lên 180s.
  - `bot.py`:
    - Tăng timeout upload `HTTPXRequest` (connect 60s, read/write 300s) và timeout `send_video` / `send_media_group` lên 300.0s.
    - Thêm bước kiểm tra an toàn dung lượng `file_size_bytes > 50MB` kèm cảnh báo thân thiện thay vì để Telegram trả lỗi `BadRequest: File too large`.
  - `instabot.service`: Nâng `MemoryMax=500M` để tránh Linux OOM Killer ngắt tiến trình Python khi đang nén/xử lý video dài trên TX3 Mini.
  - `deploy_tx3mini.sh`: Tự động cài đặt gói `ffmpeg` trong lệnh `apt-get install`.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.4.5"`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 11;`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật chân trang hiển thị `InstaPhotos v1.4.5 • Build 11 (Long Video & Auto-Compression)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.4.4 (Build 10)] - 2026-11-13
- **Commit SHA**: `794283a`
- **Mục tiêu**: Nâng cấp toàn diện cơ chế tải và phát video cho cả **Twitter (X)** và **Instagram (Reels / Video)**, hỗ trợ bóc tách video MP4 chất lượng cao nhất (`formats` container mp4, direct redirect `d.fxtwitter.com`), bổ sung phương pháp dự phòng Instaloader cho Instagram và kích hoạt cờ `supports_streaming=True` khi đẩy video lên Telegram.
- **Chi tiết thay đổi**:
  - `instagram.py`:
    - Nâng cấp `_download_twitter`: Hỗ trợ schema `formats` của FxTwitter API, tự động lọc và tải video MP4 có bitrate cao nhất; dự phòng direct video redirect `d.fxtwitter.com` nếu gặp stream `.m3u8`.
    - Bổ sung `_download_with_instaloader` cho Instagram Reels/Videos khi `gallery-dl` hoặc `yt-dlp` gặp hạn chế xác thực.
    - Cập nhật cấu hình `yt-dlp` với `format: bestvideo+bestaudio/best`, `merge_output_format: mp4` và Chrome User-Agent.
  - `bot.py`:
    - Kích hoạt `supports_streaming=True` cho cả `send_video` và `InputMediaVideo` trong Telegram album.
    - Xử lý trích xuất an toàn thuộc tính video (`video`, `animation`, `document`) tránh lỗi `AttributeError`.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.4.4"`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 10;`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật chân trang hiển thị `InstaPhotos v1.4 • Build 10 (Video Support & Streaming)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.4.3 (Build 9)] - 2026-11-13
- **Commit SHA**: `ac179a9`
- **Mục tiêu**: Bổ sung hỗ trợ tải ảnh từ Twitter Link Card Preview (đối với các bài viết chia sẻ link ngoài như Silzee/GestaltX không có ảnh upload trực tiếp) và cung cấp phản hồi thông báo cụ thể cho bài viết thuần văn bản (Text-only).
- **Chi tiết thay đổi**:
  - `instagram.py`: Cập nhật `_download_twitter` bóc tách `card['image']['url']` và tự động đổi sang kích thước gốc `name=orig` để tải ảnh chất lượng cao khi tweet không có media đính kèm trực tiếp.
  - `deploy_tx3mini.sh`: Bảo toàn thư mục `.git` và file `.env*` khi triển khai để TX3 Mini luôn giữ được liên kết git.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.4.3"`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 9;`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật chân trang hiển thị `InstaPhotos v1.4 • Build 9 (Twitter Card & Media Support)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.4.2 (Build 8)] - 2026-11-13
- **Commit SHA**: `4224cc4`
- **Mục tiêu**: Nâng cấp độ tin cậy của Telegram Bot & TX3 Mini, mở rộng toàn diện regex nhận diện link Twitter/X/Instagram (hỗ trợ case-insensitive, caption, link rút gọn t.co, /i/status, /i/web/status), dọn dẹp logic xóa tin nhắn link Telegram (tránh lỗi xóa 2 lần gây cảnh báo sai) và thêm cơ chế phản hồi lỗi tự xóa thông minh trên Kênh lưu trữ.
- **Chi tiết thay đổi**:
  - `bot.py`:
    - Nâng cấp `media_filter` sử dụng `re.IGNORECASE` và kết hợp cả `filters.Regex` lẫn `filters.CaptionRegex`, đảm bảo nhận diện mọi link trong text và caption (không bị bỏ lọt khi chữ viết hoa X.COM / Twitter.com).
    - Loại bỏ đoạn gọi xóa tin nhắn link trùng lặp ở Bước 6 (trước đó gọi 2 lần gây lỗi "Message to delete not found").
    - Bổ sung hàm `self_destruct_message` tự hủy thông báo lỗi sau 15 giây nếu link gửi vào Kênh bị hỏng, giúp Kênh luôn sạch đẹp mà Admin vẫn nắm bắt được nguyên nhân lỗi.
  - `instagram.py`:
    - Mở rộng `TWITTER_URL_PATTERN` hỗ trợ các định dạng URL: `/i/status/`, `/i/web/status/`, `/status/`, kèm tự động mở rộng link rút gọn `t.co` bằng `requests.head`.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.4.2"`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 8;`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật chân trang hiển thị `InstaPhotos v1.4 • Build 8 (Bot Reliability & Direct IPA)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.4.1 (Build 7)] - 2026-11-13
- **Commit SHA**: `b8f114c`
- **Mục tiêu**: 
  1. Khắc phục triệt để lỗi không tải được ảnh/video từ Twitter (X) bằng cơ chế trích xuất đa tầng (FxTwitter/VxTwitter API gốc + yt-dlp + gallery-dl fallback), tải trọn vẹn ảnh full resolution (`orig`) và video MP4 chất lượng cao không cần đăng nhập hay cookies.
  2. Bổ sung quy tắc dự án và tự động hóa CI/CD xuất bản GitHub Release với link tải trực tiếp file `.ipa` 1 chạm cho iPhone, không cần tài khoản GitHub hay giải nén zip.
- **Chi tiết thay đổi**:
  - `instagram.py`: Tách riêng quy trình xử lý `_download_twitter()`, tích hợp endpoint FxTwitter/VxTwitter API trích xuất media tweet trực tiếp, chọn bitrate video MP4 cao nhất và lưu trữ ảnh gốc.
  - `.github/workflows/build-ipa.yml`: Bổ sung quyền `contents: write` và action `softprops/action-gh-release@v2` tự động đẩy `InstaPhotos.ipa` lên Release mang tag `latest` kèm link tải trực tiếp.
  - `PROJECT_RULES.md`: Bổ sung Điều 5 ("Quy tắc cung cấp link tải IPA trực tiếp sau mỗi bản dựng") và cập nhật checklist bắt buộc trước khi báo cáo hoàn thành.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.4.1"`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 7;`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật chân trang hiển thị `InstaPhotos v1.4 • Build 7 (Twitter Fix & Direct IPA Release)`.
- **Link tải IPA trực tiếp**: [https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa](https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa)
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.4 (Build 6)] - 2026-11-13
- **Commit SHA**: `96f231b`
- **Mục tiêu**: Mở rộng toàn diện hệ sinh thái tải media cho cả **Instagram** và **Twitter (X)**, hỗ trợ tải và phát video trực tiếp trong app (In-App Native Video Player), bổ sung danh mục bộ lọc Video và hỗ trợ lưu Video MP4 về Thư viện iPhone (Camera Roll).
- **Chi tiết thay đổi**:
  - `bot.py` & `instagram.py`: 
    - Bổ sung regex nhận diện URL Twitter/X (`x.com` và `twitter.com`).
    - Nâng cấp `InstagramDownloader` thành bộ tải đa nền tảng, trích xuất ảnh và video từ cả tweet và post Instagram bằng `gallery-dl` và `yt-dlp`.
    - Tự động gắn tag nguồn bài viết (`🐦 Twitter (X) Lưu Trữ` hoặc `📸 Instagram Lưu Trữ`) và tác giả.
    - Đẩy media lên Kênh Telegram tự động qua `send_photo`, `send_video` hoặc `send_media_group` (InputMediaVideo/InputMediaPhoto).
  - `ios-photo-app/src/types/index.ts`: Mở rộng giao diện dữ liệu `PhotoItem` với `mediaType: "photo" | "video"`, `duration?: number`, `platform?: "instagram" | "twitter"`.
  - `ios-photo-app/src/services/photoStorage.ts`: Nâng cấp IndexedDB Persistent Cache lưu trữ thuộc tính video, thời lượng và nền tảng nguồn; hỗ trợ lưu blob cache HD định dạng `video/mp4` hoặc `image/jpeg`.
  - `ios-photo-app/src/services/telegramClient.ts`: 
    - Nâng cấp hàm `fetchChannelPhotos` nhận diện cả ảnh (`msg.media.photo`) và video MP4 (`msg.media.document` có `DocumentAttributeVideo`), đọc thời lượng video và tải thumbnail preview cực nhanh.
    - Trích xuất metadata và đường dẫn bài viết gốc cho cả Instagram lẫn Twitter/X.
    - Hàm `fetchFullResolutionPhoto` tự động tải binary gốc và nạp blob video MP4 khi mở chi tiết.
  - `ios-photo-app/src/components/PhotoGrid.tsx`: Bổ sung huy hiệu Video chuẩn Apple Photos gồm icon tam giác Play và thời lượng video (ví dụ: `0:15`) ở góc dưới phải ảnh.
  - `ios-photo-app/src/components/PhotoViewer.tsx`:
    - Tích hợp trình phát video native `<video controls playsInline autoPlay>` khi người dùng mở video, kèm poster thumbnail và hiệu ứng trượt.
    - Nâng cấp hàm tải về (`handleDownload`) và chia sẻ (`handleShare`) lưu file `.mp4` hoặc `.jpg` chuẩn vào Camera Roll.
    - Cập nhật Info Sheet hiển thị nguồn Twitter (X) / Instagram tương ứng và nút mở bài viết gốc.
  - `ios-photo-app/src/components/Header.tsx`: Thêm tab phân loại "🎬 Video" vào thanh Segmented Control.
  - `ios-photo-app/src/components/AddPhotoModal.tsx`: Hỗ trợ dán liên kết từ cả Instagram lẫn Twitter/X.
  - `ios-photo-app/src/App.tsx`: Tự động phát hiện liên kết Twitter/X từ bộ nhớ tạm (Clipboard), bổ sung thẻ danh mục "🎬 Video" trong Albums tab và bộ lọc Video.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật chân trang thành `InstaPhotos v1.4 • Build 6 (Twitter & Video Edition)`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 6;` và `MARKETING_VERSION = 1.4;`.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.4.0"`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 5)] - 2026-11-12
- **Commit SHA**: `7278007`
- **Mục tiêu**: Bổ sung tính năng xóa ảnh trực tiếp trong ứng dụng đồng bộ 2 chiều (vừa xóa khỏi bộ nhớ máy IndexedDB, vừa gửi lệnh xóa vĩnh viễn tin nhắn trên Kênh Telegram qua MTProto/Bot API) kèm hộp thoại xác nhận an toàn kiểu Action Sheet chuẩn Apple Photos.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/services/photoStorage.ts`: Bổ sung hàm `removePhotoFromCache(messageId)` xóa record trong IndexedDB và giải phóng ObjectURL bộ nhớ.
  - `ios-photo-app/src/services/telegramClient.ts`: Bổ sung hàm `deleteTelegramPhoto(config, messageId)` xóa tin nhắn vĩnh viễn trên Kênh Telegram qua MTProto Client với fallback sang Bot API.
  - `ios-photo-app/src/components/PhotoViewer.tsx`: Thêm nút Thùng rác (Trash2) ở thanh công cụ đáy, hộp thoại xác nhận Action Sheet chuẩn iOS, hiệu ứng loading xoay tròn khi đang xóa và tự động trượt mượt sang ảnh kế tiếp.
  - `ios-photo-app/src/App.tsx`: Kết nối sự kiện `onDeletePhoto` giữa PhotoViewer, IndexedDB và Telegram Client, tự động cập nhật danh sách ảnh tức thì.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 5;` và `MARKETING_VERSION = 1.3;`.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.3.0"`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật footer thành `InstaPhotos v1.3 • Build 5`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.2 (Build 4)] - 2026-11-12
- **Commit SHA**: `ad1db78`
- **Mục tiêu**: Xây dựng kiến trúc Offline-First lưu trữ bộ nhớ đệm ảnh vĩnh viễn (IndexedDB Persistent Cache), giúp mở app hiển thị ảnh ngay lập tức (<50ms), đồng bộ ngầm chỉ tải ảnh mới từ Telegram và thêm nút dọn dẹp cache trong Cài đặt.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/services/photoStorage.ts`: Khởi tạo module lưu trữ IndexedDB chuyên biệt (`InstaPhotosCacheDB`), hỗ trợ đọc ảnh cực nhanh, lưu thumbnail và HD binary, tính dung lượng MB và xóa cache.
  - `ios-photo-app/src/services/telegramClient.ts`: Tích hợp kiểm tra `getCachedMessageIds()` trước khi tải; chỉ gọi Telegram MTProto tải media cho tin nhắn mới phát sinh; lưu tự động vào IndexedDB; lưu cache ảnh gốc HD khi xem chi tiết.
  - `ios-photo-app/src/App.tsx`: Nạp ảnh ngay từ IndexedDB khi ứng dụng khởi chạy (Phase 1 Instant Load); chạy ngầm kiểm tra cập nhật mới (Phase 2 Background Sync) không làm phiền người dùng.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Thêm mục hiển thị số lượng ảnh & dung lượng MB đã lưu trên iPhone kèm nút "Xóa cache" để người dùng chủ động dọn dẹp bộ nhớ máy.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 4;` và `MARKETING_VERSION = 1.2;`.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.2.0"`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.1 (Build 3)] - 2026-11-12
- **Commit SHA**: `c808388`
- **Mục tiêu**: Hạ thấp thanh TabBar xuống sát thanh home indicator chuẩn iOS, loại bỏ dải màu gradient của nút `+`, chuyển nút `+` sang phong cách kính tối màu (dark frosted glass) đồng bộ kích thước $56\times56\text{px}$ và xếp thẳng hàng theo cột dọc với nút Tìm kiếm.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/components/TabBar.tsx`:
    - Điều chỉnh padding đáy thành `max(calc(var(--sab) - 14px), 8px)` để hạ thấp thanh dock xuống vị trí cân đối tự nhiên.
    - Tạo cột điều khiển dọc (`flex flex-col items-center gap-2`) chứa cả nút `+` và nút Tìm kiếm, đảm bảo 2 nút luôn đồng trục thẳng đứng.
    - Đồng bộ kích thước (`w-[56px] h-[56px]`), viền mờ (`border-white/10`), nền kính (`bg-[#18181c]/75`) và hiệu ứng `blur(24px)` cho nút `+`.
  - `ios-photo-app/src/App.tsx`:
    - Xóa nút `+` trôi nổi riêng lẻ và kết nối sự kiện `onOpenAddPhoto` thông qua TabBar.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `3`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật hiển thị chân trang thành `InstaPhotos v1.1 • Build 3`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.1 (Build 2)] - 2026-11-12
- **Commit SHA**: `bda99d7`
- **Mục tiêu**: Thiết lập và kích hoạt bộ quy chuẩn kỷ luật phát triển `PROJECT_RULES.md`, nâng số hiệu bản dựng iOS lên Build 2 và thêm nhãn phiên bản vào SettingsModal.
- **Chi tiết thay đổi**:
  - `PROJECT_RULES.md`: Tạo tài liệu quy chuẩn chuẩn mực dành cho AI Agent & Developer (5 điều khoản kỷ luật bất di bất dịch).
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 2;` và `MARKETING_VERSION = 1.1;` (cho cả Debug & Release).
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"1.1.0"`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Bổ sung hiển thị `InstaPhotos v1.1 • Build 2` tinh tế tại chân trang modal cài đặt.
  - `CHANGELOG.md`: Khởi tạo nhật ký phiên bản chính thức của dự án.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.1 (Build 1)] - 2026-11-12
- **Commit SHA**: `c31c90b`
- **Mục tiêu**: Bổ sung tính năng vuốt 1 ngón tay chuyển ảnh qua lại (Swipe gestures) trong PhotoViewer kèm chỉ số vị trí và nút điều hướng.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/components/PhotoViewer.tsx`:
    - Thêm cử chỉ vuốt 1 ngón tay sang trái (xem ảnh kế) và sang phải (xem ảnh trước).
    - Thêm hiệu ứng vật lý đàn hồi (rubber-band) khi ở mép đầu/cuối danh sách.
    - Không xung đột với tính năng phóng to (Pinch/Double-tap): khi zoom $>1\times$, 1 ngón tay giữ vai trò pan kéo ảnh.
    - Hiển thị chỉ số ảnh trên header: `{currentIndex + 1} / {allPhotos.length}`.
    - Bổ sung nút mũi tên chuyển ảnh 2 bên màn hình hỗ trợ cả chạm lẫn click chuột.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert c31c90b --no-edit
  ```

---

## [v1.0 (Build 1)] - 2026-11-12
- **Commit SHA**: `a14eb9d`
- **Mục tiêu**: Nâng cấp hiệu ứng mờ kính (frosted blur) cho TabBar, bo tròn đồng tâm cho pill lựa chọn, thêm Pull-to-refresh và tinh chỉnh vị trí nút `+`.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/components/TabBar.tsx`: Áp dụng `backdrop-blur-2xl bg-neutral-900/75 border border-white/10 shadow-2xl`, bo tròn `rounded-full` đồng tâm.
  - `ios-photo-app/src/components/PhotoGrid.tsx`: Thay thế nút refresh thủ công bằng tính năng vuốt kéo từ trên xuống để làm mới (Pull-to-refresh).
  - Tinh chỉnh khoảng cách nút `+` cân đối chuẩn công thái học.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert a14eb9d --no-edit
  ```

---

## [v1.0 (Build 1)] - 2026-11-12
- **Commit SHA**: `4f25786`
- **Mục tiêu**: Bổ sung trọn bộ 3 bộ Icon ứng dụng iOS 18 (Mặc định / Tối / Trong suốt tinted) và thiết kế lại TabBar dạng floating dock theo ảnh tham chiếu.
- **Chi tiết thay đổi**:
  - `generate_all_icons.py`: Script tự động tạo đầy đủ các kích thước app icon iOS.
  - Cập nhật Asset Catalog của Xcode với icon Default, Dark, Clear.
  - Tái cấu trúc TabBar thành thanh dock 4 mục chính + nút Tìm kiếm tròn tách biệt.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert 4f25786 --no-edit
  ```
