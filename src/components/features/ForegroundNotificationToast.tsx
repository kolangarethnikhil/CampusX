import { X } from "lucide-react";
import { ForegroundPushPayload } from "../../services/pushNotificationService";

interface ForegroundNotificationToastProps {
  payload: ForegroundPushPayload | null;
  onClose: () => void;
}

export default function ForegroundNotificationToast({
  payload,
  onClose,
}: ForegroundNotificationToastProps) {
  if (!payload) return null;

  return (
    <div className="fixed left-4 right-4 top-5 z-[260] mx-auto max-w-md rounded-[30px] border border-white/10 bg-black/95 p-5 shadow-pro-lg">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-kjc-accent text-[10px] font-black uppercase tracking-widest text-white">
          CX
        </div>

        <button
          type="button"
          onClick={() => {
            if (payload.url) {
              window.location.href = payload.url;
            }
          }}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-black text-white">
            {payload.title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-bold leading-relaxed text-white/50">
            {payload.body}
          </p>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/40"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}