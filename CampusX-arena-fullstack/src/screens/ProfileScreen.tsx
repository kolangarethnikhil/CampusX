import { Bell, ChevronRight, Edit3, LogOut, MessageSquare, Settings, X } from "lucide-react";
import { useState } from "react";
import AppIcon, { type AppIconName } from "../components/AppIcon";
import { useAuth } from "../contexts/AuthContext";
import type { UiListing } from "../types/listing";

interface SavedPost {
  id: number;
  title: string;
  price: string;
  tag: string;
  location: string;
  icon: AppIconName;
}

const savedPosts: SavedPost[] = [
  { id: 1, title: "1bhk near Hanuman Arch", price: "₹12,500", tag: "1BHK", location: "Kothanur", icon: "homeRent" },
  { id: 2, title: "Content Writer - Remote", price: "₹8,000/mo", tag: "PART-TIME", location: "Remote", icon: "moneyBag" },
];

interface ProfileScreenProps {
  listings?: UiListing[];
  onOpenListing?: (id: string | number) => void;
}

export default function ProfileScreen({ listings, onOpenListing }: ProfileScreenProps) {
  const [activeSection, setActiveSection] = useState<"saved" | "posts">("saved");
  const [panel, setPanel] = useState<string | null>(null);
  const { user, signIn } = useAuth();
  const visibleSavedPosts = (listings?.length ? listings.slice(0, 3).map((item) => ({ id: item.id, title: item.title, price: item.price, tag: item.tag, location: item.location, icon: item.sourceType === "market" ? "sofa" as AppIconName : "homeRent" as AppIconName })) : savedPosts);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="relative pt-14 px-5 pb-4 bg-gradient-radial overflow-hidden">
        <div className="absolute top-8 right-6 w-40 h-40 rounded-full bg-cx-amber/[0.04] blur-[52px] pointer-events-none" />
        <div className="relative glass-elevated rounded-3xl p-5 animate-scale-in overflow-hidden">
          <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cx-amber/40 to-transparent" />
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-cx-orange to-cx-amber flex items-center justify-center text-xl font-semibold text-white ring-4 ring-cx-amber/10 flex-shrink-0">
              {user?.displayName?.charAt(0).toUpperCase() || "N"}
              <div className="absolute -right-1 bottom-0 w-7 h-7 rounded-full bg-cx-bg border border-white/[0.08] flex items-center justify-center">
                <AppIcon name="verifiedBadge" size={20} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[22px] font-semibold text-cx-text tracking-tight leading-none">{user?.displayName?.split(" ")[0] || "Nikhil"}</h2>
              <p className="text-[10px] font-medium tracking-[0.15em] text-cx-text-muted uppercase mt-2">Campus Community</p>
            </div>

          </div>

          <div className="grid grid-cols-3 gap-2">
            <ProfileStat label="Saved" value="2" />
            <ProfileStat label="Posts" value="1" />
            <ProfileStat label="Chats" value="4" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4 bg-gradient-mesh">
        <button onClick={() => user ? setPanel("Settings") : void signIn()} className="w-full mb-3 rounded-2xl glass-subtle interactive-glass px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cx-purple/10 text-cx-purple-bright flex items-center justify-center">
              <Settings size={16} />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-cx-text">Settings & account</p>
              <p className="text-[10px] text-cx-text-muted">Profile, feedback, reports, notifications</p>
            </div>
          </div>
          <ChevronRight size={15} className="text-cx-text-muted" />
        </button>

        <button onClick={() => setPanel("Install CampusX")} className="w-full mb-4 rounded-2xl border border-white/[0.055] bg-white/[0.025] px-4 py-3 flex items-center justify-between hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cx-lime/10 flex items-center justify-center overflow-hidden">
              <AppIcon name="verifiedBadge" size={24} />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-cx-text">Install CampusX</p>
              <p className="text-[10px] text-cx-text-muted">Add to home screen for faster access</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-black bg-white px-3 py-1.5 rounded-full">Install</span>
        </button>

        <div className="flex gap-1 mb-4 p-1 rounded-xl glass">
          <button
            onClick={() => setActiveSection("saved")}
            className={`flex-1 py-2.5 rounded-lg text-[11px] font-medium tracking-wide transition-all duration-200 ${
              activeSection === "saved"
                ? "bg-cx-purple text-white shadow-lg shadow-cx-purple/20"
                : "text-cx-text-secondary hover:text-cx-text"
            }`}
          >
            Saved Posts
          </button>
          <button
            onClick={() => setActiveSection("posts")}
            className={`flex-1 py-2.5 rounded-lg text-[11px] font-medium tracking-wide transition-all duration-200 ${
              activeSection === "posts"
                ? "bg-cx-purple text-white shadow-lg shadow-cx-purple/20"
                : "text-cx-text-secondary hover:text-cx-text"
            }`}
          >
            My Posts
          </button>
        </div>

        {activeSection === "saved" ? (
          <div className="space-y-3 animate-fade-up">
            {visibleSavedPosts.map((post) => (
              <button key={post.id} onClick={() => onOpenListing?.(post.id)} className="w-full glass-elevated rounded-2xl p-4 flex items-center gap-4 interactive-glass group">
                <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <AppIcon name={post.icon} size={44} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-[13px] font-medium text-cx-text truncate">{post.title}</h4>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cx-purple/10 text-cx-purple-bright flex-shrink-0">{post.tag}</span>
                  </div>
                  <p className="text-cx-purple text-[13px] font-semibold">{post.price}</p>
                  <p className="text-cx-text-muted text-[10px]">{post.location}</p>
                </div>
                <button className="p-2 rounded-full hover:bg-white/[0.05] transition-colors" onClick={(e) => e.stopPropagation()}>
                  <X size={14} className="text-cx-text-muted" />
                </button>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 animate-fade-up">
            <div className="glass-elevated rounded-2xl overflow-hidden">
              <div className="relative h-36 bg-gradient-to-br from-cx-card-elevated to-cx-card p-4 flex flex-col justify-between overflow-hidden">
                <div className="absolute right-4 bottom-1 opacity-20"><AppIcon name="homeRent" size={90} /></div>
                <div className="relative flex items-start justify-between">
                  <div className="flex gap-2">
                    <span className="text-[9px] font-semibold tracking-wider uppercase bg-cx-purple text-white px-2.5 py-1 rounded-full">1BHK</span>
                    <span className="text-[9px] font-semibold tracking-wider uppercase glass text-cx-text px-2.5 py-1 rounded-full">Your Post</span>
                  </div>
                  <button onClick={() => setPanel("Post controls")} className="text-[10px] text-cx-purple-bright font-semibold px-2 py-1 rounded-full bg-cx-purple/10">Edit</button>
                </div>
                <div className="relative">
                  <span className="text-cx-text text-[10px]">₹</span>
                  <span className="text-cx-text text-[32px] font-semibold leading-none ml-1">18,000</span>
                  <span className="text-cx-text-muted text-[11px] ml-1">/ MONTH</span>
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-[16px] font-semibold text-cx-text mb-1">2bhk near falcon</h4>
                <p className="text-cx-text-muted text-[11px] mb-3">6.0 KM FROM KJU BY ROAD · LINGARAJAPUR...</p>
                <div className="flex gap-2">
                  <span className="text-[9px] font-medium tracking-wider uppercase glass text-cx-text-secondary px-3 py-1.5 rounded-lg">UNFURNISHED</span>
                  <span className="text-[9px] font-medium tracking-wider uppercase bg-cx-green/10 text-cx-green border border-cx-green/20 px-3 py-1.5 rounded-lg">AVAILABLE</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {panel && <ProfilePanel title={panel} onClose={() => setPanel(null)} />}
    </div>
  );
}

function ProfilePanel({ title, onClose }: { title: string; onClose: () => void }) {
  const settings = [
    { label: "Edit profile", icon: <Edit3 size={15} />, color: "text-cx-text-secondary" },
    { label: "Feedback", icon: <MessageSquare size={15} />, color: "text-cx-text-secondary" },
    { label: "Report app issue", icon: <AppIcon name="warning" size={20} />, color: "text-cx-amber" },
    { label: "Notification settings", icon: <Bell size={15} />, color: "text-cx-purple-bright" },
    { label: "Sign out", icon: <LogOut size={15} />, color: "text-red-400" },
  ];

  return (
    <div className="absolute inset-0 z-[90] bg-black/70 flex items-end animate-fade-in">
      <button className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full rounded-t-[30px] bg-cx-card-elevated border-t border-white/[0.08] p-5 animate-slide-up">
        <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />
        <h3 className="text-[20px] font-semibold text-cx-text tracking-[-0.03em]">{title}</h3>
        <p className="text-[12px] text-cx-text-muted leading-relaxed mt-2 mb-5">Manage your profile, app preferences, reports and listing controls.</p>
        <div className="space-y-2">
          {settings.map((item) => (
            <button key={item.label} onClick={onClose} className="w-full flex items-center justify-between rounded-2xl border border-white/[0.055] bg-white/[0.025] px-4 py-3 interactive-glass">
              <span className={`flex items-center gap-3 text-[12px] font-medium ${item.color}`}>
                <span className="w-8 h-8 rounded-xl bg-white/[0.025] flex items-center justify-center">{item.icon}</span>
                {item.label}
              </span>
              <ChevronRight size={14} className="text-cx-text-muted" />
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={onClose} className="py-3 rounded-2xl glass text-[12px] text-cx-text-secondary">Close</button>
          <button onClick={onClose} className="py-3 rounded-2xl bg-cx-purple text-white text-[12px] font-semibold">Done</button>
        </div>
      </div>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.025] border border-white/[0.045] py-2 text-center">
      <p className="text-[15px] font-semibold text-cx-text leading-none">{value}</p>
      <p className="text-[8px] text-cx-text-muted uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
