import React, { useState, useEffect, useRef } from "react";
import type { PhotoItem, TelegramConfig } from "../types";
import {
  ChevronLeft,
  Share2,
  Heart,
  Info,
  Download,
  ExternalLink,
  X,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Share } from "@capacitor/share";
import { fetchFullResolutionPhoto } from "../services/telegramClient";

interface PhotoViewerProps {
  photo: PhotoItem | null;
  allPhotos: PhotoItem[];
  config: TelegramConfig;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
  onSelectPhoto: (p: PhotoItem) => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo,
  allPhotos,
  config,
  isFavorite,
  onToggleFavorite,
  onClose,
  onSelectPhoto,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [hdUrl, setHdUrl] = useState<string | null>(null);
  const [loadingHd, setLoadingHd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ dist: number; scale: number; x: number; y: number; touches: number }>({
    dist: 0,
    scale: 1,
    x: 0,
    y: 0,
    touches: 0,
  });
  const lastTapRef = useRef<number>(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  // Reset zoom & pan when switching photo
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    let active = true;
    setHdUrl(null);
    if (!photo) return;

    setLoadingHd(true);
    fetchFullResolutionPhoto(config, photo.messageId).then((url) => {
      if (active && url) {
        setHdUrl(url);
      }
      if (active) setLoadingHd(false);
    });

    return () => {
      active = false;
    };
  }, [photo?.id, photo?.messageId]);

  if (!photo) return null;

  const currentIndex = allPhotos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1;

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (hasPrev) onSelectPhoto(allPhotos[currentIndex - 1]);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (hasNext) onSelectPhoto(allPhotos[currentIndex + 1]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, hasPrev, hasNext]);

  // Touch Handlers for Pinch to Zoom & Pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 fingers: Pinch to zoom
      setIsGesturing(true);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = {
        dist,
        scale,
        x: position.x,
        y: position.y,
        touches: 2,
      };
    } else if (e.touches.length === 1) {
      // 1 finger: Check for double tap or pan
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap: toggle zoom 1x <-> 2.5x
        if (scale > 1.1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        } else {
          setScale(2.5);
          setPosition({ x: 0, y: 0 });
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (scale > 1) {
        setIsGesturing(true);
        touchStartRef.current = {
          dist: 0,
          scale,
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
          touches: 1,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current.touches === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartRef.current.dist > 0) {
        const factor = dist / touchStartRef.current.dist;
        const newScale = Math.min(Math.max(touchStartRef.current.scale * factor, 0.9), 4.5);
        setScale(newScale);
      }
    } else if (e.touches.length === 1 && scale > 1) {
      e.preventDefault();
      const newX = e.touches[0].clientX - touchStartRef.current.x;
      const newY = e.touches[0].clientY - touchStartRef.current.y;
      const maxOffset = 250 * (scale - 1);
      setPosition({
        x: Math.min(Math.max(newX, -maxOffset), maxOffset),
        y: Math.min(Math.max(newY, -maxOffset * 1.5), maxOffset * 1.5),
      });
    }
  };

  const handleTouchEnd = () => {
    setIsGesturing(false);
    if (scale < 1.05) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  // Tải ảnh về máy iPhone (Hỗ trợ iOS Camera Roll)
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    showToast("Đang chuẩn bị ảnh chất lượng cao...");

    try {
      const targetUrl = hdUrl || photo.url;
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `instagram_${photo.author || "photo"}_${Date.now()}.jpg`,
        { type: "image/jpeg" }
      );

      // Cách 1: Native Web Share File (Mở menu iOS chứa nút 'Lưu hình ảnh' vào Thư viện)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Lưu vào Thư viện ảnh",
        });
        showToast("👉 Chọn 'Lưu hình ảnh' để lưu vào Thư viện iPhone");
        return;
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Share download error:", err);
      }
    }

    // Cách 2: Browser download fallback (trình duyệt máy tính hoặc Android)
    try {
      const a = document.createElement("a");
      a.href = hdUrl || photo.url;
      a.download = `instagram_${photo.author || "photo"}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Đã tải ảnh về máy");
    } catch {
      showToast("Mẹo: Nhấn giữ vào ảnh và chọn 'Lưu vào Ảnh'");
    }
  };

  // Chia sẻ ảnh (Native iOS Share Sheet)
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Chia sẻ File ảnh qua Web Share API
    try {
      const targetUrl = hdUrl || photo.url;
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `instagram_${photo.author || "photo"}.jpg`,
        { type: "image/jpeg" }
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ảnh từ @${photo.author || "Instagram"}`,
          text: photo.caption,
        });
        return;
      }
    } catch {}

    // 2. Chia sẻ link qua Capacitor Native Share
    try {
      await Share.share({
        title: `Ảnh từ @${photo.author || "Instagram"}`,
        text: photo.caption || "Ảnh từ Instagram",
        url: photo.originalUrl || undefined,
        dialogTitle: "Chia sẻ ảnh",
      });
      return;
    } catch {}

    // 3. Sao chép link nếu không mở được share
    if (photo.originalUrl) {
      try {
        await navigator.clipboard.writeText(photo.originalUrl);
        showToast("Đã sao chép liên kết Instagram!");
      } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070709] flex flex-col justify-between select-none">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 inset-x-0 mx-auto w-fit z-50 px-4 py-2.5 liquid-glass-pill text-white text-xs font-semibold rounded-full shadow-2xl animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Top Floating Liquid Glass Capsule Bar */}
      <div
        className={`fixed top-[calc(var(--sat)+10px)] inset-x-4 z-30 liquid-glass-pill rounded-full px-4 py-2 flex items-center justify-between shadow-2xl transition-opacity duration-300 ${
          uiVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={onClose}
          className="flex items-center text-blue-400 active:opacity-70 text-sm font-bold -ml-1 py-1.5 px-3 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-0.5" />
          <span>Thư viện</span>
        </button>

        <div className="text-center">
          <p className="text-xs font-bold text-white">
            {photo.date.toLocaleDateString("vi-VN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-[10px] text-neutral-400">
            {photo.date.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <button
          onClick={handleShare}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white active:scale-95 shadow-md transition-all"
          title="Chia sẻ ảnh"
        >
          <Share2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Main Photo Center Container with Pinch to Zoom */}
      <div
        ref={containerRef}
        onClick={() => {
          if (scale === 1) setUiVisible(!uiVisible);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative flex-1 flex items-center justify-center overflow-hidden cursor-pointer touch-none"
      >
        <img
          src={hdUrl || photo.url}
          alt={photo.caption || "Fullscreen view"}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isGesturing ? "none" : "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
            WebkitTouchCallout: "default",
          }}
          className="max-w-full max-h-full object-contain pointer-events-auto select-none"
        />

        {loadingHd && (
          <div className="absolute top-24 right-4 liquid-glass-pill px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-neutral-200 pointer-events-none shadow-lg">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Đang tải HD...</span>
          </div>
        )}

        {hdUrl && (
          <div className="absolute top-24 right-4 liquid-glass-pill border border-emerald-400/40 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs text-emerald-300 pointer-events-none shadow-lg font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>HD Cực nét</span>
          </div>
        )}

        {/* Navigation Arrows for Desktop / Tablet */}
        {hasPrev && scale === 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 p-3 rounded-full liquid-glass-pill text-white active:scale-95 z-10 transition-transform hidden sm:flex"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && scale === 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 p-3 rounded-full liquid-glass-pill text-white active:scale-95 z-10 transition-transform hidden sm:flex"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Floating Liquid Glass Action Bar: Larger touch targets */}
      <div
        className={`fixed bottom-[calc(max(var(--sab),12px)+8px)] inset-x-8 z-30 liquid-glass-pill rounded-full px-6 py-2 flex items-center justify-around shadow-2xl transition-opacity duration-300 ${
          uiVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Nút Trái tim (Yêu thích) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(String(photo.id));
            showToast(isFavorite ? "Đã xóa khỏi Mục yêu thích" : "Đã thêm vào Mục yêu thích ❤️");
          }}
          className={`w-12 h-12 flex items-center justify-center rounded-full transition-transform active:scale-125 ${
            isFavorite ? "text-red-500" : "text-neutral-300 hover:text-white"
          }`}
          title="Yêu thích ảnh"
        >
          <Heart className={`w-6 h-6 ${isFavorite ? "fill-red-500 text-red-500 scale-110" : ""}`} />
        </button>

        {/* Nút Thông tin (i) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(true);
          }}
          className="w-12 h-12 flex items-center justify-center rounded-full text-neutral-300 hover:text-white active:scale-95 transition-transform"
        >
          <Info className="w-6 h-6" />
        </button>

        {/* Nút Tải về máy */}
        <button
          onClick={handleDownload}
          className="w-12 h-12 flex items-center justify-center rounded-full text-neutral-300 hover:text-white active:scale-95 transition-transform"
          title="Tải ảnh về máy"
        >
          <Download className="w-6 h-6" />
        </button>
      </div>

      {/* Info Bottom Sheet: Liquid Glass Sheet */}
      {showInfo && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 z-40 liquid-glass-sheet rounded-t-[36px] p-6 text-white max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 shadow-2xl"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <h3 className="text-lg font-bold">Chi tiết ảnh Instagram</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 pt-4 text-sm">
            {photo.author && (
              <div>
                <p className="text-neutral-400 text-xs">Tác giả Instagram</p>
                <p className="font-bold text-blue-400 text-base">@{photo.author}</p>
              </div>
            )}

            {photo.caption && (
              <div>
                <p className="text-neutral-400 text-xs mb-1.5">Nội dung bài viết (Caption)</p>
                <p className="text-neutral-200 text-xs leading-relaxed liquid-glass-card p-3.5 rounded-2xl border border-white/10 font-normal">
                  {photo.caption}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="liquid-glass-card p-3.5 rounded-2xl border border-white/10">
                <p className="text-neutral-400 text-xs">Ngày lưu trữ</p>
                <p className="text-xs font-semibold text-white mt-1">
                  {photo.date.toLocaleDateString("vi-VN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="liquid-glass-card p-3.5 rounded-2xl border border-white/10">
                <p className="text-neutral-400 text-xs">Mã tin nhắn Kênh</p>
                <p className="text-xs font-mono text-neutral-300 mt-1">
                  #{photo.messageId}
                </p>
              </div>
            </div>

            {photo.originalUrl && (
              <div className="pt-2">
                <a
                  href={photo.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-2 active:scale-98 shadow-xl shadow-purple-600/30 transition-transform"
                >
                  <span>Mở bài viết gốc trên Instagram</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
