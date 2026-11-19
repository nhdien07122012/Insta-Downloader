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
  Play,
} from "lucide-react";
import { Share } from "@capacitor/share";
import { fetchFullResolutionPhoto } from "../services/telegramClient";

interface PhotoViewerProps {
  photo: PhotoItem | null;
  allPhotos: PhotoItem[];
  config: TelegramConfig;
  isFavorite: boolean;
  favorites?: Set<string>;
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
  favorites,
  onToggleFavorite,
  onClose,
  onSelectPhoto,
  onDeletePhoto,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local index state so swiping is instantaneous, smooth, and immune to prop lag
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (!photo) return 0;
    const idx = allPhotos.findIndex((p) => p.id === photo.id);
    return idx >= 0 ? idx : 0;
  });

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);

  // Carousel Track State
  const [slideOffset, setSlideOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Direction of the active slide animation: "next" | "prev" | "none"
  const slideDirectionRef = useRef<"next" | "prev" | "none">("none");
  const swipeStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const isSwipeGestureRef = useRef<boolean>(false);
  const animationTimerRef = useRef<any>(null);

  // Persistent in-memory HD Cache across the entire viewing session
  // Key: messageId, Value: HD ObjectURL / blob URL
  const hdCacheRef = useRef<Map<number, string>>(new Map());
  const [hdUrl, setHdUrl] = useState<string | null>(null);
  const [loadingHd, setLoadingHd] = useState(false);
  const [hdLoaded, setHdLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ dist: number; scale: number; x: number; y: number; touches: number }>({
    dist: 0,
    scale: 1,
    x: 0,
    y: 0,
    touches: 0,
  });
  const lastTapRef = useRef<number>(0);

  const GAP = 24;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  // Keep local index in sync if photo prop changes from outside (e.g. user clicked another photo in grid)
  useEffect(() => {
    if (!photo) return;
    const idx = allPhotos.findIndex((p) => p.id === photo.id);
    if (idx >= 0 && idx !== currentIndex) {
      setCurrentIndex(idx);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setSlideOffset(0);
      setIsDragging(false);
      setIsAnimating(false);
    }
  }, [photo?.id]);

  const currPhoto = allPhotos[currentIndex] || photo;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1;
  const prevPhoto = hasPrev ? allPhotos[currentIndex - 1] : null;
  const nextPhoto = hasNext ? allPhotos[currentIndex + 1] : null;

  // HD Loading & Adjacent Photos Preloading Effect
  useEffect(() => {
    if (!currPhoto) return;

    let active = true;
    const mid = currPhoto.messageId;

    // 1. Check if HD is already cached in memory
    const cached = hdCacheRef.current.get(mid);
    if (cached) {
      setHdUrl(cached);
      setLoadingHd(false);
      setHdLoaded(true);
    } else {
      setHdUrl(null);
      setHdLoaded(false);
      if (currPhoto.mediaType !== "video") {
        setLoadingHd(true);
        fetchFullResolutionPhoto(config, mid)
          .then((url) => {
            if (!active) return;
            if (url) {
              hdCacheRef.current.set(mid, url);
              setHdUrl(url);
            }
            setLoadingHd(false);
          })
          .catch(() => {
            if (active) setLoadingHd(false);
          });
      }
    }

    // 2. Preload adjacent photos (next and previous) in background for instant swipe
    if (nextPhoto) {
      const img = new Image();
      img.src = nextPhoto.thumbnailUrl || nextPhoto.url;
      if (!hdCacheRef.current.has(nextPhoto.messageId) && nextPhoto.mediaType !== "video") {
        fetchFullResolutionPhoto(config, nextPhoto.messageId)
          .then((nUrl) => {
            if (nUrl) {
              hdCacheRef.current.set(nextPhoto.messageId, nUrl);
              const nImg = new Image();
              nImg.src = nUrl;
            }
          })
          .catch(() => {});
      }
    }

    if (prevPhoto) {
      const img = new Image();
      img.src = prevPhoto.thumbnailUrl || prevPhoto.url;
      if (!hdCacheRef.current.has(prevPhoto.messageId) && prevPhoto.mediaType !== "video") {
        fetchFullResolutionPhoto(config, prevPhoto.messageId)
          .then((pUrl) => {
            if (pUrl) {
              hdCacheRef.current.set(prevPhoto.messageId, pUrl);
              const pImg = new Image();
              pImg.src = pUrl;
            }
          })
          .catch(() => {});
      }
    }

    return () => {
      active = false;
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [currentIndex, currPhoto?.messageId]);

  if (!photo || !currPhoto) return null;

  // Dynamic favorite status for the current active photo
  const isCurrentFavorite = favorites
    ? favorites.has(String(currPhoto.id)) || favorites.has(String(currPhoto.messageId))
    : isFavorite;

  // Finalize the transition smoothly in a single React render batch
  const finalizeTransition = () => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    const dir = slideDirectionRef.current;
    slideDirectionRef.current = "none";

    if (dir === "next" && hasNext) {
      const newIdx = currentIndex + 1;
      setCurrentIndex(newIdx);
      setSlideOffset(0);
      setIsAnimating(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      const nextP = allPhotos[newIdx];
      if (nextP) onSelectPhoto(nextP);
    } else if (dir === "prev" && hasPrev) {
      const newIdx = currentIndex - 1;
      setCurrentIndex(newIdx);
      setSlideOffset(0);
      setIsAnimating(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      const prevP = allPhotos[newIdx];
      if (prevP) onSelectPhoto(prevP);
    } else {
      setSlideOffset(0);
      setIsAnimating(false);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!hasPrev) return;
    if (isAnimating) {
      finalizeTransition();
    }
    const width = containerRef.current?.clientWidth || window.innerWidth;
    slideDirectionRef.current = "prev";
    setIsAnimating(true);
    setIsDragging(false);
    setSlideOffset(width + GAP);
    // Safety fallback timer in case onTransitionEnd does not fire
    animationTimerRef.current = setTimeout(finalizeTransition, 350);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!hasNext) return;
    if (isAnimating) {
      finalizeTransition();
    }
    const width = containerRef.current?.clientWidth || window.innerWidth;
    slideDirectionRef.current = "next";
    setIsAnimating(true);
    setIsDragging(false);
    setSlideOffset(-(width + GAP));
    // Safety fallback timer in case onTransitionEnd does not fire
    animationTimerRef.current = setTimeout(finalizeTransition, 350);
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
  }, [currentIndex, hasPrev, hasNext, isAnimating]);

  // Touch Handlers for Pinch to Zoom, Pan & Smooth Apple Photos Carousel Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    // If user touches while animation is in flight, finalize immediately for zero latency
    if (isAnimating) {
      finalizeTransition();
    }

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
          setSlideOffset(0);
        } else {
          setScale(2.5);
          setPosition({ x: 0, y: 0 });
          setSlideOffset(0);
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
        // Normal 1x: Prepare for horizontal carousel swipe
        swipeStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: now,
        };
        isSwipeGestureRef.current = false;
        setIsDragging(false);
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
        if (Math.abs(deltaX) > 7 && Math.abs(deltaX) > Math.abs(deltaY) * 1.05) {
          isSwipeGestureRef.current = true;
          setIsDragging(true);
        }
      }

      if (isSwipeGestureRef.current) {
        e.preventDefault();
        // Rubber-band resistance at boundaries
        let effectiveOffset = deltaX;
        if (!hasPrev && deltaX > 0) {
          effectiveOffset = deltaX * 0.28;
        } else if (!hasNext && deltaX < 0) {
          effectiveOffset = deltaX * 0.28;
        }
        setSlideOffset(effectiveOffset);
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
      setIsDragging(false);

      const duration = Math.max(Date.now() - swipeStartRef.current.time, 1);
      const velocity = Math.abs(slideOffset) / duration;
      const width = containerRef.current?.clientWidth || window.innerWidth;
      const stride = width + GAP;

      const isQuickFlick = Math.abs(slideOffset) > 25 && velocity > 0.32;
      const isDragPassed = Math.abs(slideOffset) > width * 0.22;

      if (slideOffset < 0 && (isDragPassed || isQuickFlick) && hasNext) {
        // Vuốt sang trái -> Trượt sang ảnh tiếp theo với hiệu ứng Apple Photos
        slideDirectionRef.current = "next";
        setIsAnimating(true);
        setSlideOffset(-stride);
        animationTimerRef.current = setTimeout(finalizeTransition, 350);
      } else if (slideOffset > 0 && (isDragPassed || isQuickFlick) && hasPrev) {
        // Vuốt sang phải -> Trượt sang ảnh trước đó với hiệu ứng Apple Photos
        slideDirectionRef.current = "prev";
        setIsAnimating(true);
        setSlideOffset(stride);
        animationTimerRef.current = setTimeout(finalizeTransition, 350);
      } else {
        // Không đủ ngưỡng vuốt -> Bật lò xo mượt mà quay về vị trí ban đầu
        slideDirectionRef.current = "none";
        setIsAnimating(true);
        setSlideOffset(0);
        animationTimerRef.current = setTimeout(finalizeTransition, 350);
      }
    }
  };

  // Tải ảnh hoặc video về máy iPhone (Hỗ trợ iOS Camera Roll)
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const isVideo = currPhoto.mediaType === "video";
    const ext = isVideo ? "mp4" : "jpg";
    const mime = isVideo ? "video/mp4" : "image/jpeg";
    const platformPrefix = currPhoto.platform === "twitter" ? "twitter" : "instagram";

    showToast(isVideo ? "Đang chuẩn bị video chất lượng cao..." : "Đang chuẩn bị ảnh chất lượng cao...");

    try {
      const targetUrl = hdUrl || currPhoto.url;
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `${platformPrefix}_${currPhoto.author || (isVideo ? "video" : "photo")}_${Date.now()}.${ext}`,
        { type: mime }
      );

      // Cách 1: Native Web Share File (Mở menu iOS chứa nút 'Lưu video' hoặc 'Lưu hình ảnh' vào Thư viện)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: isVideo ? "Lưu video vào Thư viện" : "Lưu vào Thư viện ảnh",
        });
        showToast(isVideo ? "👉 Chọn 'Lưu video' để lưu vào Thư viện iPhone" : "👉 Chọn 'Lưu hình ảnh' để lưu vào Thư viện iPhone");
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
      a.href = hdUrl || currPhoto.url;
      a.download = `${platformPrefix}_${currPhoto.author || (isVideo ? "video" : "photo")}_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(isVideo ? "Đã tải video về máy" : "Đã tải ảnh về máy");
    } catch {
      showToast(isVideo ? "Mẹo: Mở video và chọn 'Lưu video'" : "Mẹo: Nhấn giữ vào ảnh và chọn 'Lưu vào Ảnh'");
    }
  };

  // Chia sẻ ảnh/video (Native iOS Share Sheet)
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const isVideo = currPhoto.mediaType === "video";
    const ext = isVideo ? "mp4" : "jpg";
    const mime = isVideo ? "video/mp4" : "image/jpeg";
    const platformName = currPhoto.platform === "twitter" ? "Twitter (X)" : "Instagram";

    // 1. Chia sẻ File qua Web Share API
    try {
      const targetUrl = hdUrl || currPhoto.url;
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `${currPhoto.platform || "media"}_${currPhoto.author || "file"}.${ext}`,
        { type: mime }
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${isVideo ? "Video" : "Ảnh"} từ @${currPhoto.author || platformName}`,
          text: currPhoto.caption,
        });
        return;
      }
    } catch {}

    // 2. Chia sẻ link qua Capacitor Native Share
    try {
      await Share.share({
        title: `${isVideo ? "Video" : "Ảnh"} từ @${currPhoto.author || platformName}`,
        text: currPhoto.caption || `${isVideo ? "Video" : "Ảnh"} từ ${platformName}`,
        url: currPhoto.originalUrl || undefined,
        dialogTitle: `Chia sẻ ${isVideo ? "video" : "ảnh"}`,
      });
      return;
    } catch {}

    // 3. Sao chép link nếu không mở được share
    if (currPhoto.originalUrl) {
      try {
        await navigator.clipboard.writeText(currPhoto.originalUrl);
        showToast("Đã sao chép liên kết!");
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
            {currPhoto.date.toLocaleDateString("vi-VN", {
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

      {/* Main Photo/Video Center Container with Pinch to Zoom */}
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
        {/* Continuous 3-Slide Carousel Track (Chuẩn Apple Photos) */}
        <div
          className="relative w-full h-full flex items-center justify-center will-change-transform"
          style={{
            transform: `translate3d(${slideOffset}px, 0, 0)`,
            transition: isDragging
              ? "none"
              : isAnimating
              ? "transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)"
              : "none",
          }}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && e.propertyName === "transform" && isAnimating) {
              finalizeTransition();
            }
          }}
        >
          {/* SLIDE TRƯỚC (Previous Photo - trượt vào từ bên trái) */}
          {prevPhoto && (
            <div
              style={{
                transform: `translate3d(calc(-100% - ${GAP}px), 0, 0)`,
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none p-2 select-none"
            >
              {prevPhoto.mediaType === "video" ? (
                <div className="relative max-w-full max-h-[80vh] flex items-center justify-center">
                  <img
                    src={prevPhoto.thumbnailUrl || prevPhoto.url}
                    alt=""
                    className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
                    decoding="sync"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                      <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={prevPhoto.thumbnailUrl || prevPhoto.url}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                    decoding="sync"
                    loading="eager"
                  />
                  {hdCacheRef.current.get(prevPhoto.messageId) && (
                    <img
                      src={hdCacheRef.current.get(prevPhoto.messageId)}
                      alt=""
                      className="absolute inset-0 m-auto max-w-full max-h-full object-contain pointer-events-none"
                      decoding="sync"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* SLIDE HIỆN TẠI (Current Photo - ở trung tâm) */}
          <div
            className="w-full h-full flex items-center justify-center p-2 select-none relative"
            style={{
              transform:
                scale > 1
                  ? `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`
                  : undefined,
              transition: isGesturing ? "none" : "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
            }}
          >
            {currPhoto.mediaType === "video" ? (
              <video
                key={hdUrl || currPhoto.url}
                src={hdUrl || currPhoto.url}
                poster={currPhoto.thumbnailUrl}
                controls
                playsInline
                autoPlay
                preload="metadata"
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl pointer-events-auto"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Lớp nền: Thumbnail/Base Image (LUÔN CÓ SẴN TRONG BỘ NHỚ, KHÔNG BAO GIỜ BỊ CHỚP ĐEN) */}
                <img
                  src={currPhoto.thumbnailUrl || currPhoto.url}
                  alt={currPhoto.caption || "Fullscreen view"}
                  className="max-w-full max-h-full object-contain select-none pointer-events-auto"
                  decoding="sync"
                />

                {/* Lớp HD: Nét căng, phủ lên trên mượt mà khi đã sẵn sàng */}
                {hdUrl && (
                  <img
                    key={hdUrl}
                    src={hdUrl}
                    alt={currPhoto.caption || "Fullscreen view HD"}
                    className={`absolute inset-0 m-auto max-w-full max-h-full object-contain pointer-events-auto select-none transition-opacity duration-200 ${
                      hdLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    decoding="sync"
                    onLoad={() => setHdLoaded(true)}
                  />
                )}
              </div>
            )}
          </div>

          {/* SLIDE TIẾP THEO (Next Photo - trượt vào từ bên phải) */}
          {nextPhoto && (
            <div
              style={{
                transform: `translate3d(calc(100% + ${GAP}px), 0, 0)`,
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none p-2 select-none"
            >
              {nextPhoto.mediaType === "video" ? (
                <div className="relative max-w-full max-h-[80vh] flex items-center justify-center">
                  <img
                    src={nextPhoto.thumbnailUrl || nextPhoto.url}
                    alt=""
                    className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
                    decoding="sync"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                      <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={nextPhoto.thumbnailUrl || nextPhoto.url}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                    decoding="sync"
                    loading="eager"
                  />
                  {hdCacheRef.current.get(nextPhoto.messageId) && (
                    <img
                      src={hdCacheRef.current.get(nextPhoto.messageId)}
                      alt=""
                      className="absolute inset-0 m-auto max-w-full max-h-full object-contain pointer-events-none"
                      decoding="sync"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
            onToggleFavorite(String(currPhoto.id));
            showToast(isCurrentFavorite ? "Đã xóa khỏi Mục yêu thích" : "Đã thêm vào Mục yêu thích ❤️");
          }}
          className={`p-2 transition-transform active:scale-125 ${
            isCurrentFavorite ? "text-red-500" : "text-neutral-300"
          }`}
          title="Yêu thích ảnh"
        >
          <Heart className={`w-6 h-6 ${isCurrentFavorite ? "fill-red-500 text-red-500 scale-110" : ""}`} />
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
            <h3 className="text-lg font-bold">
              {currPhoto.mediaType === "video" ? "Chi tiết Video" : "Chi tiết ảnh"}{" "}
              {currPhoto.platform === "twitter" ? "Twitter (X)" : "Instagram"}
            </h3>
            <button
              onClick={() => setShowInfo(false)}
              className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 active:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 pt-4 text-sm">
            {currPhoto.author && (
              <div>
                <p className="text-neutral-400 text-xs">
                  Tác giả {currPhoto.platform === "twitter" ? "Twitter (X)" : "Instagram"}
                </p>
                <p className="font-semibold text-blue-400">@{currPhoto.author}</p>
              </div>
            )}

            {currPhoto.caption && (
              <div>
                <p className="text-neutral-400 text-xs mb-1">Nội dung bài viết (Caption)</p>
                <p className="text-neutral-200 text-xs leading-relaxed bg-neutral-800/60 p-3 rounded-xl border border-neutral-800 font-normal">
                  {currPhoto.caption}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-neutral-800/40 p-3 rounded-xl border border-neutral-800">
                <p className="text-neutral-400 text-xs">Ngày lưu trữ</p>
                <p className="text-xs font-medium text-white mt-0.5">
                  {currPhoto.date.toLocaleDateString("vi-VN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="bg-neutral-800/40 p-3 rounded-xl border border-neutral-800">
                <p className="text-neutral-400 text-xs">Mã tin nhắn Kênh</p>
                <p className="text-xs font-mono text-neutral-300 mt-0.5">
                  #{currPhoto.messageId}
                </p>
              </div>
            </div>

            {currPhoto.originalUrl && (
              <div className="pt-2">
                <a
                  href={currPhoto.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3 rounded-xl font-medium text-white text-xs flex items-center justify-center gap-1.5 active:opacity-80 shadow-md ${
                    currPhoto.platform === "twitter"
                      ? "bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
                      : "bg-gradient-to-r from-pink-600 to-purple-600"
                  }`}
                >
                  <span>
                    Mở bài viết gốc trên {currPhoto.platform === "twitter" ? "Twitter (X)" : "Instagram"}
                  </span>
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
                  if (!onDeletePhoto || !currPhoto) return;
                  setIsDeleting(true);
                  try {
                    const nextTarget = hasNext
                      ? allPhotos[currentIndex + 1]
                      : hasPrev
                      ? allPhotos[currentIndex - 1]
                      : null;

                    await onDeletePhoto(currPhoto.messageId);
                    showToast("Đã xóa ảnh thành công 🗑️");
                    setIsConfirmDeleteOpen(false);

                    if (nextTarget) {
                      const nextIdx = allPhotos.findIndex((p) => p.id === nextTarget.id);
                      if (nextIdx >= 0) {
                        setCurrentIndex(nextIdx);
                      }
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
