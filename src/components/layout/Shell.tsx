import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import LottiePlayer from "../../components/ui/LottiePlayer";
import homeLoadingRaw from "../../assets/lottie/home-empty?raw";
import {
  ArrowLeft,
  Bookmark,
  Eye,
  Share2,
  Filter,
  Home,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCcw,
  Search,
  Send,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { checkIsSaved, saveListing, unsaveListing } from "../../services/savedCrudService";
import {
  Conversation,
  Message,
  getConversationListingSnapshot,
  getMessageVisualStatus,
  getUnreadCount,
  markConversationDelivered,
  markConversationSeen,
  sendMessage,
  startConversation,
  subscribeToConversations,
  subscribeToMessages,
} from "../../services/chatService";
import MessageStatusDots from "../features/MessageStatusDots";
import { blockUser, getBlockedUserIds } from "../../services/blockService";
import { getHousingLocationDisplay } from "../../utils/listingDisplay";
import {
  getListingExpiryLabel,
  isListingExpired,
  isPublicListingVisible,
} from "../../utils/listingLifecycle";
import { trackListingView } from "../../services/listingViewsService";

import ListingForm from "../features/ListingForm";
import VerificationModal from "../features/VerificationModal";
import ListingDetailModal from "../features/ListingDetailModal";
import UserProfilePreview from "../features/UserProfilePreview";
import HousingMapView from "../features/HousingMapView";
import ReportListingModal from "../features/ReportListingModal";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { db } from "../../lib/firebase";
import {
  closeHousingListing,
  deleteHousingListing,
  formatHousingRoomType,
  getHousingListings,
  getMyHousingListings,
  HousingFurnishing,
  HousingListing,
  HousingRoomType,
  updateHousingListing,
  renewHousingListing,
  reopenHousingListing,
} from "../../services/housingService";
import {
  closeMarketListing,
  deleteMarketListing,
  getMarketListings,
  getMyMarketListings,
  markMarketListingSold,
  updateMarketListing,
  MarketListing,
  renewMarketListing,
  reopenMarketListing,
} from "../../services/marketService";

import ProfileCompletionModal from "../features/ProfileCompletionModal";
import AppFeedbackModal from "../features/AppFeedbackModal";
import NotificationPreferencesModal from "../features/NotificationPreferencesModal";
import SavedPostsSection from "../features/SavedPostsSection";
import ForegroundNotificationToast from "../features/ForegroundNotificationToast";
import {
  ForegroundPushPayload,
  listenForForegroundMessages,
} from "../../services/pushNotificationService.ts";

// removed module-level trigger; auth intro is opened via `openAuthIntro` inside Shell

const homeLoading = JSON.parse(homeLoadingRaw);

type Tab = "home" | "search" | "inbox" | "me";
type ListingType = "housing" | "market";

type HousingFilters = {
  roomType: "All" | HousingRoomType;
  maxRent: string;
  maxDeposit: string;
  maxDistanceKm: string;
  furnishing: "All" | HousingFurnishing;
  availableOnly: boolean;
};

type UserLite = {
  displayName: string;
  photoURL?: string;
  campusRole?: string;
  verifiedStatus?: string;
  course?: string;
  batch?: string;
  currentLocation?: string;
};

type PendingIntent =
  | { kind: "post" }
  | {
      kind: "save";
      listingId: string;
      listingType: ListingType;
    }
  | {
      kind: "contact";
      ownerId: string;
      listingId: string;
      title: string;
      listingType: string;
    }
  | {
      kind: "tab";
      tab: Tab;
    }
  | {
      kind: "report";
      listing: HousingListing | MarketListing;
      listingType: ListingType;
    };

const PENDING_INTENT_STORAGE_KEY = "campusx.pendingIntent";

type OptionItem<T extends string> = {
  value: T;
  label: string;
};

type SonnerToastVariant = "success" | "error";

type SonnerToastPayload = {
  id: number;
  title: string;
  variant: SonnerToastVariant;
};

type ConfirmationIntent =
  | {
      kind: "delete";
      listing: HousingListing | MarketListing;
      type: ListingType;
    }
  | {
      kind: "close";
      listing: HousingListing | MarketListing;
      type: ListingType;
    }
  | {
      kind: "block";
      userId: string;
    };

type RenewIntent = {
  listing: HousingListing | MarketListing;
  type: ListingType;
};

const SONNER_TOAST_EVENT = "campusx:sonner-toast";

const toast = {
  success: (title: string) => dispatchSonnerToast(title, "success"),
  error: (title: string) => dispatchSonnerToast(title, "error"),
};

function dispatchSonnerToast(title: string, variant: SonnerToastVariant) {
  window.dispatchEvent(
    new CustomEvent<SonnerToastPayload>(SONNER_TOAST_EVENT, {
      detail: {
        id: Date.now() + Math.random(),
        title,
        variant,
      },
    })
  );
}

const initialHousingFilters: HousingFilters = {
  roomType: "All",
  maxRent: "",
  maxDeposit: "",
  maxDistanceKm: "",
  furnishing: "All",
  availableOnly: false,
};

const roomTypeOptions: OptionItem<HousingFilters["roomType"]>[] = [
  { value: "All", label: "All" },
  { value: "roommate", label: "Roommate" },
  { value: "1RK", label: "1RK" },
  { value: "1BHK", label: "1BHK" },
  { value: "2BHK", label: "2BHK" },
  { value: "3BHK", label: "3BHK" },
  { value: "PG", label: "PG" },
];

const furnishingOptions: OptionItem<HousingFilters["furnishing"]>[] = [
  { value: "All", label: "All" },
  { value: "Unfurnished", label: "Unfurnished" },
  { value: "Semi-furnished", label: "Semi-furnished" },
  { value: "Fully-furnished", label: "Fully-furnished" },
];

function getHousingFilterCount(filters: HousingFilters) {
  let count = 0;

  if (filters.roomType !== "All") count += 1;
  if (filters.maxRent.trim()) count += 1;
  if (filters.maxDeposit.trim()) count += 1;
  if (filters.maxDistanceKm.trim()) count += 1;
  if (filters.furnishing !== "All") count += 1;
  if (filters.availableOnly) count += 1;

  return count;
}

function applyHousingFilters(listings: HousingListing[], filters: HousingFilters) {
  return listings.filter((listing) => {
    if (filters.roomType !== "All" && listing.roomType !== filters.roomType) return false;
    if (filters.availableOnly && listing.status !== "available") return false;
    if (filters.furnishing !== "All" && listing.furnishing !== filters.furnishing) return false;

    const maxRent = Number(filters.maxRent);
    if (Number.isFinite(maxRent) && maxRent > 0 && listing.rent > maxRent) return false;

    const maxDeposit = Number(filters.maxDeposit);
    if (
      filters.maxDeposit.trim() &&
      Number.isFinite(maxDeposit) &&
      maxDeposit >= 0 &&
      listing.deposit > maxDeposit
    ) {
      return false;
    }

    const maxDistanceKm = Number(filters.maxDistanceKm);
    const listingDistanceKm =
      typeof listing.travelDistanceMeters === "number"
        ? listing.travelDistanceMeters / 1000
        : listing.distanceFromCollegeKm || 0;

    if (
      filters.maxDistanceKm.trim() &&
      Number.isFinite(maxDistanceKm) &&
      maxDistanceKm > 0 &&
      listingDistanceKm > maxDistanceKm
    ) {
      return false;
    }

    return true;
  });
}

function SonnerToaster() {
  const [items, setItems] = useState<SonnerToastPayload[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const toastEvent = event as CustomEvent<SonnerToastPayload>;
      const nextToast = toastEvent.detail;

      setItems((current) => [...current, nextToast].slice(-3));

      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== nextToast.id));
      }, 3400);
    };

    window.addEventListener(SONNER_TOAST_EVENT, handleToast);

    return () => {
      window.removeEventListener(SONNER_TOAST_EVENT, handleToast);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[1500] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3">
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          className={`rounded-[26px] border px-5 py-4 shadow-pro-lg ${
            item.variant === "success"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/25 bg-rose-500/10 text-rose-100"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.22em]">
            {item.variant === "success" ? "Success" : "Error"}
          </p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-white/85">
            {item.title}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

function AlertDialog({
  open,
  title,
  description,
  confirmLabel,
  busy,
  variant = "danger",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  variant?: "danger" | "accent";
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1450] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        onClick={busy ? undefined : onCancel}
        className="absolute inset-0 bg-black/85"
        aria-label="Cancel confirmation"
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-md rounded-t-[38px] border border-white/10 bg-black p-7 shadow-pro-lg sm:rounded-[38px]"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
          Confirm action
        </p>
        <h2 className="mt-2 text-3xl pro-heading tracking-tighter text-white">
          {title}
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-white/55">
          {description}
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-[24px] border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-[24px] border py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-50 ${
              variant === "danger"
                ? "border-rose-500/20 bg-rose-500/15 text-rose-300"
                : "border-kjc-accent/20 bg-kjc-accent/15 text-kjc-accent"
            }`}
          >
            {busy ? "Working" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RenewDurationDialog({
  open,
  busy,
  onClose,
  onSelect,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSelect: (duration: 15 | 30) => void | Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1450] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        onClick={busy ? undefined : onClose}
        className="absolute inset-0 bg-black/85"
        aria-label="Close renew duration"
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-md rounded-t-[38px] border border-white/10 bg-black p-7 shadow-pro-lg sm:rounded-[38px]"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
          Renew listing
        </p>
        <h2 className="mt-2 text-3xl pro-heading tracking-tighter text-white">
          Choose duration
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-white/55">
          Keep your post visible in the public feed for a fresh listing window.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          {[15, 30].map((duration) => (
            <button
              key={duration}
              type="button"
              onClick={() => onSelect(duration as 15 | 30)}
              disabled={busy}
              className="rounded-[28px] border border-kjc-accent/20 bg-kjc-accent/10 px-5 py-5 text-left transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-50"
            >
              <span className="block text-3xl pro-heading text-white">
                {duration}
              </span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.22em] text-kjc-accent">
                days
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mt-3 w-full rounded-[24px] border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}

function DarkOptionPicker<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: OptionItem<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-5 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
      >
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
          {selected?.label || "Select"}
        </span>
        <span className="text-white/30">⌄</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[240] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/85"
            aria-label={`Close ${label}`}
          />

          <div className="relative w-full max-w-md rounded-t-[38px] border border-white/10 bg-black p-6 shadow-pro-lg sm:rounded-[38px]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
                  Filter
                </p>
                <h3 className="mt-1 text-2xl pro-heading tracking-tighter">{label}</h3>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white/45"
              >
                <X size={22} />
              </button>
            </div>

            <div className="grid gap-3">
              {options.map((option) => {
                const active = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`rounded-[26px] border px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] transition-transform duration-150 ease-out active:scale-[0.98] ${
                      active
                        ? "border-kjc-accent bg-kjc-accent/15 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/60"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BottomNav({
  activeTab,
  onTabChange,
  onAddClick,
  onRequireAuth,
  bottomUnreadCount,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onAddClick: () => void | Promise<void>;
  onRequireAuth: (intent: PendingIntent) => boolean;
  bottomUnreadCount?: number;
}) {
  const tabs = [
    { id: "home", icon: Home, label: "Home" },
    { id: "search", icon: Search, label: "Search" },
    { id: "add", icon: Plus, label: "Post", special: true },
    { id: "inbox", icon: MessageSquare, label: "Inbox" },
    { id: "me", icon: User, label: "Me" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-[32px] border border-white/10 bg-black/90 p-2 shadow-pro-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => {
            if (tab.id === "add") {
              void onAddClick();
              return;
            }

            onTabChange(tab.id as Tab);
          }}
          className={`relative flex items-center justify-center transition-transform duration-150 ease-out active:scale-[0.97] ${
            tab.special
              ? "h-16 w-16 -mt-5 scale-110 rounded-full bg-kjc-accent text-white shadow-lg shadow-kjc-accent/30"
              : `h-14 w-14 rounded-full ${
                  activeTab === tab.id
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                }`
          }`}
          aria-label={tab.label}
        >
          {tab.id === "inbox" ? (
            <div className="relative">
  <tab.icon size={tab.special ? 30 : 22} strokeWidth={tab.special ? 2.5 : 2} />

  {(bottomUnreadCount ?? 0) > 0 && (
    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-kjc-accent px-1.5 text-[10px] font-black text-white shadow-[0_0_18px_rgba(139,92,246,0.65)]">
      {(bottomUnreadCount ?? 0) > 9 ? "9+" : (bottomUnreadCount ?? 0)}
    </span>
  )}
</div>
          ) : (
            <tab.icon size={tab.special ? 30 : 22} strokeWidth={tab.special ? 2.5 : 2} />
          )}

          {activeTab === tab.id && !tab.special && (
            <motion.div
              layoutId="activeTabDot"
              className="absolute -bottom-1 h-1 w-1 rounded-full bg-kjc-accent"
            />
          )}
        </button>
      ))}
    </div>
  );
}

function Header({
  activeTab,
  onSearch,
  onFilterClick,
  showFilters,
  activeFilterCount,
}: {
  activeTab: Tab;
  onSearch: (value: string) => void;
  onFilterClick: () => void;
  showFilters: boolean;
  activeFilterCount: number;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/90 px-6 py-4">
      <div className="mx-auto flex max-w-xl items-center justify-between">
        {!isSearching ? (
          <>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <div className="flex items-center gap-2">
                <h1 className="text-2xl pro-heading tracking-tighter">
                  Campus<span className="text-kjc-accent italic">X</span>
                </h1>
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-kjc-accent" />
              </div>

              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">
                KJU campus housing & essentials
              </p>
            </motion.div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsSearching(true)}
                className="rounded-2xl border border-white/5 bg-white/5 p-3 text-white transition-transform duration-150 ease-out hover:bg-white/10 active:scale-[0.97]"
                aria-label="Search"
              >
                <Search size={22} />
              </button>

              {(activeTab === "home" || activeTab === "search") && (
                <button
                  type="button"
                  onClick={onFilterClick}
                  className={`rounded-2xl border p-3 transition-transform duration-150 ease-out active:scale-[0.97] ${
                    showFilters || activeFilterCount > 0
                      ? "border-kjc-accent bg-kjc-accent text-white"
                      : "border-white/5 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  aria-label="Filters"
                >
                  <div className="relative">
                    <Filter size={22} />

                    {activeFilterCount > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-black text-black">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                </button>
              )}
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-1 items-center gap-3"
          >
            <div className="relative flex-1">
              <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                autoFocus
                value={searchVal}
                onChange={(event) => {
                  setSearchVal(event.target.value);
                  onSearch(event.target.value);
                }}
                placeholder="Search rooms, PGs, tables..."
                className="input-pro pl-14"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSearching(false);
                setSearchVal("");
                onSearch("");
              }}
              className="rounded-2xl border border-white/5 bg-white/5 p-3 text-white transition-transform duration-150 ease-out active:scale-[0.97]"
              aria-label="Close search"
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </div>
    </header>
  );
}

function ListingCard({
  listing,
  type,
  onContact,
  onOpenDetails,
  onRequireProfileReady,
  showOwnerStats,
  onRenew,
  onRequireAuth,
}: {
  listing: HousingListing | MarketListing;
  type: ListingType;
  onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>;
  onOpenDetails: (listing: HousingListing | MarketListing, type: ListingType) => void;
  onRequireProfileReady: (intent: PendingIntent) => void | Promise<void>;
  showOwnerStats?: boolean;
  onRenew?: (listing: HousingListing | MarketListing, type: ListingType) => void | Promise<void>;
  onRequireAuth?: (intent: PendingIntent) => boolean;
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [saveId, setSaveId] = useState<string | null>(null);
  const { user } = useAuth();

  const isHousing = type === "housing";
  const isOwner = listing.postedBy === user?.uid;
  const housingListing = listing as HousingListing;
  const marketListing = listing as MarketListing;
  const price = isHousing ? housingListing.rent : marketListing.price;
  const photoCount = listing.photos?.length || 0;
  const expired = listing.status === "expired" || isListingExpired((listing as any).expiresAt);
  const deleted = listing.status === "deleted";
  const expiryLabel = getListingExpiryLabel((listing as any).expiresAt);

  useEffect(() => {
    let active = true;

    async function checkSaved() {
      if (!listing.id || !user) {
        setIsSaved(false);
        setSaveId(null);
        return;
      }

      const result = await checkIsSaved(listing.id);
      if (!active) return;

      setIsSaved(result.saved);
      setSaveId(result.saveId);
    }

    checkSaved();

    return () => {
      active = false;
    };
  }, [listing.id, user]);

  const handleToggleSave = async (event: React.MouseEvent) => {
    event.stopPropagation();

    if (!user) {
      onRequireAuth?.({ kind: "save", listingId: listing.id, listingType: type });
      return;
    }

    if (isSaved && saveId) {
      await unsaveListing(saveId);
      setIsSaved(false);
      setSaveId(null);
      return;
    }

    const id = await saveListing(listing.id, type);
    setIsSaved(true);
    setSaveId(id);
  };

  const locationDisplay = isHousing
    ? getHousingLocationDisplay(housingListing).compact
    : listing.formattedAddress?.split(",")[0] || "Near KJU";
  const handleShareCard = async (event: React.MouseEvent) => {
    event.stopPropagation();

    const shareUrl = `${window.location.origin}/?listingType=${type}&listingId=${listing.id}`;
    const priceLabel = isHousing
      ? `Rs ${Number(price).toLocaleString()} / month`
      : `Rs ${Number(price).toLocaleString()}`;
    const hookLine = isHousing
      ? `Found a ${housingListing.roomType || "room"} near KJU - no broker, direct from student.`
      : `${listing.title} available - student selling, no middleman.`;
    const shareText = `${listing.title}

${priceLabel}
Location: ${locationDisplay}

${hookLine}

CampusX - campus-x.app
Rooms, items and more - built around the KJU student community`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: listing.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      toast.success("Copied. Paste it on WhatsApp or Instagram.");
    } catch (error) {
      console.error("Share failed:", error);
      toast.error("Could not share this listing.");
    }
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(listing, type)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpenDetails(listing, type);
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      className="group mb-8 w-full cursor-pointer overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04] text-left shadow-pro transition-colors duration-200 hover:border-white/15"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {listing.photos?.[0] ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.025] text-white/10">
            {isHousing ? <Home size={64} strokeWidth={1} /> : <ShoppingBag size={64} strokeWidth={1} />}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />

        <div className="absolute left-5 right-5 top-5 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <span className="rounded-full bg-kjc-accent px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-xl">
              {isHousing
                ? formatHousingRoomType(housingListing.roomType)
                : marketListing.category || "Item"}
            </span>

            {isOwner && (
              <span className="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
                Your post
              </span>
            )}

            {(expired || deleted) && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/90 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-black">
                {deleted ? "Deleted" : "Expired"}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {photoCount > 1 && (
              <span className="rounded-full border border-white/15 bg-black/55 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-xl">
                1/{photoCount}
              </span>
            )}
            <button
  type="button"
  onClick={handleShareCard}
  className="flex h-12 w-12 items-center justify-center rounded-3xl border border-white/20 bg-black/35 text-white backdrop-blur-xl transition-transform duration-150 ease-out hover:bg-white/15 active:scale-[0.97]"
  aria-label="Share listing"
>
  <Share2 size={19} />
</button>

            {!isOwner && !deleted && (
              <button
                type="button"
                onClick={handleToggleSave}
                className={`flex h-12 w-12 items-center justify-center rounded-3xl border transition-transform duration-150 ease-out active:scale-[0.97] ${
                  isSaved
                    ? "scale-105 border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                    : "border-white/20 bg-black/30 text-white hover:bg-white/15"
                }`}
                aria-label={isSaved ? "Unsave listing" : "Save listing"}
              >
                <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">₹</span>
            <span className="font-display text-3xl font-black tracking-tighter text-white">
              {price.toLocaleString()}
            </span>
            {isHousing && (
              <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                / month
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-7">
        <div>
          <h3 className="mb-2 truncate text-2xl pro-heading tracking-[-0.03em] transition-colors group-hover:text-kjc-accent">
            {listing.title}
          </h3>

          <div className="flex items-center gap-2.5 text-white/45">
            <MapPin size={14} className="shrink-0 text-kjc-accent" />
            <p className="truncate text-[10px] font-black uppercase tracking-[0.22em]">
              {locationDisplay}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <span className="rounded-xl border border-white/5 bg-white/[0.035] px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/60">
            {isHousing ? housingListing.furnishing || "Unfurnished" : marketListing.condition || "Good"}
          </span>

          <span
            className={`rounded-xl border px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] ${
              listing.status === "available"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-rose-500/20 bg-rose-500/10 text-rose-400"
            }`}
          >
            {listing.status}
          </span>

          {expiryLabel && (
            <span className="rounded-xl border border-white/5 bg-white/[0.035] px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/50">
              {expiryLabel}
            </span>
          )}
        </div>

        {showOwnerStats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-center gap-2 rounded-[22px] border border-white/5 bg-white/[0.035] px-4 py-4 text-white/65">
              <Eye size={15} className="text-kjc-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                {Number((listing as any).uniqueViewersCount || 0)} views
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-[22px] border border-white/5 bg-white/[0.035] px-4 py-4 text-white/65">
              <MessageSquare size={15} className="text-kjc-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                {Number((listing as any).chatStartedCount || 0)} chats
              </span>
            </div>
          </div>
        )}

        {showOwnerStats && expired && !deleted ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void onRenew?.(listing, type);
            }}
            className="flex w-full items-center justify-center gap-3 rounded-[28px] border border-kjc-accent/20 bg-kjc-accent/10 py-5 text-[10px] font-black uppercase tracking-[0.28em] text-kjc-accent transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Renew post
            <RefreshCcw size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();

              if (isOwner) {
                onOpenDetails(listing, type);
                return;
              }

              onContact(listing.postedBy, listing.id, listing.title, type);
            }}
            disabled={deleted}
            className="flex w-full items-center justify-center gap-3 rounded-[28px] border border-white/5 bg-white py-5 text-[10px] font-black uppercase tracking-[0.28em] text-black shadow-pro transition-transform duration-150 ease-out hover:bg-kjc-accent hover:text-white active:scale-[0.97] disabled:opacity-40"
          >
            {isOwner ? "Manage post" : "Ping owner"}
            <Send size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function RoomsPage({
  listings,
  loading,
  onContact,
  onOpenDetails,
  onRequireProfileReady,
  user, // ✅ ADD THIS HERE
  onRequireAuth,
}: {
  listings: HousingListing[];
  loading: boolean;
  
onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>;
  onOpenDetails: (listing: HousingListing | MarketListing, type: ListingType) => void;
  onRequireProfileReady: (intent: PendingIntent) => void | Promise<void>;
  user?: any; // ✅ ADD THIS
  onRequireAuth?: (intent: PendingIntent) => boolean;

}) {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const isMapMode = viewMode === "map";

  return (
    <div className={isMapMode ? "space-y-4" : "space-y-8"}>
      {!isMapMode && (
        <div className="mb-2 flex flex-col gap-1">
          <h2 className="flex items-center gap-3 text-4xl pro-heading tracking-tighter">
            Housing <span className="text-kjc-accent italic">near KJU</span>
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">
            Rooms, PGs and flats posted by students
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 rounded-[26px] border border-white/5 bg-white/5 p-2">
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className={`rounded-[20px] py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-transform duration-150 ease-out active:scale-[0.97] ${
            viewMode === "list" ? "bg-white text-black" : "text-white/40"
          }`}
        >
          List
        </button>

        <button
          type="button"
          onClick={() => setViewMode("map")}
          className={`rounded-[20px] py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-transform duration-150 ease-out active:scale-[0.97] ${
            viewMode === "map" ? "bg-white text-black" : "text-white/40"
          }`}
        >
          Map
        </button>
      </div>

      {isMapMode ? (
        <HousingMapView
          listings={listings}
          onOpenDetails={(listing) => onOpenDetails(listing, "housing")}
          onContact={onContact}
        />
      ) : (
        <div className="grid gap-6">
          
 {!loading && !user && (
    <p className="text-center text-xs text-white/40 mb-2">
      Browse rooms — sign in to contact owners
    </p>
  )}

          {loading ? (
  <div className="flex flex-col items-center justify-center py-20">

    <div className="w-40 h-40">
      <LottiePlayer animation={homeLoading} />
    </div>

    <p className="mt-4 text-xs font-black uppercase tracking-[0.28em] text-white/50">
      Finding rooms near KJU
    </p>

    <p className="mt-2 text-[10px] text-white/30">
      Students are checking listings...
    </p>

  </div>
) : listings.length === 0 ? (
            <div className="rounded-[40px] border border-dashed border-white/10 bg-white/5 py-24 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                No rooms match this search
              </p>
            </div>
          ) : (
            listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                type="housing"
                onContact={onContact}
                onOpenDetails={onOpenDetails}
                onRequireProfileReady={onRequireProfileReady}
                onRequireAuth={onRequireAuth}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MarketPage({
  items,
  loading,
  onContact,
  onOpenDetails,
  onRequireProfileReady,
  onRequireAuth,
}: {
  items: MarketListing[];
  loading: boolean;
  onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>;
  onOpenDetails: (listing: HousingListing | MarketListing, type: ListingType) => void;
  onRequireProfileReady: (intent: PendingIntent) => void | Promise<void>;
  onRequireAuth?: (intent: PendingIntent) => boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="mb-2 flex flex-col gap-1">
        <h2 className="flex items-center gap-3 text-4xl pro-heading tracking-tighter">
          Search <span className="text-kjc-accent italic">CampusX</span>
        </h2>
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">
          Find furniture, books, electronics and essentials
        </p>
      </div>

      <div className="grid gap-6">
        {loading ? (
  [1, 2].map((item) => (
    <div
      key={item}
      className="aspect-[16/10] animate-pulse rounded-[40px] border border-white/10 bg-white/5"
    />
  ))
) : items.length === 0 ? (
          <div className="rounded-[40px] border border-dashed border-white/10 bg-white/5 py-24 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
              Nothing here yet
            </p>
          </div>
        ) : (
          items.map((item) => (
            <ListingCard
              key={item.id}
              listing={item}
              type="market"
              onContact={onContact}
              onOpenDetails={onOpenDetails}
              onRequireProfileReady={onRequireProfileReady}
              onRequireAuth={onRequireAuth}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MyPostsPage({
  housing,
  market,
  loading,
  onContact,
  onOpenDetails,
  onRequireProfileReady,
  onRenew,
  onRequireAuth,
}: {
  housing: HousingListing[];
  market: MarketListing[];
  loading: boolean;
  onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>;
  onOpenDetails: (listing: HousingListing | MarketListing, type: ListingType) => void;
  onRequireProfileReady: (intent: PendingIntent) => void | Promise<void>;
  onRenew: (listing: HousingListing | MarketListing, type: ListingType) => void | Promise<void>;
  onRequireAuth?: (intent: PendingIntent) => boolean;
}) {
  const total = housing.length + market.length;

  return (
    <div className="space-y-7">
      <div>
        <h3 className="text-3xl pro-heading tracking-tighter">My posts</h3>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
          Manage listings, renew expired posts, and track progress
        </p>
      </div>

      {loading ? (
        <div className="aspect-[16/10] animate-pulse rounded-[40px] border border-white/10 bg-white/5" />
      ) : total === 0 ? (
        <div className="rounded-[40px] border border-dashed border-white/10 bg-white/5 py-20 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
            You have not posted anything yet
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {housing.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              type="housing"
              onContact={onContact}
              onOpenDetails={onOpenDetails}
              onRequireProfileReady={onRequireProfileReady}
              onRequireAuth={onRequireAuth}
              showOwnerStats
              onRenew={onRenew}
            />
          ))}

          {market.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              type="market"
              onContact={onContact}
              onOpenDetails={onOpenDetails}
              onRequireProfileReady={onRequireProfileReady}
              onRequireAuth={onRequireAuth}
              showOwnerStats
              onRenew={onRenew}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateModal({
  isOpen,
  onClose,
  onRefresh,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [selectedType, setSelectedType] = useState<ListingType | null>(null);

  useEffect(() => {
    if (!isOpen) setSelectedType(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/80" />

      <div className="relative w-full max-w-lg overflow-hidden rounded-t-[44px] border border-white/10 bg-black p-9 shadow-pro-lg sm:rounded-[44px]">
        {selectedType ? (
          <ListingForm
            type={selectedType}
            onClose={() => setSelectedType(null)}
            onSuccess={() => {
              onRefresh();
              onClose();
            }}
          />
        ) : (
          <>
            <div className="mb-10 flex items-center justify-between">
              <h2 className="text-4xl pro-heading tracking-tighter">
                Create <span className="text-kjc-accent italic">post</span>
              </h2>

              <button
                type="button"
                onClick={onClose}
                className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-white/40 transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                <X size={28} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <button
                type="button"
                onClick={() => setSelectedType("housing")}
                className="rounded-[36px] border border-white/5 bg-white/5 p-8 text-left transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                <Home size={28} />
                <h3 className="mt-6 text-xl pro-heading">Room</h3>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("market")}
                className="rounded-[36px] border border-white/5 bg-white/5 p-8 text-left transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                <ShoppingBag size={28} />
                <h3 className="mt-6 text-xl pro-heading">Item</h3>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HousingFilterModal({
  isOpen,
  filters,
  onChange,
  onClose,
  onClear,
}: {
  isOpen: boolean;
  filters: HousingFilters;
  onChange: (filters: HousingFilters) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<HousingFilters>(filters);
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

  useEffect(() => {
    if (isOpen) setDraft(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const updateDraft = <K extends keyof HousingFilters>(
    key: K,
    value: HousingFilters[K]
  ) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

const apply = () => {
  onChange(draft);
  onClose();
  toast.success("Filters applied.");
};

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close filters"
        className="absolute inset-0 bg-black/80"
      />

      <div className="relative w-full max-w-lg rounded-t-[44px] border border-white/10 bg-black p-7 shadow-pro-lg sm:rounded-[44px]">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
              Housing filters
            </p>
            <h2 className="mt-2 text-3xl pro-heading tracking-tighter">
              Find faster
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-white/45 transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <label className="pl-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/30">
              Room type
            </label>
            <DarkOptionPicker
              label="Room type"
              value={draft.roomType}
              options={roomTypeOptions}
              onChange={(value) => updateDraft("roomType", value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="pl-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/30">
                Max rent
              </label>

              <input
                type="number"
                min={0}
                value={draft.maxRent}
                onChange={(event) => updateDraft("maxRent", event.target.value)}
                placeholder="15000"
                className="input-pro"
              />
            </div>

            <div className="space-y-3">
              <label className="pl-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/30">
                Max deposit
              </label>

              <input
                type="number"
                min={0}
                value={draft.maxDeposit}
                onChange={(event) => updateDraft("maxDeposit", event.target.value)}
                placeholder="40000"
                className="input-pro"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="pl-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/30">
              Max distance by road
            </label>

            <input
              type="number"
              min={0}
              step="0.5"
              value={draft.maxDistanceKm}
              onChange={(event) => updateDraft("maxDistanceKm", event.target.value)}
              placeholder="5"
              className="input-pro"
            />
          </div>

          <div className="space-y-3">
            <label className="pl-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/30">
              Furnishing
            </label>
            <DarkOptionPicker
              label="Furnishing"
              value={draft.furnishing}
              options={furnishingOptions}
              onChange={(value) => updateDraft("furnishing", value)}
            />
          </div>

          <button
            type="button"
            onClick={() => updateDraft("availableOnly", !draft.availableOnly)}
            className={`flex w-full items-center justify-between rounded-[28px] border px-5 py-5 text-left transition-transform duration-150 ease-out active:scale-[0.98] ${
              draft.availableOnly
                ? "border-emerald-500/20 bg-emerald-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
                Available only
              </p>
              <p className="mt-1 text-[11px] font-bold text-white/35">
                Hide closed or reserved rooms
              </p>
            </div>

            <span
              className={`h-6 w-6 rounded-full border ${
                draft.availableOnly
                  ? "border-emerald-400 bg-emerald-400"
                  : "border-white/20"
              }`}
            />
          </button>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setDraft(initialHousingFilters);
              onClear();
              onClose();
            }}
            className="rounded-[26px] border border-white/10 bg-white/5 py-5 text-[10px] font-black uppercase tracking-[0.24em] text-white/55 transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={apply}
            className="rounded-[26px] bg-white py-5 text-[10px] font-black uppercase tracking-[0.24em] text-black transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function Chattery({
  onOpenUserProfile,
  openConversationId,
  onConversationOpened,
  onConversationStateChange,
  onOpenListing,
  blockedUserIds = [],
}: {
  onOpenUserProfile: (uid: string) => void;
  openConversationId?: string | null;
  onConversationOpened?: () => void;
  onConversationStateChange?: (isOpen: boolean) => void;
  onOpenListing?: (conversation: Conversation) => void | Promise<void>;
  blockedUserIds?: string[];
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userMap, setUserMap] = useState<Record<string, UserLite>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = subscribeToConversations(setConversations);
    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    async function loadUsers() {
      if (!user || conversations.length === 0) return;

      const ids = conversations
        .map((conversation) =>
          conversation.participants.find((id) => id !== user.uid)
        )
        .filter(Boolean) as string[];

      const uniqueIds = [...new Set(ids)];

      const entries = await Promise.all(
        uniqueIds.map(async (uid) => {
          const snapshot = await getDoc(doc(db, "users", uid));
          const data = snapshot.data();

          return [
            uid,
            {
              displayName: data?.displayName || "CampusX user",
              photoURL: data?.photoURL || "",
              campusRole: data?.campusRole || "Student",
              verifiedStatus: data?.verifiedStatus || "unverified",
            },
          ] as const;
        })
      );

      setUserMap(Object.fromEntries(entries));
    }

    loadUsers();
  }, [conversations, user]);

  const getOtherUserId = (conversation: Conversation) =>
    conversation.participants.find((id) => id !== user?.uid);

  const visibleConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const otherUserId = getOtherUserId(conversation);
        return !otherUserId || !blockedUserIds.includes(otherUserId);
      }),
    [blockedUserIds, conversations, user?.uid]
  );

  const totalUnread = useMemo(
    () =>
      visibleConversations.reduce(
        (sum, conversation) => sum + getUnreadCount(conversation, user?.uid),
        0
      ),
    [visibleConversations, user?.uid]
  );

  useEffect(() => {
    onConversationStateChange?.(Boolean(selectedChat));

    return () => {
      onConversationStateChange?.(false);
    };
  }, [onConversationStateChange, selectedChat]);

  useEffect(() => {
    if (!selectedChat) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverflowX = document.body.style.overflowX;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverflowX = document.documentElement.style.overflowX;
    const previousHtmlWidth = document.documentElement.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.overflowX = "hidden";
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overflowX = "hidden";
    document.documentElement.style.width = "100%";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overflowX = previousBodyOverflowX;
      document.body.style.width = previousBodyWidth;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overflowX = previousHtmlOverflowX;
      document.documentElement.style.width = previousHtmlWidth;
    };
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat) return;

    const setChatViewportSize = () => {
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;

      document.documentElement.style.setProperty(
        "--campusx-chat-viewport-height",
        `${height}px`
      );
    };

    setChatViewportSize();

    window.visualViewport?.addEventListener("resize", setChatViewportSize);
    window.visualViewport?.addEventListener("scroll", setChatViewportSize);
    window.addEventListener("resize", setChatViewportSize);
    window.addEventListener("orientationchange", setChatViewportSize);

    return () => {
      document.documentElement.style.removeProperty(
        "--campusx-chat-viewport-height"
      );
      window.visualViewport?.removeEventListener("resize", setChatViewportSize);
      window.visualViewport?.removeEventListener("scroll", setChatViewportSize);
      window.removeEventListener("resize", setChatViewportSize);
      window.removeEventListener("orientationchange", setChatViewportSize);
    };
  }, [selectedChat]);

  useEffect(() => {
    if (!openConversationId) return;

    const matchedConversation = visibleConversations.find(
      (conversation) => conversation.id === openConversationId
    );

    if (!matchedConversation) return;

    if (selectedChat?.id !== matchedConversation.id) {
      setSelectedChat(matchedConversation);
    }

    onConversationOpened?.();
  }, [
    visibleConversations,
    openConversationId,
    onConversationOpened,
    selectedChat?.id,
  ]);

  useEffect(() => {
    if (!selectedChat) return;

    const unsubscribe = subscribeToMessages(selectedChat.id, setMessages);

    void markConversationDelivered(selectedChat.id);
    void markConversationSeen(selectedChat.id);

    return unsubscribe;
  }, [selectedChat?.id]);

  useEffect(() => {
    if (!selectedChat) return;

    const latest = conversations.find(
      (conversation) => conversation.id === selectedChat.id
    );

    if (latest) {
      setSelectedChat(latest);
    }
  }, [conversations, selectedChat?.id]);

  useEffect(() => {
    if (!selectedChat) return;

    const otherUserId = getOtherUserId(selectedChat);

    if (otherUserId && blockedUserIds.includes(otherUserId)) {
      setSelectedChat(null);
    }
  }, [blockedUserIds, selectedChat, user?.uid]);

  useEffect(() => {
    if (!selectedChat) return;

    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    }, 40);
  }, [messages.length, selectedChat?.id]);

  const openChat = (conversation: Conversation) => {
    setSelectedChat(conversation);
    void markConversationDelivered(conversation.id);
    void markConversationSeen(conversation.id);
  };

  const closeChat = () => {
    setSelectedChat(null);
    onConversationOpened?.();
  };

  const handleSend = async () => {
  const text = input.trim();
  if (!text || !selectedChat) return;

  const snapshot = getConversationListingSnapshot(selectedChat);

  if (snapshot.status === "sold") {
    toast.error("This item has already been sold.");
    return;
  }

  if (snapshot.status === "deleted") {
    toast.error("This listing is no longer available.");
    return;
  }

  setInput("");

  try {
    await sendMessage(selectedChat.id, text);
  } catch (error) {
    console.error(error);
    setInput(text);
  }
};


  if (selectedChat) {
    const otherUserId = getOtherUserId(selectedChat);
    const otherUser = otherUserId ? userMap[otherUserId] : null;
    const name = otherUser?.displayName || "CampusX user";
    const snapshot = getConversationListingSnapshot(selectedChat);
    const listingPrice =
      typeof snapshot.price === "number" && snapshot.price > 0
        ? snapshot.price.toLocaleString()
        : "";

    return (
      <div className="fixed inset-x-0 top-0 z-[120] flex h-[var(--campusx-chat-viewport-height,100dvh)] w-full max-w-full flex-col overflow-hidden overflow-x-hidden bg-black">
        <header className="shrink-0 flex min-w-0 max-w-full items-center gap-3 overflow-x-hidden border-b border-white/10 bg-black/95 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={closeChat}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5 transition active:scale-[0.97]"
          >
            <ArrowLeft size={22} />
          </button>

          <button
            type="button"
            onClick={() => otherUserId && onOpenUserProfile(otherUserId)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left transition active:scale-[0.98]"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white/5">
              {otherUser?.photoURL ? (
                <img
                  src={otherUser.photoURL}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-kjc-accent/15 text-lg font-black text-kjc-accent">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}

              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-emerald-400" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl pro-heading">{name}</h3>
              <p className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                Regarding: {snapshot.title}
              </p>
            </div>
          </button>
        </header>

        <div className="shrink-0 min-w-0 max-w-full overflow-x-hidden border-b border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={() => onOpenListing?.(selectedChat)}
            className="flex w-full min-w-0 max-w-full items-center gap-4 rounded-[26px] border border-white/10 bg-white/[0.05] p-4 text-left transition active:scale-[0.98]"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/5">
              {snapshot.photo ? (
                <img
                  src={snapshot.photo}
                  alt={snapshot.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                  Post
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h4 className="truncate text-sm font-semibold text-white">
                  {snapshot.title}
                </h4>

                {listingPrice && (
                  <span className="shrink-0 text-sm font-black text-kjc-accent">
                    ₹{listingPrice}
                  </span>
                )}
              </div>

              <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                {snapshot.status || snapshot.location || "Listing details"}
              </p>

              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-kjc-accent">
                Tap to view original post
              </p>
            </div>
          </button>
        </div>
        {snapshot.status !== "available" && (
  <div className="mx-4 mb-4 shrink-0 rounded-xl bg-rose-500/10 p-3 text-center text-xs font-black text-rose-400">
    {snapshot.status === "sold"
      ? "This item has been sold"
      : "This listing is no longer available"}
  </div>
)}

        <div className="scrollbar-hide min-h-0 min-w-0 max-w-full flex-1 space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/5 text-3xl">
                💬
              </div>

              <h3 className="text-2xl pro-heading">Start the conversation</h3>
              <p className="mt-2 max-w-xs text-xs font-bold leading-relaxed text-white/35">
                Ask about availability, location, price, or pickup details.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isMe = message.senderId === user?.uid;
              const visualStatus = getMessageVisualStatus(
                message,
                selectedChat,
                user?.uid
              );

              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`min-w-0 max-w-[82%] rounded-[26px] px-5 py-3 text-sm leading-relaxed shadow-sm ${
                      isMe
                        ? "rounded-br-md bg-kjc-accent text-white"
                        : "rounded-bl-md border border-white/10 bg-white/[0.06] text-white/85"
                    }`}
                  >
                    <p className="break-words">{message.content}</p>

                    {isMe && (
                      <div className="mt-2 flex justify-end">
                        <MessageStatusDots status={visualStatus} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 flex w-full max-w-full items-end gap-3 overflow-x-hidden border-t border-white/10 bg-black/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type a message..."
            className="input-pro min-h-12 min-w-0 flex-1 rounded-full px-6 py-3 text-[16px]"
            enterKeyHint="send"
            onFocus={() => {
              window.setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ block: "end" });
              }, 120);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSend();
            }}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-kjc-accent transition active:scale-[0.97] disabled:opacity-40"
          >
            <Send size={22} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-7 overflow-x-hidden">
      <div className="flex min-w-0 items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-4xl pro-heading tracking-tighter">Inbox</h2>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
            {totalUnread > 0
              ? `${totalUnread} unread message${totalUnread > 1 ? "s" : ""}`
              : "Your CampusX conversations"}
          </p>
        </div>

        {totalUnread > 0 && (
          <div className="rounded-full bg-kjc-accent px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_24px_rgba(139,92,246,0.35)]">
            New
          </div>
        )}
      </div>

      {visibleConversations.length === 0 ? (
        <div className="rounded-[42px] border border-dashed border-white/10 bg-white/[0.04] px-8 py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/5 text-3xl">
            💬
          </div>
          <h2 className="text-2xl pro-heading">No chats yet</h2>
          <p className="mx-auto mt-2 max-w-xs text-xs font-bold leading-relaxed text-white/35">
            Ping a listing owner to start a conversation. Your chats will appear
            here.
          </p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-4">
          {visibleConversations.map((conversation) => {
            const otherUserId = getOtherUserId(conversation);
            const otherUser = otherUserId ? userMap[otherUserId] : null;
            const name = otherUser?.displayName || "CampusX user";
            const snapshot = getConversationListingSnapshot(conversation);
            const unreadCount = getUnreadCount(conversation, user?.uid);
            const hasUnread = unreadCount > 0;
            const isMine = conversation.lastMessageSenderId === user?.uid;

            return (
              <div
                key={conversation.id}
                role="button"
                tabIndex={0}
                onClick={() => openChat(conversation)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") openChat(conversation);
                }}
                className={`relative flex w-full min-w-0 cursor-pointer items-center gap-4 rounded-[32px] border p-4 text-left transition-all duration-200 active:scale-[0.985] ${
                  hasUnread
                    ? "border-kjc-accent/45 bg-kjc-accent/[0.12] shadow-[0_0_28px_rgba(139,92,246,0.16)]"
                    : "border-white/10 bg-white/[0.045]"
                }`}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (otherUserId) onOpenUserProfile(otherUserId);
                  }}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/5 transition active:scale-[0.97]"
                >
                  {otherUser?.photoURL ? (
                    <img
                      src={otherUser.photoURL}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-kjc-accent/15 text-lg font-black text-kjc-accent">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {hasUnread && (
                    <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-black bg-kjc-accent" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h4
                      className={`truncate text-lg ${
                        hasUnread
                          ? "font-black text-white"
                          : "pro-heading text-white"
                      }`}
                    >
                      {name}
                    </h4>

                    {hasUnread && (
                      <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-kjc-accent px-2 text-[10px] font-black text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                    Regarding: {snapshot.title}
                  </p>

                  <p
                    className={`mt-1 truncate text-xs ${
                      hasUnread
                        ? "font-black text-white"
                        : "font-bold text-white/45"
                    }`}
                  >
                    {conversation.lastMessage
                      ? `${isMine ? "You: " : ""}${conversation.lastMessage}`
                      : "Start chatting..."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default function Shell() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
  const saved = localStorage.getItem("campusx_active_tab");
  return (saved as Tab) || "home";
});
useEffect(() => {
  localStorage.setItem("campusx_active_tab", activeTab);
}, [activeTab]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [profileGateOpen, setProfileGateOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<"issue" | "feedback" | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);

  const [housingData, setHousingData] = useState<HousingListing[]>([]);
  const [marketData, setMarketData] = useState<MarketListing[]>([]);
  const [myHousingData, setMyHousingData] = useState<HousingListing[]>([]);
  const [myMarketData, setMyMarketData] = useState<MarketListing[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [reportListing, setReportListing] = useState<HousingListing | MarketListing | null>(null);
  const [reportListingType, setReportListingType] = useState<ListingType>("housing");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [housingFilters, setHousingFilters] = useState<HousingFilters>(initialHousingFilters);
  const [loading, setLoading] = useState(true);
  const [bottomUnreadCount, setBottomUnreadCount] = useState(0);

  const [authModalOpen, setAuthModalOpen] = useState(false);

  const persistPendingIntent = (intent: PendingIntent) => {
    try {
      window.sessionStorage.setItem(PENDING_INTENT_STORAGE_KEY, JSON.stringify(intent));
    } catch {
      // Ignore storage failures and keep the in-memory fallback.
    }
  };

  const readPendingIntent = () => {
    try {
      const rawIntent = window.sessionStorage.getItem(PENDING_INTENT_STORAGE_KEY);
      if (!rawIntent) return null;

      return JSON.parse(rawIntent) as PendingIntent;
    } catch {
      return null;
    }
  };

  const clearPendingIntent = () => {
    try {
      window.sessionStorage.removeItem(PENDING_INTENT_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  useEffect(() => {
    if (authModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [authModalOpen]);

  const openAuth = () => {
    setAuthModalOpen(true);
  };

  const openAuthIntro = (intent?: PendingIntent) => {
    if (intent) {
      setPendingIntent(intent);
      persistPendingIntent(intent);
    }

    openAuth();
  };

  const closeAuthIntro = () => {
    setAuthModalOpen(false);
  };

  const cancelAuthIntro = () => {
    setAuthModalOpen(false);
    setPendingIntent(null);
    clearPendingIntent();
  };

  const requireAuth = (intent: PendingIntent) => {
    if (!user) {
      setPendingIntent(intent);
      persistPendingIntent(intent);
      openAuth();
      return true;
    }

    return false;
  };

  const [selectedListing, setSelectedListing] = useState<HousingListing | MarketListing | null>(null);
  const [selectedListingType, setSelectedListingType] = useState<ListingType>("housing");
  const [selectedPoster, setSelectedPoster] = useState<UserLite | null>(null);
  const [chatToOpenId, setChatToOpenId] = useState<string | null>(null);
  const [isChatDetailOpen, setIsChatDetailOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserLite | null>(null);
  const [isUserPreviewOpen, setIsUserPreviewOpen] = useState(false);
  const [notificationPrefsOpen, setNotificationPrefsOpen] = useState(false);
  const [foregroundPush, setForegroundPush] = useState<ForegroundPushPayload | null>(null);

  const [editingListing, setEditingListing] = useState<HousingListing | MarketListing | null>(null);
  const [editingListingType, setEditingListingType] = useState<ListingType>("housing");
  const [confirmationIntent, setConfirmationIntent] = useState<ConfirmationIntent | null>(null);
  const [confirmationBusy, setConfirmationBusy] = useState(false);
  const [renewIntent, setRenewIntent] = useState<RenewIntent | null>(null);
  const [renewBusy, setRenewBusy] = useState(false);

  const { user, profile, profileCompleted, signIn, logout, loading: authLoading } = useAuth();
  

  useEffect(() => {
    if (authLoading) return;

    if (user && profile && !profile.profileCompleted) {
      setProfileGateOpen(true);
    }
  }, [authLoading, profile, user]);

  useEffect(() => {
    if (!user?.uid) {
      setBottomUnreadCount(0);
      return;
    }

    const unsubscribe = subscribeToConversations((items: Conversation[]) => {
      const count = items.reduce(
        (sum, conversation) => sum + getUnreadCount(conversation, user.uid),
        0
      );

      setBottomUnreadCount(count);
    });

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    void loadData();
  }, [activeTab, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !profile?.notificationsEnabled) return;

    let unsubscribe: (() => void) | undefined;

    void listenForForegroundMessages((payload: ForegroundPushPayload) => {
      setForegroundPush(payload);
    }).then((cleanup: () => void) => {
      unsubscribe = cleanup;
    });

    return () => {
      unsubscribe?.();
    };
  }, [user?.uid, profile?.notificationsEnabled]);

  useEffect(() => {
    if (!user) return;

    if (!pendingIntent) {
      const storedIntent = readPendingIntent();
      if (storedIntent) {
        setPendingIntent(storedIntent);
        return;
      }
    }

    if (!pendingIntent) return;

    if (!profileCompleted) {
      setProfileGateOpen(true);
      return;
    }

    (async () => {
      const intent = pendingIntent;
      setPendingIntent(null);
      clearPendingIntent();
      await runIntent(intent);
    })();
  }, [user, pendingIntent, profileCompleted]);

  const loadData = async () => {
    setLoading(true);

    try {
      const blockedIds = user?.uid ? await getBlockedUserIds(user.uid) : [];
      setBlockedUserIds(blockedIds);

      const [housing, market] = await Promise.all([
        getHousingListings(),
        getMarketListings(),
      ]);

      const visibleHousing = housing.filter(
        (listing) =>
          !blockedIds.includes(listing.postedBy) &&
          isPublicListingVisible(listing) &&
          listing.postedBy !== user?.uid
      );

      const visibleMarket = market.filter(
        (listing) =>
          !blockedIds.includes(listing.postedBy) &&
          isPublicListingVisible(listing) &&
          listing.postedBy !== user?.uid
      );

      setHousingData(visibleHousing);
      setMarketData(visibleMarket);

      if (user?.uid) {
        const ownedHousingFromAll = housing.filter((listing) => listing.postedBy === user.uid);
        const ownedMarketFromAll = market.filter((listing) => listing.postedBy === user.uid);

        const [myHousingFromQuery, myMarketFromQuery] = await Promise.all([
          getMyHousingListings(user.uid),
          getMyMarketListings(user.uid),
        ]);

        const mergedHousing = [
          ...myHousingFromQuery,
          ...ownedHousingFromAll.filter(
            (item) => !myHousingFromQuery.some((existing) => existing.id === item.id)
          ),
        ];

        const mergedMarket = [
          ...myMarketFromQuery,
          ...ownedMarketFromAll.filter(
            (item) => !myMarketFromQuery.some((existing) => existing.id === item.id)
          ),
        ];

        setMyHousingData(
  mergedHousing.filter((item) => item.status !== "deleted")
);

setMyMarketData(
  mergedMarket.filter((item) => item.status !== "deleted")
);
      } else {
        setMyHousingData([]);
        setMyMarketData([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openUserProfile = async (uid: string) => {
    const snapshot = await getDoc(doc(db, "users", uid));
    setSelectedUserProfile((snapshot.data() as UserLite) || null);
    setIsUserPreviewOpen(true);
  };

  const openListingDetails = async (listing: HousingListing | MarketListing, type: ListingType) => {
    setSelectedListing(listing);
    setSelectedListingType(type);

    const snapshot = await getDoc(doc(db, "users", listing.postedBy));
    setSelectedPoster((snapshot.data() as UserLite) || null);

    if (user?.uid && listing.postedBy !== user.uid) {
      await trackListingView({
        listingId: listing.id,
        listingType: type,
        listingOwnerId: listing.postedBy,
      });
    }
  };
  useEffect(() => {
  async function openSharedListingFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const listingType = params.get("listingType") as ListingType | null;
    const listingId = params.get("listingId");

    if (!listingType || !listingId) return;

    if (listingType !== "housing" && listingType !== "market") return;

    try {
      const collectionName =
        listingType === "housing" ? "housing_listings" : "marketplace_listings";

      const snapshot = await getDoc(doc(db, collectionName, listingId));

      if (!snapshot.exists()) {
        toast.error("This listing is no longer available.");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const listing = {
        id: snapshot.id,
        ...snapshot.data(),
      } as HousingListing | MarketListing;

      await openListingDetails(listing, listingType);

      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) {
      console.error("Failed to open shared listing:", error);
      toast.error("Could not open this listing.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  void openSharedListingFromUrl();
}, []);

  const openOriginalListingFromConversation = async (conversation: Conversation) => {
    try {
      const collectionName =
        conversation.listingType === "housing"
          ? "housing_listings"
          : conversation.listingType === "market"
            ? "marketplace_listings"
            : null;

      if (!collectionName) {
        toast.error("Original post is no longer available.");
        return;
      }

      const snapshot = await getDoc(doc(db, collectionName, conversation.listingId));

      if (!snapshot.exists()) {
        toast.error("Original post is no longer available.");
        return;
      }

      await openListingDetails(
        { id: snapshot.id, ...snapshot.data() } as HousingListing | MarketListing,
        conversation.listingType as ListingType
      );
    } catch (error) {
      console.error(error);
      toast.error("Original post is no longer available.");
    }
  };

  const closeListingDetail = () => {
    setSelectedListing(null);
    setSelectedPoster(null);
  };

  const handleEditListing = (listing: HousingListing | MarketListing, type: ListingType) => {
    if (!user || listing.postedBy !== user.uid) {
      toast.error("You can only edit your own post.");
      return;
    }

    closeListingDetail();
    setEditingListing(listing);
    setEditingListingType(type);
  };

  const handleDeleteListing = async (listing: HousingListing | MarketListing, type: ListingType) => {
    if (!user || listing.postedBy !== user.uid) {
      toast.error("You can only delete your own post.");
      return;
    }

    setConfirmationIntent({ kind: "delete", listing, type });
  };

  const confirmDeleteListing = async (listing: HousingListing | MarketListing, type: ListingType) => {
    try {
      if (type === "housing") {
  await updateHousingListing(listing.id, {
    status: "deleted",
  });
} else {
  await updateMarketListing(listing.id, {
    status: "deleted",
  });
}

      closeListingDetail();
      await loadData();
      toast.success("Post deleted.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not delete post.");
    }
  };

  const handleCloseListing = async (listing: HousingListing | MarketListing, type: ListingType) => {
    if (!user || listing.postedBy !== user.uid) {
      toast.error("You can only close your own post.");
      return;
    }

    setConfirmationIntent({ kind: "close", listing, type });
  };

  const confirmCloseListing = async (listing: HousingListing | MarketListing, type: ListingType) => {
    try {
      if (type === "housing") {
        await closeHousingListing(listing.id);
      } else {
        await closeMarketListing(listing.id);
      }

      closeListingDetail();
      await loadData();
      toast.success("Post closed.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not close post.");
    }
  };

  const handleReopenListing = async (listing: HousingListing | MarketListing, type: ListingType) => {
    if (!user || listing.postedBy !== user.uid) {
      toast.error("You can only reopen your own post.");
      return;
    }

    try {
      if (type === "housing") {
        await reopenHousingListing(listing.id);
      } else {
        await reopenMarketListing(listing.id);
      }

      closeListingDetail();
      await loadData();
      toast.success("Post reopened.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not reopen post.");
    }
  };

  const handleRenewListing = async (listing: HousingListing | MarketListing, type: ListingType) => {
    if (!user || listing.postedBy !== user.uid) {
      toast.error("You can only renew your own post.");
      return;
    }

    setRenewIntent({ listing, type });
  };

  const submitRenewListing = async (duration: 15 | 30) => {
    if (!renewIntent) return;

    const { listing, type } = renewIntent;
    setRenewBusy(true);
    try {
      if (type === "housing") {
        await renewHousingListing(listing.id, duration);
      } else {
        await renewMarketListing(listing.id, duration);
      }

      await loadData();
      setRenewIntent(null);
      toast.success(`Post renewed for ${duration} days.`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not renew post.");
    } finally {
      setRenewBusy(false);
    }
  };

  const handleMarkSold = async (listing: MarketListing) => {
  if (!user || listing.postedBy !== user.uid) return;

  try {
    await updateMarketListing(listing.id, {
      status: "sold",
    });

    closeListingDetail();
    await loadData();
    toast.success("Marked as sold.");
  } catch (error) {
    console.error(error);
    toast.error("Could not mark as sold.");
  }
};

  const openReportFlow = (listing: HousingListing | MarketListing, type: ListingType) => {
    if (!user) return;

    if (listing.postedBy === user.uid) {
      toast.error("You cannot report your own post.");
      return;
    }

    setReportListing(listing);
    setReportListingType(type);
  };

  const startContactFlow = async (
    ownerId: string,
    listingId: string,
    title: string,
    type: string
  ) => {
    if (!user) return;

    if (ownerId === user.uid) {
      toast.error("This is your own post. Use Manage post to edit or close it.");
      return;
    }

    if (blockedUserIds.includes(ownerId)) {
      toast.error("You blocked this user. Unblock them before starting a chat.");
      return;
    }

    try {
      const listing =
        housingData.find((item) => item.id === listingId) ||
        marketData.find((item) => item.id === listingId) ||
        myHousingData.find((item) => item.id === listingId) ||
        myMarketData.find((item) => item.id === listingId) ||
        null;

      const listingMetadata = listing
        ? {
            listingPhoto: listing.photos?.[0] || null,
            listingPrice: "rent" in listing ? listing.rent : listing.price,
            listingStatus: listing.status,
            listingLocation:
              "rent" in listing
                ? getHousingLocationDisplay(listing).compact
                : listing.formattedAddress?.split(",")[0]?.trim() || "Near KJU",
          }
        : undefined;

      const conversationId = await startConversation(
        ownerId,
        listingId,
        title,
        type,
        listingMetadata
      );

      setChatToOpenId(conversationId);
      setSelectedListing(null);
      setSelectedPoster(null);
      setShowFilters(false);
      setIsModalOpen(false);
      setActiveTab("inbox");
    } catch (error) {
      console.error(error);
      toast.error("Could not start chat right now. Please refresh and try again.");
    }
  };

  const runIntent = async (intent: PendingIntent) => {
    if (intent.kind === "post") {
      setIsModalOpen(true);
      return;
    }

    if (intent.kind === "save") {
      await saveListing(intent.listingId, intent.listingType);
      return;
    }

    if (intent.kind === "tab") {
      setActiveTab(intent.tab);
      return;
    }

    if (intent.kind === "contact") {
      await startContactFlow(
        intent.ownerId,
        intent.listingId,
        intent.title,
        intent.listingType
      );
      return;
    }

    if (intent.kind === "report") {
      openReportFlow(intent.listing, intent.listingType);
    }
  };

  const requireProfileReady = async (intent: PendingIntent) => {
    if (requireAuth(intent)) {
      return;
    }

    if (!profileCompleted) {
      setPendingIntent(intent);
      setProfileGateOpen(true);
      return;
    }

    await runIntent(intent);
  };

  const handleOpenReport = (listing: HousingListing | MarketListing, type: ListingType) => {
    void requireProfileReady({
      kind: "report",
      listing,
      listingType: type,
    });
  };

  const handleBlockUser = async (userIdToBlock: string) => {
    if (!user) {
      openAuthIntro();
      return;
    }

    if (user.uid === userIdToBlock) {
      toast.error("You cannot block yourself.");
      return;
    }

    setConfirmationIntent({ kind: "block", userId: userIdToBlock });
  };

  const confirmBlockUser = async (userIdToBlock: string) => {
    try {
      await blockUser(userIdToBlock);

      setBlockedUserIds((prev) =>
        prev.includes(userIdToBlock) ? prev : [...prev, userIdToBlock]
      );

      setHousingData((prev) => prev.filter((listing) => listing.postedBy !== userIdToBlock));
      setMarketData((prev) => prev.filter((listing) => listing.postedBy !== userIdToBlock));

      closeListingDetail();

      toast.success("User blocked.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not block user.");
    }
  };

  const confirmPendingAction = async () => {
    if (!confirmationIntent) return;

    setConfirmationBusy(true);
    try {
      if (confirmationIntent.kind === "delete") {
        await confirmDeleteListing(confirmationIntent.listing, confirmationIntent.type);
      } else if (confirmationIntent.kind === "close") {
        await confirmCloseListing(confirmationIntent.listing, confirmationIntent.type);
      } else {
        await confirmBlockUser(confirmationIntent.userId);
      }

      setConfirmationIntent(null);
    } finally {
      setConfirmationBusy(false);
    }
  };

  const handleContact = async (
    ownerId: string,
    listingId: string,
    title: string,
    type: string
  ) => {
    await requireProfileReady({
      kind: "contact",
      ownerId,
      listingId,
      title,
      listingType: type,
    });
  };

  const filterBySearch = <T extends { title: string; description?: string }>(items: T[]) => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();

    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    );
  };

  const activeHousingFilterCount = getHousingFilterCount(housingFilters);

  const filteredHousingData = applyHousingFilters(
    filterBySearch(housingData),
    housingFilters
  );

  const confirmationCopy = confirmationIntent
    ? confirmationIntent.kind === "delete"
      ? {
          title: "Delete this post?",
          description: "It will be hidden from the public feed and removed from active discovery.",
          confirmLabel: "Delete",
          variant: "danger" as const,
        }
      : confirmationIntent.kind === "close"
        ? {
            title: "Close this post?",
            description: "Students will no longer be able to start new chats from this listing.",
            confirmLabel: "Close",
            variant: "accent" as const,
          }
        : {
            title: "Block this user?",
            description: "Their posts and chats will be hidden for you.",
            confirmLabel: "Block",
            variant: "danger" as const,
          }
    : null;

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-black pb-32 text-white atmo-bg">
      <SonnerToaster />

      <Header
        activeTab={activeTab}
        onSearch={setSearchQuery}
        onFilterClick={() => setShowFilters((prev) => !prev)}
        showFilters={showFilters}
        activeFilterCount={activeTab === "home" ? activeHousingFilterCount : 0}
      />

      <main className="mx-auto w-full max-w-[min(42rem,100%)] overflow-x-hidden px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {activeTab === "home" && (
              <RoomsPage
                listings={filteredHousingData}
                loading={loading}
                onContact={handleContact}
                onOpenDetails={openListingDetails}
                onRequireProfileReady={requireProfileReady}
                user={user}
                onRequireAuth={requireAuth}
              />

            )}

            {activeTab === "search" && (
              <MarketPage
                items={filterBySearch(marketData)}
                loading={loading}
                onContact={handleContact}
                onOpenDetails={openListingDetails}
                onRequireProfileReady={requireProfileReady}
                onRequireAuth={requireAuth}
              />
            )}

            
{activeTab === "inbox" &&
  (authLoading ? (
    <div className="flex items-center justify-center py-24">
      <LottiePlayer animation={homeLoading} className="w-40 h-40" />
    </div>
  ) : !authLoading && !user ? (
    <div className="py-24 text-center">
      <p className="mx-auto mb-4 max-w-xs text-[11px] font-medium leading-relaxed text-white/45">
        Students use their college email. Alumni can use college or personal email. Others can use any Gmail account.
      </p>
      <button
        type="button"
        onClick={openAuth}
        className="rounded-[30px] bg-white px-8 py-5 text-black active:scale-[0.97]"
      >
        Sign in to view inbox
      </button>
    </div>
  ) : (
    <Chattery
      onOpenUserProfile={openUserProfile}
      openConversationId={chatToOpenId}
      onConversationOpened={() => setChatToOpenId(null)}
      onConversationStateChange={setIsChatDetailOpen}
      onOpenListing={openOriginalListingFromConversation}
      blockedUserIds={blockedUserIds}
    />
  ))}


            {activeTab === "me" &&
  (authLoading ? (
    <div className="flex items-center justify-center py-24">
      <LottiePlayer animation={homeLoading} className="w-40 h-40" />
    </div>
  ) : !authLoading && !user ? (
    <div className="py-24 text-center">
      <p className="mx-auto mb-4 max-w-xs text-[11px] font-medium leading-relaxed text-white/45">
        Students use their college email. Alumni can use college or personal email. Others can use any Gmail account.
      </p>
      <button
        type="button"
        onClick={openAuth}
        className="rounded-[30px] bg-white px-8 py-5 text-black active:scale-[0.97]"
      >
        Sign in to view profile
      </button>
    </div>
  ) : (
    // ✅ keep your existing profile UI here
                <div className="space-y-10">
                  <div className="rounded-[44px] border border-white/10 bg-white/5 p-9 text-center">
                    <div className="mx-auto mb-6 h-28 w-28 overflow-hidden rounded-[40px] bg-white/5">
                      {profile?.photoURL ? (
                        <img src={profile.photoURL} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-kjc-accent/15 text-4xl font-black text-kjc-accent">
                          {profile?.displayName?.charAt(0) || "X"}
                        </div>
                      )}
                    </div>

                    <h2 className="text-4xl pro-heading">
                      {profile?.displayName || "CampusX User"}
                    </h2>

                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                      {profile?.campusRole || "Student"}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEditProfileOpen(true)}
                        className="rounded-[26px] border border-white/10 bg-white/5 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 transition-transform duration-150 ease-out active:scale-[0.97]"
                      >
                        Edit profile
                      </button>

                      <button
                        type="button"
                        onClick={() => setFeedbackModal("feedback")}
                        className="rounded-[26px] border border-white/10 bg-white/5 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 transition-transform duration-150 ease-out active:scale-[0.97]"
                      >
                        Feedback
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFeedbackModal("issue")}
                      className="mt-3 w-full rounded-[26px] border border-amber-500/20 bg-amber-500/10 px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-amber-300 transition-transform duration-150 ease-out active:scale-[0.97]"
                    >
                      Report app issue
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotificationPrefsOpen(true)}
                      className="mt-3 w-full rounded-[26px] border border-kjc-accent/20 bg-kjc-accent/10 px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-kjc-accent transition-transform duration-150 ease-out active:scale-[0.97]"
                    >
                      Notification settings
                    </button>

                    {!profileCompleted && (
                      <button
                        type="button"
                        onClick={() => setProfileGateOpen(true)}
                        className="mt-3 w-full rounded-[26px] border border-kjc-accent/20 bg-kjc-accent/10 px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-kjc-accent"
                      >
                        Complete profile
                      </button>
                    )}
                  </div>

                  <SavedPostsSection
                    refreshKey={user?.uid}
                    onOpenDetails={openListingDetails}
                  />

                  <MyPostsPage
                    housing={myHousingData}
                    market={myMarketData}
                    loading={loading}
                    onContact={handleContact}
                    onOpenDetails={openListingDetails}
                    onRequireProfileReady={requireProfileReady}
                    onRenew={handleRenewListing}
                    onRequireAuth={requireAuth}
                  />

                  <button
                    type="button"
                    onClick={logout}
                    className="w-full rounded-[36px] border border-rose-500/20 bg-rose-500/10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    Log out
                  </button>
                </div>
              ))}
          </motion.div>
        </AnimatePresence>
      </main>

      {!selectedListing && !isModalOpen && !showFilters && !isChatDetailOpen && (
  <BottomNav
    activeTab={activeTab}
    onTabChange={setActiveTab}
    onAddClick={() => requireProfileReady({ kind: "post" })}
    onRequireAuth={requireAuth}
    bottomUnreadCount={bottomUnreadCount}
  />
)}

      <HousingFilterModal
        isOpen={showFilters && activeTab === "home"}
        filters={housingFilters}
        onChange={setHousingFilters}
        onClear={() => setHousingFilters(initialHousingFilters)}
        onClose={() => setShowFilters(false)}
      />

      <ProfileCompletionModal
        isOpen={profileGateOpen}
        canClose={false}
        onComplete={async () => {
          setProfileGateOpen(false);

          if (pendingIntent) {
            const intent = pendingIntent;
            setPendingIntent(null);
            await runIntent(intent);
          }
        }}
      />

      <ProfileCompletionModal
        isOpen={editProfileOpen}
        canClose
        onClose={() => setEditProfileOpen(false)}
        onComplete={() => setEditProfileOpen(false)}
      />

      <AppFeedbackModal
        isOpen={Boolean(feedbackModal)}
        mode={feedbackModal || "feedback"}
        onClose={() => setFeedbackModal(null)}
      />

      <CreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={loadData}
      />

      {editingListing && (
        <ListingForm
          type={editingListingType}
          existingListing={editingListing}
          onClose={() => setEditingListing(null)}
          onSuccess={async () => {
            setEditingListing(null);
            await loadData();
          }}
        />
      )}

      <ListingDetailModal
        isOpen={Boolean(selectedListing)}
        listing={selectedListing}
        type={selectedListingType}
        currentUserId={user?.uid || null}
        onClose={closeListingDetail}
        onContact={handleContact}
        poster={selectedPoster}
        onOpenPoster={() => {
          if (selectedListing?.postedBy) {
            openUserProfile(selectedListing.postedBy);
          }
        }}
        onEdit={handleEditListing}
        onDelete={handleDeleteListing}
        onCloseListing={handleCloseListing}
        onReopenListing={handleReopenListing}
        onMarkSold={handleMarkSold}
        isPosterBlocked={
          selectedListing ? blockedUserIds.includes(selectedListing.postedBy) : false
        }
        onReport={handleOpenReport}
        onBlockUser={handleBlockUser}
      />

      <UserProfilePreview
        isOpen={isUserPreviewOpen}
        onClose={() => setIsUserPreviewOpen(false)}
        user={selectedUserProfile}
      />

      <ReportListingModal
        isOpen={Boolean(reportListing)}
        listing={reportListing}
        type={reportListingType}
        currentUserId={user?.uid || null}
        onClose={() => setReportListing(null)}
      />

      <NotificationPreferencesModal
        isOpen={notificationPrefsOpen}
        onClose={() => setNotificationPrefsOpen(false)}
      />

      <ForegroundNotificationToast
        payload={foregroundPush}
        onClose={() => setForegroundPush(null)}
      />

      <AlertDialog
        open={Boolean(confirmationCopy)}
        title={confirmationCopy?.title || ""}
        description={confirmationCopy?.description || ""}
        confirmLabel={confirmationCopy?.confirmLabel || "Confirm"}
        variant={confirmationCopy?.variant}
        busy={confirmationBusy}
        onCancel={() => setConfirmationIntent(null)}
        onConfirm={confirmPendingAction}
      />

      <RenewDurationDialog
        open={Boolean(renewIntent)}
        busy={renewBusy}
        onClose={() => setRenewIntent(null)}
        onSelect={submitRenewListing}
      />

      {authModalOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black px-6 text-center">
          <button
            type="button"
            onClick={cancelAuthIntro}
            className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white/80"
            aria-label="Close welcome screen"
          >
            <ArrowLeft size={22} />
          </button>

          <h1 className="text-3xl font-black text-white">
            Welcome to CampusX
          </h1>

          <p className="mt-3 max-w-xs text-sm text-white/50">
            Find rooms, connect with students, and explore campus essentials.
          </p>

          <div className="mt-6 max-w-xs space-y-3 text-left text-sm">
            <p className="font-bold text-white">Students</p>
            <p className="text-xs text-white/50">Use college email</p>

            <p className="font-bold text-white">Alumni</p>
            <p className="text-xs text-white/50">Use college or personal email</p>

            <p className="font-bold text-white">Others</p>
            <p className="text-xs text-white/50">Use any Gmail</p>
          </div>

          <button
            onClick={async () => {
              closeAuthIntro();
              await signIn();
            }}
            className="mt-8 rounded-full bg-white px-6 py-3 text-xs font-black uppercase tracking-wide text-black active:scale-[0.97]"
          >
            Continue with Google
          </button>

          <p className="mt-4 text-[10px] text-white/30">
            Only verified users can interact on CampusX
          </p>
        </div>
      )}

      <VerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
      />
    </div>
  );
}
