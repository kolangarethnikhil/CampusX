import { useEffect, useState } from "react";
import { getMySavedPosts } from "../../services/savedPostsService";
import { unsaveListing as removeSavedPost } from "../../services/savedCrudService";

export default function SavedPostsSection() {
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

  // ✅ FIXED remove handler
  const handleRemove = async (saveId: string) => {
    setRemovingId(saveId);

    try {
      await removeSavedPost(saveId);

      // ✅ IMMEDIATE UI UPDATE
      setItems((prev) => prev.filter((item) => item.saveId !== saveId));

    } catch (err) {
      console.error("remove failed", err);
      alert("Failed to remove");
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
            <div
              key={i}
              className="h-20 rounded-xl bg-white/10 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-white/60">No saved posts</p>
      )}

      {!loading && items.map((item) => (
        <div
          key={item.saveId}
          className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 flex justify-between items-center"
        >
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">
              {item.listing?.title || "Deleted listing"}
            </p>

            <p className="text-white/40 text-xs mt-1 uppercase">
              {item.listingType}
            </p>
          </div>

          <button
            onClick={() => handleRemove(item.saveId)}
            disabled={removingId === item.saveId}
            className="text-red-400 text-xs font-bold disabled:opacity-50"
          >
            {removingId === item.saveId ? "Removing..." : "Remove"}
          </button>
        </div>
      ))}
    </div>
  );
}
