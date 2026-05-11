import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Camera,
  ChevronRight,
  IndianRupee,
  Info,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  createHousingListing,
  HousingListing,
  updateHousingListing,
} from "../../services/housingService";
import {
  createMarketListing,
  MarketListing,
  updateMarketListing,
} from "../../services/marketService";
import { uploadMultipleImages } from "../../services/storageService";
import { useAuth } from "../../contexts/AuthContext";
import { getDistanceFromKjuKm, getDistanceLabel } from "../../utils/location";
import LocationSelector from "./LocationSelector";

interface ListingFormProps {
  type: "housing" | "market";
  onClose: () => void;
  onSuccess: () => void;
  existingListing?: HousingListing | MarketListing | null;
}

interface ListingFormData {
  title: string;
  roomType: "single" | "shared" | "1BHK" | "2BHK" | "PG";
  category: "Furniture" | "Electronics" | "Books" | "Essentials" | "Other";
  rent: string;
  price: string;
  deposit: string;
  maintenance: string;
  reasonForSelling: string;
  furnishing: "Unfurnished" | "Semi-furnished" | "Fully-furnished";
  preferTenants: "Any" | "Bachelors" | "Girls Only" | "Boys Only";
  isNegotiable: boolean;
  location: string;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
  googleMapsUrl: string;
  distance: string;
  distanceFromCollegeKm: number;
  distanceLabel: string;
  condition: "New" | "Like New" | "Good" | "Fair";
  description: string;
}

