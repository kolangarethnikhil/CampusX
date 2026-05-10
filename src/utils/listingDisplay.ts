import { getDistanceFromKjuKm, getDistanceLabel } from "./location";

export function getHousingAddress(listing: {
  formattedAddress?: string;
  location?: string;
}): string {
  const formatted = listing.formattedAddress?.trim();
  const location = listing.location?.trim();

  if (formatted && !isBadLocationValue(formatted)) {
    return formatted;
  }

  if (location && !isBadLocationValue(location)) {
    return location;
  }

  return "Near KJU";
}

export function getHousingDistanceLabel(listing: {
  latitude?: number;
  longitude?: number;
  distanceLabel?: string;
  distance?: string;
}): string {
  if (listing.distanceLabel?.trim()) {
    return listing.distanceLabel;
  }

  if (
    typeof listing.latitude === "number" &&
    typeof listing.longitude === "number" &&
    listing.latitude !== 0 &&
    listing.longitude !== 0
  ) {
    return getDistanceLabel(getDistanceFromKjuKm(listing.latitude, listing.longitude));
  }

  if (listing.distance?.trim() && !isBadLocationValue(listing.distance)) {
    return listing.distance;
  }

  return "Distance unavailable";
}

export function getHousingLocationDisplay(listing: {
  formattedAddress?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  distanceLabel?: string;
  distance?: string;
}): {
  address: string;
  distance: string;
  compact: string;
} {
  const address = getHousingAddress(listing);
  const distance = getHousingDistanceLabel(listing);

  return {
    address,
    distance,
    compact: distance === "Distance unavailable" ? address : `${address} • ${distance}`,
  };
}

function isBadLocationValue(value: string): boolean {
  const cleaned = value.trim();

  if (!cleaned) return true;

  // Prevent old bad values like "63", "0", "1", etc.
  if (/^\d+$/.test(cleaned)) return true;

  // Prevent useless placeholder coordinates.
  if (cleaned === "0,0") return true;

  return false;
}