import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  IndianRupee,
  Info,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  createHousingListing,
  HousingFurnishing,
  HousingListing,
  HousingRoomType,
  HousingTenantPreference,
  ListingDurationDays,
  updateHousingListing,
} from "../../services/housingService";
import {
  createMarketListing,
  MarketListing,
  updateMarketListing,
} from "../../services/marketService";
import { uploadMultipleImages } from "../../services/storageService";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { getVehicleRouteFromKju } from "../../utils/location";
import LocationSelector from "./LocationSelector";

interface ListingFormProps {
  type: "housing" | "market";
  onClose: () => void;
  onSuccess: () => void;
  existingListing?: HousingListing | MarketListing | null;
}

interface ListingFormData {
  title: string;
  roomType: HousingRoomType;
  category: "Furniture" | "Electronics" | "Books" | "Essentials" | "Other";
  rent: string;
  price: string;
  deposit: string;
  maintenance: string;
  restrictions: string;
  reasonForSelling: string;
  furnishing: HousingFurnishing;
  preferTenants: HousingTenantPreference;
  availableFrom: string;
  durationDays: ListingDurationDays;
  isNegotiable: boolean;
  location: string;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
  googleMapsUrl: string;
  distance: string;
  distanceFromCollegeKm: number;
  distanceLabel: string;
  travelDistanceMeters: number;
  travelDistanceLabel: string;
  travelDurationLabel: string;
  condition: "New" | "Like New" | "Good" | "Fair";
  description: string;
}

