import React from "react";
import type { PhotoItem, DateGroup } from "../types";
import { Layers, Image as ImageIcon } from "lucide-react";

interface PhotoGridProps {
  groups: DateGroup[];
  onSelectPhoto: (photo: PhotoItem) => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  groups,
  onSelectPhoto,
}) => {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-3xl liquid-glass-card flex items-center justify-center text-neutral-400 mb-4 shadow-xl">
          <ImageIcon className="w-8 h-8 stroke-[1.5]" />
        </div>
        <p className="text-base font-semibold text-neutral-300">Chưa có ảnh nào trong kho</p>
        <p className="text-xs text-neutral-500 mt-1.5 max-w-xs">
          Bấm nút + bên dưới hoặc share link bài viết từ Instagram để tải về ngay!
        </p>
      </div>
    );
  }

  return (
    <div className="pb-36 pt-1">
      {groups.map((group, gIdx) => (
        <section key={gIdx} className="mb-6">
          {/* Section Header: Floating Liquid Glass Ribbon */}
          <div className="sticky top-[108px] z-20 mx-3.5 mb-3 px-4 py-2.5 liquid-glass-pill rounded-2xl flex items-center justify-between shadow-lg">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              {group.dateTitle}
            </h2>
            <span className="text-xs text-white/80 font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
              {group.photos.length} ảnh
            </span>
          </div>

          {/* Balanced 3-Column Grid with Squircle Liquid Corners */}
          <div className="grid grid-cols-3 gap-2 px-3">
            {group.photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto(photo)}
                className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-900 border border-white/10 active:scale-[0.96] transition-all duration-200 cursor-pointer group shadow-sm"
              >
                <img
                  src={photo.thumbnailUrl || photo.url}
                  alt={photo.caption || "Instagram photo"}
                  className="w-full h-full object-cover select-none pointer-events-none group-active:brightness-90 transition-all duration-200"
                  loading="lazy"
                />

                {/* Badge Carousel (Bài viết nhiều ảnh) */}
                {photo.isCarousel && (
                  <div className="absolute top-2 right-2 px-1.5 py-1 rounded-xl bg-black/65 backdrop-blur-md border border-white/20 text-white shadow-md flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-white/95" />
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
