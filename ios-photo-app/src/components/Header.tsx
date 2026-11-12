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
  const filterTabs = [
    { id: "Tất cả", label: "Tất cả" },
    { id: "Hôm nay", label: "Hôm nay" },
    { id: "Tuần này", label: "Tuần này" },
    { id: "Yêu thích", label: "❤️ Yêu thích" },
    { id: "Album", label: "Album" },
  ];

  return (
    <header className="sticky top-0 z-30 pt-[var(--sat)] bg-black/60 backdrop-blur-2xl border-b border-white/[0.08] transition-colors">
      {/* Top Bar with Title & Settings */}
      <div className="flex items-center justify-between px-4 pt-2 pb-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            Ảnh
            <span className="text-xs font-semibold text-white/90 bg-white/15 border border-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-sm">
              {photoCount}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings button: Larger 44x44px touch target with liquid glass feel */}
          <button
            onClick={onOpenSettings}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 border border-white/20 active:bg-white/20 text-white shadow-lg active:scale-95 transition-all duration-150"
            title="Cài đặt Telegram"
          >
            <Settings className="w-5 h-5 text-neutral-100" />
          </button>
        </div>
      </div>

      {/* Liquid Glass Segmented Filter Bar: Larger, balanced, easy to tap */}
      <div className="px-3.5 pb-2.5">
        <div className="flex p-1.5 liquid-glass-card rounded-2xl text-xs font-medium overflow-x-auto no-scrollbar gap-1">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onFilterChange(tab.id)}
                className={`flex-1 min-w-[72px] py-2.5 px-3 rounded-xl transition-all duration-200 text-center whitespace-nowrap active:scale-95 flex items-center justify-center gap-1.5 ${
                  isActive
                    ? "liquid-glass-active text-white font-bold shadow-md"
                    : "text-neutral-400 hover:text-neutral-200 active:bg-white/5"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
