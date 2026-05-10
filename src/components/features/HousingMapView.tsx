import { AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import { Home, IndianRupee, MapPin, Send } from "lucide-react";
import { useState } from "react";
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

  const listingsWithLocation = listings.filter(
    (listing) =>
      typeof listing.latitude === "number" &&
      typeof listing.longitude === "number" &&
      listing.latitude !== 0 &&
      listing.longitude !== 0
  );

  return (
    <div className="relative h-[calc(100vh-190px)] min-h-[560px] overflow-hidden rounded-[40px] border border-white/10 bg-white/5">
      <Map
        defaultCenter={KJU_LOCATION}
        defaultZoom={15}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        disableDefaultUI
        className="h-full w-full"
      >
        <AdvancedMarker position={KJU_LOCATION}>
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-kjc-accent/20 blur-md" />
            <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-[20px] border-4 border-white bg-kjc-accent text-white shadow-xl">
              <Home size={24} />
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
            onClick={() => setSelectedListing(listing)}
          >
            <button
              type="button"
              className="rounded-full border border-white/20 bg-black px-4 py-2 text-[10px] font-black text-white shadow-xl transition-transform active:scale-95"
            >
              ₹{formatRent(listing.rent)}
            </button>
          </AdvancedMarker>
        ))}
      </Map>

      <div className="pointer-events-none absolute left-4 right-4 top-4">
        <div className="pointer-events-auto rounded-[28px] border border-white/10 bg-black/85 p-4 shadow-pro">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
            Housing map
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {listingsWithLocation.length} places with location
          </p>
        </div>
      </div>

      {listings.length > 0 && listingsWithLocation.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-8 text-center">
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
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-[34px] border border-white/10 bg-black/95 p-5 shadow-pro-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-2xl pro-heading tracking-tighter">
                  {selectedListing.title}
                </p>
                <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                  {getHousingLocationDisplay(selectedListing).compact}
                </p>
              </div>

              <span className="rounded-full bg-kjc-accent px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                {selectedListing.roomType}
              </span>
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
                className="rounded-[24px] border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white"
              >
                View details
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
                className="flex items-center justify-center gap-2 rounded-[24px] bg-white py-4 text-[10px] font-black uppercase tracking-[0.2em] text-black"
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
  if (rent >= 1000) {
    const value = rent / 1000;
    return Number.isInteger(value) ? `${value}k` : `${value.toFixed(1)}k`;
  }

  return rent.toString();
}