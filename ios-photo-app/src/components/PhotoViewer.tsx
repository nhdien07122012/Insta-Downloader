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
  Trash2,
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
  onDeletePhoto?: (messageId: number) => Promise<void>;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo,
  allPhotos,
  config,
  isFavorite,
  onToggleFavorite,
  onClose,
  onSelectPhoto,
  onDeletePhoto,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [hdUrl, setHdUrl] = useState<string | null>(null);
  const [loadingHd, setLoadingHd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);

  // Swipe left/right state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const isSwipeGestureRef = useRef<boolean>(false);

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
    setSwipeOffset(0);
    isSwipeGestureRef.current = false;
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

  // Touch Handlers for Pinch to Zoom, Pan & Swipe Left/Right
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
      const now = Date.now();
      const touch = e.touches[0];

      // Double tap: toggle zoom 1x <-> 2.5x
      if (now - lastTapRef.current < 300) {
        if (scale > 1.1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
          setSwipeOffset(0);
        } else {
          setScale(2.5);
          setPosition({ x: 0, y: 0 });
          setSwipeOffset(0);
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (scale > 1) {
        // Panning when zoomed in
        setIsGesturing(true);
        touchStartRef.current = {
          dist: 0,
          scale,
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
          touches: 1,
        };
      } else {
        // Normal 1x: Prepare for horizontal swipe between photos
        swipeStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: now,
        };
        isSwipeGestureRef.current = false;
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
    } else if (e.touches.length === 1 && scale === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeStartRef.current.x;
      const deltaY = touch.clientY - swipeStartRef.current.y;

      // Determine if gesture is horizontal swipe
      if (!isSwipeGestureRef.current) {
        if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
          isSwipeGestureRef.current = true;
          setIsGesturing(true);
        }
      }

      if (isSwipeGestureRef.current) {
        e.preventDefault();
        // Rubber-band resistance at start and end
        let effectiveOffset = deltaX;
        if (!hasPrev && deltaX > 0) {
          effectiveOffset = deltaX * 0.3;
        } else if (!hasNext && deltaX < 0) {
          effectiveOffset = deltaX * 0.3;
        }
        setSwipeOffset(effectiveOffset);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsGesturing(false);

    if (scale < 1.05) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }

    if (isSwipeGestureRef.current) {
      isSwipeGestureRef.current = false;
      const duration = Date.now() - swipeStartRef.current.time;
      const velocity = Math.abs(swipeOffset) / Math.max(duration, 1);

      const isQuickFlick = Math.abs(swipeOffset) > 20 && velocity > 0.35;
      const isDragPassed = Math.abs(swipeOffset) > 50;

      if (swipeOffset < 0 && (isDragPassed || isQuickFlick)) {
        // Vuốt sang trái -> Xem ảnh tiếp theo
        if (hasNext) {
          handleNext();
        }
      } else if (swipeOffset > 0 && (isDragPassed || isQuickFlick)) {
        // Vuốt sang phải -> Xem ảnh trước đó
        if (hasPrev) {
          handlePrev();
        }
      }

      setSwipeOffset(0);
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 inset-x-0 mx-auto w-fit z-50 px-4 py-2 bg-neutral-800/95 border border-neutral-700/80 backdrop-blur-xl text-white text-xs font-medium rounded-full shadow-2xl animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Top Header Bar */}
      <div
        className={`pt-[var(--sat)] h-20 px-4 flex items-center justify-between bg-black/60 backdrop-blur-md z-20 transition-opacity duration-300 ${
          uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={onClose}
          className="flex items-center text-blue-400 active:opacity-60 text-base font-medium -ml-1 py-2 pr-3"
        >
          <ChevronLeft className="w-6 h-6 mr-0.5" />
          <span>Thư viện</span>
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold text-white">
            {photo.date.toLocaleDateString("vi-VN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-xs text-neutral-400 font-medium">
            {currentIndex + 1} / {allPhotos.length}
          </p>
        </div>

        <button
          onClick={handleShare}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-800 text-blue-400 active:opacity-60"
          title="Chia sẻ ảnh"
        >
          <Share2 className="w-5 h-5" />
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
            transform: `scale(${scale}) translate(${(position.x + swipeOffset) / scale}px, ${position.y / scale}px)`,
            transition: isGesturing ? "none" : "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
            WebkitTouchCallout: "default",
          }}
          className="max-w-full max-h-full object-contain pointer-events-auto select-none"
        />

        {loadingHd && (
          <div className="absolute top-24 right-4 bg-black/60 border border-neutral-700/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-neutral-300 pointer-events-none">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Đang tải HD...</span>
          </div>
        )}

        {hdUrl && (
          <div className="absolute top-24 right-4 bg-emerald-950/70 border border-emerald-500/40 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[11px] text-emerald-300 pointer-events-none">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>HD Cực nét</span>
          </div>
        )}

        {/* Navigation Arrows for Mobile & Desktop */}
        {hasPrev && scale === 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className={`absolute left-3 w-10 h-10 rounded-full bg-black/50 border border-neutral-700/60 text-white active:scale-90 backdrop-blur-md z-10 transition-all flex items-center justify-center ${
              uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            title="Ảnh trước"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && scale === 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className={`absolute right-3 w-10 h-10 rounded-full bg-black/50 border border-neutral-700/60 text-white active:scale-90 backdrop-blur-md z-10 transition-all flex items-center justify-center ${
              uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            title="Ảnh tiếp theo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Action Bar (Apple Photos style) */}
      <div
        className={`pb-[var(--sab)] h-20 px-8 flex items-center justify-between bg-black/60 backdrop-blur-md z-20 transition-opacity duration-300 ${
          uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Nút Trái tim (Yêu thích) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(String(photo.id));
            showToast(isFavorite ? "Đã xóa khỏi Mục yêu thích" : "Đã thêm vào Mục yêu thích ❤️");
          }}
          className={`p-2 transition-transform active:scale-125 ${
            isFavorite ? "text-red-500" : "text-neutral-300"
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
          className="p-2 text-neutral-300 active:opacity-60"
        >
          <Info className="w-6 h-6" />
        </button>

        {/* Nút Tải về máy */}
        <button
          onClick={handleDownload}
          className="p-2 text-neutral-300 active:opacity-60"
          title="Tải ảnh về máy"
        >
          <Download className="w-6 h-6" />
        </button>

        {/* Nút Xóa ảnh (Thùng rác chuẩn iOS) */}
        {onDeletePhoto && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsConfirmDeleteOpen(true);
            }}
            className="p-2 text-neutral-400 hover:text-red-400 active:text-red-500 transition-colors"
            title="Xóa ảnh khỏi kho lưu trữ"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Info Bottom Sheet */}
      {showInfo && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 z-40 bg-neutral-900/95 backdrop-blur-2xl rounded-t-3xl p-6 border-t border-neutral-800 text-white max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        >
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <h3 className="text-lg font-bold">Chi tiết ảnh Instagram</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 active:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 pt-4 text-sm">
            {photo.author && (
              <div>
                <p className="text-neutral-400 text-xs">Tác giả Instagram</p>
                <p className="font-semibold text-blue-400">@{photo.author}</p>
              </div>
            )}

            {photo.caption && (
              <div>
                <p className="text-neutral-400 text-xs mb-1">Nội dung bài viết (Caption)</p>
                <p className="text-neutral-200 text-xs leading-relaxed bg-neutral-800/60 p-3 rounded-xl border border-neutral-800 font-normal">
                  {photo.caption}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-neutral-800/40 p-3 rounded-xl border border-neutral-800">
                <p className="text-neutral-400 text-xs">Ngày lưu trữ</p>
                <p className="text-xs font-medium text-white mt-0.5">
                  {photo.date.toLocaleDateString("vi-VN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="bg-neutral-800/40 p-3 rounded-xl border border-neutral-800">
                <p className="text-neutral-400 text-xs">Mã tin nhắn Kênh</p>
                <p className="text-xs font-mono text-neutral-300 mt-0.5">
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
                  className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-medium text-white text-xs flex items-center justify-center gap-1.5 active:opacity-80 shadow-md"
                >
                  <span>Mở bài viết gốc trên Instagram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* iOS Style Action Sheet Xác Nhận Xóa Ảnh */}
      {isConfirmDeleteOpen && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeleting) setIsConfirmDeleteOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#1c1c1e] border border-neutral-800 rounded-2xl overflow-hidden text-center shadow-2xl p-4 space-y-3 animate-in zoom-in-95 duration-200"
          >
            <div>
              <h4 className="text-base font-bold text-white">Xóa ảnh này?</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed px-2">
                Ảnh sẽ bị xóa khỏi bộ nhớ máy và xóa vĩnh viễn trên Kênh Telegram của bạn.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeletePhoto || !photo) return;
                  setIsDeleting(true);
                  try {
                    const nextTarget = hasNext
                      ? allPhotos[currentIndex + 1]
                      : hasPrev
                      ? allPhotos[currentIndex - 1]
                      : null;

                    await onDeletePhoto(photo.messageId);
                    showToast("Đã xóa ảnh thành công 🗑️");
                    setIsConfirmDeleteOpen(false);

                    if (nextTarget) {
                      onSelectPhoto(nextTarget);
                    } else {
                      onClose();
                    }
                  } catch (err: any) {
                    showToast("Lỗi khi xóa ảnh: " + (err.message || "Thử lại sau"));
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="w-full py-3 bg-red-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 active:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  "Xóa ảnh"
                )}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="w-full py-3 bg-neutral-800 text-white font-semibold rounded-xl text-sm active:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
