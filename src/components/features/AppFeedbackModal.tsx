import { useState } from "react";
import { AlertTriangle, Star, X } from "lucide-react";
import {
  AppIssueType,
  submitAppFeedback,
  submitAppIssue,
} from "../../services/feedbackService";

interface AppFeedbackModalProps {
  isOpen: boolean;
  mode: "issue" | "feedback";
  onClose: () => void;
}

const issueTypes: { value: AppIssueType; label: string }[] = [
  { value: "login", label: "Login issue" },
  { value: "posting", label: "Posting issue" },
  { value: "chat", label: "Chat issue" },
  { value: "map_location", label: "Map / location issue" },
  { value: "profile", label: "Profile issue" },
  { value: "safety", label: "Safety concern" },
  { value: "other", label: "Other" },
];

export default function AppFeedbackModal({
  isOpen,
  mode,
  onClose,
}: AppFeedbackModalProps) {
  const [issueType, setIssueType] = useState<AppIssueType>("other");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const isIssue = mode === "issue";

  const submit = async () => {
    if (isIssue && !message.trim()) {
      alert("Please describe the issue.");
      return;
    }

    setSaving(true);

    try {
      if (isIssue) {
        await submitAppIssue({
          type: issueType,
          message,
        });
      } else {
        await submitAppFeedback({
          rating,
          message,
        });
      }

      setMessage("");
      setRating(5);
      setIssueType("other");
      onClose();
      alert(isIssue ? "Issue reported. Thank you." : "Feedback submitted. Thank you.");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not submit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/85"
      />

      <div className="relative w-full max-w-lg rounded-t-[44px] border border-white/10 bg-black p-8 shadow-pro-lg sm:rounded-[44px]">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-kjc-accent">
              CampusX
            </p>
            <h2 className="mt-2 text-4xl pro-heading tracking-tighter">
              {isIssue ? "Report issue" : "Rate app"}
            </h2>
            <p className="mt-2 text-xs font-bold leading-relaxed text-white/40">
              {isIssue
                ? "Tell us what broke so we can fix it faster."
                : "Help us improve CampusX for KJU students."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white/45"
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-6">
          {isIssue ? (
            <div className="space-y-3">
              <label className="pl-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                Issue type
              </label>

              <div className="grid gap-3">
                {issueTypes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setIssueType(item.value)}
                    className={`rounded-[24px] border px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.16em] transition-transform duration-150 ease-out active:scale-[0.98] ${
                      issueType === item.value
                        ? "border-kjc-accent bg-kjc-accent/15 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/55"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="pl-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                Rating
              </label>

              <div className="flex justify-center gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="transition-transform duration-150 ease-out active:scale-[0.9]"
                  >
                    <Star
                      size={30}
                      className={value <= rating ? "text-kjc-accent" : "text-white/20"}
                      fill={value <= rating ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="pl-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
              {isIssue ? "Describe issue" : "Message optional"}
            </label>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder={
                isIssue
                  ? "What happened? Which screen? Any steps to reproduce?"
                  : "What should we improve next?"
              }
              className="input-pro resize-none py-5 leading-relaxed"
            />
          </div>

          {isIssue && (
            <div className="flex gap-3 rounded-[24px] border border-amber-500/15 bg-amber-500/10 p-4 text-amber-200">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p className="text-xs font-bold leading-relaxed text-white/55">
                For unsafe listings, use the listing report button. This section is for app bugs.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="w-full rounded-[32px] bg-kjc-accent py-6 text-[10px] font-black uppercase tracking-[0.3em] text-white transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Submitting..." : isIssue ? "Submit issue" : "Submit feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}