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
    <nav className="fixed inset-x-0 bottom-0 z-30 pb-[var(--sab)] bg-black/90 backdrop-blur-md border-t border-neutral-800">
      <div className="flex justify-around items-center h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive ? "text-blue-500 font-semibold" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
