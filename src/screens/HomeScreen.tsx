import { Bell, ChevronRight, Search, Sparkles } from "lucide-react";
import AppIcon, { type AppIconName } from "../components/AppIcon";

const happeningNow: {
  icon: AppIconName;
  title: string;
  online: number;
  accent: string;
  subtitle: string;
}[] = [
  { icon: "technologist", title: "Dev Club", online: 14, accent: "#8b5cf6", subtitle: "Projects & internships" },
  { icon: "football", title: "Sports Club", online: 8, accent: "#06b6d4", subtitle: "Games & events" },
  { icon: "networking", title: "Music Lovers", online: 6, accent: "#f472b6", subtitle: "Playlists & jams" },
  { icon: "books", title: "Study Group", online: 15, accent: "#14b8a6", subtitle: "Notes & exam prep" },
];

const quickActions: {
  label: string;
  helper: string;
  icon: AppIconName;
  accent: string;
}[] = [
  { label: "Find room", helper: "No-broker leads", icon: "homeRent", accent: "#f59e0b" },
  { label: "Sell essentials", helper: "Furniture, books & more", icon: "sofa", accent: "#f472b6" },
  { label: "Ask campus", helper: "Get replies fast", icon: "networking", accent: "#22d3ee" },
];

interface HomeScreenProps {
  onOpenSpace: (spaceName: string) => void;
}

export default function HomeScreen({ onOpenSpace }: HomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="relative pt-14 px-5 pb-5 bg-gradient-radial overflow-hidden">
        <div className="absolute top-6 right-0 w-44 h-44 rounded-full bg-cx-purple/[0.08] blur-[56px] pointer-events-none" />
        <div className="absolute -top-10 left-12 w-40 h-40 rounded-full bg-cx-pink/[0.055] blur-[48px] pointer-events-none" />

        <div className="relative flex items-center justify-between mb-5">
          <div>
            <p className="text-cx-text-muted text-[10px] tracking-[0.22em] font-semibold uppercase">Good morning</p>
            <h1 className="text-[32px] font-semibold text-cx-text tracking-[-0.055em] leading-none mt-1">Nikhil</h1>
          </div>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full glass interactive-glass flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <Search size={17} className="text-cx-text-secondary" />
            </button>
            <button className="relative w-10 h-10 rounded-full glass interactive-glass flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <Bell size={17} className="text-cx-text-secondary" />
              <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-cx-lime shadow-[0_0_10px_rgba(163,230,53,0.7)]" />
            </button>
          </div>
        </div>

        <div className="relative glass-elevated premium-sheen rounded-[28px] p-5 mb-4 overflow-hidden animate-scale-in">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(139,92,246,0.17),transparent_42%),radial-gradient(circle_at_95%_20%,rgba(244,114,182,0.10),transparent_38%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cx-purple/15 border border-cx-purple/20 text-cx-purple-bright text-[9px] font-semibold tracking-wider uppercase mb-3">
              <Sparkles size={10} /> KJU campus layer
            </div>
            <h2 className="text-[25px] leading-[0.98] font-semibold text-cx-text tracking-[-0.055em] max-w-[265px]">
              Rooms, deals & useful campus spaces around KJU.
            </h2>
            <p className="mt-3 text-[12px] leading-relaxed text-cx-text-secondary max-w-[285px]">
              Find verified student posts, senior essentials and campus help in seconds.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Metric label="Rooms" value="18" tone="amber" />
              <Metric label="Deals" value="24" tone="pink" />
              <Metric label="Online" value="62" tone="green" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {quickActions.map((action, index) => (
            <button
              key={action.label}
              className="glass-subtle interactive-glass rounded-2xl p-3 text-left animate-fade-up min-h-[94px]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 overflow-hidden"
                style={{ background: `${action.accent}12` }}
              >
                <AppIcon name={action.icon} size={33} />
              </div>
              <p className="text-[11px] font-semibold text-cx-text leading-none">{action.label}</p>
              <p className="text-[9px] text-cx-text-muted mt-1 leading-tight">{action.helper}</p>
            </button>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-medium text-cx-text-secondary tracking-wide">Happening Now</h2>
            <div className="flex items-center gap-1 text-cx-lime text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-cx-lime animate-pulse" />
              Live
            </div>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-5 px-5">
            {happeningNow.map((space, i) => (
              <button
                key={space.title}
                onClick={() => onOpenSpace(space.title)}
                className="relative flex-shrink-0 group animate-fade-up"
                style={{ animationDelay: `${160 + i * 70}ms` }}
              >
                <div className="relative flex items-center gap-2.5 rounded-2xl glass-elevated px-3.5 py-3 interactive-glass min-w-[155px] overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 25% 40%, ${space.accent}18, transparent 68%)` }}
                  />
                  <div
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden"
                    style={{ background: `${space.accent}12` }}
                  >
                    <AppIcon name={space.icon} size={33} />
                  </div>
                  <div className="relative text-left min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-cx-text line-clamp-1">{space.title}</p>
                    <p className="text-[9px] text-cx-text-muted line-clamp-1">{space.subtitle}</p>
                    <div className="flex items-center gap-1 text-[10px] text-cx-lime mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cx-lime animate-pulse" />
                      <span>{space.online} online</span>
                    </div>
                  </div>
                  <ChevronRight size={13} className="relative text-cx-text-muted group-hover:text-cx-text-secondary group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gradient-mesh px-5 pt-3 pb-4">
        <div className="h-full rounded-[24px] border border-white/[0.045] bg-white/[0.018] flex items-center justify-center px-6 text-center animate-fade-up">
          <p className="text-[11px] leading-relaxed text-cx-text-muted">
            Open a board or live space to explore rooms, essentials and campus updates.
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "amber" | "pink" | "green" }) {
  const toneClass = {
    amber: "text-cx-amber bg-cx-amber/[0.08] border-cx-amber/15",
    pink: "text-cx-pink bg-cx-pink/[0.08] border-cx-pink/15",
    green: "text-cx-lime bg-cx-lime/[0.08] border-cx-lime/15",
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[16px] font-semibold leading-none">{value}</p>
      <p className="text-[8px] tracking-wider uppercase mt-1 opacity-80">{label}</p>
    </div>
  );
}
