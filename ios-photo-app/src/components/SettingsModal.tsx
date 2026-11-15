import React, { useState, useEffect, useRef } from "react";
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
  Cloud,
  Upload,
  Download,
  Copy,
  FileText,
  Sparkles,
} from "lucide-react";
import { Share } from "@capacitor/share";
import {
  requestTelegramCode,
  verifyTelegramCode,
  logoutTelegram,
  triggerChannelScan,
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
  const [activeTab, setActiveTab] = useState<"api" | "login" | "backup">(
    config.apiId && config.apiHash && !config.isLoggedIn ? "login" : "api"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [isScanningModal, setIsScanningModal] = useState(false);
  const [scanModalMsg, setScanModalMsg] = useState("");

  const handleManualScan = async (limit: number = 20) => {
    if (isScanningModal) return;
    setIsScanningModal(true);
    setScanModalMsg(`Đang gửi lệnh /scan ${limit} đến Kênh...`);
    try {
      const ok = await triggerChannelScan(formData, limit);
      if (ok) {
        setScanModalMsg(`✅ Đã gửi /scan ${limit}! Bot TX3 Mini đang quét Kênh...`);
      } else {
        setScanModalMsg("⚠️ Cần đăng nhập Telegram cá nhân để gửi lệnh.");
      }
    } catch {
      setScanModalMsg("❌ Gặp lỗi khi gửi lệnh /scan.");
    } finally {
      setTimeout(() => {
        setIsScanningModal(false);
      }, 1200);
      setTimeout(() => {
        setScanModalMsg("");
      }, 5000);
    }
  };

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

  const handleTriggerRestore = () => {
    fileInputRef.current?.click();
  };

  const handleExportBackup = async () => {
    if (!formData.apiId && !formData.apiHash) {
      setStatusMsg("Chưa có cấu hình API ID và API Hash để sao lưu.");
      return;
    }

    const backupPayload = {
      app: "InstaPhotos",
      version: "1.5.0",
      exportedAt: new Date().toISOString(),
      config: {
        apiId: formData.apiId,
        apiHash: formData.apiHash,
        botToken: formData.botToken,
        channelId: formData.channelId,
        phoneNumber: formData.phoneNumber || phone,
        sessionString: formData.sessionString || localStorage.getItem("tg_session") || "",
        isLoggedIn: formData.isLoggedIn,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const fileName = `instaphotos-backup-${new Date().toISOString().slice(0, 10)}.json`;

    // 1. Thử dùng Web File API + navigator.share (chuẩn Share Sheet iOS 15+ xuất file sang Tệp / iCloud Drive)
    try {
      const file = new File([jsonString], fileName, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "InstaPhotos Backup",
          text: "Sao lưu cấu hình InstaPhotos lên iCloud Drive / Tệp",
        });
        setStatusMsg("Đang mở bảng chia sẻ. Chọn 'Lưu vào Tệp' để lưu vào iCloud Drive.");
        return;
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.warn("navigator.share file failed:", err);
    }

    // 2. Thử dùng Capacitor Share plugin
    try {
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: "Sao lưu cấu hình InstaPhotos",
          text: jsonString,
          dialogTitle: "Lưu cấu hình vào iCloud / Tệp",
        });
        setStatusMsg("Đã mở bảng chia sẻ! Hãy chọn 'Lưu vào Tệp' để lưu vào iCloud Drive.");
        return;
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.warn("Capacitor Share failed:", err);
    }

    // 3. Fallback: Tải file trực tiếp
    try {
      const blob = new Blob([jsonString], { type: "application/json" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setStatusMsg("Đã tạo file sao lưu! Hãy lưu file này vào thư mục iCloud Drive.");
    } catch {
      setStatusMsg("Lỗi khi tạo file sao lưu.");
    }
  };

  const handleCopyConfig = async () => {
    const backupPayload = {
      app: "InstaPhotos",
      version: "1.5.0",
      exportedAt: new Date().toISOString(),
      config: {
        apiId: formData.apiId,
        apiHash: formData.apiHash,
        botToken: formData.botToken,
        channelId: formData.channelId,
        phoneNumber: formData.phoneNumber || phone,
        sessionString: formData.sessionString || localStorage.getItem("tg_session") || "",
        isLoggedIn: formData.isLoggedIn,
      },
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(backupPayload, null, 2));
      setStatusMsg("Đã sao chép cấu hình vào bộ nhớ tạm (Clipboard)!");
    } catch {
      setStatusMsg("Không thể sao chép vào bộ nhớ tạm.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const cfg = parsed.config || parsed;

        if (!cfg.apiId && !cfg.apiHash) {
          setStatusMsg("File không hợp lệ: Không tìm thấy API ID hoặc API Hash.");
          return;
        }

        const restoredConfig: TelegramConfig = {
          apiId: String(cfg.apiId || "").trim(),
          apiHash: String(cfg.apiHash || "").trim(),
          botToken: String(cfg.botToken || formData.botToken || "").trim(),
          channelId: String(cfg.channelId || formData.channelId || "").trim(),
          phoneNumber: String(cfg.phoneNumber || "").trim(),
          sessionString: String(cfg.sessionString || "").trim(),
          isLoggedIn: Boolean(cfg.isLoggedIn && cfg.sessionString),
        };

        setFormData(restoredConfig);
        if (restoredConfig.phoneNumber) {
          setPhone(restoredConfig.phoneNumber);
        }
        if (restoredConfig.sessionString) {
          localStorage.setItem("tg_session", restoredConfig.sessionString);
        }

        onSave(restoredConfig);
        setSavedSuccess(true);
        setStatusMsg("🎉 Khôi phục cấu hình từ iCloud Drive thành công!");
        setTimeout(() => setSavedSuccess(false), 2000);
      } catch {
        setStatusMsg("Lỗi đọc file sao lưu. Vui lòng chọn đúng file .json đã xuất từ InstaPhotos.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
                : "text-neutral-400 hover:text-neutral-200"
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
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Đăng nhập MTProto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("backup")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === "backup"
                ? "bg-blue-600/90 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-blue-400" />
            Sao lưu iCloud
          </button>
        </div>

        {statusMsg && (
          <div className="mt-3 p-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-amber-300">
            {statusMsg}
          </div>
        )}

        {activeTab === "api" && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Quick restore banner */}
            {(!formData.apiId || !formData.apiHash) && (
              <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Cloud className="w-4 h-4 text-blue-400 shrink-0" />
                  <p className="text-xs text-neutral-300 truncate">
                    Đã có file sao lưu trên iCloud?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerRestore}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shrink-0 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                >
                  <Download className="w-3 h-3" />
                  Khôi phục
                </button>
              </div>
            )}
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

            {/* Quick Trigger /scan button */}
            {formData.isLoggedIn && (
              <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-xl space-y-2">
                <div>
                  <h4 className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Quét link tồn đọng trên Kênh (/scan)
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    Kích hoạt bot TX3 Mini quét các link X / Instagram đang chờ xử lý trên Kênh lưu trữ.
                  </p>
                </div>
                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleManualScan(20)}
                    disabled={isScanningModal}
                    className="flex-1 py-1.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningModal ? "animate-spin" : ""}`} />
                    Quét 20 tin gần nhất
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManualScan(50)}
                    disabled={isScanningModal}
                    className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Quét 50 tin
                  </button>
                </div>
                {scanModalMsg && (
                  <p className="text-[11px] text-cyan-400 font-medium animate-in fade-in pt-0.5">
                    {scanModalMsg}
                  </p>
                )}
              </div>
            )}

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

        {activeTab === "backup" && (
          <div className="mt-4 space-y-4">
            {/* Introduction Card */}
            <div className="p-4 bg-gradient-to-br from-blue-950/40 to-neutral-900 border border-blue-800/40 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Sao lưu & Khôi phục qua iCloud Drive
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Lưu toàn bộ <b>API ID, API Hash, ID Kênh</b> và <b>Phiên đăng nhập</b> vào iCloud Drive cá nhân qua ứng dụng <b>Tệp (Files)</b> của iPhone.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Config Status Preview */}
            <div className="p-3.5 bg-neutral-800/60 border border-neutral-700/60 rounded-2xl space-y-2">
              <div className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                Dữ liệu hiện tại:
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
                <div className="bg-neutral-900/60 p-2 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block">API ID:</span>
                  <span className="font-mono text-neutral-200">
                    {formData.apiId ? `${formData.apiId.slice(0, 4)}••••` : "(Chưa có)"}
                  </span>
                </div>
                <div className="bg-neutral-900/60 p-2 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block">API Hash:</span>
                  <span className="font-mono text-neutral-200">
                    {formData.apiHash ? "Đã cấu hình" : "(Chưa có)"}
                  </span>
                </div>
                <div className="bg-neutral-900/60 p-2 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block">ID Kênh:</span>
                  <span className="font-mono text-neutral-200 truncate block">
                    {formData.channelId || "(Chưa có)"}
                  </span>
                </div>
                <div className="bg-neutral-900/60 p-2 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block">Đăng nhập:</span>
                  <span className={formData.isLoggedIn ? "text-emerald-400 font-medium" : "text-amber-400"}>
                    {formData.isLoggedIn ? "Đã kết nối" : "Chưa kết nối"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4" />
                Sao lưu ra iCloud Drive (Tệp)
              </button>

              <button
                type="button"
                onClick={handleTriggerRestore}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Khôi phục từ iCloud Drive (Tệp)
              </button>

              <button
                type="button"
                onClick={handleCopyConfig}
                className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-750 active:scale-[0.98] text-neutral-300 font-medium rounded-2xl text-xs flex items-center justify-center gap-2 border border-neutral-700 transition-all"
              >
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                Sao chép văn bản cấu hình (Clipboard)
              </button>
            </div>

            <p className="text-[11px] text-neutral-500 text-center leading-relaxed px-2">
              💡 File sao lưu có đuôi <code>.json</code>. Bạn có thể lưu vào bất kỳ thư mục nào trên iCloud Drive để khôi phục nhanh khi cài lại máy.
            </p>
          </div>
        )}

        {/* Hidden File Input for iCloud / Files document picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

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
            InstaPhotos v1.5.6 • Build 21 (Dedicated Pull-to-Refresh & Manual Scan)
          </p>
        </div>
      </div>
    </div>
  );
};
