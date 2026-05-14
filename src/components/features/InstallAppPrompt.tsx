import { Download, Smartphone, X } from "lucide-react";

interface InstallAppPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => Promise<boolean>;
}

export default function InstallAppPrompt({
  isOpen,
  onClose,
  onInstall,
}: InstallAppPromptProps) {
  if (!isOpen) return null;

  const handleInstall = async () => {
    const installed = await onInstall();

    if (installed) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/85"
        aria-label="Close install prompt"
      />

      <div className="relative w-full max-w-md rounded-t-[44px] border border-white/10 bg-black p-8 shadow-pro-lg sm:rounded-[44px]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white/45"
        >
          <X size={22} />
        </button>

        <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-[26px] border border-kjc-accent/30 bg-kjc-accent/15 text-kjc-accent">
          <Smartphone size={30} />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-kjc-accent">
          Recommended
        </p>

        <h2 className="mt-2 text-4xl pro-heading tracking-tighter">
          Use CampusX <span className="text-kjc-accent italic">like an app</span>
        </h2>

        <p className="mt-4 text-sm font-bold leading-relaxed text-white/50">
          Install CampusX on your home screen for faster access to rooms, marketplace posts,
          chats, and updates.
        </p>

        <div className="mt-7 grid gap-3">
          <button
            type="button"
            onClick={handleInstall}
            className="flex w-full items-center justify-center gap-3 rounded-[30px] bg-kjc-accent py-6 text-[10px] font-black uppercase tracking-[0.3em] text-white transition-transform duration-150 ease-out active:scale-[0.98]"
          >
            Install app
            <Download size={16} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-[28px] border border-white/10 bg-white/5 py-5 text-[10px] font-black uppercase tracking-[0.24em] text-white/45 transition-transform duration-150 ease-out active:scale-[0.98]"
          >
            Continue in browser
          </button>
        </div>
      </div>
    </div>
  );
}