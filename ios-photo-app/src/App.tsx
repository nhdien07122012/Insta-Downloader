import React, { useState, useEffect, useMemo } from "react";
import type { PhotoItem, DateGroup, TelegramConfig, PostAlbum } from "./types";
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
import { AddPhotoModal } from "./components/AddPhotoModal";
import { App as CapApp } from "@capacitor/app";
import { Clipboard } from "@capacitor/clipboard";
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
  Plus,
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

  // Lắng nghe Deep Link & Kiểm tra Clipboard
  useEffect(() => {
    try {
      CapApp.addListener("appUrlOpen", (data) => {
        if (!data.url) return;
        let target = "";
        if (data.url.includes("url=")) {
          target = decodeURIComponent(data.url.split("url=")[1]);
        } else if (data.url.includes("instagram.com")) {
          const match = data.url.match(/https?:\/\/[^\s"']+/i);
          if (match) {
            target = match[0];
          } else {
            const idx = data.url.indexOf("instagram.com");
            target = "https://" + data.url.slice(idx);
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
        if (
          value &&
          (value.includes("instagram.com/p/") ||
            value.includes("instagram.com/reel/") ||
            value.includes("instagram.com/share/"))
        ) {
          const lastProcessed = localStorage.getItem("last_clipboard_insta");
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

  const loadPhotos = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await fetchChannelPhotos(config, 80);
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

  // Phân loại các bài viết thành từng Album theo link Instagram / groupedId
  const postAlbums: PostAlbum[] = useMemo(() => {
    const map = new Map<string, PhotoItem[]>();

    photos.forEach((p) => {
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

    if (activeFilter === "Hôm nay") {
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
    <div className="min-h-screen bg-[#070709] text-white font-sans selection:bg-blue-600 relative overflow-x-hidden">
      {/* Liquid Glass Dynamic Ambient Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-pink-600/15 rounded-full blur-[100px]" />
      </div>

      {/* Top Header */}
      <Header
        photoCount={filteredPhotos.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeFilter={activeFilter}
        onFilterChange={(f) => {
          setActiveFilter(f);
          if (currentTab !== "library") setCurrentTab("library");
        }}
      />

      {/* Main Content Area */}
      <main className="max-w-md mx-auto min-h-[calc(100vh-140px)] relative z-10">
        {/* Banner Phát hiện link Instagram từ Clipboard */}
        {clipboardPrompt && (
          <div className="mx-4 mt-3 mb-2 p-4 liquid-glass-card border border-pink-500/40 rounded-3xl flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-300">
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                <span className="w-5 h-5 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span>Phát hiện liên kết Instagram</span>
              </div>
              <p className="text-xs text-pink-200/90 truncate pl-7">{clipboardPrompt}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  localStorage.setItem("last_clipboard_insta", clipboardPrompt);
                  setClipboardPrompt(null);
                }}
                className="text-xs text-neutral-400 px-3 py-2 rounded-xl hover:text-white active:bg-white/5 transition-colors"
              >
                Bỏ qua
              </button>
              <button
                onClick={() => {
                  localStorage.setItem("last_clipboard_insta", clipboardPrompt);
                  setAddUrl(clipboardPrompt);
                  setClipboardPrompt(null);
                  setIsAddModalOpen(true);
                }}
                className="text-xs font-bold bg-white text-purple-950 px-3.5 py-2 rounded-2xl active:scale-95 shadow-lg transition-transform"
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
            className="mx-4 mt-3 mb-2 p-4 liquid-glass-card border border-blue-500/40 rounded-3xl flex items-center justify-between cursor-pointer active:scale-98 transition-all shadow-xl"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Chưa đăng nhập Telegram</div>
                <div className="text-xs text-blue-200/90 mt-0.5 leading-snug">
                  Chạm để nhập SĐT & nhận mã OTP kết nối kho ảnh
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-300 shrink-0 mr-1" />
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="mx-4 my-2.5 p-3.5 liquid-glass-card border border-red-500/40 rounded-2xl text-xs text-red-300 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button
              onClick={loadPhotos}
              className="ml-2 px-3 py-1.5 bg-red-900/70 border border-red-700/60 rounded-xl text-white font-semibold active:scale-95 transition-transform shrink-0"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* TAB 1: THƯ VIỆN (LIBRARY) */}
        {currentTab === "library" && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-10 gap-2.5 text-neutral-400 text-sm">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                <span className="font-medium">Đang đồng bộ ảnh từ Telegram...</span>
              </div>
            )}

            {activeFilter === "Yêu thích" && filteredPhotos.length === 0 && !loading && (
              <div className="p-8 text-center my-12 mx-4 liquid-glass-card rounded-3xl border border-white/10 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-3.5 shadow-lg">
                  <Heart className="w-8 h-8 fill-red-500/30 text-red-400" />
                </div>
                <h3 className="font-bold text-lg mb-1 text-white">Chưa có ảnh yêu thích</h3>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                  Hãy mở bất kỳ bức ảnh nào và chạm vào biểu tượng trái tim để thêm vào đây.
                </p>
              </div>
            )}

            <PhotoGrid
              groups={groupedPhotos}
              onSelectPhoto={(p) => setSelectedPhoto(p)}
            />
          </>
        )}

        {/* TAB 2: TÌM KIẾM (SEARCH) */}
        {currentTab === "search" && (
          <div className="p-4 animate-in fade-in duration-200">
            <div className="relative mb-4">
              <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Tìm theo @username hoặc caption..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full liquid-glass-card rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-400 border border-white/15 focus:outline-none focus:border-blue-400 transition-colors shadow-inner"
              />
            </div>
            <PhotoGrid
              groups={groupedPhotos}
              onSelectPhoto={(p) => setSelectedPhoto(p)}
            />
          </div>
        )}

        {/* TAB 3: ALBUMS (BỘ SƯU TẬP THEO BÀI VIẾT / LINK TẢI) */}
        {currentTab === "albums" && (
          <div className="p-4 pb-36 animate-in fade-in duration-200">
            {selectedAlbum ? (
              /* Giao diện xem chi tiết 1 Album cụ thể */
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <button
                    onClick={() => setSelectedAlbum(null)}
                    className="flex items-center liquid-glass-pill rounded-full px-3.5 py-1.5 text-blue-400 text-sm font-semibold active:scale-95 transition-all -ml-1"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    <span>Tất cả Album</span>
                  </button>
                  <span className="text-xs text-white/80 font-medium px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
                    {selectedAlbum.photos.length} bức ảnh
                  </span>
                </div>

                <div className="mb-4 liquid-glass-card rounded-3xl p-4 border border-white/15 shadow-xl">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedAlbum.title}
                  </h2>
                  <p className="text-xs text-neutral-300 mt-1.5 flex items-center gap-1.5">
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
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-pink-400 underline font-semibold active:opacity-70"
                    >
                      <span>Xem bài viết gốc trên Instagram</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {selectedAlbum.photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className="aspect-square rounded-2xl bg-neutral-900 border border-white/10 overflow-hidden cursor-pointer active:scale-95 transition-all shadow-sm"
                    >
                      <img
                        src={photo.thumbnailUrl || photo.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Danh sách tổng thể các Albums */
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2.5 text-white">
                  <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <Folder className="w-5 h-5" />
                  </span>
                  Bộ sưu tập Album
                </h2>

                {/* Danh mục đặc biệt */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {/* Mục Yêu Thích */}
                  <div
                    onClick={() => {
                      setActiveFilter("Yêu thích");
                      setCurrentTab("library");
                    }}
                    className="liquid-glass-card rounded-3xl p-5 border border-white/15 cursor-pointer active:scale-95 transition-all shadow-xl group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-500 flex items-center justify-center mb-3 shadow-inner group-hover:scale-105 transition-transform">
                      <Heart className="w-6 h-6 fill-red-500" />
                    </div>
                    <h3 className="font-bold text-base text-white">Yêu thích</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      {favorites.size} ảnh đã lưu
                    </p>
                  </div>

                  {/* Bài viết nhiều ảnh (Carousels) */}
                  <div
                    onClick={() => {
                      setActiveFilter("Album");
                      setCurrentTab("library");
                    }}
                    className="liquid-glass-card rounded-3xl p-5 border border-white/15 cursor-pointer active:scale-95 transition-all shadow-xl group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-3 shadow-inner group-hover:scale-105 transition-transform">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-base text-white">Carousels</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      {postAlbums.filter((a) => a.photos.length > 1).length} bài viết
                    </p>
                  </div>
                </div>

                {/* Danh sách các Album theo Link tải Instagram */}
                <div className="mb-3.5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-200">
                    Album theo bài viết ({postAlbums.length})
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {postAlbums.map((album) => (
                    <div
                      key={album.id}
                      onClick={() => setSelectedAlbum(album)}
                      className="liquid-glass-card rounded-3xl overflow-hidden border border-white/15 cursor-pointer active:scale-95 transition-all group shadow-xl"
                    >
                      <div className="aspect-square relative overflow-hidden bg-neutral-900 rounded-t-2xl">
                        <img
                          src={album.coverPhoto.thumbnailUrl || album.coverPhoto.url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 text-[11px] font-bold text-white border border-white/20 shadow-md">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          <span>{album.photos.length}</span>
                        </div>
                      </div>
                      <div className="p-3.5">
                        <h4 className="font-bold text-sm text-white truncate">
                          {album.title}
                        </h4>
                        <p className="text-xs text-neutral-400 mt-0.5">
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
          <div className="p-4 pb-36 space-y-6 animate-in fade-in duration-200">
            {/* Header Kỷ niệm */}
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2.5 text-white">
                <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Sparkles className="w-5 h-5" />
                </span>
                Dành Cho Bạn
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Các khoảnh khắc và bộ sưu tập được gợi ý tự động
              </p>
            </div>

            {/* Hero Card: Kỷ niệm nổi bật */}
            {photos.length > 0 && (
              <div
                onClick={() => setSelectedPhoto(photos[0])}
                className="relative h-72 rounded-3xl overflow-hidden cursor-pointer shadow-2xl border border-white/20 active:scale-98 transition-all group"
              >
                <img
                  src={photos[0].url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-5">
                  <span className="px-3 py-1 bg-purple-600/80 border border-purple-400/40 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white w-fit mb-2 shadow-lg">
                    Khoảnh khắc mới nhất
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
                <h3 className="text-sm font-bold text-neutral-200 mb-3.5 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  Tác giả lưu trữ nhiều nhất
                </h3>
                <div className="flex gap-3.5 overflow-x-auto pb-2 no-scrollbar">
                  {featuredCreators.map((creator) => (
                    <div
                      key={creator.author}
                      onClick={() => {
                        setSearchQuery(creator.author);
                        setCurrentTab("search");
                      }}
                      className="flex flex-col items-center shrink-0 w-20 cursor-pointer active:scale-95 transition-all"
                    >
                      <div className="w-18 h-18 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 mb-2 shadow-xl">
                        <img
                          src={creator.cover}
                          alt=""
                          className="w-full h-full object-cover rounded-full bg-neutral-900"
                        />
                      </div>
                      <p className="text-xs font-bold text-white truncate w-full text-center">
                        @{creator.author}
                      </p>
                      <span className="text-[11px] text-neutral-400">
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
                <h3 className="text-sm font-bold text-neutral-200 mb-3 flex items-center gap-2">
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
                        className="p-3.5 liquid-glass-card rounded-3xl border border-white/15 flex items-center gap-3.5 cursor-pointer active:scale-98 transition-all shadow-xl"
                      >
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0">
                          <img
                            src={album.coverPhoto.thumbnailUrl || album.coverPhoto.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">
                            {album.title}
                          </h4>
                          <p className="text-xs text-neutral-400 mt-0.5 truncate">
                            {album.coverPhoto.caption || "Bài viết Instagram"}
                          </p>
                          <span className="inline-block mt-1 text-[11px] text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                            {album.photos.length} ảnh
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-neutral-400 shrink-0" />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Buttons: Larger 56px and 48px sizes, easy thumb tapping */}
      <div className="fixed right-5 bottom-[92px] z-20 flex flex-col gap-3 items-end">
        {/* Nút Thêm link Instagram */}
        <button
          onClick={() => {
            setAddUrl("");
            setIsAddModalOpen(true);
          }}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white shadow-2xl shadow-pink-600/40 border-2 border-white/25 flex items-center justify-center transition-all active:scale-90"
          title="Tải ảnh mới từ Instagram"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* Nút Làm mới thư viện */}
        <button
          onClick={loadPhotos}
          disabled={loading}
          className="w-12 h-12 rounded-full liquid-glass-pill border border-white/25 active:bg-white/20 text-white shadow-xl flex items-center justify-center transition-all active:scale-90"
          title="Làm mới ảnh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin text-blue-400" : ""}`} />
        </button>
      </div>

      {/* iOS Bottom TabBar */}
      <TabBar currentTab={currentTab} onTabChange={setCurrentTab} />

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
          onToggleFavorite={toggleFavorite}
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
