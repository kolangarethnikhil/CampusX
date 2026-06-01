import { X } from "lucide-react";
import { useState } from "react";
import AppIcon from "../components/AppIcon";
import { useAuth } from "../contexts/AuthContext";
import {
  createListing,
  type CreateListingType,
} from "../services/createListingService";

interface CreateListingSheetProps {
  initialType?: CreateListingType;
  onClose: () => void;
  onCreated?: (listingId: string, type: CreateListingType) => void;
}

export default function CreateListingSheet({
  initialType = "housing",
  onClose,
  onCreated,
}: CreateListingSheetProps) {
  const [type, setType] = useState<CreateListingType>(initialType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { user, signIn } = useAuth();

  const submit = async () => {
    setError("");

    if (!user) {
      await signIn().catch(() => null);
      return;
    }

    setBusy(true);

    try {
      const id = await createListing({
        type,
        title,
        description,
        price: Number(price),
        category: type === "market" ? "Essentials" : undefined,
        roomType: type === "housing" ? "roommate" : undefined,
      });

      onCreated?.(id, type);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create listing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[90] bg-black/70 flex items-end animate-fade-in">
      <button className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full rounded-t-[30px] bg-cx-card-elevated border-t border-white/[0.08] p-5 animate-slide-up max-h-[82%] overflow-y-auto">
        <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[22px] font-semibold text-cx-text tracking-[-0.04em]">
              Create post
            </h3>
            <p className="text-[11px] text-cx-text-muted mt-1">
              Post a room or sell campus essentials.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full glass flex items-center justify-center"
          >
            <X size={17} className="text-cx-text-secondary" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setType("housing")}
            className={`rounded-2xl p-3 text-left border transition-all ${
              type === "housing"
                ? "border-cx-amber/35 bg-cx-amber/[0.08]"
                : "border-white/[0.06] bg-white/[0.025]"
            }`}
          >
            <AppIcon name="homeRent" size={34} />
            <p className="text-[12px] font-semibold text-cx-text mt-2">
              Housing
            </p>
            <p className="text-[9px] text-cx-text-muted">
              Room / PG / roommate
            </p>
          </button>

          <button
            onClick={() => setType("market")}
            className={`rounded-2xl p-3 text-left border transition-all ${
              type === "market"
                ? "border-cx-pink/35 bg-cx-pink/[0.08]"
                : "border-white/[0.06] bg-white/[0.025]"
            }`}
          >
            <AppIcon name="sofa" size={34} />
            <p className="text-[12px] font-semibold text-cx-text mt-2">
              Essentials
            </p>
            <p className="text-[9px] text-cx-text-muted">
              Furniture, books & more
            </p>
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "housing"
                ? "e.g. 1BHK near Kothanur"
                : "e.g. Study table + chair"
            }
            className="w-full input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted"
          />

          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder={type === "housing" ? "Monthly rent" : "Selling price"}
            className="w-full input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, condition, location, availability..."
            className="w-full min-h-[110px] input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted resize-none"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-cx-amber/15 bg-cx-amber/[0.035] p-3">
          <p className="text-[10px] text-cx-text-muted leading-relaxed">
            For now posts use KJU as default location. In the next pass we will
            add map picker, images and advanced fields.
          </p>
        </div>

        {error && <p className="text-[11px] text-red-400 mt-3">{error}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full mt-5 rounded-2xl bg-white py-3.5 text-[11px] font-semibold tracking-wide text-black disabled:opacity-50"
        >
          {busy ? "Posting..." : user ? "Post on CampusX" : "Sign in to post"}
        </button>
      </div>
    </div>
  );
}