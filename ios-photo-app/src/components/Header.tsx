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
    <header className="sticky top-0 z-30 pt-[var(--sat)] liquid-glass-header transition-colors">
      <div className="flex items-center justify-between px-4 h-13">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Ảnh
            <span className="text-xs font-medium text-neutral-300 liquid-glass-subtle px-2.5 py-0.5 rounded-full">
              {photoCount}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 flex items-center justify-center rounded-full liquid-glass-lens text-neutral-200 active:scale-90"
            title="Cài đặt Telegram"
          >
            <Settings className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* iOS Segmented Control - Apple Liquid Glass Capsule */}
      <div className="px-3.5 pb-2.5 pt-0.5">
        <div className="flex p-1 liquid-glass-pill-container rounded-full text-xs font-medium text-neutral-300 overflow-x-auto no-scrollbar">
          {["Tất cả", "Hôm nay", "Tuần này", "Yêu thích", "Album"].map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => onFilterChange(tab)}
                className={`flex-1 min-w-[64px] py-1.5 px-2 rounded-full transition-all duration-200 text-center whitespace-nowrap active:scale-95 ${
                  isActive
                    ? "liquid-glass-pill-active"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {tab === "Yêu thích" ? "❤️ " + tab : tab}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
