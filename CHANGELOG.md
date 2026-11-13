# 📝 Nhật Ký Thay Đổi (Changelog) - Insta-Downloader

Toàn bộ các phiên bản cập nhật, mã bản dựng (build number), chi tiết kỹ thuật và lệnh hoàn tác (rollback) của dự án.

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
