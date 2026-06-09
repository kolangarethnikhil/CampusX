import {
  ArrowLeft,
  Check,
  EyeOff,
  PenLine,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import AppIcon, { type AppIconName } from "../components/AppIcon";
import { useAuth } from "../contexts/AuthContext";
import {
  approveModeratorRequest,
  approveSpaceRequest,
  closeListing,
  createAdminSpace,
  hideListing,
  markReportReviewed,
  rejectModeratorRequest,
  rejectSpaceRequest,
  reopenListing,
  subscribeAdminListings,
  subscribeAdminModeratorRequests,
  subscribeAdminReports,
  subscribeAdminSpaceRequests,
  subscribeAdminSpaces,
  unhideListing,
  updateAdminSpace,
  updateSpaceStatus,
  type AdminListingItem,
  type AdminListingReport,
} from "../services/adminService";
import type { ModeratorRequest, SpaceRequest } from "../types/moderation";
import type { CampusSpace, SpaceCategory, SpaceStatus } from "../types/space";

type AdminTab = "spaces" | "spaceRequests" | "moderators" | "reports" | "listings";

const categories: SpaceCategory[] = [
  "dev",
  "sports",
  "study",
  "social",
  "music",
  "housing",
  "marketplace",
  "general",
];

const statuses: SpaceStatus[] = ["active", "hidden", "archived"];

const accents = [
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#22c55e",
];

const icons: AppIconName[] = [
  "technologist",
  "football",
  "books",
  "networking",
  "sofa",
  "homeRent",
];

interface AdminPanelScreenProps {
  onBack: () => void;
}

export default function AdminPanelScreen({ onBack }: AdminPanelScreenProps) {
  const [tab, setTab] = useState<AdminTab>("spaces");
  const [spaces, setSpaces] = useState<CampusSpace[]>([]);
  const [spaceRequests, setSpaceRequests] = useState<SpaceRequest[]>([]);
  const [moderatorRequests, setModeratorRequests] = useState<
    ModeratorRequest[]
  >([]);
  const [reports, setReports] = useState<AdminListingReport[]>([]);
  const [listings, setListings] = useState<AdminListingItem[]>([]);
  const [status, setStatus] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<CampusSpace | null>(null);

  const { user, isAdmin, refreshClaims } = useAuth();

  useEffect(() => {
    void refreshClaims().catch(() => null);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubSpaces = subscribeAdminSpaces(setSpaces);
    const unsubSpaceRequests = subscribeAdminSpaceRequests(setSpaceRequests);
    const unsubModeratorRequests =
      subscribeAdminModeratorRequests(setModeratorRequests);
    const unsubReports = subscribeAdminReports(setReports);
    const unsubListings = subscribeAdminListings(setListings);

    return () => {
      unsubSpaces();
      unsubSpaceRequests();
      unsubModeratorRequests();
      unsubReports();
      unsubListings();
    };
  }, [isAdmin]);

  const run = async (
    task: () => Promise<unknown>,
    success: string,
    actionId = ""
  ) => {
    setStatus("");
    setBusyAction(actionId);

    try {
      await task();
      setStatus(success);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Admin action failed.");
    } finally {
      setBusyAction("");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-cx-bg">
        <div className="relative flex items-center gap-3 pt-14 px-4 pb-4 bg-gradient-radial">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full glass interactive-glass flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-cx-text" />
          </button>

          <div>
            <h1 className="text-[20px] font-semibold text-cx-text">
              Admin Panel
            </h1>
            <p className="text-[11px] text-cx-text-muted">
              Admin access required
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 text-center bg-gradient-mesh">
          <div className="glass-elevated rounded-[28px] p-6">
            <ShieldCheck
              size={28}
              className="text-cx-purple-bright mx-auto mb-3"
            />

            <p className="text-[15px] font-semibold text-cx-text">
              You are not an admin yet
            </p>

            <p className="text-[11px] text-cx-text-muted mt-2 leading-relaxed">
              Run the admin claim script, sign out and sign in again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cx-bg">
      <div className="relative pt-14 px-4 pb-4 bg-gradient-radial">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full glass interactive-glass flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-cx-text" />
          </button>

          <div className="flex-1">
            <h1 className="text-[22px] font-semibold text-cx-text tracking-[-0.04em]">
              Admin Panel
            </h1>
            <p className="text-[11px] text-cx-text-muted">
              Spaces, requests, reports and listings
            </p>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="h-10 px-3 rounded-full bg-white text-black text-[10px] font-semibold flex items-center gap-1.5"
          >
            <Plus size={13} /> Space
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl glass p-1">
          <TabButton
            active={tab === "spaces"}
            label="Spaces"
            count={spaces.length}
            onClick={() => setTab("spaces")}
          />
          <TabButton
            active={tab === "spaceRequests"}
            label="Requests"
            count={spaceRequests.length}
            onClick={() => setTab("spaceRequests")}
          />
          <TabButton
            active={tab === "moderators"}
            label="Mods"
            count={moderatorRequests.length}
            onClick={() => setTab("moderators")}
          />
          <TabButton
            active={tab === "reports"}
            label="Reports"
            count={reports.length}
            onClick={() => setTab("reports")}
          />
          <TabButton
            active={tab === "listings"}
            label="Listings"
            count={listings.length}
            onClick={() => setTab("listings")}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gradient-mesh">
        {status && (
          <p className="mb-3 rounded-2xl bg-white/[0.035] border border-white/[0.06] px-4 py-3 text-[11px] text-cx-text-secondary">
            {status}
          </p>
        )}

        {tab === "spaces" && (
          <div className="space-y-3">
            {spaces.length === 0 ? (
              <EmptyAdminState title="No spaces yet" />
            ) : (
              spaces.map((space) => {
                const isHidden =
                  space.status === "hidden" || space.status === "archived";

                return (
                  <div
                    key={space.id}
                    className="glass-elevated rounded-[22px] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl glass flex items-center justify-center overflow-hidden"
                        style={{ background: `${space.accent}12` }}
                      >
                        <AppIcon
                          name={(space.icon || "networking") as AppIconName}
                          size={38}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-cx-text truncate">
                            {space.name}
                          </p>
                          <StatusPill status={space.status} />
                        </div>

                        <p className="text-[10px] text-cx-text-muted truncate">
                          {space.category} · {space.memberCount || 0} members
                        </p>

                        <p className="text-[10px] text-cx-text-muted truncate mt-0.5">
                          {space.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => setEditingSpace(space)}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3 text-[11px] font-semibold text-cx-text-secondary flex items-center justify-center gap-1.5"
                      >
                        <PenLine size={13} /> Edit
                      </button>

                      <button
                        disabled={busyAction === `space-${space.id}`}
                        onClick={() =>
                          run(
                            () =>
                              updateSpaceStatus(
                                space.id,
                                isHidden ? "active" : "hidden"
                              ),
                            isHidden
                              ? "Space is visible again."
                              : "Space hidden.",
                            `space-${space.id}`
                          )
                        }
                        className={`rounded-2xl py-3 text-[11px] font-semibold flex items-center justify-center gap-1.5 ${
                          isHidden
                            ? "bg-white text-black"
                            : "border border-red-500/15 bg-red-500/[0.04] text-red-400"
                        }`}
                      >
                        <EyeOff size={13} />
                        {busyAction === `space-${space.id}`
                          ? "Saving..."
                          : isHidden
                            ? "Unhide"
                            : "Hide"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "spaceRequests" && (
          <div className="space-y-3">
            {spaceRequests.length === 0 ? (
              <EmptyAdminState title="No pending space requests" />
            ) : (
              spaceRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  title={request.name}
                  subtitle={`${request.category} · ${
                    request.requestedByName || "CampusX user"
                  }`}
                  description={request.reason}
                  onApprove={() =>
                    user &&
                    run(
                      () => approveSpaceRequest(request, user.uid),
                      "Space request approved."
                    )
                  }
                  onReject={() =>
                    user &&
                    run(
                      () => rejectSpaceRequest(request.id, user.uid),
                      "Space request rejected."
                    )
                  }
                />
              ))
            )}
          </div>
        )}

        {tab === "moderators" && (
          <div className="space-y-3">
            {moderatorRequests.length === 0 ? (
              <EmptyAdminState title="No pending moderator requests" />
            ) : (
              moderatorRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  title="Moderator request"
                  subtitle={`${request.spaceId} · ${
                    request.requestedByName || "CampusX user"
                  }`}
                  description={request.reason}
                  onApprove={() =>
                    user &&
                    run(
                      () => approveModeratorRequest(request, user.uid),
                      "Moderator approved."
                    )
                  }
                  onReject={() =>
                    user &&
                    run(
                      () => rejectModeratorRequest(request.id, user.uid),
                      "Moderator request rejected."
                    )
                  }
                />
              ))
            )}
          </div>
        )}

        {tab === "reports" && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <EmptyAdminState title="No open reports" />
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="glass-elevated rounded-[22px] p-4"
                >
                  <p className="text-[14px] font-semibold text-cx-text">
                    {report.listingTitle || "Reported listing"}
                  </p>

                  <p className="text-[10px] text-cx-text-muted mt-1">
                    {report.listingType} · {report.reason}
                  </p>

                  {report.details && (
                    <p className="text-[12px] text-cx-text-secondary leading-relaxed mt-3">
                      {report.details}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      onClick={() =>
                        user &&
                        run(
                          () =>
                            markReportReviewed(
                              report.id,
                              user.uid,
                              "dismissed"
                            ),
                          "Report dismissed."
                        )
                      }
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3 text-[11px] font-semibold text-cx-text-secondary"
                    >
                      Dismiss
                    </button>

                    <button
                      onClick={() =>
                        user &&
                        run(
                          () =>
                            markReportReviewed(
                              report.id,
                              user.uid,
                              "action_taken"
                            ),
                          "Report marked action taken."
                        )
                      }
                      className="rounded-2xl bg-white py-3 text-[11px] font-semibold text-black"
                    >
                      Action taken
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "listings" && (
          <div className="space-y-3">
            {listings.length === 0 ? (
              <EmptyAdminState title="No listings found" />
            ) : (
              listings.map((listing) => {
                const isHidden =
                  listing.status === "deleted" || listing.status === "hidden";
                const isClosed = listing.status === "closed";

                return (
                  <div
                    key={`${listing.listingType}-${listing.id}`}
                    className="glass-elevated rounded-[22px] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-cx-text truncate">
                          {listing.title}
                        </p>

                        <p className="text-[10px] text-cx-text-muted mt-1">
                          {listing.listingType} · ₹
                          {Number(listing.price || 0).toLocaleString("en-IN")}
                        </p>
                      </div>

                      <span
                        className={`text-[9px] px-2 py-1 rounded-full uppercase ${
                          isHidden
                            ? "bg-red-500/[0.08] text-red-400"
                            : isClosed
                              ? "bg-cx-amber/[0.08] text-cx-amber"
                              : "bg-cx-lime/[0.08] text-cx-lime"
                        }`}
                      >
                        {isHidden ? "hidden" : listing.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {isHidden ? (
                        <button
                          onClick={() =>
                            run(
                              () => unhideListing(listing),
                              "Listing is visible again."
                            )
                          }
                          className="col-span-2 rounded-2xl bg-white py-3 text-[11px] font-semibold text-black"
                        >
                          Unhide listing
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              run(
                                () =>
                                  isClosed
                                    ? reopenListing(listing)
                                    : closeListing(listing),
                                isClosed
                                  ? "Listing reopened."
                                  : "Listing closed."
                              )
                            }
                            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3 text-[11px] font-semibold text-cx-text-secondary"
                          >
                            {isClosed ? "Reopen" : "Close"}
                          </button>

                          <button
                            onClick={() =>
                              run(() => hideListing(listing), "Listing hidden.")
                            }
                            className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] py-3 text-[11px] font-semibold text-red-400"
                          >
                            Hide
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {createOpen && (
        <SpaceEditorSheet
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSubmit={(input) =>
            run(() => createAdminSpace(input), "Space created.").then(() =>
              setCreateOpen(false)
            )
          }
        />
      )}

      {editingSpace && (
        <SpaceEditorSheet
          mode="edit"
          space={editingSpace}
          onClose={() => setEditingSpace(null)}
          onSubmit={(input) =>
            run(
              () =>
                updateAdminSpace({
                  ...input,
                  id: editingSpace.id,
                }),
              "Space updated."
            ).then(() => setEditingSpace(null))
          }
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const className =
    status === "active"
      ? "bg-cx-lime/[0.08] text-cx-lime"
      : status === "hidden"
        ? "bg-red-500/[0.08] text-red-400"
        : "bg-cx-amber/[0.08] text-cx-amber";

  return (
    <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase ${className}`}>
      {status}
    </span>
  );
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-semibold ${
        active ? "bg-cx-purple text-white" : "text-cx-text-muted"
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );
}

function EmptyAdminState({ title }: { title: string }) {
  return (
    <div className="rounded-[24px] glass-subtle p-8 text-center text-[12px] text-cx-text-muted">
      {title}
    </div>
  );
}

function RequestCard({
  title,
  subtitle,
  description,
  onApprove,
  onReject,
}: {
  title: string;
  subtitle: string;
  description: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="glass-elevated rounded-[22px] p-4">
      <p className="text-[14px] font-semibold text-cx-text">{title}</p>
      <p className="text-[10px] text-cx-text-muted mt-1">{subtitle}</p>
      <p className="text-[12px] text-cx-text-secondary leading-relaxed mt-3">
        {description}
      </p>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          onClick={onReject}
          className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] py-3 text-[11px] font-semibold text-red-400 flex items-center justify-center gap-1.5"
        >
          <X size={13} /> Reject
        </button>

        <button
          onClick={onApprove}
          className="rounded-2xl bg-white py-3 text-[11px] font-semibold text-black flex items-center justify-center gap-1.5"
        >
          <Check size={13} /> Approve
        </button>
      </div>
    </div>
  );
}

function SpaceEditorSheet({
  mode,
  space,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  space?: CampusSpace;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    description: string;
    category: SpaceCategory;
    icon: string;
    accent: string;
    status: SpaceStatus;
  }) => Promise<void> | void;
}) {
  const [name, setName] = useState(space?.name || "");
  const [description, setDescription] = useState(space?.description || "");
  const [category, setCategory] = useState<SpaceCategory>(
    space?.category || "general"
  );
  const [icon, setIcon] = useState<AppIconName>(
    (space?.icon as AppIconName) || "networking"
  );
  const [accent, setAccent] = useState(space?.accent || "#8b5cf6");
  const [spaceStatus, setSpaceStatus] = useState<SpaceStatus>(
    space?.status || "active"
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");

    if (name.trim().length < 3) {
      setError("Space name must be at least 3 characters.");
      return;
    }

    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }

    setBusy(true);

    try {
      await onSubmit({
        name,
        description,
        category,
        icon,
        accent,
        status: spaceStatus,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not save space.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] bg-black/70 flex items-end animate-fade-in">
      <button className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full rounded-t-[30px] bg-cx-card-elevated border-t border-white/[0.08] p-5 animate-slide-up max-h-[86%] overflow-y-auto">
        <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />

        <h3 className="text-[21px] font-semibold text-cx-text tracking-[-0.04em]">
          {mode === "create" ? "Create space" : "Edit space"}
        </h3>

        <p className="text-[11px] text-cx-text-muted mt-1 mb-5">
          Official campus room controlled by admins.
        </p>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Space name"
            className="w-full input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full min-h-[90px] input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted resize-none"
          />

          <OptionGrid
            label="Category"
            value={category}
            options={categories}
            onChange={(value) => setCategory(value as SpaceCategory)}
          />

          <OptionGrid
            label="Status"
            value={spaceStatus}
            options={statuses}
            onChange={(value) => setSpaceStatus(value as SpaceStatus)}
          />

          <div>
            <p className="text-[10px] text-cx-text-muted mb-2 uppercase tracking-wider">
              Icon
            </p>

            <div className="grid grid-cols-6 gap-2">
              {icons.map((item) => (
                <button
                  key={item}
                  onClick={() => setIcon(item)}
                  className={`rounded-xl p-2 border ${
                    icon === item
                      ? "border-cx-purple bg-cx-purple/10"
                      : "border-white/[0.06]"
                  }`}
                >
                  <AppIcon name={item} size={26} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-cx-text-muted mb-2 uppercase tracking-wider">
              Accent
            </p>

            <div className="grid grid-cols-6 gap-2">
              {accents.map((item) => (
                <button
                  key={item}
                  onClick={() => setAccent(item)}
                  className={`h-8 rounded-xl border ${
                    accent === item ? "border-white" : "border-white/[0.08]"
                  }`}
                  style={{ background: item }}
                />
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-500/15 bg-red-500/[0.05] px-4 py-3 text-[11px] text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full mt-5 rounded-2xl bg-white py-3.5 text-[11px] font-semibold text-black disabled:opacity-50"
        >
          {busy
            ? "Saving..."
            : mode === "create"
              ? "Create official space"
              : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function OptionGrid({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] text-cx-text-muted mb-2 uppercase tracking-wider">
        {label}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`rounded-xl px-3 py-2 text-[10px] border ${
              value === option
                ? "bg-cx-purple text-white border-cx-purple"
                : "border-white/[0.06] text-cx-text-muted"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}