import React from "react";
import { Settings } from "lucide-react";

interface HeaderProps {
  photoCount: number;
  onOpenSettings: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  photoCount,
  onOpenSettings,
  activeFilter,
  onFilterChange,
}) => {
  return (
    <header className="sticky top-0 z-30 pt-[var(--sat)] bg-black/90 backdrop-blur-md border-b border-neutral-800 transition-colors">
      <div className="flex items-center justify-between px-4 h-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Ảnh
            <span className="text-xs font-normal text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
              {photoCount}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-800/80 active:bg-neutral-700 text-neutral-300 transition-colors"
            title="Cài đặt Telegram"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* iOS Segmented Control */}
      <div className="px-4 pb-2">
        <div className="flex p-1 bg-neutral-900/90 rounded-lg text-xs font-medium text-neutral-400 overflow-x-auto scrollbar-none">
          {["Tất cả", "Hôm nay", "Tuần này", "Yêu thích", "Album"].map((tab) => (
            <button
              key={tab}
              onClick={() => onFilterChange(tab)}
              className={`flex-1 min-w-[64px] py-1.5 rounded-md transition-all text-center whitespace-nowrap ${
                activeFilter === tab
                  ? "bg-neutral-700 text-white shadow-sm font-semibold"
                  : "hover:text-neutral-200"
              }`}
            >
              {tab === "Yêu thích" ? "❤️ " + tab : tab}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
