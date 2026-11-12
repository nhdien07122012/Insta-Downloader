# 📝 Nhật Ký Thay Đổi (Changelog) - Insta-Downloader

Toàn bộ các phiên bản cập nhật, mã bản dựng (build number), chi tiết kỹ thuật và lệnh hoàn tác (rollback) của dự án.

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
