import { useEffect, useState } from "react";
import { Bookmark, Home, ShoppingBag } from "lucide-react";
import {
  getMySavedPosts,
  SavedPostItem,
} from "../../services/savedPostsService";
import { HousingListing, formatHousingRoomType } from "../../services/housingService";
import { MarketListing } from "../../services/marketService";
import { getHousingLocationDisplay } from "../../utils/listingDisplay";

interface SavedPostsSectionProps {
  refreshKey?: string | number;
  onOpenDetails: (
    listing: HousingListing | MarketListing,
    type: "housing" | "market"
  ) => void;
}

export default function SavedPostsSection({
  refreshKey,
  onOpenDetails,
}: SavedPostsSectionProps) {
  const [items, setItems] = useState<SavedPostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      const result = await getMySavedPosts();

      if (!active) return;

      setItems(result);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-3xl pro-heading tracking-tighter">Saved posts</h3>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
          Rooms and items you bookmarked
        </p>
      </div>

      {loading ? (
        <div className="h-28 animate-pulse rounded-[34px] border border-white/10 bg-white/5" />
      ) : items.length === 0 ? (
        <div className="rounded-[36px] border border-dashed border-white/10 bg-white/5 py-16 text-center">
          <Bookmark size={34} className="mx-auto mb-4 text-white/15" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
            No saved posts yet
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const isHousing = item.listingType === "housing";
            const listing = item.listing;
            const housing = listing as HousingListing;
            const market = listing as MarketListing;
            const price = isHousing ? housing.rent : market.price;
            const location = isHousing
              ? getHousingLocationDisplay(housing).compact
              : market.formattedAddress?.split(",")[0] || "Near KJU";

            return (
              <button
                key={item.saveId}
                type="button"
                onClick={() => onOpenDetails(listing, item.listingType)}
                className="flex w-full gap-4 rounded-[32px] border border-white/10 bg-white/[0.04] p-4 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
              >
                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-[24px] bg-white/5">
                  {listing.photos?.[0] ? (
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/15">
                      {isHousing ? <Home size={28} /> : <ShoppingBag size={28} />}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-kjc-accent px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-white">
                      {isHousing
                        ? formatHousingRoomType(housing.roomType)
                        : market.category}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-white/45">
                      {listing.status}
                    </span>
                  </div>

                  <h4 className="truncate text-lg pro-heading">
                    {listing.title}
                  </h4>

                  <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                    {location}
                  </p>

                  <p className="mt-2 text-sm font-black text-kjc-accent">
                    ₹{price.toLocaleString()}
                    {isHousing ? (
                      <span className="text-[10px] text-white/35"> / month</span>
                    ) : null}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}