type OptionItem<T extends string> = {
  value: T;
  label: string;
  helper?: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialFormData: ListingFormData = {
  title: "",
  roomType: "roommate",
  category: "Furniture",
  rent: "",
  price: "",
  deposit: "",
  maintenance: "",
  restrictions: "",
  reasonForSelling: "",
  furnishing: "Unfurnished",
  preferTenants: "both",
  availableFrom: today,
  durationDays: 30,
  isNegotiable: false,
  location: "",
  latitude: null,
  longitude: null,
  formattedAddress: "",
  googleMapsUrl: "",
  distance: "",
  distanceFromCollegeKm: 0,
  distanceLabel: "",
  travelDistanceMeters: 0,
  travelDistanceLabel: "",
  travelDurationLabel: "",
  condition: "Good",
  description: "",
};

const housingRoomOptions: OptionItem<HousingRoomType>[] = [
  { value: "roommate", label: "Roommate", helper: "Shared room / flatmate" },
  { value: "1RK", label: "1RK", helper: "Room + kitchen" },
  { value: "1BHK", label: "1BHK", helper: "Bedroom, hall, kitchen" },
  { value: "2BHK", label: "2BHK", helper: "Two bedroom flat" },
  { value: "3BHK", label: "3BHK", helper: "Three bedroom flat" },
  { value: "PG", label: "PG", helper: "Paying guest accommodation" },
];

const tenantOptions: OptionItem<HousingTenantPreference>[] = [
  { value: "girls_only", label: "Girls only" },
  { value: "boys_only", label: "Boys only" },
  { value: "both", label: "Both" },
  { value: "couples", label: "Couples allowed" },
];

const furnishingOptions: OptionItem<HousingFurnishing>[] = [
  { value: "Unfurnished", label: "Unfurnished" },
  { value: "Semi-furnished", label: "Semi-furnished" },
  { value: "Fully-furnished", label: "Fully-furnished" },
];

const marketCategoryOptions: OptionItem<ListingFormData["category"]>[] = [
  { value: "Furniture", label: "Furniture" },
  { value: "Electronics", label: "Electronics" },
  { value: "Books", label: "Books" },
  { value: "Essentials", label: "Essentials" },
  { value: "Other", label: "Other" },
];

const conditionOptions: OptionItem<ListingFormData["condition"]>[] = [
  { value: "New", label: "New" },
  { value: "Like New", label: "Like New" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
];

function removeUndefined<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as T;
}

function OptionSheet<T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T;
  options: OptionItem<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-[30px] border border-white/10 bg-white/[0.04] px-6 py-5 text-left transition-transform duration-150 ease-out hover:border-kjc-accent/30 active:scale-[0.98]"
      >
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-black uppercase tracking-[0.18em] text-white">
            {selected?.label || "Select"}
          </span>

          {selected?.helper && (
            <span className="mt-1 block truncate text-[10px] font-bold text-white/35">
              {selected.helper}
            </span>
          )}
        </span>

        <ChevronRight size={17} className="rotate-90 text-white/35" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[240] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/80"
            aria-label={`Close ${title}`}
          />

          <div className="relative w-full max-w-md rounded-t-[38px] border border-white/10 bg-black p-6 shadow-pro-lg sm:rounded-[38px]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
                  Select
                </p>
                <h3 className="mt-1 text-2xl pro-heading tracking-tighter">
                  {title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white/45"
              >
                <X size={22} />
              </button>
            </div>

            <div className="grid gap-3">
              {options.map((option) => {
                const active = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-[26px] border px-5 py-4 text-left transition-transform duration-150 ease-out active:scale-[0.98] ${
                      active
                        ? "border-kjc-accent bg-kjc-accent/15 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/70"
                    }`}
                  >
                    <span>
                      <span className="block text-[11px] font-black uppercase tracking-[0.18em]">
                        {option.label}
                      </span>

                      {option.helper && (
                        <span className="mt-1 block text-[10px] font-bold text-white/35">
                          {option.helper}
                        </span>
                      )}
                    </span>

                    {active && <Check size={18} className="text-kjc-accent" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ListingForm({
  type,
  onClose,
  onSuccess,
  existingListing,
}: ListingFormProps) {
  const { user } = useAuth();
  const isEditing = Boolean(existingListing?.id);

  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [formData, setFormData] = useState<ListingFormData>(initialFormData);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalImageCount = existingPhotos.length + selectedImages.length;

  const titleCopy = useMemo(() => {
    if (isEditing) return type === "housing" ? "Edit room" : "Edit item";
    return type === "housing" ? "Post room" : "List item";
  }, [isEditing, type]);

  useEffect(() => {
    if (!existingListing) {
      setFormData(initialFormData);
      setExistingPhotos([]);
      setSelectedImages([]);
      setImagePreviews([]);
      return;
    }

    if (type === "housing") {
      const listing = existingListing as HousingListing;

      setFormData({
        ...initialFormData,
        title: listing.title || "",
        description: listing.description || "",
        roomType: listing.roomType || "roommate",
        rent: listing.rent ? String(listing.rent) : "",
        deposit: listing.deposit ? String(listing.deposit) : "",
        maintenance: listing.maintenance ? String(listing.maintenance) : "",
        restrictions: listing.restrictions || "",
        furnishing: listing.furnishing || "Unfurnished",
        preferTenants: listing.preferTenants || "both",
        availableFrom: listing.availableFrom || today,
        durationDays: listing.durationDays || 30,
        location: listing.location || "",
        latitude: listing.latitude ?? null,
        longitude: listing.longitude ?? null,
        formattedAddress: listing.formattedAddress || listing.location || "",
        googleMapsUrl: listing.googleMapsUrl || "",
        distance: listing.travelDistanceLabel || listing.distance || "",
        distanceFromCollegeKm: listing.distanceFromCollegeKm || 0,
        distanceLabel:
          listing.travelDistanceLabel ||
          listing.distanceLabel ||
          listing.distance ||
          "",
        travelDistanceMeters: listing.travelDistanceMeters || 0,
        travelDistanceLabel:
          listing.travelDistanceLabel ||
          listing.distanceLabel ||
          listing.distance ||
          "",
        travelDurationLabel: listing.travelDurationLabel || "",
      });
    } else {
      const listing = existingListing as MarketListing;

      setFormData({
        ...initialFormData,
        title: listing.title || "",
        description: listing.description || "",
        category: listing.category || "Furniture",
        price: listing.price ? String(listing.price) : "",
        isNegotiable: Boolean(listing.isNegotiable),
        reasonForSelling: listing.reasonForSelling || "",
        condition: listing.condition || "Good",
        durationDays: listing.durationDays || 30,
        latitude: listing.latitude ?? null,
        longitude: listing.longitude ?? null,
        formattedAddress: listing.formattedAddress || "",
        location: listing.formattedAddress?.split(",")[0]?.trim() || "",
      });
    }

    setExistingPhotos(existingListing.photos || []);
    setSelectedImages([]);
    setImagePreviews([]);
  }, [existingListing, type]);

  const updateField = <K extends keyof ListingFormData>(
    key: K,
    value: ListingFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (totalImageCount + files.length > 5) {
      alert("Maximum 5 images allowed.");
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not a valid image file.`);
        return false;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} exceeds 5MB size limit.`);
        return false;
      }

      return true;
    });

    setSelectedImages((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };

      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeNewImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setImagePreviews((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleLocationSelect = async (loc: {
    address: string;
    lat: number;
    lng: number;
    googleMapsUrl?: string;
  }) => {
    setUploadStatus("Calculating KJU travel distance...");

    try {
      const route = await getVehicleRouteFromKju(loc.lat, loc.lng);

      setFormData((prev) => ({
        ...prev,
        formattedAddress: loc.address,
        latitude: loc.lat,
        longitude: loc.lng,
        googleMapsUrl: loc.googleMapsUrl || prev.googleMapsUrl,
        distanceFromCollegeKm: route.travelDistanceMeters / 1000,
        distanceLabel: route.travelDistanceLabel,
        distance: route.travelDistanceLabel,
        travelDistanceMeters: route.travelDistanceMeters,
        travelDistanceLabel: route.travelDistanceLabel,
        travelDurationLabel: route.travelDurationLabel,
        location: loc.address.split(",")[0]?.trim() || loc.address,
      }));
    } catch (error) {
      console.error("Travel distance failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Could not calculate travel distance from KJU."
      );
    } finally {
      setUploadStatus("");
    }
  };

  const validateForm = () => {
    if (!user) return "Please sign in before saving a listing.";
    if (!formData.title.trim()) return "Please enter a title.";
    if (!formData.description.trim()) return "Please enter a description.";

    if (formData.latitude === null || formData.longitude === null) {
      return "Please select or paste a valid location.";
    }

    if (type === "housing" && !formData.travelDistanceLabel) {
      return "Please wait for KJU travel distance to calculate.";
    }

    if (type === "housing") {
      const rent = Number(formData.rent);
      if (!rent || rent <= 0) return "Please enter a valid monthly rent.";
    }

    if (type === "market") {
      const price = Number(formData.price);
      if (!price || price <= 0) return "Please enter a valid item price.";
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      alert(validationError);
      return;
    }

    if (!user || formData.latitude === null || formData.longitude === null) return;

    setLoading(true);
    setUploadStatus("");

    try {
      let newPhotoURLs: string[] = [];

      if (selectedImages.length > 0) {
        const folder = type === "housing" ? "housing" : "marketplace";

        newPhotoURLs = await uploadMultipleImages(selectedImages, folder, (progress) => {
          if (progress.stage === "preparing") {
            setUploadStatus("Preparing images...");
            return;
          }

          if (progress.stage === "compressing") {
            setUploadStatus(`Optimizing image ${progress.current}/${progress.total}...`);
            return;
          }

          if (progress.stage === "uploading") {
            setUploadStatus(`Uploading image ${progress.current}/${progress.total}...`);
            return;
          }

          if (progress.stage === "done") {
            setUploadStatus(`Uploaded image ${progress.current}/${progress.total}`);
          }
        });
      }

      const photos = [...existingPhotos, ...newPhotoURLs];

      setUploadStatus(isEditing ? "Saving changes..." : "Saving listing...");

      if (type === "housing") {
        const rent = Number(formData.rent);
        const deposit = Number(formData.deposit) || rent * 2;

        const payload = removeUndefined({
          title: formData.title.trim(),
          description: formData.description.trim(),
          roomType: formData.roomType,
          rent,
          deposit,
          maintenance: Number(formData.maintenance) || 0,
          restrictions: formData.restrictions.trim(),
          furnishing: formData.furnishing,
          preferTenants: formData.preferTenants,
          availableFrom: formData.availableFrom || today,
          durationDays: formData.durationDays,
          location:
            formData.location ||
            formData.formattedAddress.split(",")[0]?.trim() ||
            "Near KJU",
          latitude: formData.latitude,
          longitude: formData.longitude,
          formattedAddress: formData.formattedAddress,
          googleMapsUrl: formData.googleMapsUrl,
          distanceFromCollegeKm: formData.distanceFromCollegeKm,
          distanceLabel: formData.travelDistanceLabel,
          distance: formData.travelDistanceLabel || "Near KJU",
          travelDistanceMeters: formData.travelDistanceMeters,
          travelDistanceLabel: formData.travelDistanceLabel,
          travelDurationLabel: formData.travelDurationLabel,
          genderPreference: "none" as const,
          amenities: [],
          photos,
          status: "available" as const,
          viewsCount: isEditing ? undefined : 0,
          uniqueViewersCount: isEditing ? undefined : 0,
          chatStartedCount: isEditing ? undefined : 0,
        });

        if (isEditing && existingListing) {
          await updateHousingListing(existingListing.id, payload);
        } else {
          await createHousingListing({
            ...payload,
            postedBy: user.uid,
          });
        }
      } else {
        const payload = removeUndefined({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          price: Number(formData.price),
          isNegotiable: formData.isNegotiable,
          reasonForSelling: formData.reasonForSelling.trim(),
          condition: formData.condition,
          latitude: formData.latitude,
          longitude: formData.longitude,
          formattedAddress: formData.formattedAddress,
          durationDays: formData.durationDays,
          photos,
          status: "available" as const,
          viewsCount: isEditing ? undefined : 0,
          uniqueViewersCount: isEditing ? undefined : 0,
          chatStartedCount: isEditing ? undefined : 0,
        });

        if (isEditing && existingListing) {
          await updateMarketListing(existingListing.id, payload);
        } else {
          await createMarketListing({
            ...payload,
            postedBy: user.uid,
          });
        }
      }

      setUploadStatus(isEditing ? "Changes saved" : "Posted successfully");
      onSuccess();
    } catch (error) {
      console.error("Listing save failed:", error);

      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error);

      alert(message || "Failed to save listing.");
    } finally {
      setLoading(false);
      setUploadStatus("");
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[44px] border border-white/10 bg-black p-8 shadow-pro-lg scrollbar-hide sm:p-10"
      >
        <div className="sticky top-0 z-20 mb-8 flex items-center justify-between bg-black/90 pb-4">
          <div className="flex flex-col">
            <h2 className="text-4xl pro-heading tracking-tighter">
              {titleCopy.split(" ")[0]}{" "}
              <span className="text-kjc-accent italic">
                {titleCopy.split(" ").slice(1).join(" ")}
              </span>
            </h2>

            <div className="mt-3 flex gap-2.5">
              <span className="rounded-full border border-white/5 bg-white/5 px-4 py-2 text-[8px] font-black uppercase tracking-[0.25em] text-white/40">
                {isEditing ? "Owner edit" : "Exclusively KJU"}
              </span>

              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                <ShieldCheck size={10} className="text-emerald-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">
                  Campus verified
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!loading) onClose();
            }}
            disabled={loading}
            className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-white/25 transition-transform duration-150 ease-out hover:text-white active:scale-[0.97] disabled:opacity-40"
          >
            <X size={24} />
          </button>
        </div>

        <div className="relative mb-8 overflow-hidden rounded-[32px] border border-white/5 bg-white/5 p-6">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-10 translate-x-10 rounded-full bg-kjc-accent/10 blur-3xl" />

          <div className="relative z-10 flex items-start gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-kjc-accent/30 bg-kjc-accent/20 text-kjc-accent shadow-lg shadow-kjc-accent/10">
              <Info size={24} strokeWidth={2.5} />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/80">
                {isEditing ? "Update carefully" : "Listing trust"}
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase leading-relaxed tracking-wider text-white/35">
                {isEditing
                  ? "Changes are visible immediately after saving."
                  : "Your post is linked to your CampusX profile."}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 pb-4">
          <div className="space-y-4">
            <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
              Title
            </label>

            <input
              required
              value={formData.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder={
                type === "housing"
                  ? "1RK near Gate 1, roommate needed..."
                  : "Study table, fridge, books..."
              }
              className="input-pro"
            />
          </div>

          <div className="space-y-4">
            <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
              Details
            </label>

            <textarea
              required
              value={formData.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder={
                type === "housing"
                  ? "Rent details, amenities, nearby landmark, move-in terms..."
                  : "Condition, reason for sale, pickup location..."
              }
              rows={4}
              className="input-pro resize-none py-6 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-4">
              <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
                {type === "housing" ? "Room type" : "Category"}
              </label>

              {type === "housing" ? (
                <OptionSheet
                  title="Room type"
                  value={formData.roomType}
                  options={housingRoomOptions}
                  onChange={(value) => updateField("roomType", value)}
                />
              ) : (
                <OptionSheet
                  title="Category"
                  value={formData.category}
                  options={marketCategoryOptions}
                  onChange={(value) => updateField("category", value)}
                />
              )}
            </div>

            <div className="space-y-4">
              <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
                {type === "housing" ? "Rent" : "Price"}
              </label>

              <div className="relative">
                <IndianRupee
                  size={16}
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-kjc-accent"
                />

                <input
                  required
                  type="number"
                  min={1}
                  value={type === "housing" ? formData.rent : formData.price}
                  onChange={(event) => {
                    if (type === "housing") {
                      updateField("rent", event.target.value);
                    } else {
                      updateField("price", event.target.value);
                    }
                  }}
                  className="input-pro pl-12 font-display text-lg font-black"
                />
              </div>
            </div>
          </div>

          {type === "housing" && (
            <>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-4">
                  <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
                    Deposit
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={formData.deposit}
                    onChange={(event) => updateField("deposit", event.target.value)}
                    placeholder="Optional"
                    className="input-pro"
                  />
                </div>

                <div className="space-y-4">
                  <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
                    Maintenance
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={formData.maintenance}
                    onChange={(event) => updateField("maintenance", event.target.value)}
                    placeholder="Optional"
                    className="input-pro"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-4">
                  <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
                    Furnishing
                  </label>

                  <OptionSheet
                    title="Furnishing"
                    value={formData.furnishing}
                    options={furnishingOptions}
                    onChange={(value) => updateField("furnishing", value)}
                  />
                </div>

                <div className="space-y-4">
                  <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
                    Preference
                  </label>

                  <OptionSheet
                    title="Tenant preference"
                    value={formData.preferTenants}
                    options={tenantOptions}
                    onChange={(value) => updateField("preferTenants", value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
                  Available from
                </label>

                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="absolute left-6 top-1/2 -translate-y-1/2 text-kjc-accent"
                  />

                  <input
                    type="date"
                    min={today}
                    value={formData.availableFrom}
                    onChange={(event) => updateField("availableFrom", event.target.value)}
                    className="input-pro pl-14"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
                  Restrictions optional
                </label>

                <textarea
                  value={formData.restrictions}
                  onChange={(event) => updateField("restrictions", event.target.value)}
                  rows={3}
                  placeholder="Example: No smoking, no loud parties, cooking allowed..."
                  className="input-pro resize-none py-5 leading-relaxed"
                />
              </div>
            </>
          )}

          {type === "market" && (
            <div className="space-y-4">
              <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
                Condition
              </label>

              <OptionSheet
                title="Condition"
                value={formData.condition}
                options={conditionOptions}
                onChange={(value) => updateField("condition", value)}
              />
            </div>
          )}

          <div className="space-y-4">
            <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
              Listing duration
            </label>

            <div className="grid grid-cols-2 gap-3">
              {[15, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => updateField("durationDays", days as ListingDurationDays)}
                  className={`rounded-[26px] border px-5 py-5 text-[10px] font-black uppercase tracking-[0.22em] transition-transform duration-150 ease-out active:scale-[0.98] ${
                    formData.durationDays === days
                      ? "border-kjc-accent bg-kjc-accent/15 text-white"
                      : "border-white/10 bg-white/[0.04] text-white/45"
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>

            <p className="px-2 text-[10px] font-bold leading-relaxed text-white/35">
              After expiry, your post is hidden from public feed. You can renew it from My posts.
              Photos are cleaned later to save storage.
            </p>
          </div>

          <div className="space-y-4">
            <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
              Add location
            </label>

            <div className="rounded-[32px] border border-white/5 bg-white/[0.03] p-2">
              <LocationSelector
                onLocationSelect={handleLocationSelect}
                initialAddress={formData.formattedAddress}
                initialLat={formData.latitude ?? undefined}
                initialLng={formData.longitude ?? undefined}
              />
            </div>

            {formData.travelDistanceLabel && (
              <div className="rounded-[24px] border border-kjc-accent/20 bg-kjc-accent/10 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-kjc-accent">
                  {formData.travelDistanceLabel} from KJU by road
                </p>

                {formData.travelDurationLabel && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                    {formData.travelDurationLabel}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="pl-4 text-[10px] font-black uppercase tracking-[0.35em] text-white/25">
              Photos
            </label>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageSelect}
              disabled={loading || totalImageCount >= 5}
              className="hidden"
            />

            {totalImageCount === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="group flex h-32 w-full flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-white/10 bg-white/5 text-white/25 transition-transform duration-150 ease-out hover:border-kjc-accent/30 hover:bg-white/[0.08] hover:text-kjc-accent active:scale-[0.98] disabled:opacity-50"
              >
                <Camera size={40} strokeWidth={1} className="mb-2" />
                <span className="text-[9px] font-black uppercase tracking-[0.35em]">
                  Add photos
                </span>
                <span className="mt-1 text-[8px] text-white/35">
                  Max 5 images, 5MB each
                </span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {existingPhotos.map((photo, index) => (
                    <div
                      key={photo}
                      className="group relative overflow-hidden rounded-[20px] border border-white/10 bg-white/5"
                    >
                      <img
                        src={photo}
                        alt={`Existing ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(index)}
                        disabled={loading}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                      >
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>
                  ))}

                  {imagePreviews.map((preview, index) => (
                    <div
                      key={preview}
                      className="group relative overflow-hidden rounded-[20px] border border-white/10 bg-white/5"
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        disabled={loading}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                      >
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>
                  ))}

                  {totalImageCount < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="flex h-32 items-center justify-center rounded-[20px] border-2 border-dashed border-white/10 bg-white/5 text-white/25 transition-transform duration-150 ease-out hover:border-kjc-accent/30 hover:bg-white/[0.08] hover:text-kjc-accent active:scale-[0.98] disabled:opacity-50"
                    >
                      <Camera size={24} strokeWidth={1} />
                    </button>
                  )}
                </div>

                <div className="pl-4 text-[9px] text-white/40">
                  {totalImageCount} of 5 images selected
                </div>
              </div>
            )}
          </div>

          {uploadStatus && (
            <p className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
              {uploadStatus}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-[36px] bg-kjc-accent py-7 text-[10px] font-black uppercase tracking-[0.35em] text-white shadow-[0_20px_50px_rgba(139,92,246,0.2)] transition-transform duration-150 ease-out hover:bg-kjc-accent/90 active:scale-[0.98] disabled:opacity-40 disabled:grayscale"
          >
            {loading
              ? isEditing
                ? "Saving..."
                : "Posting..."
              : isEditing
                ? "Save Changes"
                : "Post Listing"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}