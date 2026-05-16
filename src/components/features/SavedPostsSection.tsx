import { useEffect, useState } from "react";
import { getMySavedPosts } from "../../services/savedPostsService";
import { unsaveListing as removeSavedPost } from "../../services/savedCrudService";

export default function SavedPostsSection({ onOpenDetails }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMySavedPosts();
        setItems(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleRemove = async (saveId: string) => {
    setRemovingId(saveId);

    try {
      await removeSavedPost(saveId);

      setItems((prev) => prev.filter((item) => item.saveId !== saveId));
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-xl font-bold text-white">Saved posts</h3>

      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-white/60">No saved posts</p>
      )}

      {!loading &&
        items.map((item) => {
          const listing = item.listing;
          const photo = listing?.photos?.[0];

          return (
            <div
              key={item.saveId}
              className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.05] border border-white/10"
            >
              {/* image */}
              <div
                onClick={() =>
                  listing && onOpenDetails?.(listing, item.listingType)
                }
                className="w-20 h-20 rounded-xl overflow-hidden bg-white/10 shrink-0"
              >
                {photo ? (
                  <img
                    src={photo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30">
                    📦
                  </div>
                )}
              </div>

              {/* content */}
              <div
                className="flex-1 min-w-0"
                onClick={() =>
                  listing && onOpenDetails?.(listing, item.listingType)
                }
              >
                <p className="text-white font-semibold truncate">
                  {listing?.title || "Deleted listing"}
                </p>

                {listing && (
                  <>
                    <p className="text-kjc-accent font-bold mt-1">
                      ₹{(listing.price || listing.rent || 0).toLocaleString()}
                    </p>

                    <p className="text-white/40 text-xs mt-1 truncate">
                      {listing.location ||
                        listing.formattedAddress?.split(",")[0] ||
                        "Near KJU"}
                    </p>
                  </>
                )}
              </div>

              {/* remove */}
              <button
                onClick={() => handleRemove(item.saveId)}
                disabled={removingId === item.saveId}
                className="text-red-400 text-xs font-bold shrink-0"
              >
                {removingId === item.saveId ? "..." : "✕"}
              </button>
            </div>
          );
        })}
    </div>
  );
}
