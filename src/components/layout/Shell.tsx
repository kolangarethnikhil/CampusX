import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Bookmark,
  Filter,
  Home,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { getHousingListings, HousingListing } from "../../services/housingService";
import { getMarketListings, MarketListing } from "../../services/marketService";
import { checkIsSaved, saveListing, unsaveListing } from "../../services/savedService";
import {
  Conversation,
  Message,
  sendMessage,
  startConversation,
  subscribeToConversations,
  subscribeToMessages,
} from "../../services/chatService";

import ListingForm from "../features/ListingForm";
import VerificationModal from "../features/VerificationModal";
import ListingDetailModal from "../features/ListingDetailModal";
import UserProfilePreview from "../features/UserProfilePreview";
import HousingMapView from "../features/HousingMapView";
import { getHousingLocationDisplay } from "../../utils/listingDisplay";

type Tab = "home" | "search" | "inbox" | "me";
type ListingType = "housing" | "market";

type UserLite = {
  displayName: string;
  photoURL?: string;
  campusRole?: string;
  verifiedStatus?: string;
  course?: string;
  batch?: string;
  currentLocation?: string;
};

function BottomNav({
  activeTab,
  onTabChange,
  onAddClick,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onAddClick: () => void;
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
            if (tab.id === "add") onAddClick();
            else onTabChange(tab.id as Tab);
          }}
          className={`relative flex items-center justify-center transition-all duration-300 active:scale-90 ${
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
          <tab.icon size={tab.special ? 30 : 22} strokeWidth={tab.special ? 2.5 : 2} />

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
}: {
  activeTab: Tab;
  onSearch: (value: string) => void;
  onFilterClick: () => void;
  showFilters: boolean;
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
                className="rounded-2xl border border-white/5 bg-white/5 p-3 text-white transition-all hover:bg-white/10 active:scale-90"
                aria-label="Search"
              >
                <Search size={22} />
              </button>

              {(activeTab === "home" || activeTab === "search") && (
                <button
                  type="button"
                  onClick={onFilterClick}
                  className={`rounded-2xl border p-3 transition-all active:scale-90 ${
                    showFilters
                      ? "border-kjc-accent bg-kjc-accent text-white"
                      : "border-white/5 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  aria-label="Filters"
                >
                  <Filter size={22} />
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
              className="rounded-2xl border border-white/5 bg-white/5 p-3 text-white active:scale-90"
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
}: {
  listing: HousingListing | MarketListing;
  type: ListingType;
  onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>;
  onOpenDetails: (listing: HousingListing | MarketListing, type: ListingType) => void;
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [saveId, setSaveId] = useState<string | null>(null);
  const { user, signIn } = useAuth();

  const isHousing = type === "housing";
  const housingListing = listing as HousingListing;
  const marketListing = listing as MarketListing;
  const price = isHousing ? housingListing.rent : marketListing.price;

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
      await signIn();
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

  return (
    <motion.button
      type="button"
      onClick={() => onOpenDetails(listing, type)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      className="group mb-8 w-full overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04] text-left shadow-pro transition-all duration-300 hover:border-white/15"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {listing.photos?.[0] ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.025] text-white/10">
            {isHousing ? <Home size={64} strokeWidth={1} /> : <ShoppingBag size={64} strokeWidth={1} />}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

        <div className="absolute left-5 right-5 top-5 flex items-start justify-between">
          <span className="rounded-full bg-kjc-accent px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-xl">
            {isHousing ? housingListing.roomType || "Room" : marketListing.category || "Item"}
          </span>

          <button
            type="button"
            onClick={handleToggleSave}
            className={`flex h-12 w-12 items-center justify-center rounded-3xl border transition-all ${
              isSaved
                ? "scale-105 border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                : "border-white/20 bg-black/30 text-white hover:bg-white/15"
            }`}
            aria-label={isSaved ? "Unsave listing" : "Save listing"}
          >
            <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
          </button>
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

          {isHousing &&
            housingListing.amenities?.slice(0, 2).map((amenity) => (
              <span
                key={amenity}
                className="rounded-xl border border-white/5 bg-white/[0.035] px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/60"
              >
                {amenity}
              </span>
            ))}
        </div>

        {isHousing && housingListing.preferTenants && (
          <div className="rounded-3xl border border-white/5 bg-white/[0.025] p-4">
            <p className="mb-2 text-[10px] font-black uppercase leading-none tracking-[0.2em] text-white/40">
              Preferred tenant
            </p>
            <p className="text-[11px] font-bold tracking-tight text-kjc-accent/85">
              {housingListing.preferTenants}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onContact(listing.postedBy, listing.id, listing.title, type);
          }}
          className="flex w-full items-center justify-center gap-3 rounded-[28px] border border-white/5 bg-white py-5 text-[10px] font-black uppercase tracking-[0.28em] text-black shadow-pro transition-all hover:bg-kjc-accent hover:text-white active:scale-[0.98]"
        >
          Ping owner
          <Send size={16} />
        </button>
      </div>
    </motion.button>
  );
}

function RoomsPage({
  listings,
  loading,
  onContact,
  onOpenDetails,
}: {
  listings: HousingListing[];
  loading: boolean;
  onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>;
  onOpenDetails: (listing: HousingListing | MarketListing, type: ListingType) => void;
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
          className={`rounded-[20px] py-4 text-[10px] font-black uppercase tracking-[0.2em] ${
            viewMode === "list" ? "bg-white text-black" : "text-white/40"
          }`}
        >
          List
        </button>

        <button
          type="button"
          onClick={() => setViewMode("map")}
          className={`rounded-[20px] py-4 text-[10px] font-black uppercase tracking-[0.2em] ${
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
          {loading ? (
            [1, 2].map((item) => (
              <div
                key={item}
                className="aspect-[16/10] animate-pulse rounded-[40px] border border-white/10 bg-white/5"
              />
            ))
          ) : listings.length === 0 ? (
            <div className="rounded-[40px] border border-dashed border-white/10 bg-white/5 py-24 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                No rooms yet
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
}: {
  items: MarketListing[];
  loading: boolean;
  onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>;
  onOpenDetails: (listing: HousingListing | MarketListing, type: ListingType) => void;
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
            />
          ))
        )}
      </div>
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
                className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-white/40"
              >
                <X size={28} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <button
                type="button"
                onClick={() => setSelectedType("housing")}
                className="rounded-[36px] border border-white/5 bg-white/5 p-8 text-left"
              >
                <Home size={28} />
                <h3 className="mt-6 text-xl pro-heading">Room</h3>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("market")}
                className="rounded-[36px] border border-white/5 bg-white/5 p-8 text-left"
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

function Chattery({
  onOpenUserProfile,
}: {
  onOpenUserProfile: (uid: string) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userMap, setUserMap] = useState<Record<string, UserLite>>({});
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = subscribeToConversations(setConversations);
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    async function loadUsers() {
      if (!user || conversations.length === 0) return;

      const ids = conversations
        .map((conversation) => conversation.participants.find((id) => id !== user.uid))
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

  useEffect(() => {
    if (!selectedChat) return;

    const unsubscribe = subscribeToMessages(selectedChat.id, setMessages);
    return unsubscribe;
  }, [selectedChat]);

  const getOtherUserId = (conversation: Conversation) =>
    conversation.participants.find((id) => id !== user?.uid);

  const handleSend = async () => {
    if (!input.trim() || !selectedChat) return;

    await sendMessage(selectedChat.id, input.trim());
    setInput("");
  };

  if (selectedChat) {
    const otherUserId = getOtherUserId(selectedChat);
    const otherUser = otherUserId ? userMap[otherUserId] : null;
    const name = otherUser?.displayName || "CampusX user";

    return (
      <div className="fixed inset-0 z-[120] flex flex-col bg-black">
        <header className="flex items-center gap-4 border-b border-white/10 bg-black p-5">
          <button
            type="button"
            onClick={() => setSelectedChat(null)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5"
          >
            <ArrowLeft size={22} />
          </button>

          <button
            type="button"
            onClick={() => otherUserId && onOpenUserProfile(otherUserId)}
            className="flex items-center gap-3 text-left"
          >
            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-white/5">
              {otherUser?.photoURL ? (
                <img src={otherUser.photoURL} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-kjc-accent/15 text-kjc-accent">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xl pro-heading">{name}</h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                Regarding: {selectedChat.listingTitle}
              </p>
            </div>
          </button>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto p-6">
          {messages.map((message) => {
            const isMe = message.senderId === user?.uid;

            return (
              <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-[28px] px-6 py-4 text-sm ${
                    isMe ? "bg-kjc-accent text-white" : "bg-white/5 text-white/85"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 border-t border-white/10 p-6">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type a message..."
            className="input-pro flex-1"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSend();
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-kjc-accent"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <h2 className="text-4xl pro-heading tracking-tighter">Inbox</h2>

      {conversations.length === 0 ? (
        <div className="rounded-[48px] border border-dashed border-white/10 bg-white/5 py-24 text-center">
          <h2 className="text-2xl pro-heading">No chats yet</h2>
        </div>
      ) : (
        <div className="grid gap-5">
          {conversations.map((conversation) => {
            const otherUserId = getOtherUserId(conversation);
            const otherUser = otherUserId ? userMap[otherUserId] : null;
            const name = otherUser?.displayName || "CampusX user";

            return (
              <div
                key={conversation.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedChat(conversation)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setSelectedChat(conversation);
                }}
                className="flex w-full cursor-pointer items-center gap-5 rounded-[40px] border border-white/5 bg-white/5 p-6 text-left"
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (otherUserId) onOpenUserProfile(otherUserId);
                  }}
                  className="h-14 w-14 overflow-hidden rounded-2xl bg-white/5"
                >
                  {otherUser?.photoURL ? (
                    <img src={otherUser.photoURL} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-kjc-accent/15 text-kjc-accent">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xl pro-heading">{name}</h4>
                  <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                    Regarding: {conversation.listingTitle}
                  </p>
                  <p className="mt-1 truncate text-[11px] font-bold text-white/45">
                    {conversation.lastMessage || "Start chatting..."}
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
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [housingData, setHousingData] = useState<HousingListing[]>([]);
  const [marketData, setMarketData] = useState<MarketListing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedListing, setSelectedListing] = useState<HousingListing | MarketListing | null>(null);
  const [selectedListingType, setSelectedListingType] = useState<ListingType>("housing");
  const [selectedPoster, setSelectedPoster] = useState<UserLite | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserLite | null>(null);
  const [isUserPreviewOpen, setIsUserPreviewOpen] = useState(false);

  const { user, profile, signIn, logout } = useAuth();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);

    try {
      const [housing, market] = await Promise.all([getHousingListings(), getMarketListings()]);
      setHousingData(housing);
      setMarketData(market);
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
  };

  const handleContact = async (ownerId: string, listingId: string, title: string, type: string) => {
    if (!user) {
      await signIn();
      return;
    }

    try {
      await startConversation(ownerId, listingId, title, type);
      setSelectedListing(null);
      setActiveTab("inbox");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not start chat");
    }
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

  return (
    <div className="min-h-screen bg-black pb-32 text-white atmo-bg">
      <Header
        activeTab={activeTab}
        onSearch={setSearchQuery}
        onFilterClick={() => setShowFilters((prev) => !prev)}
        showFilters={showFilters}
      />

      <main className="mx-auto max-w-xl px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {activeTab === "home" && (
              <RoomsPage
                listings={filterBySearch(housingData)}
                loading={loading}
                onContact={handleContact}
                onOpenDetails={openListingDetails}
              />
            )}

            {activeTab === "search" && (
              <MarketPage
                items={filterBySearch(marketData)}
                loading={loading}
                onContact={handleContact}
                onOpenDetails={openListingDetails}
              />
            )}

            {activeTab === "inbox" && (
              !user ? (
                <div className="py-24 text-center">
                  <button
                    type="button"
                    onClick={signIn}
                    className="rounded-[30px] bg-white px-8 py-5 text-black"
                  >
                    Sign in to view inbox
                  </button>
                </div>
              ) : (
                <Chattery onOpenUserProfile={openUserProfile} />
              )
            )}

            {activeTab === "me" && (
              <div className="space-y-8">
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

                  <h2 className="text-4xl pro-heading">{profile?.displayName || "CampusX User"}</h2>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    {profile?.campusRole || "Student"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full rounded-[36px] border border-rose-500/20 bg-rose-500/10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-rose-500"
                >
                  Log out
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddClick={() => {
          if (!user) {
            signIn();
            return;
          }
          setIsModalOpen(true);
        }}
      />

      <CreateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRefresh={loadData} />

      <ListingDetailModal
        isOpen={Boolean(selectedListing)}
        listing={selectedListing}
        type={selectedListingType}
        onClose={() => {
          setSelectedListing(null);
          setSelectedPoster(null);
        }}
        onContact={handleContact}
        poster={selectedPoster}
        onOpenPoster={() => {
          if (selectedListing?.postedBy) openUserProfile(selectedListing.postedBy);
        }}
      />

      <UserProfilePreview
        isOpen={isUserPreviewOpen}
        onClose={() => setIsUserPreviewOpen(false)}
        user={selectedUserProfile}
      />

      <VerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
      />
    </div>
  );
}