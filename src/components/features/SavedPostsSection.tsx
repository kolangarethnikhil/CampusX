import { useEffect, useState } from "react";
import { getMySavedPosts, removeSavedPost } from "../../services/savedPostsService";

export default function SavedPostsSection() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <p className="text-white">Loading saved posts...</p>;
  }

  if (items.length === 0) {
    return <p className="text-white/60">No saved posts</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.saveId}
          className="p-3 border border-white/10 rounded-xl bg-white/5"
        >
          <p className="text-white text-sm">
            {item.listing?.title || "Deleted listing"}
          </p>

          <button
            onClick={() => removeSavedPost(item.saveId)}
            className="text-xs text-red-400 mt-2"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}