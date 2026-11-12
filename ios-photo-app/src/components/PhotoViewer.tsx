import React, { useState, useEffect } from "react";
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
import { fetchFullResolutionPhoto } from "../services/telegramClient";

interface PhotoViewerProps {
  photo: PhotoItem | null;
  allPhotos: PhotoItem[];
  config: TelegramConfig;
  onClose: () => void;
  onSelectPhoto: (p: PhotoItem) => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo,
  allPhotos,
  config,
  onClose,
  onSelectPhoto,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [hdUrl, setHdUrl] = useState<string | null>(null);
  const [loadingHd, setLoadingHd] = useState(false);

  useEffect(() => {
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

  // Tải ảnh về máy iPhone
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const a = document.createElement("a");
      a.href = hdUrl || photo.url;
      a.download = `instagram_${photo.author || "photo"}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Lỗi khi tải ảnh:", err);
    }
  };

  // Chia sẻ ảnh (Native iOS Share Sheet)
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ảnh từ @${photo.author || "Instagram"}`,
          text: photo.caption,
          url: photo.originalUrl || hdUrl || photo.url,
        });
      } catch (err) {
        // user cancelled
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
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
          <p className="text-xs text-neutral-400">
            {photo.date.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <button
          onClick={handleShare}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-800 text-blue-400 active:opacity-60"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Main Photo Center Container */}
      <div
        onClick={() => setUiVisible(!uiVisible)}
        className="relative flex-1 flex items-center justify-center overflow-hidden cursor-pointer"
      >
        <img
          src={hdUrl || photo.url}
          alt={photo.caption || "Fullscreen view"}
          className="max-w-full max-h-full object-contain pointer-events-auto"
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

        {/* Navigation Arrows for Desktop / Tablet */}
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-3 p-3 rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm z-10 transition-colors hidden sm:flex"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-3 p-3 rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm z-10 transition-colors hidden sm:flex"
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
            setIsLiked(!isLiked);
          }}
          className={`p-2 transition-transform active:scale-125 ${
            isLiked ? "text-red-500 fill-red-500" : "text-neutral-300"
          }`}
        >
          <Heart className={`w-6 h-6 ${isLiked ? "fill-red-500" : ""}`} />
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
      </div>

      {/* Info Bottom Sheet (Bảng chi tiết thông tin ảnh) */}
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
                <p className="text-neutral-400 text-xs">Mô tả / Caption</p>
                <p className="text-neutral-200 mt-0.5 leading-relaxed">
                  {photo.caption}
                </p>
              </div>
            )}

            {photo.originalUrl && (
              <div>
                <p className="text-neutral-400 text-xs">Bài đăng gốc</p>
                <a
                  href={photo.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-400 hover:underline mt-0.5 font-medium"
                >
                  <span>Mở trên Instagram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div>
              <p className="text-neutral-400 text-xs">Thời gian lưu</p>
              <p className="text-neutral-200">
                {photo.date.toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
