import { Home, LayoutGrid, MessageCircle, User } from "lucide-react";

export type Tab = "home" | "boards" | "spaces" | "profile";

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}

export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <Home size={18} /> },
    { id: "boards", label: "Boards", icon: <LayoutGrid size={18} /> },
    { id: "spaces", label: "Spaces", icon: <MessageCircle size={18} /> },
    { id: "profile", label: "Profile", icon: <User size={18} /> },
  ];

  return (
    <nav className="relative flex items-center justify-around px-3 py-2 pb-3 bg-cx-bg/82 backdrop-blur-2xl border-t border-white/[0.055] shadow-[0_-18px_46px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cx-purple/30 to-transparent" />
      {tabs.map((tab) => {
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`relative flex flex-col items-center gap-1 rounded-2xl transition-all duration-300 group ${
              isActive ? "px-4 py-2.5" : "px-4 py-2"
            }`}
          >
            {isActive && (
              <div className="absolute inset-0 bg-white/[0.065] rounded-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />
            )}

            {isActive && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cx-purple shadow-[0_0_10px_rgba(139,92,246,0.85)]" />
            )}

            <span
              className={`relative transition-all duration-300 ${
                isActive
                  ? "text-cx-text scale-105"
                  : "text-cx-text-muted group-hover:text-cx-text-secondary"
              }`}
            >
              {tab.icon}
            </span>
            <span
              className={`relative text-[9px] font-medium tracking-wide transition-all duration-300 ${
                isActive ? "text-cx-text" : "text-cx-text-muted group-hover:text-cx-text-secondary"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
