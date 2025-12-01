'use client';

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

const MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = "DEMO_MAP_ID";

const MOSQUE_LOCATION = { 
  lat: 49.685590, 
  lng: 8.593480,
};

export default function MapComponent() {
  return (
    <div className="w-full h-full min-h-[100%] rounded-xl overflow-hidden relative">
      <APIProvider apiKey={MAP_API_KEY}>
        <Map
          defaultCenter={MOSQUE_LOCATION} 
          defaultZoom={15} 
          mapId={MAP_ID}
          disableDefaultUI={true} 
          gestureHandling={'none'} // Damit man auf der Startseite nicht versehentlich scrollt
        >
          {/* Das Moschee Icon */}
          <AdvancedMarker position={MOSQUE_LOCATION} title="Bashir Moschee">
            <div className="text-4xl drop-shadow-md transform -translate-y-1/2">
              🕌
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}