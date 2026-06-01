import { ArrowLeft, MapPin, Share2, AlertTriangle, Users, Calendar, Home, Wrench } from "lucide-react";

interface ListingDetail {
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
}

interface ListingDetailScreenProps {
  listing: ListingDetail;
  onBack: () => void;
}

export default function ListingDetailScreen({ listing, onBack }: ListingDetailScreenProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cx-bg">
      {/* Header */}
      <div className="relative flex items-center gap-3 pt-14 px-4 pb-4 bg-gradient-radial">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full glass interactive-glass flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-cx-text" />
        </button>
        <span className="text-[11px] font-medium tracking-[0.15em] text-cx-text-muted uppercase">
          Listing Details
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 bg-gradient-mesh">
        {/* Hero image placeholder */}
        <div className="relative rounded-3xl overflow-hidden mb-5 h-52 bg-gradient-to-br from-cx-card-elevated to-cx-card flex items-center justify-center">
          <div className="text-center">
            <span className="text-5xl block mb-3">🏠</span>
            <span className="text-cx-text-secondary text-[11px] tracking-wider uppercase glass px-4 py-1.5 rounded-full">
              Tap to View
            </span>
          </div>
          {/* Image dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cx-purple" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Title & Price */}
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold text-cx-text mb-3 tracking-tight">{listing.title}</h1>
          <div className="flex items-baseline gap-1">
            <span className="text-cx-purple text-[16px] font-medium">₹</span>
            <span className="text-[40px] font-semibold text-cx-text leading-none tracking-tight">
              {listing.price.replace("₹", "")}
            </span>
            <span className="text-cx-text-muted text-[12px] tracking-wide uppercase ml-2">
              {listing.priceUnit}
            </span>
          </div>
        </div>

        {/* Location card */}
        <div className="glass-elevated rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} className="text-cx-purple" />
            <span className="text-[10px] font-medium tracking-[0.15em] text-cx-purple uppercase">Location</span>
          </div>
          <p className="text-cx-text text-[14px] mb-4 leading-relaxed">{listing.location}</p>
          {/* Map placeholder */}
          <div className="rounded-xl h-32 glass flex items-center justify-center mb-3">
            <div className="text-center">
              <MapPin size={22} className="text-red-400 mx-auto mb-1" />
              <span className="text-cx-text-muted text-[11px]">Map View</span>
            </div>
          </div>
          <p className="text-cx-text-secondary text-[10px] font-medium tracking-wide uppercase">{listing.distance} BY ROAD</p>
          <p className="text-cx-text-muted text-[10px] tracking-wide">3 MIN TRAVEL</p>
        </div>

        {/* Description */}
        <div className="glass-elevated rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Home size={15} className="text-cx-text-secondary" />
            <span className="text-[10px] font-medium tracking-[0.15em] text-cx-text-secondary uppercase">Description</span>
          </div>
          <p className="text-cx-text text-[14px] leading-relaxed">{listing.description}</p>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="glass-elevated rounded-2xl p-4">
            <span className="text-[10px] font-medium tracking-[0.12em] text-cx-text-muted uppercase block mb-2">Deposit</span>
            <span className="text-cx-text text-[18px] font-semibold">₹40,000</span>
          </div>
          <div className="glass-elevated rounded-2xl p-4">
            <span className="text-[10px] font-medium tracking-[0.12em] text-cx-text-muted uppercase block mb-2">Maintenance</span>
            <span className="text-cx-text text-[18px] font-semibold">₹0</span>
          </div>
          <div className="glass-elevated rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Wrench size={12} className="text-cx-text-muted" />
              <span className="text-[10px] font-medium tracking-[0.12em] text-cx-text-muted uppercase">Furnishing</span>
            </div>
            <span className="text-cx-text text-[15px] font-medium">
              {listing.tags.includes("FURNISHED") ? "Furnished" : "Unfurnished"}
            </span>
          </div>
          <div className="glass-elevated rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar size={12} className="text-cx-text-muted" />
              <span className="text-[10px] font-medium tracking-[0.12em] text-cx-text-muted uppercase">Available</span>
            </div>
            <span className="text-cx-text text-[15px] font-medium">1 Jun 2026</span>
          </div>
        </div>

        {/* Preference */}
        <div className="glass-elevated rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={15} className="text-cx-green" />
            <span className="text-[10px] font-medium tracking-[0.15em] text-cx-green uppercase">Preference</span>
          </div>
          <p className="text-cx-text text-[15px] font-medium">
            {listing.tags.includes("BOYS ONLY") ? "Boys only" : "No preference"}
          </p>
        </div>

        {/* Safety Note */}
        <div className="rounded-2xl p-5 mb-4 border border-cx-amber/15 bg-cx-amber/[0.03]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-cx-amber" />
            <span className="text-[10px] font-medium tracking-[0.15em] text-cx-amber uppercase">Safety Note</span>
          </div>
          <p className="text-cx-text-secondary text-[13px] leading-relaxed">
            Do not pay advance before visiting. Meet in person, verify the room or item, and report suspicious listings.
          </p>
        </div>

        {/* Author */}
        <div className="glass-elevated rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cx-orange to-cx-amber flex items-center justify-center text-lg font-semibold text-white">
              {listing.author[0]}
            </div>
            <div>
              <h4 className="text-cx-text text-[16px] font-semibold">{listing.author}</h4>
              <p className="text-cx-text-muted text-[10px] tracking-wide uppercase">Campus Community</p>
            </div>
          </div>
        </div>

        {/* Share button */}
        <button className="w-full py-4 rounded-2xl glass flex items-center justify-center gap-2.5 hover:bg-white/[0.04] transition-all">
          <span className="text-[11px] font-medium tracking-[0.12em] text-cx-text-secondary uppercase">Share Listing</span>
          <Share2 size={14} className="text-cx-text-secondary" />
        </button>
      </div>
    </div>
  );
}


