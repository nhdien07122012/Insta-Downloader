import React, { useState } from "react";
import type { PhotoItem, PostAlbum } from "../types";
import {
  ChevronRight,
  ChevronDown,
  Heart,
  MoreHorizontal,
  Layers,
} from "lucide-react";

interface CollectionsViewProps {
  photos: PhotoItem[];
  favoritesCount: number;
  postAlbums: PostAlbum[];
  featuredCreators: { author: string; count: number; cover: string }[];
  onSelectPhoto: (p: PhotoItem) => void;
  onOpenSettings: () => void;
  onOpenFavorites: () => void;
  onOpenRecent: () => void;
  onOpenCarousels: () => void;
  onSelectAlbum: (album: PostAlbum) => void;
  onSelectCreator: (author: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  photos,
  favoritesCount,
  postAlbums,
  featuredCreators,
  onSelectPhoto,
  onOpenSettings,
  onOpenFavorites,
  onOpenRecent,
  onOpenCarousels,
  onSelectAlbum,
  onSelectCreator,
}) => {
  // Collapse/Expand state for sections matching iOS Photos app
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (section: string) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Kỷ niệm: Lấy 5 bài viết nổi bật làm thẻ kỷ niệm
  const memories = photos.slice(0, 6);

  // Ảnh mục ưa thích
  const favoriteCover = photos.find((p) => p.isCarousel) || photos[0];
  // Ảnh đã lưu gần đây
  const recentCover = photos[0];
  // Ảnh carousels
  const carouselCover = postAlbums.find((a) => a.photos.length > 1)?.coverPhoto || photos[0];

  return (
    <div className="pb-36 pt-2 px-4 space-y-7 animate-in fade-in duration-200 text-white">
      {/* Top Header: "Bộ sưu tập" + [•••] + Avatar */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Bộ sưu tập
        </h1>

        <div className="flex items-center gap-2.5">
          {/* Nút ••• (Menu / Cài đặt) */}
          <button
            onClick={onOpenSettings}
            className="ios-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-neutral-200 active:scale-95 transition-transform"
            title="Cài đặt Telegram & Tùy chọn"
          >
            <MoreHorizontal className="w-5 h-5 text-neutral-100" />
          </button>

          {/* Avatar Profile Circle */}
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full overflow-hidden border border-white/20 active:scale-95 transition-transform bg-neutral-800 flex items-center justify-center shadow-md"
            title="Tài khoản Telegram"
          >
            {photos.length > 0 && photos[0].url ? (
              <img
                src={photos[0].url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-blue-400">TG</span>
            )}
          </button>
        </div>
      </div>

      {/* MỤC 1: KỶ NIỆM (MEMORIES) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => toggleSection("memories")}
            className="flex items-center gap-1.5 text-xl font-bold text-white active:opacity-70"
          >
            <span>Kỷ niệm</span>
            <ChevronRight className="w-5 h-5 text-neutral-500 stroke-[2.5]" />
          </button>

          <button
            onClick={() => toggleSection("memories")}
            className="ios-circle-btn w-7 h-7 rounded-full flex items-center justify-center text-blue-400 active:scale-95 transition-transform"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                collapsed["memories"] ? "-rotate-90" : ""
              }`}
            />
          </button>
        </div>

        {!collapsed["memories"] && (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {memories.length > 0 ? (
              memories.map((photo, idx) => (
                <div
                  key={photo.id || idx}
                  onClick={() => onSelectPhoto(photo)}
                  className="w-32 h-44 rounded-2xl overflow-hidden shrink-0 relative bg-neutral-900 border border-white/10 active:scale-95 transition-all cursor-pointer shadow-lg group"
                >
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                    <p className="text-xs font-bold text-white leading-tight drop-shadow-md truncate">
                      {photo.author ? `@${photo.author}` : `Khoảnh khắc ${idx + 1}`}
                    </p>
                    <span className="text-[10px] text-neutral-300 drop-shadow">
                      {photo.date.toLocaleDateString("vi-VN", {
                        day: "numeric",
                        month: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full p-4 rounded-2xl liquid-glass-card text-center text-xs text-neutral-400">
                Chưa có dữ liệu kỷ niệm. Hãy kết nối Telegram để tải ảnh!
              </div>
            )}
          </div>
        )}
      </section>

      {/* MỤC 2: ĐÃ GHIM (PINNED COLLECTIONS) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => toggleSection("pinned")}
            className="flex items-center gap-1.5 text-xl font-bold text-white active:opacity-70"
          >
            <span>Đã ghim</span>
            <ChevronRight className="w-5 h-5 text-neutral-500 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-neutral-800/80 text-blue-400 text-xs font-semibold">
              Sửa
            </span>
            <button
              onClick={() => toggleSection("pinned")}
              className="ios-circle-btn w-7 h-7 rounded-full flex items-center justify-center text-blue-400 active:scale-95 transition-transform"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  collapsed["pinned"] ? "-rotate-90" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {!collapsed["pinned"] && (
          <div className="grid grid-cols-3 gap-2.5">
            {/* Card 1: Mục ưa thích */}
            <div
              onClick={onOpenFavorites}
              className="aspect-square rounded-2xl relative overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer active:scale-95 transition-all shadow-md group"
            >
              {favoriteCover ? (
                <img
                  src={favoriteCover.thumbnailUrl || favoriteCover.url}
                  alt="Mục ưa thích"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center" />
              )}
              {/* Solid White Heart on top-left (Giống hệt ảnh chụp) */}
              <div className="absolute top-2 left-2">
                <Heart className="w-5 h-5 fill-white text-white drop-shadow-md" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                <span className="text-xs font-bold text-white leading-tight drop-shadow-md">
                  {favoritesCount > 0 ? `Mục ưa thích (${favoritesCount})` : "Mục ưa thích"}
                </span>
              </div>
            </div>

            {/* Card 2: Đã lưu gần đây */}
            <div
              onClick={onOpenRecent}
              className="aspect-square rounded-2xl relative overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer active:scale-95 transition-all shadow-md group"
            >
              {recentCover ? (
                <img
                  src={recentCover.thumbnailUrl || recentCover.url}
                  alt="Đã lưu gần đây"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                <span className="text-xs font-bold text-white leading-tight drop-shadow-md">
                  Đã lưu gần đây
                </span>
              </div>
            </div>

            {/* Card 3: Carousels (Nhiều ảnh) */}
            <div
              onClick={onOpenCarousels}
              className="aspect-square rounded-2xl relative overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer active:scale-95 transition-all shadow-md group"
            >
              {carouselCover ? (
                <img
                  src={carouselCover.thumbnailUrl || carouselCover.url}
                  alt="Carousels"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center" />
              )}
              <div className="absolute top-2 right-2">
                <Layers className="w-4 h-4 text-white drop-shadow-md" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                <span className="text-xs font-bold text-white leading-tight drop-shadow-md">
                  Carousels
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MỤC 3: ALBUM */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xl font-bold text-white">
            <span>Album</span>
          </div>

          <button
            onClick={() => toggleSection("albums")}
            className="ios-circle-btn w-7 h-7 rounded-full flex items-center justify-center text-blue-400 active:scale-95 transition-transform"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {postAlbums.length > 0 && !collapsed["albums"] && (
          <div className="grid grid-cols-2 gap-3">
            {postAlbums.slice(0, 4).map((album) => (
              <div
                key={album.id}
                onClick={() => onSelectAlbum(album)}
                className="rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer active:scale-95 transition-all shadow-md group"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={album.coverPhoto.thumbnailUrl || album.coverPhoto.url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold text-white">
                    <Layers className="w-3 h-3 text-cyan-400" />
                    <span>{album.photos.length}</span>
                  </div>
                </div>
                <div className="p-2.5">
                  <h4 className="font-bold text-xs text-white truncate">
                    {album.title}
                  </h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {album.photos.length} ảnh
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MỤC 4: NGƯỜI (HOẶC TÁC GIẢ INSTAGRAM) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => toggleSection("people")}
            className="flex items-center gap-1.5 text-xl font-bold text-white active:opacity-70"
          >
            <span>Người</span>
            <ChevronRight className="w-5 h-5 text-neutral-500 stroke-[2.5]" />
          </button>

          <button
            onClick={() => toggleSection("people")}
            className="ios-circle-btn w-7 h-7 rounded-full flex items-center justify-center text-blue-400 active:scale-95 transition-transform"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                collapsed["people"] ? "-rotate-90" : ""
              }`}
            />
          </button>
        </div>

        {!collapsed["people"] && (
          <div className="grid grid-cols-3 gap-2.5">
            {featuredCreators.slice(0, 3).map((creator) => (
              <div
                key={creator.author}
                onClick={() => onSelectCreator(creator.author)}
                className="aspect-square rounded-2xl relative overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer active:scale-95 transition-all shadow-md group"
              >
                <img
                  src={creator.cover}
                  alt={creator.author}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-2.5">
                  <span className="text-xs font-bold text-white leading-tight drop-shadow-md truncate w-full">
                    @{creator.author}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MỤC 5: ẢNH NỔI BẬT */}
      {photos.length > 3 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => toggleSection("featured")}
              className="flex items-center gap-1.5 text-xl font-bold text-white active:opacity-70"
            >
              <span>Ảnh nổi bật</span>
              <ChevronRight className="w-5 h-5 text-neutral-500 stroke-[2.5]" />
            </button>

            <button
              onClick={() => toggleSection("featured")}
              className="ios-circle-btn w-7 h-7 rounded-full flex items-center justify-center text-blue-400 active:scale-95 transition-transform"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  collapsed["featured"] ? "-rotate-90" : ""
                }`}
              />
            </button>
          </div>

          {!collapsed["featured"] && (
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(0, 6).map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => onSelectPhoto(photo)}
                  className="aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
