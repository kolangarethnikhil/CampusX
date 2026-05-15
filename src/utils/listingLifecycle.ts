export type ListingStatus =
  | "available"
  | "reserved"
  | "closed"
  | "expired"
  | "deleted"
  | "sold";

export type ListingDurationDays = 15 | 30;

export function isListingExpired(expiresAt?: unknown) {
  if (!expiresAt) return false;

  const expiry =
    typeof (expiresAt as any)?.toMillis === "function"
      ? (expiresAt as any).toMillis()
      : new Date(expiresAt as string).getTime();

  if (!Number.isFinite(expiry)) return false;

  return Date.now() > expiry;
}

export function isPublicListingVisible(listing: {
  status?: string;
  expiresAt?: unknown;
}) {
  if (listing.status === "deleted") return false;
  if (listing.status === "closed") return false;
  if (listing.status === "sold") return false;
  if (listing.status === "expired") return false;
  if (isListingExpired(listing.expiresAt)) return false;

  return true;
}

export function getListingExpiryLabel(expiresAt?: unknown) {
  if (!expiresAt) return "";

  const expiryMs =
    typeof (expiresAt as any)?.toMillis === "function"
      ? (expiresAt as any).toMillis()
      : new Date(expiresAt as string).getTime();

  if (!Number.isFinite(expiryMs)) return "";

  const diff = expiryMs - Date.now();

  if (diff <= 0) return "Expired";

  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));

  if (days === 1) return "Expires tomorrow";

  return `Expires in ${days} days`;
}

export function shouldCleanupPhotos(listing: {
  photoCleanupDueAt?: unknown;
  photosRetained?: boolean;
}) {
  if (!listing.photosRetained) return false;
  if (!listing.photoCleanupDueAt) return false;

  const dueMs =
    typeof (listing.photoCleanupDueAt as any)?.toMillis === "function"
      ? (listing.photoCleanupDueAt as any).toMillis()
      : new Date(listing.photoCleanupDueAt as string).getTime();

  if (!Number.isFinite(dueMs)) return false;

  return Date.now() > dueMs;
}