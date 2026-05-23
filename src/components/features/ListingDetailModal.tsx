import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Share2,
  Edit3,
  ExternalLink,
  Flag,
  Home,
  IndianRupee,
  MapPin,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import {
  formatHousingRoomType,
  formatTenantPreference,
  HousingListing,
} from "../../services/housingService.ts";
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
  onEdit?: (
    listing: HousingListing | MarketListing,
    type: "housing" | "market"
  ) => void;
  onDelete?: (
    listing: HousingListing | MarketListing,
    type: "housing" | "market"
  ) => void | Promise<void>;
  onCloseListing?: (
    listing: HousingListing | MarketListing,
    type: "housing" | "market"
  ) => void | Promise<void>;
  onReopenListing?: (
    listing: HousingListing | MarketListing,
    type: "housing" | "market"
  ) => void | Promise<void>;
  onMarkSold?: (listing: MarketListing) => void | Promise<void>;
  isPosterBlocked?: boolean;
  onReport?: (
    listing: HousingListing | MarketListing,
    type: "housing" | "market"
  ) => void;
  onBlockUser?: (userId: string) => void | Promise<void>;
}

type SonnerToastVariant = "success" | "error";

const SONNER_TOAST_EVENT = "campusx:sonner-toast";

const toast = {
  success: (title: string) => dispatchSonnerToast(title, "success"),
  error: (title: string) => dispatchSonnerToast(title, "error"),
};

function dispatchSonnerToast(title: string, variant: SonnerToastVariant) {
  window.dispatchEvent(
    new CustomEvent(SONNER_TOAST_EVENT, {
      detail: {
        id: Date.now() + Math.random(),
        title,
        variant,
      },
    })
  );
}

function formatDateLabel(value?: string) {
  if (!value) return "Immediately";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  isPosterBlocked,
  onReport,
  onBlockUser,
}: ListingDetailModalProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [isOpen]);
  const photos = useMemo(
    () => listing?.photos?.filter(Boolean) || [],
    [listing?.photos]
  );

  useEffect(() => {
    setActivePhotoIndex(0);
    setTouchStartX(null);
    setIsImageViewerOpen(false);
  }, [listing?.id]);

  if (!isOpen || !listing) return null;

  const isHousing = type === "housing";
  const housing = listing as HousingListing;
  const market = listing as MarketListing;
  const isOwner = Boolean(currentUserId && listing.postedBy === currentUserId);

  const price = isHousing ? housing.rent : market.price;
  const status = listing.status || "available";
  const isClosed = status === "sold" || status === "deleted";
  const hasMultiplePhotos = photos.length > 1;
  const activePhoto = photos[activePhotoIndex];

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
  const shareUrl = `${window.location.origin}/?listingType=${type}&listingId=${listing.id}`;

const handleShareListing = async () => {
  const listingKind = isHousing ? "room" : "item";

  const isSelling = listingKind === "item";

  const priceLabel = isHousing
    ? `₹${Number(price).toLocaleString()} / month`
    : `₹${Number(price).toLocaleString()}`;

  const emojiMap: Record<string, string> = {
    room: "🏠",
    pg: "🏘️",
    housing: "🏠",
    item: "📦",
    roommate: "🤝",
    food: "🍱",
    job: "💼",
    lost: "🔍",
  };

  const emoji = emojiMap[listingKind] || "📌";

  const ctaLine = isHousing
    ? `📍 ${location.compact || location.address} · ${
        housing.distanceLabel || housing.travelDistanceLabel || "near KJU"
      }`
    : `📍 ${location.compact || location.address}`;

  const hookLine = isHousing
    ? `Found a ${housing.roomType || "room"} near KJU — no broker, direct from student.`
    : isSelling
      ? `${listing.title} available — student selling, no middleman.`
      : `Spotted on CampusX — KJU student marketplace.`;

  const shareText = `${emoji} ${listing.title}

${priceLabel}
${ctaLine}

${hookLine}

🎓 CampusX · campus-x.app
Rooms, items & more — built around the KJU student community`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: listing.title,
        text: shareText,
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(`${shareText}\n\n👉 ${shareUrl}`);
    toast.success("Copied. Paste it on WhatsApp or Instagram.");
  } catch (error) {
    console.error("Share failed:", error);
    toast.error("Could not share this listing.");
  }
};

  const goToPreviousPhoto = () => {
    if (!hasMultiplePhotos) return;

    setActivePhotoIndex((current) =>
      current === 0 ? photos.length - 1 : current - 1
    );
  };

  const goToNextPhoto = () => {
    if (!hasMultiplePhotos) return;

    setActivePhotoIndex((current) =>
      current === photos.length - 1 ? 0 : current + 1
    );
  };

  const handleTouchEnd = (clientX: number) => {
    if (touchStartX === null || !hasMultiplePhotos) return;

    const diff = touchStartX - clientX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) goToNextPhoto();
      else goToPreviousPhoto();
    }

    setTouchStartX(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-[999] bg-black flex items-center justify-center">
        <div className="absolute inset-0 bg-black/80 pointer-events-auto" onClick={onClose} />

        <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[44px] border border-white/10 bg-black shadow-pro-lg scrollbar-hide sm:rounded-[44px]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-black/95 p-5">
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white text-black shadow-pro transition-transform duration-150 ease-out active:scale-[0.97]"
              aria-label="Go back"
            >
              <ArrowLeft size={23} strokeWidth={2.4} />
            </button>

            <div className="min-w-0 flex-1 px-4">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
                Listing details
              </p>

              {isOwner && (
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.22em] text-kjc-accent">
                  Your post
                </p>
              )}
            </div>

            <div className="h-12 w-12" />
          </div>

          <div
            className="relative aspect-[16/10] bg-white/[0.03]"
            onTouchStart={(event) =>
              setTouchStartX(event.touches[0]?.clientX ?? null)
            }
            onTouchEnd={(event) =>
              handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)
            }
          >
            {activePhoto ? (
              <button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageViewerOpen(true);
  }}
                className="relative z-10 block h-full w-full cursor-pointer"
                aria-label="Open full image"
              >
                <img
                  src={activePhoto}
                  alt={`${listing.title} photo ${activePhotoIndex + 1}`}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/10">
                <Home size={64} strokeWidth={1} />
              </div>
            )}


            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
  className="pointer-events-none absolute bottom-3 right-3 z-30 rounded-full bg-black/60 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/80 backdrop-blur"
