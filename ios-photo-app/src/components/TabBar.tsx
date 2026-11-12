import React from "react";
import { Search } from "lucide-react";

interface TabBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  currentTab,
  onTabChange,
  activeFilter,
  onFilterChange,
}) => {
  const isLibrary = currentTab === "library";
  const isCollections = currentTab === "collections";
  const isSearch = currentTab === "search";

  const filters = ["Năm", "Tháng", "Tất cả"];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none pb-[calc(var(--sab)+10px)] px-4">
      <div className="pointer-events-auto max-w-md mx-auto flex items-center justify-center gap-2.5">
        {/* Nút tròn bên trái: Biểu tượng 2 ảnh xếp chồng màu xanh Cyan (Apple Photos Icon) */}
        <button
          onClick={() => {
            if (isCollections) {
              onTabChange("library");
            } else {
              onTabChange("collections");
            }
          }}
          className={`apple-glass-lens w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 shadow-2xl ${
            isCollections ? "ring-2 ring-cyan-400/60" : ""
          }`}
          title={isCollections ? "Xem Thư viện" : "Xem Bộ sưu tập"}
        >
          {/* Exact Apple Photos overlapping photos icon */}
          <svg
            className="w-7 h-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect
              x="2"
              y="6"
              width="15"
              height="14"
              rx="3"
              fill="#0ea5e9"
              fillOpacity="0.4"
              stroke="#38bdf8"
            />
            <path
              d="M7 3h11a3 3 0 0 1 3 3v12"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <circle cx="7" cy="11" r="1.5" fill="#38bdf8" />
            <path
              d="m4 17 4-4 2.5 2.5 3.5-3.5 3 4"
              stroke="#e0f2fe"
              strokeWidth="1.8"
            />
          </svg>
        </button>

        {/* Viên nang kính lỏng trung tâm (Apple Liquid Glass Capsule: Năm | Tháng | Tất cả) */}
        <div className="apple-glass-lens rounded-full p-1.5 flex items-center gap-1 shadow-2xl h-14">
          {filters.map((f) => {
            const isActive = activeFilter === f && isLibrary;
            return (
              <button
                key={f}
                onClick={() => {
                  onFilterChange(f);
                  if (!isLibrary) onTabChange("library");
                }}
                className={`min-w-[72px] px-4 py-2 rounded-full font-bold text-sm tracking-tight transition-all duration-200 active:scale-95 whitespace-nowrap text-center ${
                  isActive
                    ? "apple-glass-pill-active text-white shadow-lg drop-shadow"
                    : "text-white/85 hover:text-white"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Nút tròn bên phải: Tìm kiếm kính lúp (Search Glass Circle) */}
        <button
          onClick={() => onTabChange("search")}
          className={`apple-glass-lens w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 shadow-2xl ${
            isSearch ? "ring-2 ring-cyan-400/60" : ""
          }`}
          title="Tìm kiếm"
        >
          <Search className="w-6 h-6 stroke-[2.8] text-white" />
        </button>
      </div>
    </div>
  );
};
