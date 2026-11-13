# 🤖 Project Standard Rules & AI Agent Instructions (Insta-Downloader)

Tài liệu này là bộ quy chuẩn kỷ luật bắt buộc dành cho mọi AI Agent và Developer khi làm việc trên dự án **Insta-Downloader** (Web React + Capacitor iOS + Telegram/Instagram Bot). Mọi hành động chỉnh sửa mã nguồn, cấu trúc dữ liệu hoặc giao diện đều phải tuân thủ nghiêm ngặt các điều khoản dưới đây:

---

## 🛡️ 1. QUY TẮC BẢO TOÀN PHẠM VI & XÁC NHẬN KHI CÓ ẢNH HƯỞNG LIÊN ĐỚI (Scope Preservation & Impact Confirmation - BẮT BUỘC SỐ 1)

> [!CAUTION]
> **ĐIỀU KHOẢN BẤT DI BẤT DỊCH:**
> 1. **Giữ nguyên 100% các chức năng không được đề cập**:
>    - Khi người dùng yêu cầu thêm mới, sửa lỗi hoặc thay đổi một tính năng/giao diện cụ thể (ví dụ: TabBar, PhotoViewer, Modal...): AI **CHỈ ĐƯỢC PHÉP** can thiệp đúng vào phạm vi được yêu cầu.
>    - Mọi tính năng, màn hình, cấu trúc dữ liệu, luồng tính toán khác (logic tải ảnh Telegram, kết nối Instagram, zoom ảnh 2 ngón, pan kéo ảnh, bộ lọc album...) KHÔNG được đề cập trong yêu cầu **BẮT BUỘC PHẢI GIỮ NGUYÊN HOÀN TOÀN**. Tuyệt đối không tự ý tái cấu trúc (refactor), xóa bỏ, đổi tên hàm hay thay đổi cách hoạt động vốn có của các phần khác.
> 2. **Bắt buộc dừng lại hỏi ý kiến trước khi làm nếu có tác động liên đới**:
>    - Nếu việc thực hiện yêu cầu bắt buộc phải sửa đổi, can thiệp hoặc có nguy cơ làm ảnh hưởng/lỗi bất kỳ chức năng liên quan nào khác: AI **PHẢI DỪNG LẠI NGAY LẬP TỨC, GIẢI THÍCH RÕ NGUY CƠ VÀ XIN Ý KIẾN NGƯỜI DÙNG** trước khi viết code.
>    - Chỉ được phép tiến hành khi người dùng đã xem xét và đồng ý với phương án tác động liên đới đó.
> 3. **Kiểm tra hồi quy (No Regression)**:
>    - Tuyệt đối không xóa bỏ hay sửa đổi các hàm tiện ích dùng chung (`telegramClient.ts`, format ngày giờ, style Safe-Area `var(--sat)`, `var(--sab)`...) mà các trang hoặc sự kiện khác đang sử dụng.

---

## 📌 2. QUY TẮC NHẬT KÝ THAY ĐỔI & HOÀN TÁC (Changelog & Rollback Rule)
- Mọi lần thay đổi (dù lớn hay nhỏ), **BẮT BUỘC** phải cập nhật một mục phiên bản mới lên đầu file `CHANGELOG.md` trước khi commit.
- Mỗi bản ghi trong `CHANGELOG.md` phải có đầy đủ:
  - Số hiệu Phiên bản (Version) & Mã bản dựng (Build Number).
  - Commit SHA.
  - Mục tiêu thay đổi tóm tắt.
  - Chi tiết kỹ thuật các file đã chỉnh sửa.
  - **Lệnh hoàn tác mẫu (`git revert <commit_sha> --no-edit`)** để người dùng có thể rollback lập tức khi cần.

---

