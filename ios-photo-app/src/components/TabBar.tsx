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
        paddingBottom: "max(calc(var(--sab) - 14px), 8px)",
      }}
      className="fixed inset-x-0 bottom-0 z-30 pointer-events-none px-3 flex items-end justify-center gap-2"
    >
      {/* Viên nang lớn chứa các Tab chính với hiệu ứng mờ kính (Frosted Glass Blur) */}
      <nav
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
        className="pointer-events-auto flex items-center bg-[#18181c]/75 border border-white/10 rounded-full p-1 shadow-2xl shadow-black/80 min-h-[56px]"
      >
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
              className={`flex flex-col items-center justify-center px-3.5 py-1.5 min-w-[64px] rounded-full transition-all duration-200 active:scale-95 ${
                isActive
                  ? "bg-[#2c2c2e]/90 border border-white/15 text-[#ff375f] shadow-sm"
                  : "text-white hover:text-neutral-200 active:opacity-70"
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 transition-transform duration-200 ${
                  isActive ? "text-[#ff375f] stroke-[2.4]" : "text-white stroke-[2]"
                }`}
              />
              <span
                className={`text-[11px] tracking-tight leading-tight ${
                  isActive ? "font-bold text-[#ff375f]" : "font-semibold text-white"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Cột dọc chứa nút Thêm (+) và nút Tìm kiếm (Search) đồng bộ style và thẳng hàng */}
      <div className="flex flex-col items-center gap-2 pointer-events-none">
        {/* Nút Thêm link Instagram (+) style kính tối màu chuẩn iOS */}
        <button
          onClick={onOpenAddPhoto}
          style={{
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
          className="pointer-events-auto w-[56px] h-[56px] rounded-full flex items-center justify-center bg-[#18181c]/75 border border-white/10 shadow-2xl shadow-black/80 transition-all duration-200 active:scale-95 shrink-0 text-white hover:text-neutral-200"
          title="Tải ảnh mới từ Instagram"
        >
          <Plus className="w-6 h-6 stroke-[2.4]" />
        </button>

        {/* Nút Tìm kiếm hình tròn riêng biệt với hiệu ứng mờ kính */}
        <button
          onClick={() => onTabChange("search")}
          style={{
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
          className={`pointer-events-auto w-[56px] h-[56px] rounded-full flex items-center justify-center bg-[#18181c]/75 border border-white/10 shadow-2xl shadow-black/80 transition-all duration-200 active:scale-95 shrink-0 ${
            isSearchActive
              ? "bg-[#2c2c2e]/90 border-[#ff375f]/50 text-[#ff375f]"
              : "text-white hover:text-neutral-200"
          }`}
          title="Tìm kiếm"
        >
          <Search
            className={`w-6 h-6 transition-transform duration-200 ${
              isSearchActive
                ? "text-[#ff375f] stroke-[2.8]"
                : "text-white stroke-[2.4]"
            }`}
          />
        </button>
      </div>
    </div>
  );
};
