import React, { useState, useEffect } from "react";
import type { TelegramConfig } from "../types";
import {
  X,
  Plus,
  Clipboard as ClipboardIcon,
  Send,
  RefreshCw,
  Check,
  AlertCircle,
} from "lucide-react";
import { Clipboard } from "@capacitor/clipboard";
import { sendInstagramLinkToChannel } from "../services/telegramClient";

interface AddPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TelegramConfig;
  onSuccess: () => void;
  initialUrl?: string;
}

export const AddPhotoModal: React.FC<AddPhotoModalProps> = ({
  isOpen,
  onClose,
  config,
  onSuccess,
  initialUrl = "",
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [stepText, setStepText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [initialUrl]);

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      const { value } = await Clipboard.read();
      if (value) {
        setUrl(value.trim());
        setErrorMsg("");
      }
    } catch {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text.trim());
          setErrorMsg("");
        }
      } catch {
        setErrorMsg("Không thể đọc bộ nhớ tạm. Hãy dán trực tiếp vào ô nhập.");
      }
    }
  };

  const handleStartDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg("Vui lòng nhập hoặc dán liên kết Instagram.");
      return;
    }

    if (!url.includes("instagram.com")) {
      setErrorMsg("Liên kết không hợp lệ. Phải là liên kết bài viết Instagram.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccess(false);

    try {
      // Bước 1: Gửi link đến Kênh Telegram qua MTProto
      setStepText("Đang gửi liên kết đến Kênh Telegram...");
      await sendInstagramLinkToChannel(config, url.trim());

      // Bước 2: Chờ bot TX3 Mini xử lý tải ảnh & đẩy ảnh lên kênh
      setStepText("🤖 Bot TX3 Mini đang trích xuất ảnh chất lượng cao...");
      await new Promise((r) => setTimeout(r, 4000));

      setStepText("🚀 Đang đẩy ảnh HD vào Kho lưu trữ...");
      await new Promise((r) => setTimeout(r, 3000));

      setStepText("✅ Đã hoàn tất! Đang làm mới thư viện ảnh...");
      setSuccess(true);

      // Bước 3: Tự động refresh thư viện
      onSuccess();

      setTimeout(() => {
        setLoading(false);
        setUrl("");
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Lỗi gửi link:", err);
      setErrorMsg(err.message || "Lỗi gửi liên kết đến Telegram. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md liquid-glass-modal rounded-3xl p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl liquid-glass-subtle flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </span>
            Tải Ảnh Từ Instagram
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full liquid-glass-lens flex items-center justify-center text-neutral-300 active:scale-90 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
          Dán liên kết bài viết Instagram (ảnh đơn hoặc carousel nhiều ảnh) để Bot TX3 Mini tự động tải về và lưu vào Kho ảnh Telegram của bạn.
        </p>

        {errorMsg && (
          <div className="mt-3 p-3 bg-red-950/70 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleStartDownload} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-neutral-300 font-medium">
                Liên kết bài viết Instagram:
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium active:opacity-70"
              >
                <ClipboardIcon className="w-3 h-3" />
                <span>Dán từ bộ nhớ tạm</span>
              </button>
            </div>
            <input
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="w-full liquid-glass-subtle rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-neutral-500 disabled:opacity-60"
            />
          </div>

          {loading ? (
            <div className="p-4 liquid-glass-subtle rounded-2xl text-center space-y-2">
              {success ? (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
              ) : (
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
              )}
              <p className="text-xs font-semibold text-white">{stepText}</p>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 active:scale-98 transition-transform text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Tải & Đẩy Lên Kho Ảnh</span>
            </button>
          )}
        </form>

        <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-neutral-400 leading-relaxed">
          💡 <b>Mẹo chia sẻ 1 chạm từ Instagram:</b> Trên ứng dụng Instagram, bạn chỉ cần bấm nút <b>Chia sẻ</b> ➔ chọn <b>Sao chép liên kết</b>, khi bạn mở lại InstaPhotos app sẽ tự động phát hiện và hỏi bạn có muốn tải ngay hay không!
        </div>
      </div>
    </div>
  );
};
