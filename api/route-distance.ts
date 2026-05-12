import type { VercelRequest, VercelResponse } from "@vercel/node";
import { KJU_LOCATION } from "../src/constants/campus";

type RouteDistanceResponse = {
  travelDistanceMeters: number;
  travelDistanceLabel: string;
  travelDurationLabel: string;
};

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m from KJU by road`;
  }

  return `${(meters / 1000).toFixed(1)} km from KJU by road`;
}

function formatDuration(duration: string): string {
  const seconds = Number(duration.replace("s", ""));

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Travel time unavailable";
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min travel`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min travel`
    : `${hours} hr travel`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing Google Maps API key" });
    }

    const { lat, lng } = req.body || {};

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: KJU_LOCATION.lat,
                longitude: KJU_LOCATION.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: lat,
                longitude: lng,
              },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          units: "METRIC",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Could not calculate route distance",
      });
    }

    const route = data?.routes?.[0];

    if (!route?.distanceMeters) {
      return res.status(404).json({ error: "Route distance unavailable" });
    }

    const payload: RouteDistanceResponse = {
      travelDistanceMeters: route.distanceMeters,
      travelDistanceLabel: formatDistance(route.distanceMeters),
      travelDurationLabel: route.duration
        ? formatDuration(route.duration)
        : "Travel time unavailable",
    };

    return res.status(200).json(payload);
  } catch (error) {
    console.error("[route-distance]", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Could not calculate route distance",
    });
  }
}