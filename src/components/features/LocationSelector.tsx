import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, 
  AdvancedMarker, 
  useMap, 
  useMapsLibrary, 
  useAdvancedMarkerRef 
} from '@vis.gl/react-google-maps';
import { MapPin, Search, Navigation, Loader2 } from 'lucide-react';

interface LocationSelectorProps {
  onLocationSelect: (location: { address: string, lat: number, lng: number }) => void;
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
}

export default function LocationSelector({ onLocationSelect, initialAddress, initialLat, initialLng }: LocationSelectorProps) {
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [inputValue, setInputValue] = useState(initialAddress || '');
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLocating, setIsLocating] = useState(false);
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const map = useMap();

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = { lat: latitude, lng: longitude };

        if (geocodingLib) {
          const geocoder = new geocodingLib.Geocoder();
          geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const place = results[0];
              const formattedAddress = place.formatted_address || '';
              
              setInputValue(formattedAddress);
              setSelectedPlace({
                geometry: {
                  location: new google.maps.LatLng(latitude, longitude)
                } as google.maps.places.PlaceGeometry,
                formatted_address: formattedAddress,
                name: formattedAddress.split(',')[0]
              } as google.maps.places.PlaceResult);

              onLocationSelect({
                address: formattedAddress,
                lat: latitude,
                lng: longitude
              });

              if (map) {
                map.setCenter(latLng);
                map.setZoom(17);
              }
              if (marker) {
                marker.position = latLng;
              }
            }
            setIsLocating(false);
          });
        } else {
          setIsLocating(false);
          // Fallback if geocoding not loaded or available
          onLocationSelect({
            address: "Current Location",
            lat: latitude,
            lng: longitude
          });
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsLocating(false);
        alert("Could not get your location. Please check permissions.");
      }
    );
  };

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const options = {
      fields: ['geometry', 'name', 'formatted_address'],
      componentRestrictions: { country: 'in' } // Restrict to India as KJC is in Bangalore
    };

    setPlaceAutocomplete(new placesLib.Autocomplete(inputRef.current, options));
  }, [placesLib]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    const listener = placeAutocomplete.addListener('place_changed', () => {
      const place = placeAutocomplete.getPlace();
      setSelectedPlace(place);
      setInputValue(place.formatted_address || place.name || '');
      
      if (place.geometry?.location) {
        onLocationSelect({
          address: place.formatted_address || place.name || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
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

  const hasMaps = Boolean(process.env.GOOGLE_MAPS_PLATFORM_KEY);

  if (!hasMaps) {
    return (
      <div className="space-y-4">
        <div className="relative group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-kjc-accent transition-colors">
            <MapPin size={20} />
          </div>
          <input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onLocationSelect({ address: e.target.value, lat: 0, lng: 0 });
            }}
            placeholder="Type approximate location (e.g. Near KJC Gate 1)"
            className="input-pro pl-14"
          />
        </div>
        <div className="p-6 bg-white/5 rounded-[40px] border border-white/5 text-center">
          <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">Precision Mapping Disabled</p>
          <p className="text-[11px] text-white/20 font-bold mt-2 leading-relaxed uppercase tracking-wider italic">
            Visual coordinates require an authorized secure key.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative flex gap-3">
        <div className="relative flex-1 group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-kjc-navy transition-colors">
            <Search size={18} />
          </div>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search address..."
            className="w-full bg-kjc-slate-50 border border-kjc-slate-200 rounded-3xl pl-14 pr-6 py-5 focus:ring-4 focus:ring-kjc-navy/5 outline-none font-bold text-kjc-slate-900 placeholder:text-slate-300 transition-all shadow-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={isLocating}
          className="aspect-square w-[64px] bg-kjc-navy text-white rounded-3xl flex items-center justify-center hover:bg-kjc-slate-900 transition-all shadow-[0_15px_30px_rgba(0,51,102,0.2)] active:scale-90 disabled:opacity-50 relative group"
          title="Use current location"
        >
          {isLocating && (
            <span className="absolute inset-0 rounded-3xl bg-kjc-navy animate-ping opacity-20" />
          )}
          {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Navigation size={24} className="group-hover:rotate-12 transition-transform" />}
        </button>
      </div>

      <div className="w-full h-72 rounded-[40px] overflow-hidden border border-kjc-slate-100 relative group shadow-inner bg-kjc-slate-50">
        <Map
          defaultZoom={15}
          defaultCenter={initialLat && initialLng ? { lat: initialLat, lng: initialLng } : { lat: 13.0643, lng: 77.6482 }} // KJC Coordinates
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          disableDefaultUI={true}
          className="w-full h-full"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          <AdvancedMarker 
            ref={markerRef} 
            position={initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null} 
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-kjc-navy/20 rounded-full animate-pulse blur-sm" />
              <div className="w-12 h-12 bg-kjc-navy rounded-[18px] flex items-center justify-center text-white border-4 border-white shadow-[0_10px_20px_rgba(0,0,0,0.2)] relative z-10">
                <MapPin size={24} />
              </div>
            </div>
          </AdvancedMarker>
        </Map>
        
        {!selectedPlace && !initialLat && (
          <div className="absolute inset-0 bg-kjc-slate-900/5 backdrop-blur-[1px] pointer-events-none flex items-center justify-center px-10">
            <div className="glass-card px-6 py-3 rounded-[20px] shadow-xl border border-white/60">
              <p className="text-[10px] font-black uppercase text-kjc-navy tracking-[0.2em] text-center">
                Search address to pinpoint on map
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
