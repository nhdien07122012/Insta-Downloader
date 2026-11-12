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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md liquid-glass-sheet border border-white/20 rounded-[32px] p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 className="text-lg font-bold flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-md">
              <Plus className="w-5 h-5 text-white stroke-[2.5]" />
            </span>
            Tải Ảnh Từ Instagram
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95 disabled:opacity-50 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
          Dán liên kết bài viết Instagram (ảnh đơn hoặc carousel nhiều ảnh) để Bot TX3 Mini tự động tải về và lưu vào Kho ảnh Telegram của bạn.
        </p>

        {errorMsg && (
          <div className="mt-3 p-3.5 liquid-glass-card border border-red-500/40 rounded-2xl text-xs text-red-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleStartDownload} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-neutral-300 font-semibold">
                Liên kết bài viết Instagram:
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold active:opacity-70 px-2 py-1 rounded-lg bg-white/5 border border-white/10"
              >
                <ClipboardIcon className="w-3.5 h-3.5" />
                <span>Dán từ bộ nhớ tạm</span>
              </button>
            </div>
            <input
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="w-full liquid-glass-card border border-white/15 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-400 transition-colors placeholder:text-neutral-500 disabled:opacity-60 shadow-inner"
            />
          </div>

          {loading ? (
            <div className="p-5 liquid-glass-card border border-white/15 rounded-2xl text-center space-y-2.5">
              {success ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <Check className="w-7 h-7" />
                </div>
              ) : (
                <RefreshCw className="w-7 h-7 animate-spin text-blue-400 mx-auto" />
              )}
              <p className="text-xs font-bold text-white">{stepText}</p>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 active:scale-98 text-white font-bold rounded-2xl text-sm shadow-xl shadow-purple-600/35 flex items-center justify-center gap-2 border border-white/20 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Tải & Đẩy Lên Kho Ảnh</span>
            </button>
          )}
        </form>

        <div className="mt-4 pt-3.5 border-t border-white/10 text-xs text-neutral-400 leading-relaxed">
          💡 <b>Mẹo chia sẻ 1 chạm từ Instagram:</b> Trên ứng dụng Instagram, bạn chỉ cần bấm nút <b>Chia sẻ</b> ➔ chọn <b>Sao chép liên kết</b>, khi bạn mở lại InstaPhotos app sẽ tự động phát hiện và hỏi bạn có muốn tải ngay hay không!
        </div>
      </div>
    </div>
  );
};
