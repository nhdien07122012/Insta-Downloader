import React from "react";
import { Settings, RefreshCw } from "lucide-react";

interface HeaderProps {
  photoCount: number;
  onOpenSettings: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // Chế độ chọn nhiều ảnh (Selection Mode)
  isSelectionMode?: boolean;
  selectedCount?: number;
  onToggleSelectionMode?: () => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  photoCount,
  onOpenSettings,
  activeFilter,
  onFilterChange,
  onRefresh,
  isRefreshing = false,
  isSelectionMode = false,
  selectedCount = 0,
  onToggleSelectionMode,
  onSelectAll,
  allSelected = false,
}) => {
  return (
    <header className="sticky top-0 z-30 pt-[var(--sat)] bg-black/90 backdrop-blur-md border-b border-neutral-800 transition-colors">
      <div className="flex items-center justify-between px-4 h-12">
        {isSelectionMode ? (
          // Header khi đang ở Chế độ Chọn nhiều ảnh (Chuẩn Apple Photos)
          <>
            <button
              onClick={onToggleSelectionMode}
              className="text-base font-medium text-blue-400 active:opacity-60 -ml-1 py-1 px-2 rounded-lg"
            >
              Hủy
            </button>

            <div className="text-center">
              <span className="text-base font-bold text-white tracking-tight">
                {selectedCount > 0 ? `Đã chọn ${selectedCount} mục` : "Chọn mục"}
              </span>
            </div>

            <button
              onClick={onSelectAll}
              className="text-sm font-semibold text-blue-400 active:opacity-60 py-1 px-2 rounded-lg"
            >
              {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
            </button>
          </>
        ) : (
          // Header bình thường
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Ảnh & Video
                <span className="text-xs font-normal text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                  {photoCount}
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Nút 'Chọn' kiểu Apple Photos */}
              {photoCount > 0 && onToggleSelectionMode && (
                <button
                  onClick={onToggleSelectionMode}
                  className="px-3 py-1 bg-neutral-800/80 active:bg-neutral-700 text-blue-400 text-xs font-semibold rounded-full transition-colors"
                >
                  Chọn
                </button>
              )}

              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-800/80 active:bg-neutral-700 text-cyan-400 transition-colors disabled:opacity-50"
                  title="Làm mới ảnh từ Telegram"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              )}
              <button
                onClick={onOpenSettings}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-800/80 active:bg-neutral-700 text-neutral-300 transition-colors"
                title="Cài đặt Telegram"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* iOS Segmented Control */}
      {!isSelectionMode && (
        <div className="px-4 pb-2">
          <div className="flex p-1 bg-neutral-900/90 rounded-lg text-xs font-medium text-neutral-400 overflow-x-auto scrollbar-none">
            {["Tất cả", "Video", "Hôm nay", "Tuần này", "Yêu thích", "Album"].map((tab) => (
              <button
                key={tab}
                onClick={() => onFilterChange(tab)}
                className={`flex-1 min-w-[64px] py-1.5 rounded-md transition-all text-center whitespace-nowrap ${
                  activeFilter === tab
                    ? "bg-neutral-700 text-white shadow-sm font-semibold"
                    : "hover:text-neutral-200"
                }`}
              >
                {tab === "Yêu thích" ? "❤️ " + tab : tab === "Video" ? "🎬 " + tab : tab}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
