import React from "react";
import type { PhotoItem, DateGroup } from "../types";
import { Layers, Play } from "lucide-react";

interface PhotoGridProps {
  groups: DateGroup[];
  onSelectPhoto: (photo: PhotoItem) => void;
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
}) => {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
        <p className="text-sm">Chưa có ảnh nào trong kho.</p>
        <p className="text-xs text-neutral-600 mt-1">
          Hãy dán link Instagram vào Telegram để tải ảnh!
        </p>
      </div>
    );
  }

  return (
    <div className="pb-32">
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
            {group.photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto(photo)}
                className="relative aspect-square overflow-hidden bg-neutral-900 active:opacity-75 transition-opacity cursor-pointer group"
              >
                <img
                  src={photo.thumbnailUrl || photo.url}
                  alt={photo.caption || "Instagram photo"}
                  className="w-full h-full object-cover select-none pointer-events-none transform group-active:scale-98 transition-transform"
                  loading="lazy"
                />

                {/* Badge Carousel (Nhiều ảnh) */}
                {photo.isCarousel && (
                  <div className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 backdrop-blur-sm text-white">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Badge Video chuẩn Apple Photos (Icon Play & Thời lượng) */}
                {photo.mediaType === "video" && (
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white flex items-center gap-1 text-[10px] font-semibold tracking-tight shadow">
                    <Play className="w-2.5 h-2.5 fill-white text-white" />
                    {photo.duration ? <span>{formatDuration(photo.duration)}</span> : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
