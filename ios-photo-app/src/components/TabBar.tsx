import React from "react";
import { Images, Layers, Search } from "lucide-react";

interface TabBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ currentTab, onTabChange }) => {
  const isLibrary = currentTab === "library";
  const isCollections = currentTab === "collections";
  const isSearch = currentTab === "search";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none pb-[calc(var(--sab)+8px)] px-5">
      <div className="pointer-events-auto max-w-sm mx-auto flex items-center justify-center gap-2.5">
        {/* Main Floating Liquid Glass Capsule: Thư viện & Bộ sưu tập */}
        <div className="ios-photos-dock rounded-full p-1.5 flex items-center gap-1 shadow-2xl">
          {/* Nút: Thư viện */}
          <button
            onClick={() => onTabChange("library")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 active:scale-95 ${
              isLibrary
                ? "ios-photos-dock-active text-white font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Images className={`w-5 h-5 ${isLibrary ? "text-cyan-400" : "text-neutral-400"}`} />
            <span className="text-xs font-semibold tracking-tight">Thư viện</span>
          </button>

          {/* Nút: Bộ sưu tập */}
          <button
            onClick={() => onTabChange("collections")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 active:scale-95 ${
              isCollections
                ? "ios-photos-dock-active text-white font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Layers className={`w-5 h-5 ${isCollections ? "text-cyan-400" : "text-neutral-400"}`} />
            <span className="text-xs font-semibold tracking-tight">Bộ sưu tập</span>
          </button>
        </div>

        {/* Nút Tìm kiếm hình tròn riêng biệt (Search Circle Button) */}
        <button
          onClick={() => onTabChange("search")}
          className={`ios-photos-dock w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-2xl ${
            isSearch ? "ios-photos-dock-active text-cyan-400" : "text-neutral-400 hover:text-white"
          }`}
          title="Tìm kiếm"
        >
          <Search className={`w-5 h-5 ${isSearch ? "text-cyan-400 stroke-[2.5]" : "stroke-[2]"}`} />
        </button>
      </div>
    </div>
  );
};
