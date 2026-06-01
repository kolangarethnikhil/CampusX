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

const boardListings: Record<string, { title: string; subtitle: string; emoji: string; accent: string; listings: Listing[] }> = {
  "Housing": {
    title: "Housing",
    subtitle: "PGs & roommates near campus",
    emoji: "🏠",
    accent: "#f59e0b",
    listings: [
      {
        id: 1,
        title: "1bhk near Hanuman Arch",
        price: "₹12,500",
        priceUnit: "/ MONTH",
        location: "51, K.Narayanapura, Kothanur",
        distance: "773 M FROM KJU",
        tag: "1BHK",
        tags: ["UNFURNISHED", "BOYS ONLY"],
        author: "Rahul",
        timeAgo: "2m ago",
        description: "Spacious 1BHK with balcony. Water & power backup included.",
        saved: true,
      },
      {
        id: 2,
        title: "2bhk near Falcon",
        price: "₹18,000",
        priceUnit: "/ MONTH",
        location: "Lingarajapura, Bangalore",
        distance: "6.0 KM FROM KJU",
        tag: "2BHK",
        tags: ["UNFURNISHED", "AVAILABLE"],
        author: "Amit",
        timeAgo: "1h ago",
        description: "2BHK flat, ground floor. Near bus stop.",
      },
      {
        id: 3,
        title: "PG for boys - Triple sharing",
        price: "₹6,500",
        priceUnit: "/ MONTH",
        location: "K.Narayanapura, Kothanur",
        distance: "500 M FROM KJU",
        tag: "PG",
        tags: ["FURNISHED", "BOYS ONLY", "FOOD INCLUDED"],
        author: "Suresh PG",
        timeAgo: "3h ago",
        description: "AC rooms with food. WiFi included.",
      },
    ],
  },
  "Internships": {
    title: "Internships",
    subtitle: "Leads & referrals",
    emoji: "💼",
    accent: "#8b5cf6",
    listings: [
      {
        id: 10,
        title: "Frontend Developer Intern",
        price: "₹15,000",
        priceUnit: "/ MONTH",
        location: "Bangalore, Remote",
        distance: "REMOTE FRIENDLY",
        tag: "FRONTEND",
        tags: ["REACT", "3 MONTHS", "STIPEND"],
        author: "Tech Startup",
        timeAgo: "1h ago",
        description: "Looking for React developers. College students preferred.",
      },
    ],
  },
  "Part-time": {
    title: "Part-time",
    subtitle: "Flexible work opportunities",
    emoji: "💰",
    accent: "#22c55e",
    listings: [
      {
        id: 20,
        title: "Content Writer needed",
        price: "₹8,000",
        priceUnit: "/ MONTH",
        location: "Remote",
        distance: "REMOTE",
        tag: "WRITING",
        tags: ["FLEXIBLE", "REMOTE"],
        author: "Priya",
        timeAgo: "15m ago",
        description: "Need content writers for blog posts. 3-4 hours daily.",
      },
    ],
  },
  "Dev Club": {
    title: "Dev Club",
    subtitle: "Code & projects",
    emoji: "💻",
    accent: "#3b82f6",
    listings: [
      {
        id: 30,
        title: "Hackathon this weekend!",
        price: "FREE",
        priceUnit: "",
        location: "KJU Main Hall",
        distance: "ON CAMPUS",
        tag: "EVENT",
        tags: ["AI/ML", "PRIZES", "FOOD"],
        author: "Dev Club",
        timeAgo: "30m ago",
        description: "24hr hackathon. Teams of 4. Cash prizes up to ₹50,000.",
      },
    ],
  },
  "Sports": {
    title: "Sports",
    subtitle: "Games & events",
    emoji: "⚽",
    accent: "#06b6d4",
    listings: [
      {
        id: 40,
        title: "Cricket match - Need 2 players",
        price: "FREE",
        priceUnit: "",
        location: "KJU Ground",
        distance: "ON CAMPUS",
        tag: "CRICKET",
        tags: ["EVENING", "FRIENDLY"],
        author: "Sports Club",
        timeAgo: "1h ago",
        description: "Evening match at 5pm. Need a batsman and a bowler.",
      },
    ],
  },
  "Social": {
    title: "Social",
    subtitle: "Hangouts & parties",
    emoji: "🎉",
    accent: "#ec4899",
    listings: [
      {
        id: 50,
        title: "Beach party this Saturday",
        price: "₹500",
        priceUnit: "/ PERSON",
        location: "Gokarna Beach",
        distance: "DAY TRIP",
        tag: "PARTY",
        tags: ["SATURDAY", "BUS ARRANGED"],
        author: "Social Club",
        timeAgo: "4h ago",
        description: "Bus from campus at 6am. Beach games, bonfire, music!",
      },
    ],
  },
};