const initialFormData: ListingFormData = {
  title: "",
  roomType: "single",
  category: "Furniture",
  rent: "",
  price: "",
  deposit: "",
  maintenance: "",
  reasonForSelling: "",
  furnishing: "Unfurnished",
  preferTenants: "Any",
  isNegotiable: false,
  location: "",
  latitude: null,
  longitude: null,
  formattedAddress: "",
  googleMapsUrl: "",
  distance: "",
  distanceFromCollegeKm: 0,
  distanceLabel: "",
  condition: "Good",
  description: "",
};

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
        roomType: listing.roomType || "single",
        rent: listing.rent ? String(listing.rent) : "",
        deposit: listing.deposit ? String(listing.deposit) : "",
        maintenance: listing.maintenance ? String(listing.maintenance) : "",
        furnishing: listing.furnishing || "Unfurnished",
        preferTenants: listing.preferTenants || "Any",
        location: listing.location || "",
        latitude: listing.latitude ?? null,
        longitude: listing.longitude ?? null,
        formattedAddress: listing.formattedAddress || listing.location || "",
        googleMapsUrl: listing.googleMapsUrl || "",
        distance: listing.distance || "",
        distanceFromCollegeKm: listing.distanceFromCollegeKm || 0,
        distanceLabel: listing.distanceLabel || listing.distance || "",
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

  const handleLocationSelect = (loc: {
    address: string;
    lat: number;
    lng: number;
    googleMapsUrl?: string;
  }) => {
    const distanceFromCollegeKm = getDistanceFromKjuKm(loc.lat, loc.lng);
    const distanceLabel = getDistanceLabel(distanceFromCollegeKm);

    setFormData((prev) => ({
      ...prev,
      formattedAddress: loc.address,
      latitude: loc.lat,
      longitude: loc.lng,
      googleMapsUrl: loc.googleMapsUrl || prev.googleMapsUrl,
      distanceFromCollegeKm,
      distanceLabel,
      distance: distanceLabel,
      location: loc.address.split(",")[0]?.trim() || loc.address,
    }));
  };

  const validateForm = () => {
    if (!user) return "Please sign in before saving a listing.";
    if (!formData.title.trim()) return "Please enter a title.";
    if (!formData.description.trim()) return "Please enter a description.";

    if (formData.latitude === null || formData.longitude === null) {
      return "Please select or paste a valid location.";
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
        setUploadStatus(
          `Compressing and uploading ${selectedImages.length} image${
            selectedImages.length > 1 ? "s" : ""
          }...`
        );
        const folder = type === "housing" ? "housing" : "marketplace";
        newPhotoURLs = await uploadMultipleImages(selectedImages, folder);
      }

      const photos = [...existingPhotos, ...newPhotoURLs];

      setUploadStatus(isEditing ? "Saving changes..." : "Posting listing...");

      if (type === "housing") {
        const rent = Number(formData.rent);
        const deposit = Number(formData.deposit) || rent * 2;

        const payload = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          roomType: formData.roomType,
          rent,
          deposit,
          maintenance: Number(formData.maintenance) || 0,
          furnishing: formData.furnishing,
          preferTenants: formData.preferTenants,
          location:
            formData.location ||
            formData.formattedAddress.split(",")[0]?.trim() ||
            "Near KJU",
          latitude: formData.latitude,
          longitude: formData.longitude,
          formattedAddress: formData.formattedAddress,
          googleMapsUrl: formData.googleMapsUrl,
          distanceFromCollegeKm: formData.distanceFromCollegeKm,
          distanceLabel: formData.distanceLabel,
          distance: formData.distanceLabel || "Near KJU",
          availableFrom: "Immediately",
          genderPreference: "none" as const,
          amenities: [],
          photos,
          status: "available" as const,
        };

        if (isEditing && existingListing) {
          await updateHousingListing(existingListing.id, payload);
        } else {
          await createHousingListing({
            ...payload,
            postedBy: user.uid,
          });
        }
      } else {
        const payload = {
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
          photos,
          status: "available" as const,
        };

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
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

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
            onClick={onClose}
            className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-white/25 transition-transform duration-150 ease-out hover:text-white active:scale-[0.97]"
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
                  : "Your post is linked to your verified CampusX profile."}
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
              placeholder={type === "housing" ? "1BHK near Gate 1..." : "Study table, fridge, books..."}
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
                  ? "Rent details, restrictions, amenities, move-in date..."
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

              <div className="relative">
                <select
                  value={type === "housing" ? formData.roomType : formData.category}
                  onChange={(event) => {
                    if (type === "housing") {
                      updateField("roomType", event.target.value as ListingFormData["roomType"]);
                    } else {
                      updateField("category", event.target.value as ListingFormData["category"]);
                    }
                  }}
                  className="input-pro appearance-none pr-12 text-[11px] font-black uppercase tracking-widest"
                >
                  {type === "housing" ? (
                    <>
                      <option value="single">Single</option>
                      <option value="shared">Shared</option>
                      <option value="1BHK">1BHK</option>
                      <option value="2BHK">2BHK</option>
                      <option value="PG">PG</option>
                    </>
                  ) : (
                    <>
                      <option value="Furniture">Furniture</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Books">Books</option>
                      <option value="Essentials">Essentials</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>

                <ChevronRight
                  size={16}
                  className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-white/30"
                />
              </div>
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
                  Furnishing
                </label>

                <select
                  value={formData.furnishing}
                  onChange={(event) =>
                    updateField("furnishing", event.target.value as ListingFormData["furnishing"])
                  }
                  className="input-pro appearance-none text-[11px] font-black uppercase tracking-widest"
                >
                  <option value="Unfurnished">Unfurnished</option>
                  <option value="Semi-furnished">Semi-furnished</option>
                  <option value="Fully-furnished">Fully-furnished</option>
                </select>
              </div>
            </div>
          )}

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

            {formData.distanceLabel && (
              <div className="rounded-[24px] border border-kjc-accent/20 bg-kjc-accent/10 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-kjc-accent">
                  {formData.distanceLabel}
                </p>
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
                <span className="mt-1 text-[8px] text-white/35">Max 5 images, 5MB each</span>
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
            {loading ? (isEditing ? "Saving..." : "Posting...") : isEditing ? "Save Changes" : "Post Listing"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}