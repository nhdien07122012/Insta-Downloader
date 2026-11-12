#!/bin/bash
# ==============================================================================
# Script tự động cài đặt & cấu hình Insta-Downloader trên Armbian (TX3 Mini)
# Tối ưu hóa cho SoC Amlogic S905W / 2GB RAM / microSD /mnt/storage
# ==============================================================================

set -e

echo "🚀 Bắt đầu cài đặt Insta-Downloader trên TX3 Mini..."

# 1. Cài đặt các gói phụ thuộc hệ thống
echo "📦 1. Cài đặt Python và các công cụ cần thiết..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv git

# 2. Tạo thư mục làm việc chuẩn tại /opt/insta-downloader nếu chưa có
APP_DIR="/opt/insta-downloader"
if [ "$PWD" != "$APP_DIR" ]; then
    echo "📁 2. Sao chép dự án vào $APP_DIR..."
    sudo mkdir -p $APP_DIR
    sudo cp -r ./* $APP_DIR/
    cd $APP_DIR
fi

# 3. Đảm bảo thư mục lưu trữ trên thẻ nhớ microSD tồn tại
echo "💾 3. Cấu hình thư mục lưu trữ trên thẻ nhớ microSD (/mnt/storage)..."
sudo mkdir -p /mnt/storage/insta_downloads
sudo chmod 777 /mnt/storage/insta_downloads

# 4. Tạo môi trường ảo Python và cài đặt thư viện
echo "🐍 4. Khởi tạo Python venv và cài đặt thư viện..."
# Nếu thư mục venv được copy từ Windows (có Scripts/ thay vì bin/), xóa đi để tạo lại chuẩn Linux ARM
if [ -d "venv/Scripts" ] || [ ! -f "venv/bin/python3" ]; then
    echo "⚠️ Phát hiện venv cũ hoặc từ Windows, đang tạo lại venv chuẩn cho Linux ARM..."
    rm -rf venv
fi

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
./venv/bin/pip install gallery-dl

# 5. Cài đặt Systemd Service
echo "⚙️ 5. Cấu hình Systemd Service (tự khởi động 24/7)..."
sudo cp instabot.service /etc/systemd/system/instabot.service
sudo systemctl daemon-reload
sudo systemctl enable instabot
sudo systemctl restart instabot

echo "--------------------------------------------------"
echo "✅ CÀI ĐẶT THÀNH CÔNG TRÊN TX3 MINI!"
echo "Trạng thái dịch vụ:"
sudo systemctl status instabot --no-pager
echo "--------------------------------------------------"
echo "👉 Để xem log trực tiếp: journalctl -u instabot -f"
