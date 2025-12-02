'use client';

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

const MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// WICHTIG: Damit eigene Icons funktionieren, brauchst du hier eigentlich eine echte Map ID von Google.
// Wenn du keine hast, versuche "DEMO_MAP_ID", aber besser ist eine eigene (Vektor-Karte).
const MAP_ID = "DEMO_MAP_ID"; 

// Die exakten Koordinaten der Bashir Moschee, Bensheim
const MOSQUE_LOCATION = { 
  lat: 49.685590, 
  lng: 8.593480,
};

export default function MapComponent() {
  return (
    <div className="w-full h-full min-h-[100%] rounded-xl overflow-hidden relative">
      <APIProvider apiKey={MAP_API_KEY}>
        <Map
          defaultCenter={MOSQUE_LOCATION} // <--- Startet genau hier
          defaultZoom={17}                // <--- Nah genug ranzoomen
          mapId={MAP_ID}
          disableDefaultUI={true}         // Keine störenden Google-Knöpfe
          gestureHandling={'cooperative'} // Damit man beim Scrollen nicht stecken bleibt
        >
          {/* Das Moschee Icon */}
          <AdvancedMarker position={MOSQUE_LOCATION} title="Bashir Moschee">
            
            {/* Unser selbstgebautes Icon-Design */}
            <div className="relative flex items-center justify-center">
               
               {/* 1. Der Kreis */}
               <div className="bg-white w-12 h-12 rounded-full border-4 border-green-700 shadow-xl flex items-center justify-center text-2xl z-10 relative">
                 🕌
               </div>
               
               {/* 2. Die kleine Spitze unten dran (damit es wie ein Pin aussieht) */}
               <div className="absolute -bottom-1 w-4 h-4 bg-green-700 transform rotate-45 z-0"></div>
            
            </div>

          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}