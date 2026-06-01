import { Search } from "lucide-react";
import { useState } from "react";
import AppIcon, { type AppIconName } from "../components/AppIcon";

interface Board {
  icon: AppIconName;
  title: string;
  description: string;
  accent: string;
}

const boards: Board[] = [
  {
    icon: "homeRent",
    title: "Housing",
    description: "PGs & roommates",
    accent: "#f59e0b",
  },
  {
    icon: "sofa",
    title: "Essentials",
    description: "Furniture, books & more",
    accent: "#f472b6",
  },
  {
    icon: "briefcase",
    title: "Internships",
    description: "Leads & referrals",
    accent: "#8b5cf6",
  },
  {
    icon: "moneyBag",
    title: "Part-time",
    description: "Flexible work",
    accent: "#22c55e",
  },
  {
    icon: "laptop",
    title: "Dev Club",
    description: "Code & projects",
    accent: "#3b82f6",
  },
  {
    icon: "football",
    title: "Sports",
    description: "Games & events",
    accent: "#06b6d4",
  },
  {
    icon: "networking",
    title: "Social",
    description: "Hangouts & parties",
    accent: "#ec4899",
  },
];

interface BoardsScreenProps {
  counts: Record<string, number>;
  onOpenBoard: (boardName: string) => void;
}

export default function BoardsScreen({ counts, onOpenBoard }: BoardsScreenProps) {
  const [search, setSearch] = useState("");

  const filteredBoards = boards.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="relative pt-14 px-5 pb-5 bg-gradient-radial">
        <div className="mb-1">
          <h1 className="text-[28px] font-semibold text-cx-text tracking-tight">
            Campus <span className="text-cx-purple">Boards</span>
          </h1>
        </div>

        <p className="text-cx-text-muted text-[11px] tracking-wide mb-6">
          No WhatsApp chaos. Just useful spaces.
        </p>

        <div className="relative">
          <Search
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-cx-text-muted"
          />
          <input
            type="text"
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full input-premium rounded-2xl pl-11 pr-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4 bg-gradient-mesh">
        <div className="grid grid-cols-2 gap-3">
          {filteredBoards.map((board, i) => {
            const count = counts[board.title] || 0;

            return (
              <button
                key={board.title}
                onClick={() => onOpenBoard(board.title)}
                className="relative group animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div
                  className="relative rounded-[24px] p-4 text-left overflow-hidden interactive-glass transition-all duration-300 border border-white/[0.045] min-h-[148px]"
                  style={{
                    background: `linear-gradient(135deg, ${board.accent}09 0%, rgba(255,255,255,0.018) 64%)`,
                    borderColor: `${board.accent}16`,
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[24px]"
                    style={{
                      background: `radial-gradient(circle at 20% 20%, ${board.accent}14, transparent 60%)`,
                    }}
                  />

                  <div
                    className="absolute top-0 left-4 right-4 h-[1.5px] opacity-45"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${board.accent}, transparent)`,
                    }}
                  />

                  <div className="relative flex flex-col h-full">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 overflow-hidden border border-white/[0.04]"
                      style={{ background: `${board.accent}12` }}
                    >
                      <AppIcon name={board.icon} size={39} />
                    </div>

                    <h3
                      className="text-[15px] font-semibold mb-1 transition-colors tracking-[-0.02em]"
                      style={{ color: board.accent }}
                    >
                      {board.title}
                    </h3>

                    <p className="text-cx-text-muted text-[11px] mb-3">
                      {board.description}
                    </p>

                    <span
                      className="inline-flex w-fit text-[9px] font-medium tracking-wider uppercase px-2.5 py-1 rounded-full mt-auto"
                      style={{
                        background: `${board.accent}12`,
                        color: board.accent,
                      }}
                    >
                      {count} posts
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}