## 🏷️ 3. QUY TẮC PHIÊN BẢN GIAO DIỆN (UI Versioning Rule)
- **Khi có thay đổi lớn** (thêm tính năng mới, thay đổi luồng nghiệp vụ quan trọng hoặc cập nhật layout lớn): Tăng version hiển thị (`v1.0` ➔ `v1.1`...).
- **Khi là bản vá lỗi nhỏ / CSS hotfix**: Giữ nguyên version (`v1.1`), chỉ tăng số hiệu Build version ở file cấu hình nền tảng và ghi chú trong `CHANGELOG.md`.
- **Vị trí hiển thị**: Hiển thị phiên bản dạng text mờ tinh tế tại chân trang của **SettingsModal** (ví dụ: `Phiên bản 1.1 (Build 2)`).

---

## 🔄 4. QUY TẮC ĐỒNG BỘ ĐA NỀN TẢNG (Platform Sync & Build Rules)
*(Áp dụng cho dự án Capacitor iOS)*:
1. **Đồng bộ mã nguồn Web sang Mobile**:
   - Khi chỉnh sửa bất kỳ file Web nào trong thư mục `ios-photo-app/src/`, **BẮT BUỘC** chạy lệnh `npm run build` để xuất sang `dist/`.
   - Sau khi build xong, **BẮT BUỘC** chạy lệnh sync nền tảng: `npx cap sync ios`.
2. **Tự động tăng Build Number**:
   - Khi hoàn tất tính năng hoặc sửa lỗi, tăng số `CURRENT_PROJECT_VERSION` trong file `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj` và cập nhật version trong `ios-photo-app/package.json`.
3. **An toàn môi trường thực thi (PowerShell / Terminal)**:
   - Khi chạy các script phức tạp hoặc có chuỗi ký tự đặc biệt trên terminal, ưu tiên tạo script tạm thời (`.js` hoặc `.py`), thực thi rồi xóa bỏ để tránh lỗi cú pháp escape chuỗi.

---

## 📦 5. QUY TẮC CUNG CẤP LINK TẢI IPA TRỰC TIẾP SAU MỖI BẢN DỰNG (Direct IPA Download Link Rule)
- Sau mỗi lần cập nhật mã nguồn, tăng build và đẩy code lên GitHub (kích hoạt GitHub Actions `build-ipa.yml`), AI **BẮT BUỘC** phải đính kèm đường link tải trực tiếp file `.ipa` ngay trong câu trả lời báo cáo cho người dùng:
  👉 **Link tải trực tiếp**: `https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa`
- **Mục đích**: Người dùng có thể bấm trực tiếp từ iPhone (Safari / TrollStore / Scarlet / AltStore) để tải ngay file `.ipa` gốc mà không cần phải đăng nhập GitHub, không cần vào tab Actions, và không phải giải nén file `.zip`.
- Hệ thống workflow CI/CD `.github/workflows/build-ipa.yml` được cấu hình tự động đóng gói và xuất file `InstaPhotos.ipa` lên GitHub Release mang tag `latest` kèm quyền `contents: write`.

---

## 🚀 6. CHECKLIST BẮT BUỘC TRƯỚC KHI BÁO CÁO HOÀN THÀNH
Trước khi thông báo hoàn tất nhiệm vụ cho người dùng, AI phải tự kiểm tra:
- [ ] **Bảo toàn phạm vi**: Tất cả chức năng ngoài yêu cầu đều nguyên vẹn 100%, không bị ảnh hưởng ngoài ý muốn.
- [ ] Nếu có ảnh hưởng liên đới: Đã hỏi ý kiến và được người dùng đồng ý trước khi can thiệp.
- [ ] Đã kiểm tra cú pháp, sự kiện DOM, TypeScript compile pass (`npm run build`).
- [ ] Đã chạy lệnh sync nền tảng (`npx cap sync ios`).
- [ ] Đã tăng Build Number (`CURRENT_PROJECT_VERSION`) ở file cấu hình iOS.
- [ ] Đã ghi đầy đủ nhật ký kỹ thuật vào `CHANGELOG.md`.
- [ ] Đã commit và push mã nguồn sạch sẽ lên Git remote.
- [ ] **Gửi kèm link tải IPA trực tiếp**: Đã chèn link tải nhanh `.ipa` (`https://github.com/nhdien07122012/Insta-Downloader/releases/latest/download/InstaPhotos.ipa`) vào phần báo cáo hoàn thành cho người dùng.