interface BoardListingsScreenProps {
  boardName: string;
  onBack: () => void;
  listings?: UiListing[];
  onOpenListing: (listing: UiListing) => void;
}

export default function BoardListingsScreen({ boardName, listings, onBack, onOpenListing }: BoardListingsScreenProps) {
  const boardBase = boardListings[boardName] || { title: boardName, subtitle: "", emoji: "📋", accent: "#8b5cf6", listings: [] };
  const board = useMemo(() => ({ ...boardBase, listings: (listings?.length ? listings : boardBase.listings) as Listing[] }), [boardBase, listings]);
  const [savedIds, setSavedIds] = useState<Set<string | number>>(new Set(board.listings.filter(l => l.saved).map(l => l.id)));

  const toggleSave = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
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
            <h2 className="text-[17px] font-semibold text-cx-text">{board.title}</h2>
            <p className="text-cx-text-muted text-[10px] tracking-wide uppercase">{board.subtitle}</p>
          </div>
        </div>
        <span
          className="text-[10px] font-medium px-3 py-1.5 rounded-full"
          style={{ background: `${board.accent}12`, color: board.accent }}
        >
          {board.listings.length} posts
        </span>
      </div>

      {/* Listings */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 bg-gradient-mesh">
        <div className="space-y-3">
          {board.listings.map((listing, i) => (
            <button
              key={listing.id}
              onClick={() => onOpenListing({ ...listing, id: String(listing.id), sourceType: listing.sourceType || "board" })}
              className="w-full glass-elevated rounded-2xl overflow-hidden text-left interactive-glass animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Card header with gradient */}
              <div 
                className="relative h-28 flex flex-col justify-between p-4"
                style={{ background: `linear-gradient(135deg, ${board.accent}10 0%, transparent 70%)` }}
              >
                {/* Top row */}
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
                        savedIds.has(listing.id) ? "bg-cx-purple/20 text-cx-purple" : "glass text-cx-text-secondary"
                      }`}
                    >
                      <Bookmark size={13} fill={savedIds.has(listing.id) ? "currentColor" : "none"} />
                    </button>
                    <div className="w-8 h-8 rounded-full glass flex items-center justify-center text-cx-text-secondary">
                      <Share2 size={13} />
                    </div>
                  </div>
                </div>
                {/* Price */}
                <div>
                  <span className="text-cx-text text-[10px]">₹</span>
                  <span className="text-cx-text text-[26px] font-semibold leading-none ml-0.5">
                    {listing.price.replace("₹", "")}
                  </span>
                  <span className="text-cx-text-muted text-[10px] ml-1">{listing.priceUnit}</span>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4">
                <h3 className="text-[15px] font-semibold text-cx-text mb-1">{listing.title}</h3>
                <p className="text-cx-text-muted text-[12px] mb-3 line-clamp-1">{listing.description}</p>
                
                <div className="flex items-center gap-1.5 mb-3">
                  <MapPin size={11} className="text-cx-text-muted" />
                  <span className="text-cx-text-secondary text-[10px] tracking-wide">{listing.distance} · {listing.location}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {listing.tags.map((tag, j) => (
                    <span key={j} className="text-[9px] font-medium tracking-wider uppercase glass text-cx-text-secondary px-2 py-1 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                      style={{ background: board.accent }}
                    >
                      {listing.author[0]}
                    </div>
                    <span className="text-cx-text-secondary text-[11px]">{listing.author}</span>
                  </div>
                  <div className="flex items-center gap-1 text-cx-text-muted">
                    <Clock size={10} />
                    <span className="text-[10px]">{listing.timeAgo}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


