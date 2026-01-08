'use client';

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// 👇 HIER DEINE NEUE ID VON GOOGLE EINFÜGEN!
const MAP_ID = "5dce13e4aefc268fb68fd07c"; 

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
          gestureHandling={'cooperative'}
        >
          {/* Moschee Marker - Jetzt groß und auffällig */}
          <AdvancedMarker position={MOSQUE_LOCATION} title="Bashier Moschee">
            <div className="relative flex flex-col items-center justify-center transform -translate-y-1/2">
               {/* Grüner Kreis */}
               <div className="bg-green-700 w-12 h-12 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-2xl">
                 🕌
               </div>
               {/* Kleiner Pfeil unten dran */}
               <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-green-700 -mt-1"></div>
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}