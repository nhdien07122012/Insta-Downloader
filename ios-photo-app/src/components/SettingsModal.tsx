import React, { useState } from "react";
import type { TelegramConfig } from "../types";
import { X, Key, ShieldCheck, Hash, Bot, Check, ExternalLink } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TelegramConfig;
  onSave: (config: TelegramConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [formData, setFormData] = useState<TelegramConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            Cấu hình Telegram MTProto
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 active:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 mt-3 leading-relaxed">
          Ứng dụng kết nối trực tiếp đến máy chủ Telegram mà không cần server trung gian.
          Lấy <b>API ID</b> & <b>API Hash</b> miễn phí tại:{" "}
          <a
            href="https://my.telegram.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline inline-flex items-center gap-0.5"
          >
            my.telegram.org <ExternalLink className="w-3 h-3" />
          </a>
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-1.5">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              API ID (Số):
            </label>
            <input
              type="text"
              placeholder="Ví dụ: 28471923"
              value={formData.apiId}
              onChange={(e) =>
                setFormData({ ...formData, apiId: e.target.value.trim() })
              }
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              API HASH:
            </label>
            <input
              type="text"
              placeholder="Chuỗi hash 32 ký tự..."
              value={formData.apiHash}
              onChange={(e) =>
                setFormData({ ...formData, apiHash: e.target.value.trim() })
              }
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-1.5">
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              Bot Token (Đã điền sẵn):
            </label>
            <input
              type="text"
              value={formData.botToken}
              onChange={(e) =>
                setFormData({ ...formData, botToken: e.target.value.trim() })
              }
              className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-3.5 py-2.5 text-xs text-neutral-300 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-400" />
              ID Kênh lưu trữ (Đã điền sẵn):
            </label>
            <input
              type="text"
              value={formData.channelId}
              onChange={(e) =>
                setFormData({ ...formData, channelId: e.target.value.trim() })
              }
              className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-3.5 py-2.5 text-xs text-neutral-300 focus:outline-none font-mono"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-800 text-neutral-300 font-medium rounded-xl text-sm active:bg-neutral-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl text-sm active:bg-blue-700 flex items-center justify-center gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Đã lưu!
                </>
              ) : (
                "Lưu & Kết nối"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
