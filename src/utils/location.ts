import { KJU_LOCATION } from "../constants/campus";

export interface ParsedLocation {
  lat: number;
  lng: number;
}

export function parseGoogleMapsLocation(input: string): ParsedLocation | null {
  const value = input.trim();

  const queryMatch = value.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (queryMatch) {
    return {
      lat: Number(queryMatch[1]),
      lng: Number(queryMatch[2]),
    };
  }

  const atMatch = value.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (atMatch) {
    return {
      lat: Number(atMatch[1]),
      lng: Number(atMatch[2]),
    };
  }

  const coordinateMatch = value.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (coordinateMatch) {
    return {
      lat: Number(coordinateMatch[1]),
      lng: Number(coordinateMatch[2]),
    };
  }

  return null;
}

export function getDistanceFromKjuKm(lat: number, lng: number): number {
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat - KJU_LOCATION.lat);
  const dLng = toRadians(lng - KJU_LOCATION.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(KJU_LOCATION.lat)) *
      Math.cos(toRadians(lat)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(2));
}

export function getDistanceLabel(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m from KJU`;
  }

  return `${distanceKm.toFixed(1)} km from KJU`;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}