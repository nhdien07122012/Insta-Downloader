import React, { useState, useEffect, useMemo } from "react";
import type { PhotoItem, DateGroup, TelegramConfig } from "./types";
import {
  getStoredConfig,
  saveStoredConfig,
  fetchChannelPhotos,
} from "./services/telegramClient";
import { Header } from "./components/Header";
import { PhotoGrid } from "./components/PhotoGrid";
import { PhotoViewer } from "./components/PhotoViewer";
import { TabBar } from "./components/TabBar";
import { SettingsModal } from "./components/SettingsModal";
import { RefreshCw, Search, Folder, Sparkles, ShieldCheck, ChevronRight, AlertCircle } from "lucide-react";

export const App: React.FC = () => {
  const [config, setConfig] = useState<TelegramConfig>(getStoredConfig);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [currentTab, setCurrentTab] = useState("library");
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadPhotos = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await fetchChannelPhotos(config, 60);
      setPhotos(data);
    } catch (e: any) {
      console.error(e);
      if (e.message && e.message.includes("CHUA_DANG_NHAP")) {
        setErrorMessage("Chưa đăng nhập Telegram cá nhân. Vui lòng bấm Cài đặt và nhập SĐT.");
      } else {
        setErrorMessage(e.message || "Lỗi tải ảnh từ Telegram");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (config.isLoggedIn || config.sessionString) {
      loadPhotos();
    }
  }, [config.apiId, config.apiHash, config.sessionString, config.isLoggedIn]);

  // Lọc ảnh theo Filter và Search Query
  const filteredPhotos = useMemo(() => {
    let list = [...photos];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.author?.toLowerCase().includes(q) ||
          p.caption?.toLowerCase().includes(q)
      );
    }

    if (activeFilter === "Hôm nay") {
      const today = new Date().toDateString();
      list = list.filter((p) => p.date.toDateString() === today);
    } else if (activeFilter === "Tuần này") {
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      list = list.filter((p) => p.date.getTime() >= sevenDaysAgo);
    } else if (activeFilter === "Album") {
      list = list.filter((p) => p.isCarousel);
    }

    return list;
  }, [photos, activeFilter, searchQuery]);

  // Gom nhóm ảnh theo ngày (Apple Photos format)
  const groupedPhotos: DateGroup[] = useMemo(() => {
    const map = new Map<string, PhotoItem[]>();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    filteredPhotos.forEach((photo) => {
      const dStr = photo.date.toDateString();
      let title = "";
      if (dStr === today) {
        title = "Hôm nay";
      } else if (dStr === yesterday) {
        title = "Hôm qua";
      } else {
        title = photo.date.toLocaleDateString("vi-VN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }

      if (!map.has(title)) {
        map.set(title, []);
      }
      map.get(title)!.push(photo);
    });

    return Array.from(map.entries()).map(([dateTitle, pList]) => ({
      dateTitle,
      photos: pList,
    }));
  }, [filteredPhotos]);

  const handleSaveConfig = (newCfg: TelegramConfig) => {
    setConfig(newCfg);
    saveStoredConfig(newCfg);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-600">
      {/* Top Header */}
      <Header
        photoCount={filteredPhotos.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Main Content Area */}
      <main className="max-w-md mx-auto min-h-[calc(100vh-140px)]">
        {/* Banner Chưa đăng nhập Telegram */}
        {!config.isLoggedIn && (
          <div
            onClick={() => setIsSettingsOpen(true)}
            className="mx-4 mt-3 mb-2 p-3.5 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/40 rounded-2xl flex items-center justify-between cursor-pointer active:scale-98 transition-transform shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Chưa đăng nhập Telegram</div>
                <div className="text-[11px] text-blue-200 mt-0.5">
                  Bấm vào đây để nhập SĐT & nhận mã OTP kết nối kênh
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-300 shrink-0" />
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="mx-4 my-2 p-3 bg-red-950/70 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={loadPhotos}
              className="ml-2 px-2.5 py-1 bg-red-900/80 rounded-lg text-white font-medium active:bg-red-800 shrink-0"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Tab Tìm kiếm (Search) */}
        {currentTab === "search" && (
          <div className="p-4 animate-in fade-in duration-200">
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm theo tác giả @username hoặc caption..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <PhotoGrid
              groups={groupedPhotos}
              onSelectPhoto={(p) => setSelectedPhoto(p)}
            />
          </div>
        )}

        {/* Tab Album */}
        {currentTab === "albums" && (
          <div className="p-4 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-500" />
              Bộ sưu tập Album
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div
                onClick={() => {
                  setActiveFilter("Album");
                  setCurrentTab("library");
                }}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 cursor-pointer active:scale-98 transition-transform"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                  <Folder className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-white">Carousels</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Các bài viết nhiều ảnh
                </p>
              </div>

              <div
                onClick={() => {
                  setActiveFilter("Tất cả");
                  setCurrentTab("library");
                }}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 cursor-pointer active:scale-98 transition-transform"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-white">Gần đây</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Tất cả bài lưu</p>
              </div>
            </div>
            <PhotoGrid
              groups={groupedPhotos}
              onSelectPhoto={(p) => setSelectedPhoto(p)}
            />
          </div>
        )}

        {/* Tab Kỷ niệm (Memories) */}
        {currentTab === "memories" && (
          <div className="p-4 text-center py-20 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Khoảnh Khắc Đẹp</h2>
            <p className="text-sm text-neutral-400 max-w-xs mx-auto">
              Các bức ảnh được chọn lọc từ Instagram qua Telegram lưu trữ tự động của bạn.
            </p>
          </div>
        )}

        {/* Tab Thư viện (Library) - Mặc định */}
        {currentTab === "library" && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-10 gap-2 text-neutral-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang tải ảnh từ Telegram...</span>
              </div>
            )}
            <PhotoGrid
              groups={groupedPhotos}
              onSelectPhoto={(p) => setSelectedPhoto(p)}
            />
          </>
        )}
      </main>

      {/* Floating Reload Button */}
      <button
        onClick={loadPhotos}
        disabled={loading}
        className="fixed right-4 bottom-20 z-20 w-11 h-11 rounded-full bg-blue-600 active:bg-blue-700 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform active:scale-95"
        title="Làm mới ảnh"
      >
        <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
      </button>

      {/* iOS Bottom TabBar */}
      <TabBar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Fullscreen Photo Viewer Modal */}
      {selectedPhoto && (
        <PhotoViewer
          photo={selectedPhoto}
          allPhotos={filteredPhotos}
          config={config}
          onClose={() => setSelectedPhoto(null)}
          onSelectPhoto={(p) => setSelectedPhoto(p)}
        />
      )}

      {/* Telegram MTProto Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
      />
    </div>
  );
};

export default App;
