import React, { useRef } from "react";
import type { PhotoItem, DateGroup } from "../types";
import { Layers, Play, Check } from "lucide-react";

interface PhotoGridProps {
  groups: DateGroup[];
  onSelectPhoto: (photo: PhotoItem) => void;
  isSelectionMode?: boolean;
  selectedPhotoIds?: Set<string | number>;
  onToggleSelectPhoto?: (photoId: string | number) => void;
  onLongPressPhoto?: (photo: PhotoItem) => void;
}

function formatDuration(sec?: number): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  groups,
  onSelectPhoto,
  isSelectionMode = false,
  selectedPhotoIds = new Set(),
  onToggleSelectPhoto,
  onLongPressPhoto,
}) => {
  const longPressTimerRef = useRef<any>(null);
  const isLongPressRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
        <p className="text-sm">Chưa có ảnh nào trong kho.</p>
        <p className="text-xs text-neutral-600 mt-1">
          Hãy dán link Instagram hoặc Twitter/X vào Telegram để tải ảnh!
        </p>
      </div>
    );
  }

  const handleTouchStart = (photo: PhotoItem, e: React.TouchEvent) => {
    if (isSelectionMode) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (navigator.vibrate) {
        try {
          navigator.vibrate(45);
        } catch {}
      }
      onLongPressPhoto?.(photo);
    }, 420);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isSelectionMode || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClickPhoto = (photo: PhotoItem) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    if (isSelectionMode) {
      onToggleSelectPhoto?.(photo.id);
    } else {
      onSelectPhoto(photo);
    }
  };

  return (
    <div className="pb-32 select-none">
      {groups.map((group, gIdx) => (
        <section key={gIdx} className="mb-6">
          {/* Section Header (Ngày tháng) */}
          <div className="sticky top-[96px] z-20 px-4 py-2 bg-black/85 backdrop-blur-md flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              {group.dateTitle}
            </h2>
            <span className="text-xs text-neutral-400 font-medium">
              {group.photos.length} ảnh
            </span>
          </div>

          {/* 3-Column Grid */}
          <div className="grid grid-cols-3 gap-0.5 px-0.5">
            {group.photos.map((photo) => {
              const isSelected = selectedPhotoIds.has(photo.id);

              return (
                <div
                  key={photo.id}
                  onClick={() => handleClickPhoto(photo)}
                  onTouchStart={(e) => handleTouchStart(photo, e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!isSelectionMode) {
                      onLongPressPhoto?.(photo);
                    }
                  }}
                  className={`relative aspect-square overflow-hidden bg-neutral-900 cursor-pointer group transition-all duration-200 ${
                    isSelectionMode
                      ? isSelected
                        ? "p-1 bg-black"
                        : "active:opacity-80"
                      : "active:opacity-75"
                  }`}
                >
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt={photo.caption || "Instagram photo"}
                    className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-200 ${
                      isSelected
                        ? "rounded-xl scale-95 ring-2 ring-blue-500 shadow-lg"
                        : isSelectionMode
                        ? "rounded-md"
                        : "group-active:scale-98"
                    }`}
                    loading="lazy"
                  />

                  {/* Selection Checkmark Badge chuẩn Apple Photos */}
                  {isSelectionMode && (
                    <div className="absolute top-2 right-2 z-10 pointer-events-none transition-transform duration-150">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white shadow-lg animate-in zoom-in-75 duration-150">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-white/80 bg-black/35 backdrop-blur-sm" />
                      )}
                    </div>
                  )}

                  {/* Badge Carousel (Nhiều ảnh) */}
                  {!isSelectionMode && photo.isCarousel && (
                    <div className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 backdrop-blur-sm text-white">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Badge Video chuẩn Apple Photos (Icon Play & Thời lượng) */}
                  {!isSelectionMode && photo.mediaType === "video" && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white flex items-center gap-1 text-[10px] font-semibold tracking-tight shadow">
                      <Play className="w-2.5 h-2.5 fill-white text-white" />
                      {photo.duration ? <span>{formatDuration(photo.duration)}</span> : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
