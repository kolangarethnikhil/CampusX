import React, { useEffect, useRef, useState } from "react";
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
  Expand,
  Loader2,
  MapPin,
  Minimize2,
  Move,
  Navigation,
  Search,
  X,
} from "lucide-react";
import { CAMPUS_SHORT_NAME, KJU_LOCATION } from "../../constants/campus";
import { parseGoogleMapsLocation } from "../../utils/location";

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
      ? { lat: initialLat, lng: initialLng }
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
  const [isExpanded, setIsExpanded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const expandedInputRef = useRef<HTMLInputElement>(null);

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
      const { results } = await geocoder.geocode({ location: position });
      const formattedAddress = results?.[0]?.formatted_address || fallbackAddress;

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

    updateSelectedLocation({
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

    updateSelectedLocation({
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
      componentRestrictions: { country: "in" },
    });

    setPlaceAutocomplete(autocomplete);
  }, [placesLib]);

  useEffect(() => {
    if (!placesLib || !expandedInputRef.current || !isExpanded) return;

    const autocomplete = new placesLib.Autocomplete(expandedInputRef.current, {
      fields: ["geometry", "name", "formatted_address"],
      componentRestrictions: { country: "in" },
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const address = place.formatted_address || place.name || "";

      if (!place.geometry?.location) return;

      const position = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };

      setInputValue(address);
      updateSelectedLocation({
        position,
        fallbackAddress: address,
        action: "search",
        shouldReverseGeocode: false,
      });
    });

    return () => google.maps.event.removeListener(listener);
  }, [placesLib, isExpanded]);

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

      updateSelectedLocation({
        position,
        fallbackAddress: address,
        action: "search",
        shouldReverseGeocode: false,
      });
    });

    return () => google.maps.event.removeListener(listener);
  }, [placeAutocomplete]);

  useEffect(() => {
    if (!marker) return;

    marker.gmpDraggable = true;
    marker.title = "Drag pin to exact location";

    const listener = marker.addListener("dragend", () => {
      const position = marker.position;
      if (!position) return;

      const lat =
        typeof position.lat === "function"
          ? position.lat()
          : Number((position as google.maps.LatLngLiteral).lat);

      const lng =
        typeof position.lng === "function"
          ? position.lng()
          : Number((position as google.maps.LatLngLiteral).lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      updateSelectedLocation({
        position: { lat, lng },
        fallbackAddress: `Pinned location near ${CAMPUS_SHORT_NAME}`,
        action: "drag",
        shouldReverseGeocode: true,
      });
    });

    return () => listener.remove();
  }, [marker, geocodingLib, map]);

  const statusLabel =
    lastAction === "drag"
      ? "Pin adjusted"
      : lastAction === "tap"
        ? "Map location selected"
        : lastAction === "paste"
          ? "Maps link detected"
          : lastAction === "current"
            ? "Current location selected"
            : markerPosition
              ? "Location selected"
              : "Start from KJU";

  const mapNode = (
    <Map
      defaultZoom={15}
      defaultCenter={markerPosition || KJU_LOCATION}
      mapId="DEMO_MAP_ID"
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons={false}
      className="h-full w-full"
      onClick={handleMapClick}
    >
      <AdvancedMarker position={KJU_LOCATION}>
        <div className="rounded-2xl border-2 border-white bg-kjc-accent px-3 py-2 text-center text-white shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.16em]">
            KJU
          </p>
        </div>
      </AdvancedMarker>

      {markerPosition && (
        <AdvancedMarker ref={markerRef} position={markerPosition}>
          <div className="relative cursor-grab active:cursor-grabbing">
            <div className="absolute -inset-4 animate-pulse rounded-full bg-kjc-accent/20 blur-sm" />
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-[18px] border-4 border-white bg-kjc-accent text-white shadow-[0_10px_20px_rgba(0,0,0,0.25)]">
              <MapPin size={24} />
            </div>
          </div>
        </AdvancedMarker>
      )}
    </Map>
  );

  if (!hasMaps) {
    return (
      <div className="space-y-4">
        <div className="rounded-[28px] border border-kjc-accent/20 bg-kjc-accent/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-kjc-accent">
            Location guide
          </p>
          <p className="mt-2 text-xs font-bold leading-relaxed text-white/55">
            Paste coordinates or a long Google Maps link.
          </p>
        </div>

        <input
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder="Paste coordinates or Google Maps link"
          className="input-pro"
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-[28px] border border-kjc-accent/20 bg-kjc-accent/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-kjc-accent">
            Pick exact location
          </p>

          <div className="mt-4 grid gap-3">
            <div className="flex gap-3">
              <Search size={16} className="mt-0.5 shrink-0 text-kjc-accent" />
              <p className="text-xs font-bold leading-relaxed text-white/60">
                Search address or building name.
              </p>
            </div>

            <div className="flex gap-3">
              <Clipboard size={16} className="mt-0.5 shrink-0 text-kjc-accent" />
              <p className="text-xs font-bold leading-relaxed text-white/60">
                Paste a long Google Maps link.
              </p>
            </div>

            <div className="flex gap-3">
              <Move size={16} className="mt-0.5 shrink-0 text-kjc-accent" />
              <p className="text-xs font-bold leading-relaxed text-white/60">
                Expand map, tap near KJU, then drag pin exactly.
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(event) => handleInputChange(event.target.value)}
              placeholder="Search or paste Maps link"
              className="input-pro pl-14"
            />
          </div>

          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isBusy}
            className="relative flex aspect-square w-[64px] items-center justify-center rounded-3xl bg-kjc-accent text-white transition-transform duration-150 ease-out active:scale-90 disabled:opacity-50"
            title="Use current location"
          >
            {isBusy ? <Loader2 size={24} className="animate-spin" /> : <Navigation size={24} />}
          </button>
        </div>

        <div className="relative h-[360px] w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/5">
          {mapNode}

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="absolute right-4 top-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/75 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-xl"
          >
            Expand
            <Expand size={15} />
          </button>

          <div className="absolute bottom-4 left-4 right-4 rounded-[22px] border border-white/10 bg-black/75 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={18}
                className={`mt-0.5 shrink-0 ${
                  markerPosition ? "text-emerald-400" : "text-white/35"
                }`}
              />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                  {statusLabel}
                </p>
                <p className="mt-1 truncate text-[11px] font-bold text-white/40">
                  {isResolvingPin
                    ? "Finding address..."
                    : inputValue || "Map starts at KJU. Tap or search to select."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="px-2 text-[10px] font-bold leading-relaxed text-white/35">
          Tip: if the pin lands on the wrong road, expand map and drag it to the exact building.
        </p>
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-[220] flex flex-col bg-black">
          <div className="flex items-center gap-3 border-b border-white/10 p-4">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black"
            >
              <Minimize2 size={20} />
            </button>

            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                ref={expandedInputRef}
                value={inputValue}
                onChange={(event) => handleInputChange(event.target.value)}
                placeholder="Search or paste Maps link"
                className="input-pro pl-14"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white"
            >
              <X size={22} />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            {mapNode}

            <div className="absolute bottom-5 left-5 right-5 rounded-[26px] border border-white/10 bg-black/80 p-5 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-kjc-accent">
                {statusLabel}
              </p>
              <p className="mt-2 line-clamp-2 text-sm font-bold text-white/60">
                {isResolvingPin
                  ? "Finding address..."
                  : inputValue || "Tap the map or drag the pin to select exact location."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}