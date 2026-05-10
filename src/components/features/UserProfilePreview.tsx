import { GraduationCap, MapPin, ShieldCheck, User, X } from "lucide-react";

interface UserProfilePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    displayName?: string;
    photoURL?: string;
    campusRole?: string;
    verifiedStatus?: string;
    currentLocation?: string;
    course?: string;
    batch?: string;
  } | null;
}

export default function UserProfilePreview({
  isOpen,
  onClose,
  user,
}: UserProfilePreviewProps) {
  if (!isOpen || !user) return null;

  const name = user.displayName || "CampusX user";

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close profile preview"
        onClick={onClose}
        className="absolute inset-0 bg-black/80"
      />

      <div className="relative w-full max-w-sm rounded-[40px] border border-white/10 bg-black p-7 shadow-pro-lg">
        <div className="mb-7 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Profile</p>

          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-white/45">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="mb-5 h-24 w-24 overflow-hidden rounded-[32px] border border-white/10 bg-white/5">
            {user.photoURL ? (
              <img src={user.photoURL} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-kjc-accent/15 text-3xl font-black text-kjc-accent">{name.charAt(0).toUpperCase()}</div>
            )}
          </div>

          <h3 className="text-3xl pro-heading tracking-tighter">{name}</h3>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/60">{user.campusRole || "Student"}</span>

            {user.verifiedStatus === "verified" && (
              <span className="flex items-center gap-1.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">
                <ShieldCheck size={13} />
                Verified
              </span>
            )}
          </div>

          <div className="mt-7 grid w-full gap-3 text-left">
            {user.course && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                <GraduationCap size={18} className="text-kjc-accent" />
                <p className="text-sm font-bold text-white/75">{user.course}</p>
              </div>
            )}

            {user.batch && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                <User size={18} className="text-kjc-accent" />
                <p className="text-sm font-bold text-white/75">Batch {user.batch}</p>
              </div>
            )}

            {user.currentLocation && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                <MapPin size={18} className="text-kjc-accent" />
                <p className="text-sm font-bold text-white/75">{user.currentLocation}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
