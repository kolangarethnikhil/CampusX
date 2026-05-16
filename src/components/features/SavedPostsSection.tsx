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
  <div className="flex flex-col items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-12 text-center">
    <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
      <div className="absolute h-20 w-20 rounded-full border border-kjc-accent/30 animate-ping" />
      <div className="absolute h-16 w-16 rounded-full bg-kjc-accent/10 blur-xl" />

      <div className="relative flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/10 text-4xl animate-bounce">
        🎒
      </div>
    </div>

    <p className="text-sm font-black uppercase tracking-[0.22em] text-white/70">
      Finding saved posts
    </p>

    <p className="mt-2 max-w-xs text-xs font-bold leading-relaxed text-white/35">
      Students are checking rooms, essentials, and campus deals for you.
    </p>

    <div className="mt-5 flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-kjc-accent animate-bounce [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-kjc-accent animate-bounce [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-kjc-accent animate-bounce [animation-delay:300ms]" />
    </div>
  </div>
)}

      {items.length === 0 && !loading && (
  <div className="text-center py-10">
    <div className="text-4xl mb-3">🔖</div>

    <p className="text-white font-semibold">
      No saved posts yet
    </p>

    <p className="text-white/40 text-sm mt-2">
      Save listings to view them here later
    </p>
  </div>
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
