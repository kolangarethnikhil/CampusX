import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import {
  CampusRole,
  CommunityIntent,
  DiscoverySource,
  GenderOption,
  useAuth,
} from "../../contexts/AuthContext";

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onComplete?: () => void | Promise<void>;
  canClose?: boolean;
}

const genderOptions: { value: GenderOption; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const discoveryOptions: { value: DiscoverySource; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "friends", label: "Recommended by friends" },
  { value: "whatsapp", label: "WhatsApp group" },
  { value: "college", label: "College circle" },
  { value: "other", label: "Other" },
];

const intentOptions: { value: CommunityIntent; label: string }[] = [
  { value: "explore", label: "Explore CampusX" },
  { value: "utility", label: "Find rooms/items" },
  { value: "business", label: "Offer useful services" },
  { value: "other", label: "Other" },
];

export default function ProfileCompletionModal({
  isOpen,
  onClose,
  onComplete,
  canClose = false,
}: ProfileCompletionModalProps) {
  const { profile, updateProfile, isKjcEmail } = useAuth();
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [campusRole, setCampusRole] = useState<CampusRole>("Campus Community");
  const [gender, setGender] = useState<GenderOption>("prefer_not_to_say");
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [discoverySource, setDiscoverySource] =
    useState<DiscoverySource>("friends");
  const [communityIntent, setCommunityIntent] =
    useState<CommunityIntent>("utility");

  useEffect(() => {
    if (!profile || !isOpen) return;

    setDisplayName(profile.displayName || "");
    setCampusRole(isKjcEmail ? "Student" : profile.campusRole || "Campus Community");
    setGender(profile.gender || "prefer_not_to_say");
    setCourse(profile.course || "");
    setBatch(profile.batch || "");
    setCurrentLocation(profile.currentLocation || profile.hometown || "");
    setDiscoverySource(profile.discoverySource || "friends");
    setCommunityIntent(profile.communityIntent || "utility");
  }, [profile, isOpen, isKjcEmail]);

  if (!isOpen || !profile) return null;

  const requiresAcademicInfo =
    campusRole === "Student" || campusRole === "Alumni";

  const validate = () => {
    if (!displayName.trim()) return "Please enter your name.";
    if (!currentLocation.trim()) return "Please enter your hometown/current location.";
    if (requiresAcademicInfo && !course.trim()) return "Please enter your course.";
    if (requiresAcademicInfo && !batch.trim()) return "Please enter your batch year.";
    return null;
  };

  const handleSave = async () => {
    const error = validate();

    if (error) {
      alert(error);
      return;
    }

    setSaving(true);

    try {
      await updateProfile({
        displayName: displayName.trim(),
        campusRole,
        gender,
        course: requiresAcademicInfo ? course.trim() : "",
        batch: requiresAcademicInfo ? batch.trim() : "",
        currentLocation: currentLocation.trim(),
        hometown: currentLocation.trim(),
        discoverySource,
        communityIntent:
          campusRole === "Campus Community" ? communityIntent : undefined,
        profileCompleted: true,
      });

      await onComplete?.();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        onClick={() => {
          if (canClose) onClose?.();
        }}
        className="absolute inset-0 bg-black/85"
        aria-label="Close profile completion"
      />

      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[44px] border border-white/10 bg-black p-8 shadow-pro-lg scrollbar-hide sm:rounded-[44px]">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-kjc-accent">
              One-time setup
            </p>
            <h2 className="mt-2 text-4xl pro-heading tracking-tighter">
              Complete <span className="text-kjc-accent italic">profile</span>
            </h2>
            <p className="mt-3 text-xs font-bold leading-relaxed text-white/40">
              This helps keep CampusX trusted before posting or messaging.
            </p>
          </div>

          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white/45"
            >
              <X size={22} />
            </button>
          )}
        </div>

        <div className="space-y-6">
          <Field label="Name">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your display name"
              className="input-pro"
            />
          </Field>

          <Field label="I am">
            <div className="grid grid-cols-2 gap-3">
              {(isKjcEmail
                ? [{ value: "Student" as CampusRole, label: "Student" }]
                : [
                    { value: "Alumni" as CampusRole, label: "Alumni" },
                    {
                      value: "Campus Community" as CampusRole,
                      label: "Campus Community",
                    },
                  ]
              ).map((option) => (
                <OptionButton
                  key={option.value}
                  active={campusRole === option.value}
                  onClick={() => setCampusRole(option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          </Field>

          <Field label="Gender">
            <div className="grid gap-3">
              {genderOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={gender === option.value}
                  onClick={() => setGender(option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          </Field>

          {requiresAcademicInfo && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Course">
                <input
                  value={course}
                  onChange={(event) => setCourse(event.target.value)}
                  placeholder="BCA, MBA..."
                  className="input-pro"
                />
              </Field>

              <Field label="Batch">
                <input
                  value={batch}
                  onChange={(event) => setBatch(event.target.value)}
                  placeholder="2026"
                  className="input-pro"
                />
              </Field>
            </div>
          )}

          <Field label="Hometown / current location">
            <input
              value={currentLocation}
              onChange={(event) => setCurrentLocation(event.target.value)}
              placeholder="Bengaluru, Kerala..."
              className="input-pro"
            />
          </Field>

          {campusRole === "Campus Community" && (
            <Field label="Purpose">
              <div className="grid gap-3">
                {intentOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    active={communityIntent === option.value}
                    onClick={() => setCommunityIntent(option.value)}
                  >
                    {option.label}
                  </OptionButton>
                ))}
              </div>
            </Field>
          )}

          <Field label="How did you discover CampusX?">
            <div className="grid gap-3">
              {discoveryOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={discoverySource === option.value}
                  onClick={() => setDiscoverySource(option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          </Field>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-[32px] bg-kjc-accent py-6 text-[10px] font-black uppercase tracking-[0.3em] text-white transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <label className="pl-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
        {label}
      </label>
      {children}
    </div>
  );
}

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-[24px] border px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.16em] transition-transform duration-150 ease-out active:scale-[0.98] ${
        active
          ? "border-kjc-accent bg-kjc-accent/15 text-white"
          : "border-white/10 bg-white/[0.04] text-white/55"
      }`}
    >
      {children}
      {active && <Check size={16} className="text-kjc-accent" />}
    </button>
  );
}