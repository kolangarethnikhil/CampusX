import React, { useEffect, useRef, useState } from "react";
import {
  AdvancedMarker,
  Map,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Loader2, MapPin, Navigation, Search } from "lucide-react";
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

export default function LocationSelector({
  onLocationSelect,
  initialAddress,
  initialLat,
  initialLng,
}: LocationSelectorProps) {
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [inputValue, setInputValue] = useState(initialAddress || "");
  const [placeAutocomplete, setPlaceAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary("places");
  const geocodingLib = useMapsLibrary("geocoding");
  const map = useMap();

  const hasMaps = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  const selectParsedLocation = (value: string) => {
    const parsed = parseGoogleMapsLocation(value);
    if (!parsed) return false;

    const address = `Pinned location near ${CAMPUS_SHORT_NAME}`;

    onLocationSelect({
      address,
      lat: parsed.lat,
      lng: parsed.lng,
      googleMapsUrl: value,
    });

    if (typeof google !== "undefined") {
      const place = {
        geometry: {
          location: new google.maps.LatLng(parsed.lat, parsed.lng),
        } as google.maps.places.PlaceGeometry,
        formatted_address: address,
        name: address,
      } as google.maps.places.PlaceResult;

      setSelectedPlace(place);
    }

    if (map) {
      map.setCenter(parsed);
      map.setZoom(17);
    }

    if (marker) {
      marker.position = parsed;
    }

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
      (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = { lat: latitude, lng: longitude };

        if (!geocodingLib) {
          const address = `Current location near ${CAMPUS_SHORT_NAME}`;

          setInputValue(address);
          onLocationSelect({
            address,
            lat: latitude,
            lng: longitude,
          });

          setIsLocating(false);
          return;
        }

        const geocoder = new geocodingLib.Geocoder();

        geocoder
          .geocode({ location: latLng })
          .then(({ results }) => {
            if (results?.[0]) {
              const formattedAddress = results[0].formatted_address || "";

              setInputValue(formattedAddress);
              setSelectedPlace({
                geometry: {
                  location: new google.maps.LatLng(latitude, longitude),
                } as google.maps.places.PlaceGeometry,
                formatted_address: formattedAddress,
                name: formattedAddress.split(",")[0],
              } as google.maps.places.PlaceResult);

              onLocationSelect({
                address: formattedAddress,
                lat: latitude,
                lng: longitude,
              });

              if (map) {
                map.setCenter(latLng);
                map.setZoom(17);
              }

              if (marker) {
                marker.position = latLng;
              }
            }
          })
          .catch((error) => {
            console.error("Reverse geocoding failed:", error);
            onLocationSelect({
              address: `Current location near ${CAMPUS_SHORT_NAME}`,
              lat: latitude,
              lng: longitude,
            });
          })
          .finally(() => {
            setIsLocating(false);
          });
      },
      (error) => {
        console.error("Failed to get current location:", error);
        setIsLocating(false);
        alert("Could not retrieve your location. Please enable location permissions.");
      },
    );
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
      setInputValue(place.formatted_address || place.name || "");

      if (place.geometry?.location) {
        onLocationSelect({
          address: place.formatted_address || place.name || "",
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [onLocationSelect, placeAutocomplete]);

  useEffect(() => {
    if (!map || !selectedPlace || !marker) return;

    if (selectedPlace.geometry?.viewport) {
      map.fitBounds(selectedPlace.geometry.viewport);
    } else if (selectedPlace.geometry?.location) {
      map.setCenter(selectedPlace.geometry.location);
      map.setZoom(17);
    }

    if (selectedPlace.geometry?.location) {
      marker.position = selectedPlace.geometry.location;
    }
  }, [map, selectedPlace, marker]);

  if (!hasMaps) {
    return (
      <div className="space-y-4">
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
      <div className="relative flex gap-3">
        <div className="relative flex-1 group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-kjc-accent">
            <Search size={18} />
          </div>

          <input
            ref={inputRef}
            value={inputValue}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder="Paste Google Maps link or search address"
            className="input-pro pl-14"
          />
        </div>

        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={isLocating}
          className="relative flex aspect-square w-[64px] items-center justify-center rounded-3xl bg-kjc-accent text-white shadow-[0_15px_30px_rgba(139,92,246,0.2)] transition-all hover:bg-kjc-accent/90 active:scale-90 disabled:opacity-50"
          title="Use current location"
        >
          {isLocating && (
            <span className="absolute inset-0 animate-ping rounded-3xl bg-kjc-accent opacity-20" />
          )}

          {isLocating ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <Navigation size={24} className="transition-transform group-hover:rotate-12" />
          )}
        </button>
      </div>

      <div className="relative h-72 w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-inner">
        <Map
          defaultZoom={15}
          defaultCenter={
            initialLat && initialLng ? { lat: initialLat, lng: initialLng } : KJU_LOCATION
          }
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          disableDefaultUI
          className="h-full w-full"
        >
          <AdvancedMarker
            ref={markerRef}
            position={initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null}
          >
            <div className="relative">
              <div className="absolute -inset-4 animate-pulse rounded-full bg-kjc-accent/20 blur-sm" />
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-[18px] border-4 border-white bg-kjc-accent text-white shadow-[0_10px_20px_rgba(0,0,0,0.25)]">
                <MapPin size={24} />
              </div>
            </div>
          </AdvancedMarker>
        </Map>

        {!selectedPlace && !initialLat && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 px-10 backdrop-blur-[1px]">
            <div className="rounded-[20px] border border-white/20 bg-black/70 px-6 py-3 shadow-xl">
              <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-white">
                Search or paste map link
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="px-2 text-[10px] font-bold leading-relaxed text-white/35">
        Tip: long Google Maps links with coordinates work now. Short maps.app.goo.gl links will be
        supported after backend resolver.
      </p>
    </div>
  );
}