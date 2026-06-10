export type ParsedGoogleMapsLocation = {
  lat: number;
  lng: number;
};

const DECIMAL_COORD_PAIR =
  /(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/;

const GOOGLE_AT_COORDINATES =
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;

const GOOGLE_QUERY_COORDINATES =
  /[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;

function isValidCoordinate(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function parseGoogleMapsLocation(
  value: string
): ParsedGoogleMapsLocation | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const decoded = decodeURIComponent(trimmed);

  const match =
    decoded.match(GOOGLE_AT_COORDINATES) ||
    decoded.match(GOOGLE_QUERY_COORDINATES) ||
    decoded.match(DECIMAL_COORD_PAIR);

  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  if (!isValidCoordinate(lat, lng)) return null;

  return {
    lat,
    lng,
  };
}

export interface RouteDistance {
  travelDistanceMeters: number;
  travelDistanceLabel: string;
  travelDurationLabel: string;
}

export async function getRouteDistanceFromKju(params: {
  lat: number;
  lng: number;
}): Promise<RouteDistance> {
  const response = await fetch("/api/route-distance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not calculate distance from KJU.");
  }

  return data as RouteDistance;
}