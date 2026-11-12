import React, { useState } from "react";
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
} from "lucide-react";
import {
  requestTelegramCode,
  verifyTelegramCode,
  logoutTelegram,
} from "../services/telegramClient";

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
      setStatusMsg("🎉 Đăng nhập Telegram MTProto thành công!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      if (err.message && err.message.includes("2FA")) {
        setStep("password");
        setStatusMsg("Tài khoản có bật bảo mật 2 lớp. Hãy nhập mật khẩu đám mây (2FA) của bạn.");
      } else {
        setStatusMsg(err.message || "Mã xác thực không chính xác");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutTelegram();
    const updatedConfig: TelegramConfig = {
      ...formData,
      sessionString: "",
      isLoggedIn: false,
    };
    setFormData(updatedConfig);
    onSave(updatedConfig);
    setStep("phone");
    setCode("");
    setPassword("");
    setStatusMsg("Đã đăng xuất tài khoản Telegram.");
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md liquid-glass-sheet border border-white/20 rounded-[32px] p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 className="text-lg font-bold flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            Cấu hình Telegram MTProto
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Switch tab */}
        <div className="flex liquid-glass-card p-1.5 rounded-2xl mt-4 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("api")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "api"
                ? "liquid-glass-active text-white shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Thông số API
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "login"
                ? "liquid-glass-active text-white shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Đăng nhập MTProto
          </button>
        </div>

        {statusMsg && (
          <div className="mt-3.5 p-3.5 liquid-glass-card border border-amber-500/30 rounded-2xl text-xs text-amber-300 font-medium leading-relaxed">
            {statusMsg}
          </div>
        )}

        {activeTab === "api" && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-xs text-neutral-300 leading-relaxed">
              Lấy <b>API ID</b> & <b>API Hash</b> miễn phí tại:{" "}
              <a
                href="https://my.telegram.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline font-semibold inline-flex items-center gap-1"
              >
                my.telegram.org <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </p>

            <div>
              <label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5 mb-2">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                API ID:
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 37132709"
                value={formData.apiId}
                onChange={(e) =>
                  setFormData({ ...formData, apiId: e.target.value.trim() })
                }
                className="w-full liquid-glass-card border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5 mb-2">
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
                className="w-full liquid-glass-card border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400 transition-colors font-mono shadow-inner"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5 mb-2">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
                Bot Token (Đã điền sẵn):
              </label>
              <input
                type="text"
                value={formData.botToken}
                onChange={(e) =>
                  setFormData({ ...formData, botToken: e.target.value.trim() })
                }
                className="w-full liquid-glass-card border border-white/10 rounded-2xl px-4 py-3 text-xs text-neutral-300 font-mono shadow-inner"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5 mb-2">
                <Hash className="w-3.5 h-3.5 text-blue-400" />
                ID Kênh lưu trữ:
              </label>
              <input
                type="text"
                value={formData.channelId}
                onChange={(e) =>
                  setFormData({ ...formData, channelId: e.target.value.trim() })
                }
                className="w-full liquid-glass-card border border-white/10 rounded-2xl px-4 py-3 text-xs text-neutral-300 font-mono shadow-inner"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-white/10 border border-white/15 text-neutral-200 font-bold rounded-2xl text-sm active:scale-95 transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 bg-blue-600 border border-blue-400/40 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-blue-600/30 transition-all"
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
              <div className="p-5 liquid-glass-card border border-emerald-500/40 rounded-3xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-emerald-300 text-base">
                  Đã kết nối Telegram cá nhân
                </h3>
                <p className="text-xs text-neutral-300 mt-1">
                  Đang dùng tài khoản của bạn để đọc ảnh từ kênh lưu trữ.
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-5 px-5 py-2.5 bg-red-950/80 text-red-300 border border-red-800/60 rounded-2xl text-xs font-bold flex items-center gap-2 mx-auto active:scale-95 transition-all shadow-md"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất tài khoản
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Đăng nhập tài khoản cá nhân để ứng dụng có toàn quyền đọc tin nhắn ảnh trong kênh lưu trữ tương tự ứng dụng <b>Telegram-Drive</b>.
                </p>

                {step === "phone" && (
                  <div>
                    <label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5 mb-2">
                      <Phone className="w-3.5 h-3.5 text-blue-400" />
                      Số điện thoại Telegram:
                    </label>
                    <input
                      type="text"
                      placeholder="+84xxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full liquid-glass-card border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400 transition-colors shadow-inner"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSendCode}
                      className="w-full mt-4 py-3.5 bg-blue-600 border border-blue-400/40 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-98 shadow-xl shadow-blue-600/30 disabled:opacity-50 transition-all"
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
                    <label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5 mb-2">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      Nhập mã xác thực:
                    </label>
                    <input
                      type="text"
                      placeholder="12345"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full liquid-glass-card border border-white/15 rounded-2xl px-4 py-3 text-lg text-white focus:outline-none focus:border-blue-400 font-mono tracking-widest text-center shadow-inner"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleVerifyCode}
                      className="w-full mt-4 py-3.5 bg-emerald-600 border border-emerald-400/40 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-98 shadow-xl shadow-emerald-600/30 disabled:opacity-50 transition-all"
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
                    <label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5 mb-2">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      Mật khẩu xác thực 2 lớp (2FA):
                    </label>
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu 2FA..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full liquid-glass-card border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-400 transition-colors shadow-inner"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleVerifyCode}
                      className="w-full mt-4 py-3.5 bg-purple-600 border border-purple-400/40 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-98 shadow-xl shadow-purple-600/30 disabled:opacity-50 transition-all"
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
      </div>
    </div>
  );
};
