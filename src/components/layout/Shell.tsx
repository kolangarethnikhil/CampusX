import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Filter,
  Home,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
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

type Tab = "home" | "search" | "inbox" | "me";
type ListingType = "housing" | "market";

type UserLite = {
  displayName: string;
  photoURL?: string;
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
}: {
  listing: HousingListing | MarketListing;
  type: ListingType;
  onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      className="group mb-8 overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04] shadow-pro transition-all duration-300 hover:border-white/15"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {listing.photos?.[0] ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.025] text-white/10">
            {isHousing ? <Home size={64} strokeWidth={1} /> : <ShoppingBag size={64} strokeWidth={1} />}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

        <div className="absolute left-5 right-5 top-5 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <span className="rounded-full bg-kjc-accent px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-xl">
              {isHousing ? housingListing.roomType || "Room" : marketListing.category || "Item"}
            </span>

            {isHousing && housingListing.genderPreference && housingListing.genderPreference !== "none" && (
              <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                {housingListing.genderPreference} only
              </span>
            )}
          </div>

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
              {isHousing && housingListing.distanceLabel
                ? housingListing.distanceLabel
                : listing.formattedAddress?.split(",")[0] || (listing as any).location || "Campus area"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <span className="rounded-xl border border-white/5 bg-white/[0.035] px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/60">
            {isHousing ? housingListing.furnishing || "Unfurnished" : marketListing.condition || "Good"}
          </span>

          {!isHousing && (
            <span className="rounded-xl border border-kjc-accent/20 bg-kjc-accent/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-kjc-accent">
              {marketListing.category}
            </span>
          )}

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
          onClick={() => onContact(listing.postedBy, listing.id, listing.title, type)}
          className="flex w-full items-center justify-center gap-3 rounded-[28px] border border-white/5 bg-white py-5 text-[10px] font-black uppercase tracking-[0.28em] text-black shadow-pro transition-all hover:bg-kjc-accent hover:text-white active:scale-[0.98]"
        >
          Ping owner
          <Send size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function Chattery() {
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
      if (!user || conversations.length === 0) {
        setUserMap({});
        return;
      }

      const otherUserIds = conversations
        .map((conversation) => conversation.participants.find((id) => id !== user.uid))
        .filter(Boolean) as string[];

      const uniqueIds = [...new Set(otherUserIds)];

      const entries = await Promise.all(
        uniqueIds.map(async (uid) => {
          const snapshot = await getDoc(doc(db, "users", uid));
          const data = snapshot.data();

          return [
            uid,
            {
              displayName: data?.displayName || "CampusX user",
              photoURL: data?.photoURL || "",
            },
          ] as const;
        })
      );

      setUserMap(Object.fromEntries(entries));
    }

    loadUsers();
  }, [conversations, user]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(selectedChat.id, setMessages);
    return unsubscribe;
  }, [selectedChat]);

  const getOtherUser = (conversation: Conversation) => {
    const otherUserId = conversation.participants.find((id) => id !== user?.uid);
    return otherUserId ? userMap[otherUserId] : null;
  };

  const getOtherUserName = (conversation: Conversation) => {
    return getOtherUser(conversation)?.displayName || "CampusX user";
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedChat) return;

    await sendMessage(selectedChat.id, input.trim());
    setInput("");
  };

  if (selectedChat) {
    const otherUser = getOtherUser(selectedChat);
    const otherUserName = getOtherUserName(selectedChat);

    return (
      <div className="fixed inset-0 z-[120] flex flex-col bg-black">
        <header className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-black/95 p-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSelectedChat(null)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-white/50 transition-all hover:text-white active:scale-90"
              aria-label="Back to inbox"
            >
              <ArrowLeft size={24} />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-11 w-11 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {otherUser?.photoURL ? (
                  <img src={otherUser.photoURL} alt={otherUserName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-kjc-accent/20 text-sm font-black text-kjc-accent">
                    {otherUserName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl pro-heading leading-none tracking-tighter">{otherUserName}</h3>
                <p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                  Regarding: {selectedChat.listingTitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-kjc-accent">
            <ShieldCheck size={24} />
          </div>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto p-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="space-y-6 py-24 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[32px] border border-white/5 bg-white/5 text-white/10">
                <MessageSquare size={32} strokeWidth={1} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25">
                Start the conversation
              </p>
            </div>
          )}

          {messages.map((message, index) => {
            const isMe = message.senderId === user?.uid;
            const messageDate = message.createdAt?.toDate?.() || new Date(message.createdAt);
            const previousMessage = messages[index - 1];
            const previousDate = previousMessage
              ? previousMessage.createdAt?.toDate?.() || new Date(previousMessage.createdAt)
              : null;
            const showTime = index === 0 || messageDate.getMinutes() !== previousDate?.getMinutes();

            return (
              <div key={message.id} className="space-y-2">
                {showTime && (
                  <p className="py-2 text-center text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
                    {messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}

                <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 8 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className={`max-w-[85%] border px-6 py-4 text-sm font-medium leading-relaxed tracking-tight shadow-pro ${
                      isMe
                        ? "rounded-[28px] rounded-tr-[6px] border-kjc-accent/20 bg-kjc-accent text-white"
                        : "rounded-[28px] rounded-tl-[6px] border-white/10 bg-white/5 text-white/85"
                    }`}
                  >
                    {message.content}
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/10 bg-black/95 p-6">
          <div className="mx-auto flex max-w-2xl items-center gap-4">
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
              disabled={!input.trim()}
              className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-kjc-accent text-white shadow-lg shadow-kjc-accent/20 transition-all hover:bg-kjc-accent/90 active:scale-95 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="mb-2 flex flex-col gap-1">
        <h2 className="text-4xl pro-heading tracking-tighter">Inbox</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">
          Chats about listings and posts
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-[48px] border border-dashed border-white/10 bg-white/5 py-24 text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[36px] bg-white/5 text-white/10">
            <MessageSquare size={40} strokeWidth={1} />
          </div>
          <h2 className="mb-2 text-2xl pro-heading tracking-tighter">No chats yet</h2>
          <p className="px-12 text-[10px] font-black uppercase leading-relaxed tracking-[0.25em] text-white/30">
            Ping a listing owner to start a chat.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {conversations.map((conversation) => {
            const otherUser = getOtherUser(conversation);
            const otherUserName = getOtherUserName(conversation);

            return (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={conversation.id}
                type="button"
                onClick={() => setSelectedChat(conversation)}
                className="group flex w-full items-center gap-6 rounded-[40px] border border-white/5 bg-white/5 p-7 text-left transition-all hover:border-white/10 hover:bg-white/[0.08] active:scale-95"
              >
                <div className="relative">
                  <div className="h-16 w-16 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-inner">
                    {otherUser?.photoURL ? (
                      <img
                        src={otherUser.photoURL}
                        alt={otherUserName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-kjc-accent/15 text-xl font-black text-kjc-accent">
                        {otherUserName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {(conversation.unreadCount ?? 0) > 0 && (
                    <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-black bg-kjc-accent text-[10px] font-black text-white shadow-lg">
                      {conversation.unreadCount ?? 0}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="truncate text-xl pro-heading tracking-tight">{otherUserName}</h4>
                    <p className="whitespace-nowrap rounded-full bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                      Active
                    </p>
                  </div>

                  <p className="mt-1 line-clamp-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                    Regarding: {conversation.listingTitle}
                  </p>

                  <p className="mt-1 line-clamp-1 text-[11px] font-bold text-white/45">
                    {conversation.lastMessage || "Start chatting..."}
                  </p>
                </div>

                <ChevronRight
                  size={20}
                  className="text-white/10 transition-all group-hover:translate-x-1 group-hover:text-white"
                />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoomsPage({
  listings,
  loading,
  onContact,
  showFilters,
}: {
  listings: HousingListing[];
  loading: boolean;
  onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>;
  showFilters: boolean;
}) {
  const [category, setCategory] = useState("All");
  const [priceMax, setPriceMax] = useState<number>(50000);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const amenitiesList = ["Wifi", "Laundry", "AC", "Parking", "Kitchen"];

  const filtered = listings.filter((listing) => {
    const categoryMatch = category === "All" || listing.roomType.toLowerCase() === category.toLowerCase();
    const priceMatch = listing.rent <= priceMax;
    const amenitiesMatch =
      selectedAmenities.length === 0 ||
      selectedAmenities.every((amenity) => listing.amenities?.includes(amenity));

    return categoryMatch && priceMatch && amenitiesMatch;
  });

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((item) => item !== amenity) : [...prev, amenity]
    );
  };

  return (
    <div className="space-y-8">
      <div className="mb-2 flex flex-col gap-1">
        <h2 className="flex items-center gap-3 text-4xl pro-heading tracking-tighter">
          Housing <span className="text-kjc-accent italic">near KJU</span>
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        </h2>
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">
          Rooms, PGs and flats posted by students
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto py-1 pb-3 scrollbar-hide">
        {["All", "single", "shared", "1BHK", "2BHK", "PG"].map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setCategory(filter)}
            className={`whitespace-nowrap rounded-[22px] border px-7 py-4 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
              category === filter
                ? "border-kjc-accent bg-kjc-accent text-white shadow-lg shadow-kjc-accent/20"
                : "border-white/5 bg-white/5 text-white/40 hover:border-white/20"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -12 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -12 }}
            className="overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-8 shadow-pro"
          >
            <div className="space-y-8">
              <div className="space-y-5">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                      Budget limit
                    </span>
                    <p className="font-display text-2xl font-black tracking-tighter text-white">
                      ₹{priceMax.toLocaleString()}
                      <span className="ml-2 text-sm font-bold text-white/20">/ month</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPriceMax(50000)}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-kjc-accent hover:opacity-80"
                  >
                    Reset
                  </button>
                </div>

                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="500"
                  value={priceMax}
                  onChange={(event) => setPriceMax(Number(event.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-kjc-accent"
                />
              </div>

              <div className="space-y-5">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                  Essentials
                </label>

                <div className="flex flex-wrap gap-3">
                  {amenitiesList.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`rounded-2xl border px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                        selectedAmenities.includes(amenity)
                          ? "border-kjc-accent bg-kjc-accent text-white"
                          : "border-white/5 bg-white/5 text-white/40 hover:border-white/20"
                      }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6">
        {loading ? (
          [1, 2].map((item) => (
            <div
              key={item}
              className="aspect-[16/10] animate-pulse rounded-[40px] border border-white/10 bg-white/5"
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-[40px] border border-dashed border-white/10 bg-white/5 py-24 text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[32px] bg-white/5 text-white/20">
              <Search size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
              No rooms match this search
            </p>
            <button
              type="button"
              onClick={() => {
                setCategory("All");
                setPriceMax(50000);
                setSelectedAmenities([]);
              }}
              className="mt-6 text-[11px] font-black uppercase tracking-[0.25em] text-kjc-accent hover:opacity-80"
            >
              Reset filters
            </button>
          </div>
        ) : (
          filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} type="housing" onContact={onContact} />
          ))
        )}
      </div>
    </div>
  );
}

function MarketPage({
  items,
  loading,
  onContact,
  showFilters,
}: {
  items: MarketListing[];
  loading: boolean;
  onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>;
  showFilters: boolean;
}) {
  const [category, setCategory] = useState("All");
  const [priceMax, setPriceMax] = useState<number>(20000);
  const [condition, setCondition] = useState("All");

  const filtered = items.filter((listing) => {
    const categoryMatch = category === "All" || listing.category.toLowerCase() === category.toLowerCase();
    const priceMatch = listing.price <= priceMax;
    const conditionMatch = condition === "All" || listing.condition === condition;

    return categoryMatch && priceMatch && conditionMatch;
  });

  return (
    <div className="space-y-8">
      <div className="mb-2 flex flex-col gap-1">
        <h2 className="flex items-center gap-3 text-4xl pro-heading tracking-tighter">
          Search <span className="text-kjc-accent italic">CampusX</span>
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        </h2>
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">
          Find furniture, books, electronics and essentials
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto py-1 pb-3 scrollbar-hide">
        {["All", "Furniture", "Electronics", "Books", "Essentials"].map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setCategory(filter)}
            className={`whitespace-nowrap rounded-[22px] border px-7 py-4 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
              category === filter
                ? "border-kjc-accent bg-kjc-accent text-white shadow-lg shadow-kjc-accent/20"
                : "border-white/5 bg-white/5 text-white/40 hover:border-white/20"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -12 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -12 }}
            className="overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-8 shadow-pro"
          >
            <div className="space-y-8">
              <div className="space-y-5">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                      Budget limit
                    </span>
                    <p className="font-display text-2xl font-black tracking-tighter text-white">
                      ₹{priceMax.toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPriceMax(20000)}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-kjc-accent"
                  >
                    Reset
                  </button>
                </div>

                <input
                  type="range"
                  min="100"
                  max="20000"
                  step="100"
                  value={priceMax}
                  onChange={(event) => setPriceMax(Number(event.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-kjc-accent"
                />
              </div>

              <div className="space-y-5">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                  Condition
                </label>

                <div className="flex flex-wrap gap-3">
                  {["All", "New", "Like New", "Good", "Fair"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCondition(item)}
                      className={`rounded-2xl border px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                        condition === item
                          ? "border-kjc-accent bg-kjc-accent text-white"
                          : "border-white/5 bg-white/5 text-white/40 hover:border-white/20"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6">
        {loading ? (
          [1, 2].map((item) => (
            <div
              key={item}
              className="aspect-[16/10] animate-pulse rounded-[40px] border border-white/10 bg-white/5"
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-[40px] border border-dashed border-white/10 bg-white/5 py-24 text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[32px] bg-white/5 text-white/20">
              <ShoppingBag size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
              Nothing here yet
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <ListingCard key={item.id} listing={item} type="market" onContact={onContact} />
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80"
          />

          <motion.div
            initial={{ y: "100%", scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: "100%", scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg overflow-hidden rounded-t-[44px] border border-white/10 bg-black p-9 shadow-pro-lg sm:rounded-[44px]"
          >
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
                  <div className="space-y-1">
                    <h2 className="text-4xl pro-heading tracking-tighter">
                      Create <span className="text-kjc-accent italic">post</span>
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40">
                      What are you posting?
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-white/40 transition-all hover:text-white active:scale-90"
                    aria-label="Close create modal"
                  >
                    <X size={28} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <button
                    type="button"
                    onClick={() => setSelectedType("housing")}
                    className="group flex flex-col rounded-[36px] border border-white/5 bg-white/5 p-8 text-left transition-all duration-300 hover:border-kjc-accent hover:bg-kjc-accent/10"
                  >
                    <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg transition-all group-hover:bg-kjc-accent">
                      <Home size={28} />
                    </div>
                    <h3 className="text-xl pro-heading">Room</h3>
                    <p className="mt-1 text-[10px] font-black uppercase leading-none tracking-widest text-white/30">
                      PG & Flat
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedType("market")}
                    className="group flex flex-col rounded-[36px] border border-white/5 bg-white/5 p-8 text-left transition-all duration-300 hover:border-rose-500 hover:bg-rose-500/10"
                  >
                    <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg transition-all group-hover:bg-rose-500">
                      <ShoppingBag size={28} />
                    </div>
                    <h3 className="text-xl pro-heading">Item</h3>
                    <p className="mt-1 text-[10px] font-black uppercase leading-none tracking-widest text-white/30">
                      Buy & Sell
                    </p>
                  </button>
                </div>

                <div className="mt-10 flex items-center gap-5 border-t border-white/5 pt-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[24px] border border-kjc-accent/20 bg-kjc-accent/10 text-kjc-accent">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <p className="text-sm pro-heading">Campus verified posting</p>
                    <p className="text-[10px] font-black uppercase leading-tight tracking-[0.2em] text-white/30">
                      Safer than random WhatsApp forwards
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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

  const { user, profile, signIn, logout } = useAuth();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);

    try {
      if (activeTab === "home") {
        const data = await getHousingListings();
        setHousingData(data);
      }

      if (activeTab === "search") {
        const [housing, market] = await Promise.all([getHousingListings(), getMarketListings()]);
        setHousingData(housing);
        setMarketData(market);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (ownerId: string, listingId: string, title: string, type: string) => {
    if (!user) {
      await signIn();
      return;
    }

    try {
      await startConversation(ownerId, listingId, title, type);
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

  const renderLoginPrompt = () => (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center p-8 text-white">
      <div className="absolute right-[-10%] top-[-10%] aspect-square w-[80%] max-w-sm animate-pulse rounded-full bg-kjc-accent/20 blur-[120px]" />

      <div className="relative z-10 w-full max-w-sm space-y-10 text-center">
        <div className="space-y-4">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[36px] bg-gradient-to-br from-kjc-accent to-blue-600 text-white shadow-[0_20px_50px_rgba(139,92,246,0.3)] ring-1 ring-white/20">
            <span className="text-4xl font-black">X</span>
          </div>

          <h2 className="mb-2 block text-4xl font-display tracking-tighter">
            Sign in <span className="text-kjc-accent italic">to continue</span>
          </h2>

          <p className="block text-[10px] font-black uppercase leading-relaxed tracking-[0.35em] text-white/35">
            CampusX needs your profile for posting and chats
          </p>
        </div>

        <button
          type="button"
          onClick={signIn}
          className="group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-[32px] bg-white py-6 text-[10px] font-black uppercase tracking-widest text-black shadow-pro-lg transition-all hover:bg-kjc-slate-50 active:scale-[0.96]"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-32 text-white atmo-bg">
      <Header
        activeTab={activeTab}
        onSearch={setSearchQuery}
        onFilterClick={() => setShowFilters((prev) => !prev)}
        showFilters={showFilters}
      />

      <main className="mx-auto max-w-xl px-6 py-10">
        {profile?.verifiedStatus !== "verified" && activeTab !== "me" && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 overflow-hidden rounded-[40px] bg-gradient-to-r from-kjc-accent to-blue-600 p-[1.5px] shadow-pro"
          >
            <div className="flex items-center justify-between gap-5 rounded-[39px] bg-black/95 p-6">
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-kjc-accent/20 bg-kjc-accent/10 text-kjc-accent">
                  <ShieldCheck size={30} />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
                    Verify your profile
                  </p>
                  <p className="mt-1 text-[12px] font-bold tracking-tight text-white">
                    Unlock trusted campus access
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setVerificationModalOpen(true)}
                className="rounded-2xl bg-white px-7 py-4 text-[9px] font-black uppercase tracking-[0.18em] text-black shadow-lg transition-all hover:bg-white/90 active:scale-95"
              >
                Verify
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            {activeTab === "home" && (
              <RoomsPage
                listings={filterBySearch(housingData)}
                loading={loading}
                onContact={handleContact}
                showFilters={showFilters}
              />
            )}

            {activeTab === "search" && (
              <MarketPage
                items={filterBySearch(marketData)}
                loading={loading}
                onContact={handleContact}
                showFilters={showFilters}
              />
            )}

            {!user && ["inbox", "me"].includes(activeTab) ? (
              renderLoginPrompt()
            ) : (
              <>
                {activeTab === "inbox" && <Chattery />}

                {activeTab === "me" && (
                  <div className="space-y-10 pb-16">
                    <div className="group relative overflow-hidden rounded-[44px] border border-white/10 bg-white/5 p-9 shadow-pro-lg">
                      <div className="absolute right-0 top-0 h-64 w-64 -translate-y-20 translate-x-20 rounded-full bg-kjc-accent/10 blur-[100px]" />

                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="relative mb-8">
                          <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-kjc-accent to-blue-600 opacity-20 blur-2xl transition-opacity group-hover:opacity-40" />

                          <div className="relative z-10 h-32 w-32 overflow-hidden rounded-[44px] border border-white/20 bg-white/10 shadow-2xl ring-4 ring-white/10">
                            {profile?.photoURL ? (
                              <img
                                src={profile.photoURL}
                                alt={profile.displayName || "CampusX user"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-kjc-accent to-blue-600 text-4xl font-black italic text-white">
                                {profile?.displayName?.charAt(0) || "X"}
                              </div>
                            )}
                          </div>
                        </div>

                        <h2 className="mb-3 text-4xl pro-heading tracking-tighter">
                          {profile?.displayName || "CampusX User"}
                        </h2>

                        <div className="mt-2 flex flex-wrap justify-center gap-3">
                          <span className="rounded-2xl border border-white/5 bg-white/5 px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                            {profile?.campusRole || "Student"}
                          </span>

                          {profile?.verifiedStatus === "verified" ? (
                            <span className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">
                              <ShieldCheck size={14} strokeWidth={3} />
                              Campus verified
                            </span>
                          ) : (
                            <span className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-rose-400">
                              Not verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5">
                      {[
                        {
                          label: "My posts",
                          icon: Home,
                          color: "bg-indigo-500/10 text-indigo-400",
                          sub: "Rooms and items you posted",
                          onClick: () => setActiveTab("home"),
                        },
                        {
                          label: "Saved posts",
                          icon: Bookmark,
                          color: "bg-blue-500/10 text-blue-400",
                          sub: "Coming soon",
                        },
                        {
                          label: "Privacy",
                          icon: ShieldCheck,
                          color: "bg-emerald-500/10 text-emerald-400",
                          sub: "Block and report settings",
                        },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.onClick}
                          className="group flex w-full items-center gap-6 rounded-[40px] border border-white/5 bg-white/5 p-7 text-left transition-all hover:border-white/10 hover:bg-white/[0.08] active:scale-[0.98]"
                        >
                          <div
                            className={`flex h-16 w-16 items-center justify-center rounded-[28px] border border-white/5 shadow-lg transition-transform group-hover:scale-110 ${item.color}`}
                          >
                            <item.icon size={28} />
                          </div>

                          <div className="flex-1">
                            <p className="text-xl font-black tracking-tighter text-white">
                              {item.label}
                            </p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                              {item.sub}
                            </p>
                          </div>

                          <ChevronRight
                            size={22}
                            className="text-white/20 transition-all group-hover:translate-x-1 group-hover:text-kjc-accent"
                          />
                        </button>
                      ))}
                    </div>

                    <div className="px-2">
                      <button
                        type="button"
                        onClick={logout}
                        className="group flex w-full items-center justify-center gap-4 rounded-[40px] border border-rose-500/20 bg-rose-500/10 py-7 text-[10px] font-black uppercase tracking-[0.35em] text-rose-500 shadow-xl shadow-rose-500/5 transition-all hover:bg-rose-500/20 active:scale-[0.96]"
                      >
                        Log out
                        <ChevronRight
                          size={16}
                          className="opacity-0 transition-all group-hover:translate-x-2 group-hover:opacity-100"
                        />
                      </button>
                    </div>
                  </div>
                )}
              </>
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

      <VerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
      />
    </div>
  );
}