import React, { useState, useEffect, useMemo, useRef } from "react";
import type { PhotoItem, DateGroup, TelegramConfig, PostAlbum } from "./types";
import {
  getStoredConfig,
  saveStoredConfig,
  fetchChannelPhotos,
  deleteTelegramPhoto,
  deleteTelegramPhotos,
} from "./services/telegramClient";
import {
  getCachedPhotosFromDB,
  removePhotoFromCache,
  removePhotosFromCache,
} from "./services/photoStorage";
import { Header } from "./components/Header";
import { PhotoGrid } from "./components/PhotoGrid";
import { PhotoViewer } from "./components/PhotoViewer";
import { TabBar } from "./components/TabBar";
import { SettingsModal } from "./components/SettingsModal";
import { AddPhotoModal } from "./components/AddPhotoModal";
import { App as CapApp } from "@capacitor/app";
import { Clipboard } from "@capacitor/clipboard";
import { Share } from "@capacitor/share";
import {
  RefreshCw,
  Search,
  Folder,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Heart,
  Layers,
  ExternalLink,
  ChevronLeft,
  User,
  Calendar,
  Video,
  Share2,
  Trash2,
} from "lucide-react";

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
  const [selectedAlbum, setSelectedAlbum] = useState<PostAlbum | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [clipboardPrompt, setClipboardPrompt] = useState<string | null>(null);

  // Multi-Photo Selection & Batch Deletion State (Chuẩn Apple Photos)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string | number>>(new Set());
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleEnterSelectionMode = (initialPhotoId?: string | number) => {
    setIsSelectionMode(true);
    if (initialPhotoId !== undefined) {
      setSelectedPhotoIds(new Set([initialPhotoId]));
    } else {
      setSelectedPhotoIds(new Set());
    }
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedPhotoIds(new Set());
  };

  const handleToggleSelectPhoto = (photoId: string | number) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
        if (navigator.vibrate) {
          try {
            navigator.vibrate(25);
          } catch {}
        }
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPhotoIds.size === filteredPhotos.length) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(filteredPhotos.map((p) => p.id)));
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedPhotoIds.size === 0) return;
    setIsBatchDeleting(true);

    try {
      const targets = photos.filter((p) => selectedPhotoIds.has(p.id));
      const messageIds = Array.from(new Set(targets.map((p) => p.messageId)));

      // 1. Xóa khỏi IndexedDB bộ nhớ đệm
      await removePhotosFromCache(messageIds);

      // 2. Cập nhật giao diện ngay lập tức
      setPhotos((prev) => prev.filter((p) => !selectedPhotoIds.has(p.id)));

      // 3. Xóa tin nhắn ảnh trên Kênh Telegram
      await deleteTelegramPhotos(config, messageIds);

      showToast(`Đã xóa thành công ${targets.length} ảnh! 🗑️`);
    } catch (err) {
      console.warn("Lỗi khi xóa hàng loạt ảnh:", err);
      showToast("Có lỗi xảy ra khi xóa ảnh!");
    } finally {
      setIsBatchDeleting(false);
      setIsBatchDeleteModalOpen(false);
      setIsSelectionMode(false);
      setSelectedPhotoIds(new Set());
    }
  };

  const handleShareSelected = async () => {
    if (selectedPhotoIds.size === 0) return;
    const targets = photos.filter((p) => selectedPhotoIds.has(p.id));
    const urls = targets.map((p) => p.url).join("\n");

    try {
      await Share.share({
        title: `Chia sẻ ${targets.length} ảnh`,
        text: `Bộ sưu tập ${targets.length} ảnh từ Telegram`,
        url: targets[0]?.url,
        dialogTitle: `Chia sẻ ${targets.length} ảnh`,
      });
    } catch {
      try {
        await Clipboard.write({ string: urls });
        showToast(`Đã sao chép liên kết ${targets.length} ảnh!`);
      } catch {}
    }
  };

  // Pull-to-Refresh State
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const handleRefresh = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage("");

    try {
      // Tải danh sách ảnh mới nhất từ Kênh Telegram về máy
      await loadPhotos(false);
    } catch (err: any) {
      console.warn("Lỗi khi tải ảnh mới từ Telegram:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 5 && !loading) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    } else {
      touchStartY.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || loading) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0 && window.scrollY <= 5) {
      const damped = Math.min(Math.pow(diff, 0.85) * 1.8, 85);
      setPullDistance(damped);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (touchStartY.current === null) return;
    setIsPulling(false);
    touchStartY.current = null;
    if (pullDistance >= 55 && !loading) {
      setPullDistance(55);
      await handleRefresh();
    }
    setPullDistance(0);
  };

  // Lắng nghe Deep Link & Kiểm tra Clipboard
  useEffect(() => {
    try {
      CapApp.addListener("appUrlOpen", (data) => {
        if (!data.url) return;
        let target = "";
        if (data.url.includes("url=")) {
          target = decodeURIComponent(data.url.split("url=")[1]);
        } else if (
          data.url.includes("instagram.com") ||
          data.url.includes("twitter.com") ||
          data.url.includes("x.com")
        ) {
          const match = data.url.match(/https?:\/\/[^\s"']+/i);
          if (match) {
            target = match[0];
          } else {
            const idx = Math.max(
              data.url.indexOf("instagram.com"),
              data.url.indexOf("twitter.com"),
              data.url.indexOf("x.com")
            );
            if (idx >= 0) target = "https://" + data.url.slice(idx);
          }
        }

        if (target) {
          setAddUrl(target);
          setIsAddModalOpen(true);
        }
      });
    } catch {}

    const checkClipboard = async () => {
      try {
        const { value } = await Clipboard.read();
        const isMediaLink =
          value &&
          (value.includes("instagram.com/p/") ||
            value.includes("instagram.com/reel/") ||
            value.includes("instagram.com/share/") ||
            value.includes("twitter.com/") ||
            value.includes("x.com/"));
        if (isMediaLink) {
          const lastProcessed = localStorage.getItem("last_clipboard_media");
          if (lastProcessed !== value.trim()) {
            setAddUrl(value.trim());
            setIsAddModalOpen(true);
            setClipboardPrompt(value.trim());
          }
        }
      } catch {}
    };

    checkClipboard();

    try {
      CapApp.addListener("appStateChange", (state) => {
        if (state.isActive) {
          checkClipboard();
        }
      });
    } catch {}
  }, []);

  // Danh sách ảnh yêu thích lưu trong LocalStorage
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("insta_favorites");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem("insta_favorites", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // Giai đoạn 1: Đọc ảnh từ IndexedDB hiển thị tức thì (< 50ms)
  useEffect(() => {
    getCachedPhotosFromDB().then((cached) => {
      if (cached && cached.length > 0) {
        setPhotos(cached);
      }
    });
  }, []);

  const loadPhotos = async (isBackground = false) => {
    // Chỉ bật vòng xoay loading nếu chưa có ảnh nào trong máy
    if (!isBackground && photos.length === 0) {
      setLoading(true);
    }
    setErrorMessage("");
    try {
      const data = await fetchChannelPhotos(config, 80);
      setPhotos(data);
    } catch (e: any) {
      console.error(e);
      if (e.message && e.message.includes("CHUA_DANG_NHAP")) {
        setErrorMessage("Chưa đăng nhập Telegram cá nhân. Vui lòng bấm Cài đặt và nhập SĐT.");
      } else {
        if (photos.length === 0) {
          setErrorMessage(e.message || "Lỗi tải ảnh từ Telegram");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (config.isLoggedIn || config.sessionString) {
      // Mở app: Đồng bộ ngầm ảnh mới từ Telegram
      loadPhotos(true);
    }
  }, [config.apiId, config.apiHash, config.sessionString, config.isLoggedIn]);

  // Phân loại các bài viết thành từng Album theo link Instagram / groupedId
  const postAlbums: PostAlbum[] = useMemo(() => {
    const map = new Map<string, PhotoItem[]>();

    photos.forEach((p) => {
      // Nhóm theo link bài viết gốc hoặc groupedId Telegram
      const key =
        p.originalUrl ||
        (p.groupedId ? `group-${p.groupedId}` : `single-${p.messageId}`);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(p);
    });

    const albums: PostAlbum[] = [];
    map.forEach((items, key) => {
      const first = items[0];
      let title = "";
      if (first.author) {
        title = `@${first.author}`;
      } else if (first.caption) {
        title = first.caption.slice(0, 35) + "...";
      } else {
        title = `Bài viết ${first.date.toLocaleDateString("vi-VN")}`;
      }

      albums.push({
        id: key,
        title,
        originalUrl: first.originalUrl,
        author: first.author || "Instagram",
        date: first.date,
        coverPhoto: first,
        photos: items,
      });
    });

    return albums.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [photos]);

  // Danh sách tác giả nổi bật cho tab Kỷ niệm
  const featuredCreators = useMemo(() => {
    const map = new Map<string, { count: number; cover: string }>();
    photos.forEach((p) => {
      if (!p.author) return;
      const prev = map.get(p.author) || { count: 0, cover: p.url };
      map.set(p.author, { count: prev.count + 1, cover: prev.cover });
    });
    return Array.from(map.entries())
      .map(([author, info]) => ({ author, ...info }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [photos]);

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

    if (activeFilter === "Video") {
      list = list.filter((p) => p.mediaType === "video");
    } else if (activeFilter === "Hôm nay") {
      const today = new Date().toDateString();
      list = list.filter((p) => p.date.toDateString() === today);
    } else if (activeFilter === "Tuần này") {
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      list = list.filter((p) => p.date.getTime() >= sevenDaysAgo);
    } else if (activeFilter === "Yêu thích") {
      list = list.filter(
        (p) =>
          favorites.has(String(p.id)) || favorites.has(String(p.messageId))
      );
    } else if (activeFilter === "Album") {
      list = list.filter((p) => p.isCarousel);
    }

    return list;
  }, [photos, activeFilter, searchQuery, favorites]);

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
        onFilterChange={(f) => {
          setActiveFilter(f);
          if (currentTab !== "library") setCurrentTab("library");
        }}
        onRefresh={handleRefresh}
        isRefreshing={loading}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedPhotoIds.size}
        onToggleSelectionMode={() => {
          if (isSelectionMode) handleExitSelectionMode();
          else handleEnterSelectionMode();
        }}
        onSelectAll={handleSelectAll}
        allSelected={filteredPhotos.length > 0 && selectedPhotoIds.size === filteredPhotos.length}
      />

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-neutral-900/95 border border-cyan-500/40 text-cyan-300 text-xs font-semibold rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area with Pull-To-Refresh */}
      <main
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="max-w-md mx-auto min-h-[calc(100vh-140px)]"
      >
        {/* Pull-To-Refresh Indicator */}
        <div
          style={{
            height: `${pullDistance}px`,
            transition: isPulling ? "none" : "height 0.25s cubic-bezier(0.2, 0, 0, 1)",
          }}
          className="overflow-hidden flex items-center justify-center pointer-events-none"
        >
          <div className="flex items-center gap-2 py-2 text-xs font-semibold text-neutral-300">
            <RefreshCw
              style={{
                transform: `rotate(${pullDistance * 4}deg)`,
              }}
              className={`w-4 h-4 text-cyan-400 ${
                pullDistance >= 55 || loading ? "animate-spin" : ""
              }`}
            />
            <span>
              {pullDistance >= 55 || loading
                ? "Đang làm mới ảnh từ Telegram..."
                : "Kéo xuống để làm mới ảnh"}
            </span>
          </div>
        </div>
        {/* Banner Phát hiện link Instagram hoặc Twitter (X) từ Clipboard */}
        {clipboardPrompt && (
          <div className="mx-4 mt-3 mb-2 p-3.5 bg-gradient-to-r from-purple-950/90 via-pink-950/90 to-neutral-900 border border-pink-500/40 rounded-2xl flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-300">
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Phát hiện liên kết Instagram / Twitter (X)</span>
              </div>
              <p className="text-[11px] text-pink-200 truncate">{clipboardPrompt}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  localStorage.setItem("last_clipboard_media", clipboardPrompt);
                  setClipboardPrompt(null);
                }}
                className="text-[11px] text-neutral-400 px-2 py-1.5 hover:text-white active:opacity-60"
              >
                Bỏ qua
              </button>
              <button
                onClick={() => {
                  localStorage.setItem("last_clipboard_media", clipboardPrompt);
                  setAddUrl(clipboardPrompt);
                  setClipboardPrompt(null);
                  setIsAddModalOpen(true);
                }}
                className="text-xs font-semibold bg-white text-purple-950 px-3 py-1.5 rounded-xl active:bg-neutral-200 shadow"
              >
                Tải ngay
              </button>
            </div>
          </div>
        )}

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
              onClick={() => loadPhotos(false)}
              className="ml-2 px-2.5 py-1 bg-red-900/80 rounded-lg text-white font-medium active:bg-red-800 shrink-0"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* TAB 1: THƯ VIỆN (LIBRARY) */}
        {currentTab === "library" && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-10 gap-2 text-neutral-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang tải ảnh từ Telegram...</span>
              </div>
            )}

            {activeFilter === "Yêu thích" && filteredPhotos.length === 0 && !loading && (
              <div className="p-8 text-center my-12">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-8 h-8 fill-red-500/30" />
                </div>
                <h3 className="font-semibold text-base mb-1">Chưa có ảnh yêu thích</h3>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  Hãy mở bất kỳ bức ảnh nào và chạm vào biểu tượng trái tim để thêm vào đây.
                </p>
              </div>
            )}

            <PhotoGrid
              groups={groupedPhotos}
              onSelectPhoto={(p) => setSelectedPhoto(p)}
              isSelectionMode={isSelectionMode}
              selectedPhotoIds={selectedPhotoIds}
              onToggleSelectPhoto={handleToggleSelectPhoto}
              onLongPressPhoto={(p) => handleEnterSelectionMode(p.id)}
            />
          </>
        )}

        {/* TAB 2: TÌM KIẾM (SEARCH) */}
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
              isSelectionMode={isSelectionMode}
              selectedPhotoIds={selectedPhotoIds}
              onToggleSelectPhoto={handleToggleSelectPhoto}
              onLongPressPhoto={(p) => handleEnterSelectionMode(p.id)}
            />
          </div>
        )}

        {/* TAB 3: ALBUMS (BỘ SƯU TẬP THEO BÀI VIẾT / LINK TẢI) */}
        {currentTab === "albums" && (
          <div className="p-4 animate-in fade-in duration-200">
            {selectedAlbum ? (
              /* Giao diện xem chi tiết 1 Album cụ thể */
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
                  <button
                    onClick={() => setSelectedAlbum(null)}
                    className="flex items-center text-blue-400 text-sm font-medium active:opacity-70 -ml-1 py-1 pr-2"
                  >
                    <ChevronLeft className="w-5 h-5 mr-0.5" />
                    <span>Tất cả Album</span>
                  </button>
                  <span className="text-xs text-neutral-400">
                    {selectedAlbum.photos.length} bức ảnh
                  </span>
                </div>

                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedAlbum.title}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      {selectedAlbum.date.toLocaleDateString("vi-VN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                  {selectedAlbum.originalUrl && (
                    <a
                      href={selectedAlbum.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-pink-400 underline font-medium"
                    >
                      <span>Xem bài viết gốc trên Instagram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {selectedAlbum.photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className="aspect-square bg-neutral-900 overflow-hidden cursor-pointer active:opacity-80"
                    >
                      <img
                        src={photo.thumbnailUrl || photo.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Danh sách tổng thể các Albums */
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-blue-500" />
                  Bộ sưu tập Album
                </h2>

                {/* Danh mục đặc biệt */}
                <div className="grid grid-cols-3 gap-2.5 mb-6">
                  {/* Mục Yêu Thích */}
                  <div
                    onClick={() => {
                      setActiveFilter("Yêu thích");
                      setCurrentTab("library");
                    }}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 cursor-pointer active:scale-98 transition-transform"
                  >
                    <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center mb-2.5">
                      <Heart className="w-5 h-5 fill-red-500" />
                    </div>
                    <h3 className="font-semibold text-xs text-white">Yêu thích</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {favorites.size} ảnh
                    </p>
                  </div>

                  {/* Mục Video */}
                  <div
                    onClick={() => {
                      setActiveFilter("Video");
                      setCurrentTab("library");
                    }}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 cursor-pointer active:scale-98 transition-transform"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2.5">
                      <Video className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-xs text-white">Video</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {photos.filter((p) => p.mediaType === "video").length} video
                    </p>
                  </div>

                  {/* Bài viết nhiều ảnh (Carousels) */}
                  <div
                    onClick={() => {
                      setActiveFilter("Album");
                      setCurrentTab("library");
                    }}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 cursor-pointer active:scale-98 transition-transform"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2.5">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-xs text-white">Carousels</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {postAlbums.filter((a) => a.photos.length > 1).length} bài
                    </p>
                  </div>
                </div>

                {/* Danh sách các Album theo Link tải Instagram */}
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-300">
                    Album theo bài viết ({postAlbums.length})
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {postAlbums.map((album) => (
                    <div
                      key={album.id}
                      onClick={() => setSelectedAlbum(album)}
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden cursor-pointer active:scale-98 transition-transform group"
                    >
                      <div className="aspect-square relative overflow-hidden bg-neutral-800">
                        <img
                          src={album.coverPhoto.thumbnailUrl || album.coverPhoto.url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] font-semibold text-white">
                          <Layers className="w-3 h-3 text-blue-400" />
                          <span>{album.photos.length}</span>
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold text-sm text-white truncate">
                          {album.title}
                        </h4>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {album.date.toLocaleDateString("vi-VN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: KỶ NIỆM (MEMORIES) - THIẾT KẾ ĐẦY ĐỦ GỢI Ý */}
        {currentTab === "memories" && (
          <div className="p-4 space-y-6 animate-in fade-in duration-200">
            {/* Header Kỷ niệm */}
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Dành Cho Bạn
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Các khoảnh khắc và bộ sưu tập được gợi ý tự động
              </p>
            </div>

            {/* Hero Card: Kỷ niệm nổi bật */}
            {photos.length > 0 && (
              <div
                onClick={() => setSelectedPhoto(photos[0])}
                className="relative h-64 rounded-3xl overflow-hidden cursor-pointer shadow-2xl active:scale-98 transition-transform"
              >
                <img
                  src={photos[0].url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-5">
                  <span className="px-2.5 py-0.5 bg-purple-600/80 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-white w-fit mb-2">
                    Khoảnh khắc nổi bật
                  </span>
                  <h3 className="text-lg font-bold text-white leading-snug">
                    {photos[0].caption ? photos[0].caption.slice(0, 50) + "..." : "Ảnh Instagram mới nhất"}
                  </h3>
                  <p className="text-xs text-neutral-300 mt-1">
                    @{photos[0].author || "Instagram"} • {photos[0].date.toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            )}

            {/* Mục: Tác giả nổi bật */}
            {featuredCreators.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-3 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-400" />
                  Tác giả lưu trữ nhiều nhất
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {featuredCreators.map((creator) => (
                    <div
                      key={creator.author}
                      onClick={() => {
                        setSearchQuery(creator.author);
                        setCurrentTab("search");
                      }}
                      className="flex flex-col items-center shrink-0 w-20 cursor-pointer active:scale-95 transition-transform"
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 mb-1.5 shadow-md">
                        <img
                          src={creator.cover}
                          alt=""
                          className="w-full h-full object-cover rounded-full bg-neutral-900"
                        />
                      </div>
                      <p className="text-xs font-semibold text-white truncate w-full text-center">
                        @{creator.author}
                      </p>
                      <span className="text-[10px] text-neutral-400">
                        {creator.count} ảnh
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mục: Bộ sưu tập Carousels */}
            {postAlbums.filter((a) => a.photos.length > 1).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Bài viết nhiều ảnh đáng nhớ
                </h3>
                <div className="space-y-3">
                  {postAlbums
                    .filter((a) => a.photos.length > 1)
                    .slice(0, 3)
                    .map((album) => (
                      <div
                        key={album.id}
                        onClick={() => {
                          setSelectedAlbum(album);
                          setCurrentTab("albums");
                        }}
                        className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-2xl flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-800 shrink-0">
                          <img
                            src={album.coverPhoto.thumbnailUrl || album.coverPhoto.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-white truncate">
                            {album.title}
                          </h4>
                          <p className="text-xs text-neutral-400 mt-0.5 truncate">
                            {album.coverPhoto.caption || "Bài viết Instagram"}
                          </p>
                          <span className="inline-block mt-1 text-[10px] text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-md font-medium">
                            Bộ sưu tập {album.photos.length} ảnh
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* iOS Bottom Selection Bar (Chuẩn Apple Photos - Thay thế TabBar khi đang chọn nhiều ảnh) */}
      {isSelectionMode ? (
        <div
          style={{
            paddingBottom: "max(calc(var(--sab) - 10px), 12px)",
          }}
          className="fixed inset-x-0 bottom-0 z-40 px-4 flex items-center justify-center pointer-events-none animate-in slide-in-from-bottom-6 duration-200"
        >
          <div
            style={{
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
            className="pointer-events-auto w-full max-w-md flex items-center justify-between px-6 py-2.5 bg-[#18181c]/90 border border-white/15 rounded-full shadow-2xl shadow-black/90 min-h-[56px]"
          >
            {/* Nút Chia sẻ các ảnh đã chọn */}
            <button
              onClick={handleShareSelected}
              disabled={selectedPhotoIds.size === 0}
              className="p-2 text-blue-400 active:opacity-60 disabled:opacity-30 disabled:text-neutral-500 transition-all rounded-full hover:bg-white/5"
              title="Chia sẻ ảnh đã chọn"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Số lượng ảnh đã chọn */}
            <span className="text-xs font-semibold text-neutral-200">
              {selectedPhotoIds.size > 0
                ? `Đã chọn ${selectedPhotoIds.size} ảnh`
                : "Chạm vào ảnh để chọn"}
            </span>

            {/* Nút Xóa hàng loạt */}
            <button
              onClick={() => setIsBatchDeleteModalOpen(true)}
              disabled={selectedPhotoIds.size === 0}
              className="p-2 text-red-500 active:scale-90 disabled:opacity-30 disabled:text-neutral-500 transition-all rounded-full hover:bg-red-500/10"
              title="Xóa các ảnh đã chọn"
            >
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>
      ) : (
        /* iOS Bottom TabBar bình thường */
        <TabBar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAddPhoto={() => {
            setAddUrl("");
            setIsAddModalOpen(true);
          }}
        />
      )}

      {/* Modal Xác nhận Xóa Hàng Loạt Ảnh (Chuẩn iOS ActionSheet) */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/40 text-red-400 flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Xóa {selectedPhotoIds.size} ảnh đã chọn?
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed px-2">
                Các ảnh này sẽ bị xóa vĩnh viễn khỏi Kênh Telegram và bộ nhớ thiết bị. Thao tác này không thể hoàn tác.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirmBatchDelete}
                disabled={isBatchDeleting}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-900/30"
              >
                {isBatchDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xóa {selectedPhotoIds.size} ảnh...</span>
                  </>
                ) : (
                  <span>Xóa {selectedPhotoIds.size} ảnh</span>
                )}
              </button>
              <button
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isBatchDeleting}
                className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 text-xs font-medium rounded-xl transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tải Ảnh Từ Instagram */}
      <AddPhotoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        config={config}
        initialUrl={addUrl}
        onSuccess={loadPhotos}
      />

      {/* Fullscreen Photo Viewer Modal */}
      {selectedPhoto && (
        <PhotoViewer
          photo={selectedPhoto}
          allPhotos={selectedAlbum ? selectedAlbum.photos : filteredPhotos}
          config={config}
          isFavorite={
            favorites.has(String(selectedPhoto.id)) ||
            favorites.has(String(selectedPhoto.messageId))
          }
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onClose={() => setSelectedPhoto(null)}
          onSelectPhoto={(p) => setSelectedPhoto(p)}
          onDeletePhoto={async (messageId) => {
            await removePhotoFromCache(messageId);
            setPhotos((prev) => prev.filter((p) => p.messageId !== messageId));
            await deleteTelegramPhoto(config, messageId);
          }}
        />
      )}

      {/* Telegram MTProto Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
        onCacheCleared={() => setPhotos([])}
      />
    </div>
  );
};

export default App;
