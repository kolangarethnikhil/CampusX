import { X } from "lucide-react";
import { useMemo, useState } from "react";
import AppIcon from "../components/AppIcon";
import { useAuth } from "../contexts/AuthContext";
import {
  boardIdToType,
  boardNameToId,
  createBoardPost,
} from "../services/boardPostService";
import {
  createListing,
  type CreateListingType,
  type HousingFurnishing,
  type HousingRoomType,
  type HousingTenantPreference,
  type MarketCategory,
  type MarketCondition,
} from "../services/createListingService";

type CreateFlowType = CreateListingType | "board";

interface CreateListingSheetProps {
  initialType?: CreateFlowType;
  boardName?: string;
  lockType?: boolean;
  onClose: () => void;
  onCreated?: (listingId: string, type: CreateFlowType) => void;
}

const roomTypes: HousingRoomType[] = [
  "roommate",
  "1RK",
  "1BHK",
  "2BHK",
  "3BHK",
  "PG",
];

const furnishings: HousingFurnishing[] = [
  "Unfurnished",
  "Semi-furnished",
  "Fully-furnished",
];

const tenantPrefs: {
  value: HousingTenantPreference;
  label: string;
}[] = [
  { value: "both", label: "Any" },
  { value: "boys_only", label: "Boys" },
  { value: "girls_only", label: "Girls" },
  { value: "couples", label: "Couples" },
];

const marketCategories: MarketCategory[] = [
  "Furniture",
  "Electronics",
  "Books",
  "Essentials",
  "Other",
];

const conditions: MarketCondition[] = ["New", "Like New", "Good", "Fair"];

