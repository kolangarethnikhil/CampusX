import { HousingListing } from "../services/housingService";

export function getHousingLocationDisplay(listing: HousingListing): {
  address: string;
  distance: string;
  compact: string;
} {
  const address =
    listing.formattedAddress?.trim() ||
    listing.location?.trim() ||
    "Near KJU";

  const distance =
    listing.travelDistanceLabel?.trim() ||
    listing.distanceLabel?.trim() ||
    listing.distance?.trim() ||
    "";

  const compactParts = [
    listing.travelDistanceLabel?.trim() ||
      listing.distanceLabel?.trim() ||
      listing.distance?.trim(),
    address.split(",")[0]?.trim(),
  ].filter(Boolean);

  return {
    address,
    distance,
    compact: compactParts.join(" • ") || address,
  };
}