>
  Tap to view
</motion.div>

            <div className="absolute left-5 top-5 rounded-full bg-kjc-accent px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white">
              {isHousing ? formatHousingRoomType(housing.roomType) : market.category}
            </div>

            {photos.length > 0 && (
              <div className="absolute right-5 top-5 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-xl">
                {activePhotoIndex + 1}/{photos.length}
              </div>
            )}

            {isClosed && (
              <div className="absolute bottom-5 right-5 rounded-full border border-rose-500/20 bg-rose-500/90 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                {status}
              </div>
            )}

            {hasMultiplePhotos && (
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-xl">
                {photos.map((photo, index) => (
                  <button
                    key={`${photo}-${index}`}
                    type="button"
                    onClick={() => setActivePhotoIndex(index)}
                    aria-label={`Go to photo ${index + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activePhotoIndex
                        ? "w-5 bg-white"
                        : "w-1.5 bg-white/35"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {hasMultiplePhotos && (
            <div className="flex gap-3 overflow-x-auto border-b border-white/5 px-5 py-4 scrollbar-hide">
              {photos.map((photo, index) => (
                <button
                  key={`${photo}-thumb-${index}`}
                  type="button"
                  onClick={() => setActivePhotoIndex(index)}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-2xl border transition-all ${
                    index === activePhotoIndex
                      ? "border-kjc-accent opacity-100"
                      : "border-white/10 opacity-55"
                  }`}
                >
                  <img
                    src={photo}
                    alt={`${listing.title} thumbnail ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="space-y-7 p-7">
            <div>
              <h2 className="text-3xl pro-heading tracking-tighter">
                {listing.title}
              </h2>

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
              {listing.latitude && listing.longitude && (
  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
    <iframe
      src={`https://www.google.com/maps?q=${listing.latitude},${listing.longitude}&z=15&output=embed`}
      className="h-48 w-full"
      loading="lazy"
    />
  </div>
)}

              {location.distance && (
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/40">
                  {location.distance}
                </p>
              )}

              {isHousing && housing.travelDurationLabel && (
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
                  {housing.travelDurationLabel}
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
              <>
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
                      Maintenance
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      ₹{Number(housing.maintenance || 0).toLocaleString()}
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

                  <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
                      Available
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {formatDateLabel(housing.availableFrom)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/5 bg-white/[0.04] p-5">
                  <div className="mb-3 flex items-center gap-2 text-kjc-accent">
                    <Users size={18} />
                    <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                      Preference
                    </p>
                  </div>

                  <p className="text-sm font-bold text-white/75">
                    {formatTenantPreference(housing.preferTenants)}
                  </p>
                </div>

                {housing.restrictions && (
                  <div className="rounded-[28px] border border-white/5 bg-white/[0.04] p-5">
                    <div className="mb-3 flex items-center gap-2 text-kjc-accent">
                      <CalendarDays size={18} />
                      <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                        Restrictions
                      </p>
                    </div>

                    <p className="text-sm font-medium leading-relaxed text-white/70">
                      {housing.restrictions}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="rounded-[28px] border border-amber-500/15 bg-amber-500/10 p-5">
              <div className="mb-3 flex items-center gap-2 text-amber-300">
                <ShieldAlert size={18} />
                <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                  Safety note
                </p>
              </div>

              <p className="text-[12px] font-bold leading-relaxed text-white/65">
                Do not pay advance before visiting. Meet in person, verify the
                room or item, and report suspicious listings.
              </p>
            </div>

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
                    loading="lazy"
                    decoding="async"
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
            <button
  type="button"
  onClick={handleShareListing}
  className="flex w-full items-center justify-center gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] py-5 text-[10px] font-black uppercase tracking-[0.24em] text-white/70 transition-transform duration-150 ease-out hover:bg-white/[0.08] active:scale-[0.97]"
>
  Share listing
  <Share2 size={16} />
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

                {status === "available" ? (
                  <button
                    type="button"
                    onClick={() => onCloseListing?.(listing, type)}
                    className="flex w-full items-center justify-center gap-3 rounded-[28px] border border-kjc-accent/20 bg-kjc-accent/10 py-5 text-[10px] font-black uppercase tracking-[0.24em] text-kjc-accent transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    Close post
                    <RotateCcw size={16} />
                  </button>
                ) : status !== "deleted" ? (
                  <button
                    type="button"
                    onClick={() => onReopenListing?.(listing, type)}
                    className="flex w-full items-center justify-center gap-3 rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 py-5 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300 transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    Reopen post
                    <RotateCcw size={16} />
                  </button>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onMarkSold?.(market)}
                    disabled={isHousing || status === "sold"}
                    className="rounded-[24px] border border-kjc-accent/20 bg-kjc-accent/10 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-kjc-accent transition-transform duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sold
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete?.(listing, type)}
                    className="flex items-center justify-center gap-2 rounded-[24px] border border-rose-500/20 bg-rose-500/10 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-rose-400 transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    Delete
                    <Trash2 size={14} />
                  </button>
                </div>

                
              </div>
            ) : (
              <div className="grid gap-3">
                {isPosterBlocked ? (
                  <div className="rounded-[28px] border border-rose-500/20 bg-rose-500/10 p-5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-300">
                      You blocked this user
                    </p>
                    <p className="mt-2 text-[11px] font-bold leading-relaxed text-white/40">
                      This post will be hidden after refresh.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onContact(listing.postedBy, listing.id, listing.title, type)
                    }
                    className="flex w-full items-center justify-center gap-3 rounded-[30px] bg-white py-5 text-[10px] font-black uppercase tracking-[0.28em] text-black transition-transform duration-150 ease-out hover:bg-kjc-accent hover:text-white active:scale-[0.97]"
                  >
                    Ping owner
                    <Send size={16} />
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onReport?.(listing, type)}
                    className="flex items-center justify-center gap-2 rounded-[24px] border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/55 transition-transform duration-150 ease-out hover:text-white active:scale-[0.97]"
                  >
                    Report
                    <Flag size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onBlockUser?.(listing.postedBy)}
                    className="flex items-center justify-center gap-2 rounded-[24px] border border-rose-500/20 bg-rose-500/10 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-rose-300 transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    Block
                    <Ban size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isImageViewerOpen && activePhoto && (
  <div
    className="fixed inset-0 z-[1200] flex flex-col bg-black"
    onTouchStart={(event) =>
      setTouchStartX(event.touches[0]?.clientX ?? null)
    }
    onTouchEnd={(event) =>
      handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)
    }
  >
    <div className="flex h-20 items-center justify-between px-5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsImageViewerOpen(false);
        }}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white text-black shadow-pro transition-transform duration-150 ease-out active:scale-[0.97]"
        aria-label="Back to listing"
      >
        <ArrowLeft size={23} strokeWidth={2.4} />
      </button>

      <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
        {activePhotoIndex + 1}/{photos.length}
      </p>

      <div className="h-12 w-12" />
    </div>

    <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-4">
      <img
        src={activePhoto}
        alt={`${listing.title} full photo ${activePhotoIndex + 1}`}
        className="max-h-full max-w-full object-contain"
        loading="eager"
        decoding="async"
      />
    </div>

    {hasMultiplePhotos && (
      <div className="flex gap-3 overflow-x-auto border-t border-white/10 px-5 py-4 scrollbar-hide">
        {photos.map((photo, index) => (
          <button
            key={`${photo}-viewer-thumb-${index}`}
            type="button"
            onClick={() => setActivePhotoIndex(index)}
            className={`h-16 w-20 shrink-0 overflow-hidden rounded-2xl border transition-all ${
              index === activePhotoIndex
                ? "border-kjc-accent opacity-100"
                : "border-white/10 opacity-45"
            }`}
          >
            <img
              src={photo}
              alt={`${listing.title} viewer thumbnail ${index + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>
    )}
  </div>
)}
    </>
  );
}