function todayDate() {
  return new Date();
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function today() {
  return toDateInputValue(todayDate());
}

function addDays(days: number) {
  const date = todayDate();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getBoardPostLabel(boardName?: string) {
  if (boardName === "Internships") return "Post internship";
  if (boardName === "Part-time") return "Post work";
  if (boardName === "Sports") return "Post event";
  if (boardName === "Social") return "Post social update";
  if (boardName === "Dev Club") return "Post club update";

  return "Post update";
}

export default function CreateListingSheet({
  initialType = "housing",
  boardName,
  lockType = false,
  onClose,
  onCreated,
}: CreateListingSheetProps) {
  const [type, setType] = useState<CreateFlowType>(initialType);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [maintenance, setMaintenance] = useState("");

  const [roomType, setRoomType] = useState<HousingRoomType>("roommate");
  const [furnishing, setFurnishing] =
    useState<HousingFurnishing>("Unfurnished");
  const [preferTenants, setPreferTenants] =
    useState<HousingTenantPreference>("both");
  const [availableFrom, setAvailableFrom] = useState(today());

  const [marketCategory, setMarketCategory] =
    useState<MarketCategory>("Essentials");
  const [condition, setCondition] = useState<MarketCondition>("Good");
  const [isNegotiable, setIsNegotiable] = useState(true);

  const [location, setLocation] = useState("KJU Campus");
  const [tags, setTags] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { user, signIn } = useAuth();

  const priceLabel = useMemo(() => {
    if (type === "housing") return "Monthly rent";
    if (type === "market") return "Selling price";
    return "Amount (optional)";
  }, [type]);

  const submit = async () => {
    setError("");

    if (!user) {
      await signIn().catch(() => null);
      return;
    }

    setBusy(true);

    try {
      let id = "";

      if (type === "housing") {
        id = await createListing({
          type: "housing",
          title,
          description,
          rent: Number(price),
          deposit: Number(deposit || 0),
          maintenance: Number(maintenance || 0),
          roomType,
          furnishing,
          preferTenants,
          availableFrom,
        });
      } else if (type === "market") {
        id = await createListing({
          type: "market",
          title,
          description,
          price: Number(price),
          category: marketCategory,
          condition,
          isNegotiable,
        });
      } else {
        const boardId = boardNameToId(boardName || "general");

        id = await createBoardPost({
          boardId,
          title,
          description,
          type: boardIdToType(boardId),
          price: Number(price || 0),
          location,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        });
      }

      onCreated?.(id, type);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create post.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[90] bg-black/70 flex items-end animate-fade-in">
      <button className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full rounded-t-[30px] bg-cx-card-elevated border-t border-white/[0.08] p-5 animate-slide-up max-h-[86%] overflow-y-auto">
        <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[22px] font-semibold text-cx-text tracking-[-0.04em]">
              {type === "board" ? getBoardPostLabel(boardName) : "Create post"}
            </h3>

            <p className="text-[11px] text-cx-text-muted mt-1">
              {type === "board"
                ? `Posting to ${boardName}`
                : type === "housing"
                  ? "Post a room, PG or roommate lead."
                  : "Sell furniture, books or essentials."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full glass flex items-center justify-center"
          >
            <X size={17} className="text-cx-text-secondary" />
          </button>
        </div>

        {!lockType && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <TypeButton
              active={type === "housing"}
              icon="homeRent"
              title="Housing"
              subtitle="Room / PG / roommate"
              onClick={() => setType("housing")}
              tone="amber"
            />

            <TypeButton
              active={type === "market"}
              icon="sofa"
              title="Essentials"
              subtitle="Furniture, books & more"
              onClick={() => setType("market")}
              tone="pink"
            />
          </div>
        )}

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "housing"
                ? "e.g. 1BHK near Kothanur"
                : type === "market"
                  ? "e.g. Study table + chair"
                  : "e.g. Hackathon this weekend"
            }
            className="w-full input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted"
          />

          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder={priceLabel}
            className="w-full input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted"
          />

          {type === "housing" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  inputMode="numeric"
                  placeholder="Deposit"
                  className="input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted"
                />

                <input
                  value={maintenance}
                  onChange={(e) => setMaintenance(e.target.value)}
                  inputMode="numeric"
                  placeholder="Maintenance"
                  className="input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted"
                />
              </div>

              <OptionGrid
                label="Room type"
                value={roomType}
                options={roomTypes}
                onChange={(value) => setRoomType(value as HousingRoomType)}
              />

              <OptionGrid
                label="Furnishing"
                value={furnishing}
                options={furnishings}
                onChange={(value) =>
                  setFurnishing(value as HousingFurnishing)
                }
              />

              <div>
                <p className="text-[10px] text-cx-text-muted mb-2 uppercase tracking-wider">
                  Preference
                </p>

                <div className="grid grid-cols-4 gap-1.5">
                  {tenantPrefs.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setPreferTenants(item.value)}
                      className={`rounded-xl py-2 text-[10px] border transition-all ${
                        preferTenants === item.value
                          ? "bg-cx-purple text-white border-cx-purple"
                          : "border-white/[0.06] text-cx-text-muted bg-white/[0.02]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-cx-text-muted mb-2 uppercase tracking-wider">
                  Available from
                </p>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <p className="text-[13px] font-medium text-cx-text mb-3">
                    {formatDateLabel(availableFrom)}
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setAvailableFrom(today())}
                      className="rounded-xl py-2 text-[10px] border border-white/[0.06] text-cx-text-secondary"
                    >
                      Today
                    </button>

                    <button
                      onClick={() => setAvailableFrom(addDays(7))}
                      className="rounded-xl py-2 text-[10px] border border-white/[0.06] text-cx-text-secondary"
                    >
                      +7 days
                    </button>

                    <button
                      onClick={() => setAvailableFrom(addDays(30))}
                      className="rounded-xl py-2 text-[10px] border border-white/[0.06] text-cx-text-secondary"
                    >
                      +30 days
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : type === "market" ? (
            <>
              <OptionGrid
                label="Category"
                value={marketCategory}
                options={marketCategories}
                onChange={(value) => setMarketCategory(value as MarketCategory)}
              />

              <OptionGrid
                label="Condition"
                value={condition}
                options={conditions}
                onChange={(value) => setCondition(value as MarketCondition)}
              />

              <button
                onClick={() => setIsNegotiable((current) => !current)}
                className={`w-full rounded-2xl px-4 py-3 text-left border transition-all ${
                  isNegotiable
                    ? "border-cx-lime/20 bg-cx-lime/[0.04] text-cx-lime"
                    : "border-white/[0.06] text-cx-text-muted bg-white/[0.02]"
                }`}
              >
                <span className="text-[12px] font-semibold">
                  {isNegotiable ? "Negotiable" : "Fixed price"}
                </span>
              </button>
            </>
          ) : (
            <>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="w-full input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted"
              />

              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags separated by comma"
                className="w-full input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted"
              />
            </>
          )}

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, condition, location, availability..."
            className="w-full min-h-[110px] input-premium rounded-2xl px-4 py-3 text-[13px] text-cx-text placeholder:text-cx-text-muted resize-none"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-cx-amber/15 bg-cx-amber/[0.035] p-3">
          <p className="text-[10px] text-cx-text-muted leading-relaxed">
            Location currently defaults to KJU for housing/essentials. Next pass
            adds map picker and Supabase image upload.
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

function TypeButton({
  active,
  icon,
  title,
  subtitle,
  onClick,
  tone,
}: {
  active: boolean;
  icon: "homeRent" | "sofa";
  title: string;
  subtitle: string;
  onClick: () => void;
  tone: "amber" | "pink";
}) {
  const activeClass =
    tone === "amber"
      ? "border-cx-amber/35 bg-cx-amber/[0.08]"
      : "border-cx-pink/35 bg-cx-pink/[0.08]";

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl p-3 text-left border transition-all ${
        active ? activeClass : "border-white/[0.06] bg-white/[0.025]"
      }`}
    >
      <AppIcon name={icon} size={34} />

      <p className="text-[12px] font-semibold text-cx-text mt-2">{title}</p>

      <p className="text-[9px] text-cx-text-muted">{subtitle}</p>
    </button>
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
            className={`rounded-xl px-3 py-2.5 text-[11px] text-left border transition-all ${
              value === option
                ? "bg-cx-purple text-white border-cx-purple"
                : "border-white/[0.06] text-cx-text-muted bg-white/[0.02]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}