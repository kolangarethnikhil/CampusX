import { Flag, X } from "lucide-react";
import { useState } from "react";
import { HousingListing } from "../../services/housingService.ts";
import { MarketListing } from "../../services/marketService";
import {
  createListingReport,
  ReportReason,
} from "../../services/reportService";

interface ReportListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: HousingListing | MarketListing | null;
  type: "housing" | "market";
  currentUserId?: string | null;
}

const reasons: { value: ReportReason; label: string }[] = [
  { value: "fake_listing", label: "Fake listing" },
  { value: "scam", label: "Scam / asking advance" },
  { value: "wrong_location", label: "Wrong location" },
  { value: "already_unavailable", label: "Already unavailable" },
  { value: "spam", label: "Spam or duplicate" },
  { value: "unsafe", label: "Unsafe behavior" },
  { value: "other", label: "Other" },
];

export default function ReportListingModal({
  isOpen,
  onClose,
  listing,
  type,
  currentUserId,
}: ReportListingModalProps) {
  const [reason, setReason] = useState<ReportReason>("scam");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !listing) return null;

  const handleSubmit = async () => {
    if (!currentUserId) {
      alert("Please sign in to report a listing.");
      return;
    }

    if (listing.postedBy === currentUserId) {
      alert("You cannot report your own post.");
      return;
    }

    setLoading(true);

    try {
      await createListingReport({
        listingId: listing.id,
        listingType: type,
        listingTitle: listing.title,
        listingOwnerId: listing.postedBy,
        reporterId: currentUserId,
        reason,
        details: details.trim(),
      });

      setReason("scam");
      setDetails("");
      onClose();

      alert("Report submitted. Thanks for helping keep CampusX safe.");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close report modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/80"
      />

      <div className="relative w-full max-w-md rounded-t-[40px] border border-white/10 bg-black p-7 shadow-pro-lg sm:rounded-[40px]">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
              Report listing
            </p>
            <h3 className="mt-2 text-3xl pro-heading tracking-tighter">
              Help us review
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-white/45 transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-6 rounded-[26px] border border-white/5 bg-white/[0.04] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
            Listing
          </p>
          <p className="mt-2 truncate text-lg pro-heading">{listing.title}</p>
        </div>

        <div className="space-y-4">
          <label className="pl-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/25">
            Reason
          </label>

          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as ReportReason)}
            className="input-pro appearance-none text-[11px] font-black uppercase tracking-widest"
          >
            {reasons.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 space-y-4">
          <label className="pl-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/25">
            Details optional
          </label>

          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={4}
            placeholder="Add context for review..."
            className="input-pro resize-none py-5"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-[30px] bg-white py-5 text-[10px] font-black uppercase tracking-[0.25em] text-black transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          {loading ? "Submitting..." : "Submit report"}
          <Flag size={15} />
        </button>
      </div>
    </div>
  );
}