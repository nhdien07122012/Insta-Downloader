import React from "react";
import { LayoutGrid, Sparkles, Folder, Settings, Search, Plus } from "lucide-react";

interface TabBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenSettings: () => void;
  onOpenAddPhoto: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  currentTab,
  onTabChange,
  onOpenSettings,
  onOpenAddPhoto,
}) => {
  const tabs = [
    { id: "library", label: "Thư viện", icon: LayoutGrid },
    { id: "memories", label: "Kỷ niệm", icon: Sparkles },
    { id: "albums", label: "Album", icon: Folder },
    { id: "settings", label: "Cài đặt", icon: Settings },
  ];

  const isSearchActive = currentTab === "search";

  return (
    <div
      style={{
        paddingBottom: "max(calc(var(--sab) - 24px), 4px)",
      }}
      className="fixed inset-x-0 bottom-0 z-30 pointer-events-none px-3 flex items-end justify-center gap-2.5 transition-all duration-300"
    >
      {/* Viên nang lớn chứa các Tab chính với hiệu ứng Apple Liquid Glass */}
      <nav className="pointer-events-auto flex items-center liquid-glass-dock rounded-full p-1.5 min-h-[58px]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          const handleClick = () => {
            if (tab.id === "settings") {
              onOpenSettings();
            } else {
              onTabChange(tab.id);
            }
          };

          return (
            <button
              key={tab.id}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center px-3.5 py-1.5 min-w-[64px] rounded-full transition-all duration-250 active:scale-95 ${
                isActive
                  ? "liquid-glass-tab-active text-[#ff375f]"
                  : "text-neutral-300 hover:text-white active:opacity-75"
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 transition-transform duration-200 ${
                  isActive ? "text-[#ff375f] stroke-[2.4] scale-105" : "text-neutral-300 stroke-[2]"
                }`}
              />
              <span
                className={`text-[11px] tracking-tight leading-tight ${
                  isActive ? "font-bold text-[#ff375f]" : "font-semibold text-neutral-300"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Cột dọc chứa nút Thêm (+) và nút Tìm kiếm (Search) đồng bộ style Liquid Glass lens & cùng kích thước */}
      <div className="flex flex-col items-center gap-2 pointer-events-none">
        {/* Nút Thêm link Instagram (+) style Liquid Glass trong suốt thuần khiết (không màu mè gradient) */}
        <button
          onClick={onOpenAddPhoto}
          className="pointer-events-auto w-[54px] h-[54px] rounded-full flex items-center justify-center liquid-glass-lens shrink-0 text-white active:scale-90"
          title="Tải ảnh mới từ Instagram"
        >
          <Plus className="w-6 h-6 stroke-[2.4]" />
        </button>

        {/* Nút Tìm kiếm hình tròn riêng biệt với hiệu ứng Apple Liquid Glass lens */}
        <button
          onClick={() => onTabChange("search")}
          className={`pointer-events-auto w-[54px] h-[54px] rounded-full flex items-center justify-center liquid-glass-lens shrink-0 active:scale-90 ${
            isSearchActive ? "liquid-glass-lens-active text-[#ff375f]" : "text-white"
          }`}
          title="Tìm kiếm"
        >
          <Search
            className={`w-6 h-6 transition-transform duration-200 ${
              isSearchActive
                ? "text-[#ff375f] stroke-[2.8] scale-105"
                : "text-white stroke-[2.4]"
            }`}
          />
        </button>
      </div>
    </div>
  );
};
