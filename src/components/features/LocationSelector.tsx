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
  Loader2,
  MapPin,
  Move,
  Navigation,
  Search,
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

  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);
  const [markerPosition, setMarkerPosition] =
    useState<LatLngLiteral | null>(initialPosition);
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [inputValue, setInputValue] = useState(initialAddress || "");
  const [placeAutocomplete, setPlaceAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingPin, setIsResolvingPin] = useState(false);
  const [lastAction, setLastAction] = useState<
    "search" | "paste" | "drag" | "tap" | "current" | null
  >(initialPosition ? "search" : null);

  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary("places");
  const geocodingLib = useMapsLibrary("geocoding");
  const map = useMap();

  const hasMaps = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

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
    action: "search" | "paste" | "drag" | "tap" | "current";
    shouldReverseGeocode?: boolean;
  }) => {
    setMarkerPosition(position);
    setLastAction(action);

    if (map) {
      map.setCenter(position);
      map.setZoom(17);
    }

    if (marker) {
      marker.position = position;
    }

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
      setSelectedPlace({
        geometry: {
          location: new google.maps.LatLng(position.lat, position.lng),
        } as google.maps.places.PlaceGeometry,
        formatted_address: formattedAddress,
        name: formattedAddress.split(",")[0],
      } as google.maps.places.PlaceResult);

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

    const address = `Pinned location near ${CAMPUS_SHORT_NAME}`;

    updateSelectedLocation({
      position: parsed,
      fallbackAddress: address,
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
        const latLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        await updateSelectedLocation({
          position: latLng,
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

    const options: google.maps.places.AutocompleteOptions = {
      fields: ["geometry", "name", "formatted_address"],
      componentRestrictions: { country: "in" },
    };

    setPlaceAutocomplete(new placesLib.Autocomplete(inputRef.current, options));
  }, [placesLib]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    const listener = placeAutocomplete.addListener("place_changed", () => {
      const place = placeAutocomplete.getPlace();
      setSelectedPlace(place);

      const address = place.formatted_address || place.name || "";
      setInputValue(address);

      if (place.geometry?.location) {
        const position = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        setMarkerPosition(position);
        setLastAction("search");

        onLocationSelect({
          address,
          lat: position.lat,
          lng: position.lng,
        });
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [onLocationSelect, placeAutocomplete]);

  useEffect(() => {
    if (!map || !selectedPlace) return;

    if (selectedPlace.geometry?.viewport) {
      map.fitBounds(selectedPlace.geometry.viewport);
      return;
    }

    if (selectedPlace.geometry?.location) {
      map.setCenter(selectedPlace.geometry.location);
      map.setZoom(17);
    }
  }, [map, selectedPlace]);

  useEffect(() => {
    if (!marker) return;

    marker.gmpDraggable = true;
    marker.title = "Drag pin to exact room location";

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

    return () => {
      listener.remove();
    };
  }, [geocodingLib, marker, map]);

  if (!hasMaps) {
    return (
      <div className="space-y-4">
        <div className="rounded-[28px] border border-kjc-accent/20 bg-kjc-accent/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-kjc-accent">
            Location guide
          </p>
          <p className="mt-2 text-xs font-bold leading-relaxed text-white/55">
            Paste coordinates or a long Google Maps link. Map preview is disabled until
            Google Maps key is configured.
          </p>
        </div>

        <div className="relative group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-kjc-accent">
            <MapPin size={20} />
          </div>

          <input
            value={inputValue}
            onChange={(event) => {
              const value = event.target.value;
              setInputValue(value);

              const parsed = parseGoogleMapsLocation(value);
              if (parsed) {
                onLocationSelect({
                  address: `Pinned location near ${CAMPUS_SHORT_NAME}`,
                  lat: parsed.lat,
                  lng: parsed.lng,
                  googleMapsUrl: value,
                });
              }
            }}
            placeholder="Paste coordinates or Google Maps link"
            className="input-pro pl-14"
          />
        </div>

        <div className="rounded-[32px] border border-white/5 bg-white/5 p-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
            Map preview disabled
          </p>
          <p className="mt-2 text-[11px] font-bold leading-relaxed text-white/25">
            Add VITE_GOOGLE_MAPS_API_KEY to enable visual location selection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-kjc-accent/20 bg-kjc-accent/10 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-kjc-accent">
          Pick exact room location
        </p>

        <div className="mt-4 grid gap-3">
          <div className="flex items-start gap-3">
            <Search size={16} className="mt-0.5 shrink-0 text-kjc-accent" />
            <p className="text-xs font-bold leading-relaxed text-white/60">
              Search the building, road, or area name.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Clipboard size={16} className="mt-0.5 shrink-0 text-kjc-accent" />
            <p className="text-xs font-bold leading-relaxed text-white/60">
              Paste a long Google Maps link with coordinates.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Move size={16} className="mt-0.5 shrink-0 text-kjc-accent" />
            <p className="text-xs font-bold leading-relaxed text-white/60">
              Drag the pin or tap the map to adjust the exact gate/building.
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex gap-3">
        <div className="relative flex-1 group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-kjc-accent">
            <Search size={18} />
          </div>

          <input
            ref={inputRef}
            value={inputValue}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder="Search address or paste Google Maps link"
            className="input-pro pl-14"
          />
        </div>

        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={isLocating || isResolvingPin}
          className="relative flex aspect-square w-[64px] items-center justify-center rounded-3xl bg-kjc-accent text-white shadow-[0_15px_30px_rgba(139,92,246,0.2)] transition-transform duration-150 ease-out hover:bg-kjc-accent/90 active:scale-90 disabled:opacity-50"
          title="Use current location"
        >
          {(isLocating || isResolvingPin) && (
            <span className="absolute inset-0 animate-ping rounded-3xl bg-kjc-accent opacity-20" />
          )}

          {isLocating || isResolvingPin ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <Navigation size={24} />
          )}
        </button>
      </div>

      <div className="relative h-80 w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-inner">
        <Map
          defaultZoom={15}
          defaultCenter={markerPosition || KJU_LOCATION}
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          disableDefaultUI
          className="h-full w-full"
          onClick={handleMapClick}
        >
          <AdvancedMarker ref={markerRef} position={markerPosition}>
            <div className="relative cursor-grab active:cursor-grabbing">
              <div className="absolute -inset-4 animate-pulse rounded-full bg-kjc-accent/20 blur-sm" />
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-[18px] border-4 border-white bg-kjc-accent text-white shadow-[0_10px_20px_rgba(0,0,0,0.25)]">
                <MapPin size={24} />
              </div>
            </div>
          </AdvancedMarker>
        </Map>

        {!markerPosition && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 px-10 backdrop-blur-[1px]">
            <div className="rounded-[20px] border border-white/20 bg-black/70 px-6 py-3 shadow-xl">
              <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-white">
                Search, paste link, or tap map
              </p>
            </div>
          </div>
        )}

        {markerPosition && (
          <div className="absolute bottom-4 left-4 right-4 rounded-[22px] border border-white/10 bg-black/70 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                  {lastAction === "drag"
                    ? "Pin adjusted"
                    : lastAction === "tap"
                      ? "Map location selected"
                      : lastAction === "paste"
                        ? "Maps link detected"
                        : lastAction === "current"
                          ? "Current location selected"
                          : "Location selected"}
                </p>
                <p className="mt-1 truncate text-[11px] font-bold text-white/40">
                  {isResolvingPin ? "Finding address..." : inputValue || "Pinned location"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="px-2 text-[10px] font-bold leading-relaxed text-white/35">
        Tip: drag the pin after search if Google places it on the wrong side of the
        road. Short maps.app.goo.gl links will be supported after backend resolver.
      </p>
    </div>
  );
}