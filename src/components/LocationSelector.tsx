import { useEffect, useRef, useState } from "react";
import {
  AdvancedMarker,
  Map,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  CheckCircle2,
  Clipboard,
  Loader2,
  MapPin,
  Move,
  Navigation,
  Search,
} from "lucide-react";
import { CAMPUS_SHORT_NAME, KJU_LOCATION } from "../constants/campus";
import { parseGoogleMapsLocation } from "../utils/location";

interface LocationSelectorProps {
  onLocationSelect: (location: {
    address: string;
    lat: number;
    lng: number;
    googleMapsUrl?: string;
  }) => void;
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
}

type LatLngLiteral = {
  lat: number;
  lng: number;
};

type LastAction = "search" | "paste" | "drag" | "tap" | "current" | null;

export default function LocationSelector({
  onLocationSelect,
  initialAddress,
  initialLat,
  initialLng,
}: LocationSelectorProps) {
  const initialPosition =
    typeof initialLat === "number" && typeof initialLng === "number"
      ? {
          lat: initialLat,
          lng: initialLng,
        }
      : null;

  const [markerPosition, setMarkerPosition] =
    useState<LatLngLiteral | null>(initialPosition);
  const [inputValue, setInputValue] = useState(initialAddress || "");
  const [placeAutocomplete, setPlaceAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingPin, setIsResolvingPin] = useState(false);
  const [lastAction, setLastAction] = useState<LastAction>(
    initialPosition ? "search" : null
  );

  const inputRef = useRef<HTMLInputElement>(null);

  const placesLib = useMapsLibrary("places");
  const geocodingLib = useMapsLibrary("geocoding");

  const map = useMap();
  const [markerRef, marker] = useAdvancedMarkerRef();

  const hasMaps = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const isBusy = isLocating || isResolvingPin;

  const setMapPosition = (position: LatLngLiteral, zoom = 17) => {
    if (map) {
      map.setCenter(position);
      map.setZoom(zoom);
    }

    if (marker) {
      marker.position = position;
    }
  };

  const updateSelectedLocation = async ({
    position,
    fallbackAddress,
    googleMapsUrl,
    action,
    shouldReverseGeocode = true,
  }: {
    position: LatLngLiteral;
    fallbackAddress: string;
    googleMapsUrl?: string;
    action: Exclude<LastAction, null>;
    shouldReverseGeocode?: boolean;
  }) => {
    setMarkerPosition(position);
    setLastAction(action);
    setMapPosition(position);

    if (!shouldReverseGeocode || !geocodingLib) {
      setInputValue(fallbackAddress);

      onLocationSelect({
        address: fallbackAddress,
        lat: position.lat,
        lng: position.lng,
        googleMapsUrl,
      });

      return;
    }

    setIsResolvingPin(true);

    try {
      const geocoder = new geocodingLib.Geocoder();

      const { results } = await geocoder.geocode({
        location: position,
      });

      const formattedAddress =
        results?.[0]?.formatted_address || fallbackAddress;

      setInputValue(formattedAddress);

      onLocationSelect({
        address: formattedAddress,
        lat: position.lat,
        lng: position.lng,
        googleMapsUrl,
      });
    } catch (error) {
      console.error("Reverse geocoding failed:", error);

      setInputValue(fallbackAddress);

      onLocationSelect({
        address: fallbackAddress,
        lat: position.lat,
        lng: position.lng,
        googleMapsUrl,
      });
    } finally {
      setIsResolvingPin(false);
    }
  };

  const selectParsedLocation = (value: string) => {
    const parsed = parseGoogleMapsLocation(value);

    if (!parsed) return false;

    void updateSelectedLocation({
      position: parsed,
      fallbackAddress: `Pinned location near ${CAMPUS_SHORT_NAME}`,
      googleMapsUrl: value,
      action: "paste",
      shouldReverseGeocode: true,
    });

    return true;
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    selectParsedLocation(value);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await updateSelectedLocation({
          position: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          fallbackAddress: `Current location near ${CAMPUS_SHORT_NAME}`,
          action: "current",
          shouldReverseGeocode: true,
        });

        setIsLocating(false);
      },
      (error) => {
        console.error("Failed to get current location:", error);
        setIsLocating(false);
        alert("Could not retrieve your location. Please enable location permissions.");
      }
    );
  };

  const handleMapClick = (event: any) => {
    event?.stop?.();

    const latLng = event?.detail?.latLng;

    if (!latLng) return;

    void updateSelectedLocation({
      position: {
        lat: latLng.lat,
        lng: latLng.lng,
      },
      fallbackAddress: `Pinned location near ${CAMPUS_SHORT_NAME}`,
      action: "tap",
      shouldReverseGeocode: true,
    });
  };

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ["geometry", "name", "formatted_address"],
      componentRestrictions: {
        country: "in",
      },
    });

    setPlaceAutocomplete(autocomplete);
  }, [placesLib]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    const listener = placeAutocomplete.addListener("place_changed", () => {
      const place = placeAutocomplete.getPlace();
      const address = place.formatted_address || place.name || "";

      if (!place.geometry?.location) return;

      const position = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };

      setInputValue(address);

      void updateSelectedLocation({
        position,
        fallbackAddress: address,
        action: "search",
        shouldReverseGeocode: false,
      });
    });

    return () => google.maps.event.removeListener(listener);
  }, [placeAutocomplete]);

  const selectedText =
    lastAction === "current"
      ? "Current location selected"
      : lastAction === "search"
        ? "Searched location selected"
        : lastAction === "paste"
          ? "Maps link location selected"
          : lastAction === "tap"
            ? "Pinned location selected"
            : lastAction === "drag"
              ? "Dragged pin selected"
              : "Select listing location";

  if (!hasMaps) {
    return (
      <div className="rounded-2xl border border-cx-amber/15 bg-cx-amber/[0.04] p-4">
        <p className="text-[12px] font-semibold text-cx-amber">
          Google Maps key missing
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-cx-text-muted">
          Add VITE_GOOGLE_MAPS_API_KEY to enable location search and map pin.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
      <div className="relative mb-3">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-cx-text-muted"
        />

        <input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder="Search location or paste Google Maps link"
          className="w-full input-premium rounded-2xl pl-10 pr-3 py-3 text-[12px] text-cx-text placeholder:text-cx-text-muted"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={isBusy}
          className="rounded-xl border border-white/[0.06] bg-white/[0.035] py-2 text-[10px] font-semibold text-cx-text-secondary flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {isLocating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
          Current
        </button>

        <button
          type="button"
          onClick={async () => {
            const text = await navigator.clipboard.readText().catch(() => "");
            if (text) handleInputChange(text);
          }}
          disabled={isBusy}
          className="rounded-xl border border-white/[0.06] bg-white/[0.035] py-2 text-[10px] font-semibold text-cx-text-secondary flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Clipboard size={13} />
          Paste link
        </button>
      </div>

      <div className="relative h-44 overflow-hidden rounded-2xl border border-white/[0.06] bg-cx-card">
        <Map
          defaultCenter={markerPosition || KJU_LOCATION}
          defaultZoom={15}
          mapId="campusx-location-map"
          gestureHandling="greedy"
          disableDefaultUI
          onClick={handleMapClick}
        >
          {markerPosition && (
            <AdvancedMarker
              ref={markerRef}
              position={markerPosition}
              draggable
              onDragEnd={(event) => {
                if (!event.latLng) return;

                void updateSelectedLocation({
                  position: {
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng(),
                  },
                  fallbackAddress: `Pinned location near ${CAMPUS_SHORT_NAME}`,
                  action: "drag",
                  shouldReverseGeocode: true,
                });
              }}
            >
              <div className="rounded-full bg-cx-purple p-2 shadow-lg shadow-cx-purple/30">
                <MapPin size={18} className="text-white" />
              </div>
            </AdvancedMarker>
          )}
        </Map>

        {!markerPosition && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/20 text-center">
            <Move size={20} className="mb-2 text-cx-text-muted" />
            <p className="text-[11px] text-cx-text-muted">
              Search or tap map to drop pin
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2">
        {markerPosition ? (
          <CheckCircle2 size={15} className="mt-0.5 text-cx-lime" />
        ) : (
          <MapPin size={15} className="mt-0.5 text-cx-text-muted" />
        )}

        <div>
          <p className="text-[11px] font-semibold text-cx-text-secondary">
            {selectedText}
          </p>

          <p className="mt-0.5 text-[10px] leading-relaxed text-cx-text-muted">
            {inputValue || "No location selected yet"}
          </p>
        </div>
      </div>
    </div>
  );
}