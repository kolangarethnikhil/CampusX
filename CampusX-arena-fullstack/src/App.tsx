import { useEffect, useMemo, useState } from "react";
import PhoneFrame from "./components/PhoneFrame";
import BottomNav, { type Tab } from "./components/BottomNav";
import HomeScreen from "./screens/HomeScreen";
import BoardsScreen from "./screens/BoardsScreen";
import SpacesScreen from "./screens/SpacesScreen";
import RoomChatScreen from "./screens/RoomChatScreen";
import ProfileScreen from "./screens/ProfileScreen";
import BoardListingsScreen from "./screens/BoardListingsScreen";
import ListingDetailScreen from "./screens/ListingDetailScreen";
import { subscribeToSpaces } from "./services/spaceService";
import { subscribeToHousingListings, subscribeToMarketListings } from "./services/listingService";
import type { CampusSpace } from "./types/space";
import type { UiListing } from "./types/listing";

const fallbackSpaces: CampusSpace[] = [
  { id: "dev-club", campusId: "kju", name: "Dev Club", description: "Projects & internships", category: "dev", icon: "technologist", accent: "#8b5cf6", createdBy: "system", isOfficial: true, status: "active", memberCount: 38, activeCount: 14 },
  { id: "sports-club", campusId: "kju", name: "Sports Club", description: "Games & events", category: "sports", icon: "football", accent: "#06b6d4", createdBy: "system", isOfficial: true, status: "active", memberCount: 42, activeCount: 8 },
  { id: "party-tonight", campusId: "kju", name: "Party Tonight", description: "Hangouts & parties", category: "social", icon: "networking", accent: "#ec4899", createdBy: "system", isOfficial: true, status: "active", memberCount: 23, activeCount: 5 },
  { id: "study-group", campusId: "kju", name: "Study Group", description: "Notes & exam prep", category: "study", icon: "books", accent: "#14b8a6", createdBy: "system", isOfficial: true, status: "active", memberCount: 32, activeCount: 15 },
  { id: "music-lovers", campusId: "kju", name: "Music Lovers", description: "Playlists & jams", category: "music", icon: "networking", accent: "#f59e0b", createdBy: "system", isOfficial: true, status: "active", memberCount: 25, activeCount: 6 },
];

const fallbackHousing: UiListing[] = [
  { id: "demo-housing-1", sourceType: "housing", title: "1BHK near Hanuman Arch", price: "₹12,500", priceUnit: "/ MONTH", location: "Kothanur", distance: "773 M FROM KJU", tag: "1BHK", tags: ["UNFURNISHED", "BOYS ONLY"], author: "Rahul", timeAgo: "2m ago", description: "Spacious 1BHK with balcony. Water & power backup included.", saved: true },
  { id: "demo-housing-2", sourceType: "housing", title: "2BHK near Falcon", price: "₹18,000", priceUnit: "/ MONTH", location: "Lingarajapura", distance: "6.0 KM FROM KJU", tag: "2BHK", tags: ["UNFURNISHED", "AVAILABLE"], author: "Amit", timeAgo: "1h ago", description: "2BHK flat, ground floor. Near bus stop." },
];

const fallbackMarket: UiListing[] = [
  { id: "demo-market-1", sourceType: "market", title: "Study table + chair combo", price: "₹1,800", priceUnit: "", location: "Near back gate", distance: "NEAR KJU", tag: "FURNITURE", tags: ["GOOD", "NEGOTIABLE"], author: "Ananya", timeAgo: "8m ago", description: "Clean study table and chair. Pickup near campus." },
  { id: "demo-market-2", sourceType: "market", title: "Engineering books bundle", price: "₹900", priceUnit: "", location: "Kothanur", distance: "NEAR KJU", tag: "BOOKS", tags: ["GOOD", "BUNDLE"], author: "Nikhil", timeAgo: "1h ago", description: "Useful books for juniors. Selling as bundle." },
];

type SubScreen =
  | { type: "room"; space: CampusSpace }
  | { type: "boardListings"; boardName: string }
  | { type: "listingDetail"; listing: UiListing; boardName: string }
  | null;

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [spaces, setSpaces] = useState<CampusSpace[]>(fallbackSpaces);
  const [housingListings, setHousingListings] = useState<UiListing[]>(fallbackHousing);
  const [marketListings, setMarketListings] = useState<UiListing[]>(fallbackMarket);

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    try {
      unsubscribers.push(subscribeToSpaces((items) => setSpaces(items.length ? items : fallbackSpaces)));
      unsubscribers.push(subscribeToHousingListings((items) => setHousingListings(items.length ? items : fallbackHousing)));
      unsubscribers.push(subscribeToMarketListings((items) => setMarketListings(items.length ? items : fallbackMarket)));
    } catch (error) {
      console.error("Realtime subscription setup failed:", error);
    }

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const spacesByName = useMemo(
    () => new Map(spaces.map((space) => [space.name, space])),
    [spaces]
  );

  const handleOpenSpace = (spaceName: string) => {
    const space = spacesByName.get(spaceName) || fallbackSpaces.find((item) => item.name === spaceName) || fallbackSpaces[0];
    setSubScreen({ type: "room", space });
  };

  const handleOpenBoard = (boardName: string) => {
    setSubScreen({ type: "boardListings", boardName });
  };

  const handleOpenListing = (listing: UiListing, boardName: string) => {
    setSubScreen({ type: "listingDetail", listing, boardName });
  };

  const handleBack = () => {
    if (subScreen?.type === "listingDetail") {
      setSubScreen({ type: "boardListings", boardName: subScreen.boardName });
    } else {
      setSubScreen(null);
    }
  };

  const handleNavigate = (tab: Tab) => {
    setSubScreen(null);
    setActiveTab(tab);
  };

  const getBoardListings = (boardName: string) => {
    if (boardName === "Housing") return housingListings;
    if (boardName === "Part-time") return fallbackMarket.filter((item) => item.tag.includes("PART") || item.title.toLowerCase().includes("content"));
    if (boardName === "Internships") return fallbackMarket.filter((item) => item.title.toLowerCase().includes("intern"));
    if (["Dev Club", "Sports", "Social"].includes(boardName)) return [];
    return marketListings;
  };

  const showBottomNav = subScreen === null;

  return (
    <PhoneFrame>
      {subScreen?.type === "room" ? (
        <RoomChatScreen space={subScreen.space} onBack={handleBack} />
      ) : subScreen?.type === "listingDetail" ? (
        <ListingDetailScreen listing={subScreen.listing} onBack={handleBack} />
      ) : subScreen?.type === "boardListings" ? (
        <BoardListingsScreen
          boardName={subScreen.boardName}
          listings={getBoardListings(subScreen.boardName)}
          onBack={handleBack}
          onOpenListing={(listing) => handleOpenListing(listing, subScreen.boardName)}
        />
      ) : (
        <>
          {activeTab === "home" && <HomeScreen onOpenSpace={handleOpenSpace} />}
          {activeTab === "boards" && <BoardsScreen onOpenBoard={handleOpenBoard} />}
          {activeTab === "spaces" && <SpacesScreen spaces={spaces} onOpenSpace={handleOpenSpace} />}
          {activeTab === "profile" && <ProfileScreen listings={[...housingListings, ...marketListings]} />}
        </>
      )}

      {showBottomNav && <BottomNav active={activeTab} onNavigate={handleNavigate} />}
    </PhoneFrame>
  );
}
