import {
  Edit3,
  ExternalLink,
  Home,
  IndianRupee,
  MapPin,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { HousingListing } from "../../services/housingService";
import { MarketListing } from "../../services/marketService";
import { getHousingLocationDisplay } from "../../utils/listingDisplay";

interface ListingDetailModalProps {
  listing: HousingListing | MarketListing | null;
  type: "housing" | "market";
  isOpen: boolean;
  onClose: () => void;
  onContact: (
    ownerId: string,
    listingId: string,
    title: string,
    type: string
  ) => void | Promise<void>;
  currentUserId?: string | null;
  poster?: {
    displayName?: string;
    photoURL?: string;
    campusRole?: string;
    verifiedStatus?: string;
  } | null;
  onOpenPoster?: () => void;
  onEdit?: (listing: HousingListing | MarketListing, type: "housing" | "market") => void;
  onDelete?: (listing: HousingListing | MarketListing, type: "housing" | "market") => void | Promise<void>;
  onCloseListing?: (listing: HousingListing | MarketListing, type: "housing" | "market") => void | Promise<void>;
  onReopenListing?: (listing: HousingListing | MarketListing, type: "housing" | "market") => void | Promise<void>;
  onMarkSold?: (listing: MarketListing) => void | Promise<void>;
}

export default function ListingDetailModal({
  listing,
  type,
  isOpen,
  onClose,
  onContact,
  currentUserId,
  poster,
  onOpenPoster,
  onEdit,
  onDelete,
  onCloseListing,
  onReopenListing,
  onMarkSold,
}: ListingDetailModalProps) {
  if (!isOpen || !listing) return null;

  const isHousing = type === "housing";
  const housing = listing as HousingListing;
  const market = listing as MarketListing;
  const isOwner = Boolean(currentUserId && listing.postedBy === currentUserId);

  const price = isHousing ? housing.rent : market.price;
  const status = listing.status || "available";
  const isClosed = status === "closed" || status === "sold";

  const location = isHousing
    ? getHousingLocationDisplay(housing)
    : {
        address: listing.formattedAddress || "Near KJU",
        distance: "",
        compact: listing.formattedAddress || "Near KJU",
      };

  const mapsUrl =
    isHousing && housing.googleMapsUrl
      ? housing.googleMapsUrl
      : isHousing && housing.latitude && housing.longitude
        ? `https://www.google.com/maps/search/?api=1&query=${housing.latitude},${housing.longitude}`
        : "";

  const posterName = poster?.displayName || "CampusX user";

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close listing detail"
        onClick={onClose}
        className="absolute inset-0 bg-black/80"
      />

      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[44px] border border-white/10 bg-black shadow-pro-lg scrollbar-hide sm:rounded-[44px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-black/95 p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
              Listing details
            </p>
            {isOwner && (
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.22em] text-kjc-accent">
                Your post
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-white/45 transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            <X size={22} />
          </button>
        </div>

        <div className="relative aspect-[16/10] bg-white/[0.03]">
          {listing.photos?.[0] ? (
            <img
              src={listing.photos[0]}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/10">
              <Home size={64} strokeWidth={1} />
            </div>
          )}

          <div className="absolute left-5 top-5 rounded-full bg-kjc-accent px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white">
            {isHousing ? housing.roomType : market.category}
          </div>

          {isClosed && (
            <div className="absolute right-5 top-5 rounded-full border border-rose-500/20 bg-rose-500/90 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white">
              {status}
            </div>
          )}
        </div>

        <div className="space-y-7 p-7">
          <div>
            <h2 className="text-3xl pro-heading tracking-tighter">{listing.title}</h2>

            <div className="mt-3 flex items-baseline gap-1.5">
              <IndianRupee size={18} className="text-kjc-accent" />
              <span className="font-display text-3xl font-black tracking-tighter text-white">
                {price.toLocaleString()}
              </span>
              {isHousing && (
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                  / month
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/5 bg-white/[0.04] p-5">
            <div className="mb-3 flex items-center gap-2 text-kjc-accent">
              <MapPin size={18} />
              <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                Location
              </p>
            </div>

            <p className="text-sm font-bold leading-relaxed text-white/80">
              {location.address}
            </p>

            {location.distance && (
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/40">
                {location.distance}
              </p>
            )}

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 transition-transform duration-150 ease-out hover:bg-white/10 active:scale-[0.97]"
              >
                Open in Google Maps
                <ExternalLink size={14} />
              </a>
            )}
          </div>

          {listing.description && (
            <div className="rounded-[28px] border border-white/5 bg-white/[0.04] p-5">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                Details
              </p>
              <p className="text-sm font-medium leading-relaxed text-white/75">
                {listing.description}
              </p>
            </div>
          )}

          {isHousing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
                  Deposit
                </p>
                <p className="mt-2 text-lg font-black text-white">
                  ₹{housing.deposit.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
                  Furnishing
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  {housing.furnishing || "Unfurnished"}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenPoster}
            className="flex w-full items-center gap-4 rounded-[28px] border border-white/5 bg-white/[0.04] p-5 text-left transition-transform duration-150 ease-out hover:bg-white/[0.08] active:scale-[0.98]"
          >
            <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white/5">
              {poster?.photoURL ? (
                <img
                  src={poster.photoURL}
                  alt={posterName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-kjc-accent/15 text-lg font-black text-kjc-accent">
                  {posterName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg pro-heading">{posterName}</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                  {poster?.campusRole || "Student"}
                </p>
                {poster?.verifiedStatus === "verified" && (
                  <ShieldCheck size={14} className="text-emerald-400" />
                )}
              </div>
            </div>
          </button>

          {isOwner ? (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => onEdit?.(listing, type)}
                className="flex w-full items-center justify-center gap-3 rounded-[28px] bg-white py-5 text-[10px] font-black uppercase tracking-[0.24em] text-black transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                Edit post
                <Edit3 size={16} />
              </button>

              <div className="grid grid-cols-2 gap-3">
                {isClosed ? (
                  <button
                    type="button"
                    onClick={() => onReopenListing?.(listing, type)}
                    className="flex items-center justify-center gap-2 rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400 transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    Reopen
                    <RotateCcw size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCloseListing?.(listing, type)}
                    className="rounded-[24px] border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    Close
                  </button>
                )}

                {!isHousing && status !== "sold" ? (
                  <button
                    type="button"
                    onClick={() => onMarkSold?.(market)}
                    className="rounded-[24px] border border-kjc-accent/20 bg-kjc-accent/10 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-kjc-accent transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    Sold
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onDelete?.(listing, type)}
                    className="flex items-center justify-center gap-2 rounded-[24px] border border-rose-500/20 bg-rose-500/10 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-rose-400 transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    Delete
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {!isHousing && status !== "sold" && (
                <button
                  type="button"
                  onClick={() => onDelete?.(listing, type)}
                  className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-rose-500/20 bg-rose-500/10 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-rose-400 transition-transform duration-150 ease-out active:scale-[0.97]"
                >
                  Delete post
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onContact(listing.postedBy, listing.id, listing.title, type)}
              className="flex w-full items-center justify-center gap-3 rounded-[30px] bg-white py-5 text-[10px] font-black uppercase tracking-[0.28em] text-black transition-transform duration-150 ease-out hover:bg-kjc-accent hover:text-white active:scale-[0.97]"
            >
              Ping owner
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}