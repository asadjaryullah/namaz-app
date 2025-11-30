'use client';

import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { useState } from 'react';

const MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = "DEMO_MAP_ID";

// 📍 EXAKTE Position: Bashir Moschee, Zeppelinstraße 33, Bensheim
const MOSQUE_LOCATION = { 
  lat: 49.685590, 
  lng: 8.593480,
  name: "Bashir Moschee",
  address: "Zeppelinstraße 33, 64625 Bensheim"
};

export default function MapComponent() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border shadow-sm relative">
      <APIProvider apiKey={MAP_API_KEY}>
        <Map
          defaultCenter={MOSQUE_LOCATION} 
          defaultZoom={15} 
          mapId={MAP_ID}
          gestureHandling={'cooperative'}
          disableDefaultUI={true} 
        >
          {/* Der Marker */}
          <AdvancedMarker
            position={MOSQUE_LOCATION}
            title={MOSQUE_LOCATION.name}
            onClick={() => setOpen(true)}
          >
            <Pin background={'#166534'} borderColor={'#fff'} glyphColor={'#fff'} scale={1.2} />
          </AdvancedMarker>

          {/* Info-Fenster beim Klick */}
          {open && (
            <InfoWindow 
              position={MOSQUE_LOCATION} 
              onCloseClick={() => setOpen(false)}
            >
              <div className="p-2 min-w-[150px]">
                <h3 className="font-bold text-slate-900">{MOSQUE_LOCATION.name}</h3>
                <p className="text-sm text-slate-600 mt-1">{MOSQUE_LOCATION.address}</p>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${MOSQUE_LOCATION.lat},${MOSQUE_LOCATION.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline mt-2 block"
                >
                  Route berechnen ➜
                </a>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
      
      {!MAP_API_KEY && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-50">
          <p className="text-red-500 font-bold text-xs">API Key fehlt in .env.local</p>
        </div>
      )}
    </div>
  );
}