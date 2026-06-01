import { ChevronRight, ShieldCheck, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import AppIcon, { type AppIconName } from "../components/AppIcon";
import { useAuth } from "../contexts/AuthContext";
import { requestSpace } from "../services/spaceRequestService";
import type { CampusSpace, SpaceCategory } from "../types/space";

const filters = ["All", "Dev", "Sports", "Party", "Study"];

function displayCategory(category: string) {
  if (category === "dev") return "Dev";
  if (category === "sports") return "Sports";
  if (category === "social" || category === "music") return "Party";
  if (category === "study") return "Study";

  return "All";
}

interface SpacesScreenProps {
  spaces: CampusSpace[];
  onOpenSpace: (spaceName: string) => void;
}

export default function SpacesScreen({ spaces, onOpenSpace }: SpacesScreenProps) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [status, setStatus] = useState("");

  const { user, signIn } = useAuth();

  const filteredSpaces = useMemo(() => {
    return activeFilter === "All"
      ? spaces
      : spaces.filter((space) => displayCategory(space.category) === activeFilter);
  }, [activeFilter, spaces]);

  const handleRequestSpace = async () => {
    if (!user) {
      await signIn().catch(() => null);
      return;
    }

    try {
      await requestSpace({
        name: "New Campus Space",
        description: "A requested community space from CampusX users.",
        category: "general" as SpaceCategory,
        reason: "Students want a dedicated room for this topic.",
      });

      setStatus("Space request sent to admin.");
    } catch (error) {
      console.error(error);
      setStatus("Could not request space.");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="relative pt-14 px-5 pb-5 bg-gradient-radial overflow-hidden">
        <div className="absolute top-8 right-2 w-40 h-40 rounded-full bg-cx-purple/[0.07] blur-[54px] pointer-events-none" />

        <h1 className="relative text-[28px] font-semibold text-cx-text tracking-tight mb-1">
          Spaces
        </h1>

        <p className="relative text-cx-text-muted text-[11px] tracking-wide mb-5">
          Admin-controlled chat rooms for KJU
        </p>

        <div className="relative flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-[11px] font-medium tracking-wide whitespace-nowrap transition-all duration-200 ${
                activeFilter === filter
                  ? "bg-cx-purple text-white shadow-lg shadow-cx-purple/20"
                  : "glass text-cx-text-secondary hover:text-cx-text interactive-glass"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-3 bg-gradient-mesh">
        <div className="space-y-2.5">
          {filteredSpaces.length === 0 ? (
            <div className="rounded-2xl glass-subtle p-8 text-center">
              <p className="text-[14px] font-semibold text-cx-text mb-1">
                No spaces yet
              </p>
              <p className="text-[11px] text-cx-text-muted">
                Seed spaces in Firebase or request a new one.
              </p>
            </div>
          ) : (
            filteredSpaces.map((space, i) => {
              const icon = (space.icon || "networking") as AppIconName;
              const active = (space.activeCount || 0) > 0;

              return (
                <button
                  key={space.id}
                  onClick={() => onOpenSpace(space.name)}
                  className="w-full glass-elevated rounded-[22px] p-4 flex items-center gap-3 interactive-glass animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div
                    className="flex h-13 w-13 min-h-13 min-w-13 items-center justify-center rounded-2xl flex-shrink-0 overflow-hidden border border-white/[0.045]"
                    style={{ background: `${space.accent}12` }}
                  >
                    <AppIcon name={icon} size={43} />
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-semibold text-cx-text tracking-[-0.02em]">
                        {space.name}
                      </span>

                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cx-lime shadow-[0_0_7px_rgba(163,230,53,0.7)]" />
                      )}
                    </div>

                    <p className="text-cx-text-muted text-[12px] truncate">
                      {space.description}
                    </p>

                    <p className="text-[10px] text-cx-text-muted mt-1">
                      {space.memberCount || 0} members ·{" "}
                      {displayCategory(space.category)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-cx-lime text-[10px] font-semibold">
                      {active ? "Live" : "Open"}
                    </span>
                    <ChevronRight size={16} className="text-cx-text-muted" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleRequestSpace}
            className="rounded-2xl glass-subtle interactive-glass p-4 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-cx-purple/10 text-cx-purple-bright flex items-center justify-center mb-3">
              <UserPlus size={16} />
            </div>
            <p className="text-[12px] font-semibold text-cx-text">
              Request space
            </p>
            <p className="text-[10px] text-cx-text-muted mt-1 leading-relaxed">
              Ask admin to create a new room.
            </p>
          </button>

          <button
            onClick={handleRequestSpace}
            className="rounded-2xl glass-subtle interactive-glass p-4 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-cx-lime/10 text-cx-lime flex items-center justify-center mb-3">
              <ShieldCheck size={16} />
            </div>
            <p className="text-[12px] font-semibold text-cx-text">
              Be moderator
            </p>
            <p className="text-[10px] text-cx-text-muted mt-1 leading-relaxed">
              Open a space and request role.
            </p>
          </button>
        </div>

        {status && (
          <p className="text-[10px] text-cx-text-muted text-center mt-3">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}