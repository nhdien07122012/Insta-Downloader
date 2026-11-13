# 📝 Nhật Ký Thay Đổi (Changelog) - Insta-Downloader

Toàn bộ các phiên bản cập nhật, mã bản dựng (build number), chi tiết kỹ thuật và lệnh hoàn tác (rollback) của dự án.

---

## [v2.0 (Build 6)] - 2026-11-13
- **Commit SHA**: `e66e0d5`
- **Mục tiêu**: Nâng cấp toàn diện ngôn ngữ thiết kế từ Frosted Glass tĩnh sang Apple Liquid Glass chuẩn iOS 26 (khúc xạ quang học Dynamic Refraction, ánh sáng phản chiếu Specular Glare, gờ nổi kép Caustic Dual-Bevel, bóng đổ chiều sâu Deep Ambient Shadow, phản hồi lực đàn hồi Tactile Fluid Spring Feedback); hạ thấp thanh TabBar sát viền đáy tự nhiên; đồng bộ nút `+` và nút Tìm kiếm (Search) thành thấu kính Liquid Glass lens cùng kích thước $54\times54\text{px}$ xếp thẳng hàng theo cột.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/index.css`: Xây dựng toàn bộ hệ thống lớp kính quang học Apple Liquid Glass:
    - `.liquid-glass-dock`: Dock điều hướng trôi nổi với độ mờ khúc xạ cao `blur(34px) saturate(210%)`, viền sáng quang học kép `inset 0 1.5px 1px rgba(255,255,255,0.42)` và bóng đổ sâu `rgba(0,0,0,0.8)`.
    - `.liquid-glass-lens` & `.liquid-glass-lens-active`: Thấu kính tròn trôi nổi cho các nút tương tác (`+`, `Search`, `Settings`, `Share`, `Chevron`), có tâm sáng hội tụ và phản hồi nhún vật lý `cubic-bezier(0.34, 1.56, 0.64, 1)`.
    - `.liquid-glass-header`: Thanh điều hướng phía trên với dải phân cách đáy trong suốt.
    - `.liquid-glass-pill-container` & `.liquid-glass-pill-active`: Viên nang Segmented Control trượt êm ái với gờ sáng nổi bật.
    - `.liquid-glass-modal` & `.liquid-glass-sheet`: Hộp thoại nổi và bảng trượt đáy với chiều sâu nổi ba chiều.
    - `.liquid-glass-subtle` & `.liquid-glass-tab-active`: Bề mặt kính nhẹ cho thẻ bài viết, album và tab đang chọn.
    - Hỗ trợ chuẩn trợ năng iOS: Tự động điều chỉnh khi bật `prefers-reduced-transparency` hoặc `prefers-reduced-motion`.
  - `ios-photo-app/src/components/TabBar.tsx`: 
    - Chuyển dock điều hướng sang `.liquid-glass-dock`.
    - Hạ thấp vị trí dock: Điều chỉnh khoảng cách đáy thành `max(calc(var(--sab) - 24px), 4px)` giúp thanh dock nằm sát vùng thao tác tự nhiên hơn.
    - Xóa bỏ hoàn toàn màu sắc sặc sỡ của nút `+`, chuyển cả nút `+` và nút Tìm kiếm sang kiểu thấu kính tròn `.liquid-glass-lens` đồng nhất kích thước $54\times54\text{px}$ và nằm chung một cột dọc.
  - `ios-photo-app/src/components/Header.tsx`: Nâng cấp Header và thanh phân loại thời gian ("Tất cả", "Hôm nay", "Tuần này", "Yêu thích", "Album") sang Liquid Glass Capsule.
  - `ios-photo-app/src/components/PhotoViewer.tsx`: Chuyển đổi thanh tiêu đề trên, thanh công cụ đáy, nút chuyển ảnh Chevron trái/phải, bảng thông tin chi tiết (Info Sheet) và hộp thoại xác nhận xóa ảnh sang Liquid Glass.
  - `ios-photo-app/src/components/PhotoGrid.tsx`: Nâng cấp thanh tiêu đề ngày tháng dính (`sticky`) và huy hiệu Carousel sang dải kính Liquid Glass.
  - `ios-photo-app/src/components/AddPhotoModal.tsx`: Nâng cấp hộp thoại dán liên kết Instagram sang Liquid Glass Modal.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Chuyển đổi giao diện cài đặt sang Liquid Glass, nâng cấp các thẻ và cập nhật số hiệu phiên bản `InstaPhotos v2.0 • Build 6 (Liquid Glass Edition)`.
  - `ios-photo-app/src/App.tsx`: Nâng cấp thanh tìm kiếm, thẻ bộ sưu tập Album và mục Yêu thích sang Liquid Glass.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION = 6;` và `MARKETING_VERSION = 2.0;`.
  - `ios-photo-app/package.json`: Nâng phiên bản lên `"2.0.0"`.
  - **Bản sao lưu an toàn (Safe Backup)**:
    - Git Tag lưu trữ vĩnh viễn trên GitHub: `backup-v1.3-pre-liquid-glass` (tải IPA trực tiếp từ GitHub Releases/Actions của tag này nếu cần).
    - Thư mục sao lưu mã nguồn vật lý nội bộ: `backup_pre_liquid_glass/ios-photo-app`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  # Hoặc quay lại chính xác bản build v1.3:
  git checkout backup-v1.3-pre-liquid-glass
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
