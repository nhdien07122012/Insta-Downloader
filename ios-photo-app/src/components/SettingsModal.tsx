import React, { useState, useEffect } from "react";
import type { TelegramConfig } from "../types";
import {
  X,
  Key,
  ShieldCheck,
  Hash,
  Bot,
  Check,
  ExternalLink,
  Phone,
  Lock,
  LogOut,
  RefreshCw,
  Database,
  Trash2,
} from "lucide-react";
import {
  requestTelegramCode,
  verifyTelegramCode,
  logoutTelegram,
} from "../services/telegramClient";
import { getCacheStats, clearPhotoCache } from "../services/photoStorage";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TelegramConfig;
  onSave: (config: TelegramConfig) => void;
  onCacheCleared?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onCacheCleared,
}) => {
  const [formData, setFormData] = useState<TelegramConfig>(config);
  const [activeTab, setActiveTab] = useState<"api" | "login">(
    config.apiId && config.apiHash && !config.isLoggedIn ? "login" : "api"
  );
  const [phone, setPhone] = useState(config.phoneNumber || "");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; sizeMB: string }>({
    count: 0,
    sizeMB: "0",
  });

  useEffect(() => {
    if (isOpen) {
      getCacheStats().then(setCacheStats);
    }
  }, [isOpen]);

  const handleClearCache = async () => {
    await clearPhotoCache();
    setCacheStats({ count: 0, sizeMB: "0" });
    setStatusMsg("Đã dọn dẹp sạch bộ nhớ đệm ảnh!");
    if (onCacheCleared) onCacheCleared();
  };

  if (!isOpen) return null;

  const handleSendCode = async () => {
    if (!formData.apiId || !formData.apiHash) {
      setStatusMsg("Vui lòng nhập API ID và API Hash trước");
      return;
    }
    if (!phone.trim()) {
      setStatusMsg("Vui lòng nhập số điện thoại Telegram (ví dụ: +84...)");
      return;
    }

    setLoading(true);
    setStatusMsg("");
    try {
      const res = await requestTelegramCode(
        formData.apiId,
        formData.apiHash,
        phone.trim()
      );
      setPhoneCodeHash(res.phoneCodeHash);
      setStep("code");
      setStatusMsg("Mã xác thực đã được gửi đến ứng dụng Telegram của bạn!");
    } catch (err: any) {
      setStatusMsg(err.message || "Lỗi gửi mã OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setStatusMsg("Vui lòng nhập mã Telegram đã nhận");
      return;
    }

    setLoading(true);
    setStatusMsg("");
    try {
      const sessionString = await verifyTelegramCode(
        phone.trim(),
        phoneCodeHash,
        code.trim(),
        password
      );
      const updatedConfig: TelegramConfig = {
        ...formData,
        phoneNumber: phone.trim(),
        sessionString,
        isLoggedIn: true,
      };
      setFormData(updatedConfig);
      onSave(updatedConfig);
      setStatusMsg("Đăng nhập Telegram MTProto thành công!");
      setStep("phone");
    } catch (err: any) {
      if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
        setStep("password");
        setStatusMsg("Tài khoản yêu cầu mật khẩu xác thực 2 lớp (2FA)");
      } else {
        setStatusMsg(err.message || "Mã xác thực không hợp lệ");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutTelegram();
    const updatedConfig: TelegramConfig = {
      ...formData,
      sessionString: "",
      isLoggedIn: false,
    };
    setFormData(updatedConfig);
    onSave(updatedConfig);
    setStatusMsg("Đã đăng xuất tài khoản.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedSuccess(true);
    if (!formData.isLoggedIn && formData.apiId && formData.apiHash) {
      setTimeout(() => {
        setSavedSuccess(false);
        setActiveTab("login");
        setStatusMsg("Đã lưu API ID & Hash! Tiếp theo hãy nhập Số điện thoại để nhận mã xác thực Telegram.");
      }, 500);
    } else {
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
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

        {/* Switch tab */}
        <div className="flex bg-neutral-800/80 p-1 rounded-xl mt-4">
          <button
            type="button"
            onClick={() => setActiveTab("api")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "api"
                ? "bg-neutral-700 text-white shadow-sm"
                : "text-neutral-400"
            }`}
          >
            Thông số API
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "login"
                ? "bg-neutral-700 text-white shadow-sm"
                : "text-neutral-400"
            }`}
          >
            Đăng nhập MTProto
          </button>
        </div>

        {statusMsg && (
          <div className="mt-3 p-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-amber-300">
            {statusMsg}
          </div>
        )}

        {activeTab === "api" && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-xs text-neutral-400 leading-relaxed">
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

            <div>
              <label className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-1.5">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                API ID:
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 28471923"
                value={formData.apiId}
                onChange={(e) =>
                  setFormData({ ...formData, apiId: e.target.value.trim() })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
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
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
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
                className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-3.5 py-2.5 text-xs text-neutral-300 font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-400" />
                ID Kênh lưu trữ:
              </label>
              <input
                type="text"
                value={formData.channelId}
                onChange={(e) =>
                  setFormData({ ...formData, channelId: e.target.value.trim() })
                }
                className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-3.5 py-2.5 text-xs text-neutral-300 font-mono"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-neutral-800 text-neutral-300 font-medium rounded-xl text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Đã lưu!
                  </>
                ) : (
                  "Lưu cấu hình"
                )}
              </button>
            </div>
          </form>
        )}

        {activeTab === "login" && (
          <div className="mt-4 space-y-4">
            {formData.isLoggedIn ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-emerald-400 text-sm">
                  Đã kết nối Telegram cá nhân
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Đang dùng tài khoản của bạn để đọc ảnh từ kênh lưu trữ.
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-4 px-4 py-2 bg-red-950 text-red-400 border border-red-800/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto active:bg-red-900"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng xuất tài khoản
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Đăng nhập tài khoản cá nhân để ứng dụng có toàn quyền đọc tin nhắn ảnh trong kênh lưu trữ tương tự ứng dụng <b>Telegram-Drive</b>.
                </p>

                {step === "phone" && (
                  <div>
                    <label className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-400" />
                      Số điện thoại Telegram:
                    </label>
                    <input
                      type="text"
                      placeholder="+84xxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSendCode}
                      className="w-full mt-3 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 active:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        "Nhận mã xác nhận Telegram"
                      )}
                    </button>
                  </div>
                )}

                {step === "code" && (
                  <div>
                    <label className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      Nhập mã xác thực:
                    </label>
                    <input
                      type="text"
                      placeholder="12345"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono tracking-widest text-center"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleVerifyCode}
                      className="w-full mt-3 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 active:bg-emerald-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        "Xác thực & Kết nối"
                      )}
                    </button>
                  </div>
                )}

                {step === "password" && (
                  <div>
                    <label className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-1.5">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      Mật khẩu xác thực 2 lớp (2FA):
                    </label>
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu 2FA..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleVerifyCode}
                      className="w-full mt-3 py-2.5 bg-purple-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 active:bg-purple-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        "Đăng nhập bằng 2FA"
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quản lý Bộ nhớ đệm ảnh (Offline Cache) */}
        <div className="mt-5 pt-4 border-t border-neutral-850">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-400" />
                Bộ nhớ đệm ảnh (Offline)
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                {cacheStats.count > 0
                  ? `${cacheStats.count} ảnh trong máy (${cacheStats.sizeMB} MB)`
                  : "Chưa có ảnh nào lưu trong máy"}
              </p>
            </div>
            {cacheStats.count > 0 && (
              <button
                type="button"
                onClick={handleClearCache}
                className="px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl active:bg-red-900/60 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa cache
              </button>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Ảnh được lưu trực tiếp trên iPhone để mở ứng dụng xem ngay tức thì mà không cần tải lại từ Telegram.
          </p>
        </div>

        {/* Footer App Version & Build */}
        <div className="pt-4 pb-1 text-center border-t border-neutral-800/80">
          <p className="text-[11px] text-neutral-500 font-medium">
            InstaPhotos v1.4 • Build 10 (Video Support & Streaming)
          </p>
        </div>
      </div>
    </div>
  );
};
