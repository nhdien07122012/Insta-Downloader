import React from "react";
import { Image, Sparkles, Folder, Search } from "lucide-react";

interface TabBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: "library", label: "Thư viện", icon: Image },
    { id: "memories", label: "Kỷ niệm", icon: Sparkles },
    { id: "albums", label: "Album", icon: Folder },
    { id: "search", label: "Tìm kiếm", icon: Search },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none pb-[var(--sab)] px-4 pt-2">
      <nav className="pointer-events-auto max-w-md mx-auto mb-2 liquid-glass-pill rounded-full p-1.5 shadow-2xl flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full transition-all duration-200 active:scale-95 min-h-[52px] ${
                isActive
                  ? "liquid-glass-active text-white font-semibold shadow-md"
                  : "text-neutral-400 hover:text-white active:bg-white/5"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 transition-transform duration-200 ${isActive ? "scale-110 text-blue-400 stroke-[2.2]" : "stroke-[1.8]"}`} />
              <span className={`text-[11px] tracking-tight ${isActive ? "text-white font-bold" : "text-neutral-400"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
