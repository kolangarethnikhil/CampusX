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
import CreateListingSheet from "./screens/CreateListingSheet";
import { subscribeToSpaces } from "./services/spaceService";
import {
  subscribeToHousingListings,
  subscribeToMarketListings,
} from "./services/listingService";
import { boardNameToId, subscribeToBoardPosts } from "./services/boardPostService";
import type { CampusSpace } from "./types/space";
import type { UiListing } from "./types/listing";
import { useAuth } from "./contexts/AuthContext";

type CreateIntent = {
  type: "housing" | "market" | "board";
  boardName?: string;
  lockType?: boolean;
};

type SubScreen =
  | { type: "room"; space: CampusSpace }
  | { type: "boardListings"; boardName: string }
  | { type: "listingDetail"; listing: UiListing; boardName: string }
  | null;

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [createOpen, setCreateOpen] = useState<CreateIntent | null>(null);

  const [spaces, setSpaces] = useState<CampusSpace[]>([]);
  const [housingListings, setHousingListings] = useState<UiListing[]>([]);
  const [marketListings, setMarketListings] = useState<UiListing[]>([]);
  const [boardPostsByBoard, setBoardPostsByBoard] = useState<
    Record<string, UiListing[]>
  >({});

  const [spacesLoading, setSpacesLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    try {
      unsubscribers.push(
        subscribeToSpaces((items) => {
          setSpaces(items);
          setSpacesLoading(false);
        })
      );

      unsubscribers.push(
        subscribeToHousingListings((items) => {
          setHousingListings(items);
          setListingsLoading(false);
        })
      );

      unsubscribers.push(
        subscribeToMarketListings((items) => {
          setMarketListings(items);
          setListingsLoading(false);
        })
      );

      unsubscribers.push(
        subscribeToBoardPosts((items) => {
          setBoardPostsByBoard(items);
        })
      );
    } catch (error) {
      console.error("Realtime subscription setup failed:", error);
      setSpacesLoading(false);
      setListingsLoading(false);
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const spacesByName = useMemo(
    () => new Map(spaces.map((space) => [space.name, space])),
    [spaces]
  );

  const handleOpenSpace = (spaceName: string) => {
    const space = spacesByName.get(spaceName);

    if (!space) return;

    setSubScreen({
      type: "room",
      space,
    });
  };

  const handleOpenBoard = (boardName: string) => {
    setSubScreen({
      type: "boardListings",
      boardName,
    });
  };

  const handleOpenListing = (listing: UiListing, boardName: string) => {
    setSubScreen({
      type: "listingDetail",
      listing,
      boardName,
    });
  };

  const handleBack = () => {
    if (subScreen?.type === "listingDetail") {
      setSubScreen({
        type: "boardListings",
        boardName: subScreen.boardName,
      });
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
    if (boardName === "Essentials") return marketListings;

    const boardId = boardNameToId(boardName);
    return boardPostsByBoard[boardId] || [];
  };

  const boardCounts = {
    Housing: housingListings.length,
    Essentials: marketListings.length,
    Internships: boardPostsByBoard["internships"]?.length || 0,
    "Part-time": boardPostsByBoard["part-time"]?.length || 0,
    "Dev Club":
      (boardPostsByBoard["dev-club"]?.length || 0) +
      (spaces.find((space) => space.name === "Dev Club")?.memberCount || 0),
    Sports:
      (boardPostsByBoard["sports"]?.length || 0) +
      (spaces.find((space) => space.name === "Sports Club")?.memberCount || 0),
    Social:
      (boardPostsByBoard["social"]?.length || 0) +
      (spaces.find((space) => space.name === "Party Tonight")?.memberCount || 0),
  };

  const showBottomNav = subScreen === null && !createOpen;

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
          loading={listingsLoading}
          onBack={handleBack}
          onCreateListing={(intent) => setCreateOpen(intent)}
          onOpenListing={(listing) =>
            handleOpenListing(listing, subScreen.boardName)
          }
        />
      ) : (
        <>
          {activeTab === "home" && (
            <HomeScreen
              user={user}
              spaces={spaces}
              spacesLoading={spacesLoading}
              housingCount={housingListings.length}
              dealsCount={marketListings.length}
              onOpenSpace={handleOpenSpace}
              onOpenBoard={handleOpenBoard}
              onOpenSpaces={() => setActiveTab("spaces")}
              onCreateListing={(type) =>
                setCreateOpen({
                  type,
                  lockType: false,
                })
              }
            />
          )}

          {activeTab === "boards" && (
            <BoardsScreen counts={boardCounts} onOpenBoard={handleOpenBoard} />
          )}

          {activeTab === "spaces" && (
            <SpacesScreen spaces={spaces} onOpenSpace={handleOpenSpace} />
          )}

          {activeTab === "profile" && (
            <ProfileScreen
              listings={[...housingListings, ...marketListings]}
              onCreateListing={(type) =>
                setCreateOpen({
                  type,
                  lockType: false,
                })
              }
            />
          )}
        </>
      )}

      {createOpen && (
        <CreateListingSheet
          initialType={createOpen.type}
          boardName={createOpen.boardName}
          lockType={createOpen.lockType}
          onClose={() => setCreateOpen(null)}
          onCreated={() => {
            setCreateOpen(null);
            setActiveTab("boards");
          }}
        />
      )}

      {showBottomNav && <BottomNav active={activeTab} onNavigate={handleNavigate} />}
    </PhoneFrame>
  );
}