import {
  ArrowLeft,
  Bookmark,
  Clock,
  MapPin,
  Plus,
  Share2,
} from "lucide-react";
import { type MouseEvent, useState } from "react";
import type { UiListing } from "../types/listing";

interface BoardMeta {
  title: string;
  subtitle: string;
  emoji: string;
  accent: string;
}

type CreateIntent = {
  type: "housing" | "market" | "board";
  boardName?: string;
  lockType?: boolean;
};

const boardMeta: Record<string, BoardMeta> = {
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
  onCreateListing?: (intent: CreateIntent) => void;
  onOpenListing: (listing: UiListing) => void;
}

function getCreateIntent(boardName: string): CreateIntent | null {
  if (boardName === "Housing") {
    return {
      type: "housing",
      boardName,
      lockType: true,
    };
  }

  if (boardName === "Essentials") {
    return {
      type: "market",
      boardName,
      lockType: true,
    };
  }

  if (
    ["Internships", "Part-time", "Dev Club", "Sports", "Social"].includes(
      boardName
    )
  ) {
    return {
      type: "board",
      boardName,
      lockType: true,
    };
  }

  return null;
}

function getCreateLabel(boardName: string) {
  if (boardName === "Housing") return "Post room";
  if (boardName === "Essentials") return "Sell item";
  if (boardName === "Internships") return "Post internship";
  if (boardName === "Part-time") return "Post work";
  if (boardName === "Sports") return "Post event";
  if (boardName === "Social") return "Post update";
  if (boardName === "Dev Club") return "Post update";

  return "Post";
}

function getEmptyCta(boardName: string) {
  if (boardName === "Housing") return "Post first room";
  if (boardName === "Essentials") return "Sell first item";
  if (boardName === "Internships") return "Post first internship";
  if (boardName === "Part-time") return "Post first work";
  if (boardName === "Sports") return "Post first event";
  if (boardName === "Social") return "Post first update";
  if (boardName === "Dev Club") return "Post first update";

  return "Create first post";
}

export default function BoardListingsScreen({
  boardName,
  listings = [],
  loading = false,
  onBack,
  onCreateListing,
  onOpenListing,
}: BoardListingsScreenProps) {
  const board =
    boardMeta[boardName] || {
      title: boardName,
      subtitle: "",
      emoji: "📋",
      accent: "#8b5cf6",
    };

  const [savedIds, setSavedIds] = useState<Set<string>>(
    new Set(listings.filter((listing) => listing.saved).map((listing) => listing.id))
  );

  const createIntent = getCreateIntent(boardName);
  const createLabel = getCreateLabel(boardName);

  const toggleSave = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    setSavedIds((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="rounded-2xl glass-subtle p-8 text-center text-[12px] text-cx-text-muted shimmer">
          Loading posts...
        </div>
      );
    }

    if (listings.length === 0) {
      return (
        <div className="rounded-[26px] glass-subtle p-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06]"
            style={{
              background: `${board.accent}12`,
              color: board.accent,
            }}
          >
            <Plus size={22} />
          </div>

          <p className="text-[15px] font-semibold text-cx-text mb-1">
            No posts yet
          </p>

          <p className="text-[11px] text-cx-text-muted max-w-[240px] mx-auto leading-relaxed">
            {createIntent
              ? "Be the first to post something useful for KJU students."
              : "Real posts from Firebase will appear here."}
          </p>

          {createIntent && (
            <button
              onClick={() => onCreateListing?.(createIntent)}
              className="mt-5 w-full rounded-2xl bg-white py-3 text-[11px] font-semibold text-black"
            >
              {getEmptyCta(boardName)}
            </button>
          )}
        </div>
      );
    }

    return listings.map((listing, index) => {
      const isSaved = savedIds.has(listing.id);

      return (
        <button
          key={listing.id}
          onClick={() => onOpenListing(listing)}
          className="w-full glass-elevated rounded-2xl overflow-hidden text-left interactive-glass animate-fade-up"
          style={{ animationDelay: `${index * 80}ms` }}
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
                style={{ background: board.accent }}
              >
                {listing.tag}
              </span>

              <div className="flex gap-1.5">
                <button
                  onClick={(event) => toggleSave(listing.id, event)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isSaved
                      ? "bg-cx-purple/20 text-cx-purple"
                      : "glass text-cx-text-secondary"
                  }`}
                >
                  <Bookmark
                    size={13}
                    fill={isSaved ? "currentColor" : "none"}
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
              {listing.tags.map((tag) => (
                <span
                  key={tag}
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
                  {listing.author[0] || "C"}
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
      );
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

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-xl">{board.emoji}</span>

          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-cx-text truncate">
              {board.title}
            </h2>

            <p className="text-cx-text-muted text-[10px] tracking-wide uppercase truncate">
              {board.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-medium px-3 py-1.5 rounded-full"
            style={{
              background: `${board.accent}12`,
              color: board.accent,
            }}
          >
            {listings.length} posts
          </span>

          {createIntent && (
            <button
              onClick={() => onCreateListing?.(createIntent)}
              className="h-9 px-3 rounded-full bg-white text-black text-[10px] font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <Plus size={13} />
              {createLabel}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 bg-gradient-mesh">
        <div className="space-y-3">{renderContent()}</div>
      </div>
    </div>
  );
}