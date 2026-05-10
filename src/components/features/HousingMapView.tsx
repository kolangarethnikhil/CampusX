import { AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import { Home, IndianRupee, MapPin, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { KJU_LOCATION } from "../../constants/campus";
import { HousingListing } from "../../services/housingService";
import { getHousingLocationDisplay } from "../../utils/listingDisplay";

interface HousingMapViewProps {
  listings: HousingListing[];
  onOpenDetails: (listing: HousingListing) => void;
  onContact: (
    ownerId: string,
    listingId: string,
    title: string,
    type: string
  ) => void | Promise<void>;
}

export default function HousingMapView({
  listings,
  onOpenDetails,
  onContact,
}: HousingMapViewProps) {
  const [selectedListing, setSelectedListing] = useState<HousingListing | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const listingsWithLocation = useMemo(
    () =>
      listings.filter(
        (listing) =>
          typeof listing.latitude === "number" &&
          typeof listing.longitude === "number" &&
          listing.latitude !== 0 &&
          listing.longitude !== 0
      ),
    [listings]
  );

  useEffect(() => {
    setMapReady(false);

    const timer = window.setTimeout(() => {
      setMapReady(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [listingsWithLocation.length]);

  return (
    <div
      className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0b0b0f]"
      style={{
        height: "min(640px, calc(100dvh - 245px))",
        minHeight: 430,
      }}
    >
      {!mapReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] px-8 py-6 text-center shadow-pro">
            <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-2xl bg-kjc-accent/30" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/45">
              Loading housing map...
            </p>
          </div>
        </div>
      )}

      <Map
        defaultCenter={KJU_LOCATION}
        defaultZoom={15}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        disableDefaultUI
        className={`h-full w-full transition-opacity duration-500 ${
          mapReady ? "opacity-100" : "opacity-0"
        }`}
        onTilesLoaded={() => setMapReady(true)}
        onClick={() => setSelectedListing(null)}
      >
        <AdvancedMarker position={KJU_LOCATION}>
          <div className="relative">
            <div className="absolute -inset-5 animate-ping rounded-full bg-kjc-accent/25" />
            <div className="absolute -inset-3 rounded-full bg-kjc-accent/25 blur-md" />

            <div className="relative z-10 flex min-w-[74px] flex-col items-center justify-center rounded-[24px] border-4 border-white bg-kjc-accent px-4 py-3 text-white shadow-2xl">
              <span className="text-[11px] font-black uppercase tracking-[0.16em]">
                KJU
              </span>
              <span className="mt-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/75">
                Campus
              </span>
            </div>
          </div>
        </AdvancedMarker>

        {listingsWithLocation.map((listing) => (
          <AdvancedMarker
            key={listing.id}
            position={{
              lat: listing.latitude!,
              lng: listing.longitude!,
            }}
            onClick={(event) => {
              event.stop();
              setSelectedListing(listing);
            }}
          >
            <button
              type="button"
              className={`min-w-[72px] rounded-[20px] border px-3 py-2 text-center shadow-2xl transition-transform duration-150 ease-out active:scale-[0.97] ${
                selectedListing?.id === listing.id
                  ? "border-kjc-accent bg-kjc-accent text-white"
                  : "border-white/20 bg-black text-white"
              }`}
            >
              <span className="block text-[9px] font-black uppercase leading-none tracking-[0.12em]">
                {formatRoomType(listing.roomType)}
              </span>
              <span className="mt-1 block text-[11px] font-black leading-none">
                ₹{formatRent(listing.rent)}
              </span>
            </button>
          </AdvancedMarker>
        ))}
      </Map>

      <div className="pointer-events-none absolute left-4 right-4 top-4 z-10">
        <div className="pointer-events-auto rounded-[26px] border border-white/10 bg-black/85 px-5 py-4 shadow-pro backdrop-blur-md">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/35">
            Housing map
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {listingsWithLocation.length} places with location
          </p>
        </div>
      </div>

      {listings.length > 0 && listingsWithLocation.length === 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-8 text-center">
          <div className="rounded-[36px] border border-white/10 bg-black p-8">
            <MapPin className="mx-auto mb-5 text-kjc-accent" size={36} />
            <p className="text-xl pro-heading">No mapped listings yet</p>
            <p className="mt-3 text-[11px] font-bold leading-relaxed text-white/35">
              New posts with Google Maps location will appear here.
            </p>
          </div>
        </div>
      )}

      {selectedListing && (
        <div className="absolute bottom-28 left-4 right-4 z-20">
          <div className="rounded-[30px] border border-white/10 bg-black/95 p-5 shadow-pro-lg backdrop-blur-md">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-2xl pro-heading tracking-tighter">
                  {selectedListing.title}
                </p>
                <p className="mt-1 line-clamp-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                  {getHousingLocationDisplay(selectedListing).compact}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-kjc-accent px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white">
                  {formatRoomType(selectedListing.roomType)}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-transform duration-150 ease-out hover:text-white active:scale-[0.97]"
                  aria-label="Close listing preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="mb-5 flex items-center gap-2">
              <IndianRupee size={18} className="text-kjc-accent" />
              <span className="font-display text-2xl font-black text-white">
                {selectedListing.rent.toLocaleString()}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                / month
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onOpenDetails(selectedListing)}
                className="rounded-[22px] border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                Details
              </button>

              <button
                type="button"
                onClick={() =>
                  onContact(
                    selectedListing.postedBy,
                    selectedListing.id,
                    selectedListing.title,
                    "housing"
                  )
                }
                className="flex items-center justify-center gap-2 rounded-[22px] bg-white py-4 text-[10px] font-black uppercase tracking-[0.18em] text-black transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                Ping
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRent(rent: number): string {
  if (rent >= 100000) {
    return `${(rent / 100000).toFixed(1)}L`;
  }

  if (rent >= 1000) {
    const value = rent / 1000;
    return Number.isInteger(value) ? `${value}k` : `${value.toFixed(1)}k`;
  }

  return rent.toString();
}

function formatRoomType(roomType?: string): string {
  if (!roomType) return "Room";

  if (roomType.toLowerCase() === "single") return "Single";
  if (roomType.toLowerCase() === "shared") return "Shared";

  return roomType.toUpperCase();
}