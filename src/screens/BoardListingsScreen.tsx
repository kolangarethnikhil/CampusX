import { ArrowLeft, Share2, MapPin, Bookmark, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import type { UiListing } from "../types/listing";

interface Listing {
  id: string | number;
  title: string;
  price: string;
  priceUnit: string;
  location: string;
  distance: string;
  tag: string;
  tags: string[];
  author: string;
  timeAgo: string;
  description: string;
  saved?: boolean;
  sourceType?: "housing" | "market" | "board";
  raw?: unknown;
}

const boardMeta: Record<
  string,
  { title: string; subtitle: string; emoji: string; accent: string }
> = {
  Housing: {
    title: "Housing",
    subtitle: "PGs & roommates near campus",
    emoji: "🏠",
    accent: "#f59e0b",
  },
  Essentials: {
    title: "Essentials",
    subtitle: "Furniture, books & student deals",
    emoji: "🛋️",
    accent: "#f472b6",
  },
  Internships: {
    title: "Internships",
    subtitle: "Leads & referrals",
    emoji: "💼",
    accent: "#8b5cf6",
  },
  "Part-time": {
    title: "Part-time",
    subtitle: "Flexible work opportunities",
    emoji: "💰",
    accent: "#22c55e",
  },
  "Dev Club": {
    title: "Dev Club",
    subtitle: "Code & projects",
    emoji: "💻",
    accent: "#3b82f6",
  },
  Sports: {
    title: "Sports",
    subtitle: "Games & events",
    emoji: "⚽",
    accent: "#06b6d4",
  },
  Social: {
    title: "Social",
    subtitle: "Hangouts & parties",
    emoji: "🎉",
    accent: "#ec4899",
  },
};

interface BoardListingsScreenProps {
  boardName: string;
  onBack: () => void;
  listings?: UiListing[];
  loading?: boolean;
  onOpenListing: (listing: UiListing) => void;
}

export default function BoardListingsScreen({
  boardName,
  listings,
  loading,
  onBack,
  onOpenListing,
}: BoardListingsScreenProps) {
  const boardBase =
    boardMeta[boardName] || {
      title: boardName,
      subtitle: "",
      emoji: "📋",
      accent: "#8b5cf6",
    };

  const board = useMemo(
    () => ({
      ...boardBase,
      listings: (listings || []) as Listing[],
    }),
    [boardBase, listings]
  );

  const [savedIds, setSavedIds] = useState<Set<string | number>>(
    new Set(board.listings.filter((l) => l.saved).map((l) => l.id))
  );

  const toggleSave = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();

    setSavedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="relative flex items-center gap-3 pt-14 px-4 pb-4 bg-gradient-radial">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full glass interactive-glass flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-cx-text" />
        </button>

        <div className="flex items-center gap-2.5 flex-1">
          <span className="text-xl">{board.emoji}</span>
          <div>
            <h2 className="text-[17px] font-semibold text-cx-text">
              {board.title}
            </h2>
            <p className="text-cx-text-muted text-[10px] tracking-wide uppercase">
              {board.subtitle}
            </p>
          </div>
        </div>

        <span
          className="text-[10px] font-medium px-3 py-1.5 rounded-full"
          style={{
            background: `${board.accent}12`,
            color: board.accent,
          }}
        >
          {board.listings.length} posts
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 bg-gradient-mesh">
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl glass-subtle p-8 text-center text-[12px] text-cx-text-muted shimmer">
              Loading posts...
            </div>
          ) : board.listings.length === 0 ? (
            <div className="rounded-2xl glass-subtle p-8 text-center">
              <p className="text-[14px] font-semibold text-cx-text mb-1">
                No posts yet
              </p>
              <p className="text-[11px] text-cx-text-muted">
                Real posts from Firebase will appear here.
              </p>
            </div>
          ) : (
            board.listings.map((listing, i) => (
              <button
                key={listing.id}
                onClick={() =>
                  onOpenListing({
                    ...listing,
                    id: String(listing.id),
                    sourceType: listing.sourceType || "board",
                  })
                }
                className="w-full glass-elevated rounded-2xl overflow-hidden text-left interactive-glass animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="relative h-28 flex flex-col justify-between p-4"
                  style={{
                    background: `linear-gradient(135deg, ${board.accent}10 0%, transparent 70%)`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="text-[9px] font-semibold tracking-wider uppercase text-white px-2.5 py-1 rounded-full"
                      style={{ background: `${board.accent}` }}
                    >
                      {listing.tag}
                    </span>

                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => toggleSave(listing.id, e)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          savedIds.has(listing.id)
                            ? "bg-cx-purple/20 text-cx-purple"
                            : "glass text-cx-text-secondary"
                        }`}
                      >
                        <Bookmark
                          size={13}
                          fill={savedIds.has(listing.id) ? "currentColor" : "none"}
                        />
                      </button>

                      <div className="w-8 h-8 rounded-full glass flex items-center justify-center text-cx-text-secondary">
                        <Share2 size={13} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-cx-text text-[10px]">₹</span>
                    <span className="text-cx-text text-[26px] font-semibold leading-none ml-0.5">
                      {listing.price.replace("₹", "")}
                    </span>
                    <span className="text-cx-text-muted text-[10px] ml-1">
                      {listing.priceUnit}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-[15px] font-semibold text-cx-text mb-1">
                    {listing.title}
                  </h3>

                  <p className="text-cx-text-muted text-[12px] mb-3 line-clamp-1">
                    {listing.description}
                  </p>

                  <div className="flex items-center gap-1.5 mb-3">
                    <MapPin size={11} className="text-cx-text-muted" />
                    <span className="text-cx-text-secondary text-[10px] tracking-wide">
                      {listing.distance} · {listing.location}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {listing.tags.map((tag, j) => (
                      <span
                        key={j}
                        className="text-[9px] font-medium tracking-wider uppercase glass text-cx-text-secondary px-2 py-1 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                        style={{ background: board.accent }}
                      >
                        {listing.author[0]}
                      </div>
                      <span className="text-cx-text-secondary text-[11px]">
                        {listing.author}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-cx-text-muted">
                      <Clock size={10} />
                      <span className="text-[10px]">{listing.timeAgo}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}