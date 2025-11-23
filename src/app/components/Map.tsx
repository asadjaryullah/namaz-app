'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;

type Props = { destinationQuery: string };

export default function Map({ destinationQuery }: Props) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [14.5058, 46.0569],
      zoom: 11,
    });
    mapRef.current = map;

    const addMarker = (lng: number, lat: number, color: string) =>
      new mapboxgl.Marker({ color }).setLngLat([lng, lat]).addTo(map);

    const fitToBounds = (a: [number, number], b: [number, number]) => {
      const bounds = new mapboxgl.LngLatBounds(a, a);
      bounds.extend(b);
      map.fitBounds(bounds, { padding: 60, animate: true });
    };

    const drawRoute = (coords: [number, number][]) => {
      const sourceId = 'route-line';
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {},
        });
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: {},
          },
        });
        map.addLayer({
          id: 'route-layer',
          type: 'line',
          source: sourceId,
          paint: { 'line-color': '#0A3D32', 'line-width': 5 },
        });
      }
    };

    async function geocodeDestination(query: string): Promise<[number, number] | null> {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=1`;
        const res = await fetch(url);
        const json = await res.json();
        const feat = json?.features?.[0];
        return feat ? (feat.center as [number, number]) : null;
      } catch { return null; }
    }

    async function getRoute(from: [number, number], to: [number, number]) {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
      const res = await fetch(url);
      const json = await res.json();
      const coords: [number, number][] = json?.routes?.[0]?.geometry?.coordinates || [];
      if (coords.length) drawRoute(coords);
    }

    (async () => {
      const dest = await geocodeDestination(destinationQuery);
      if (!dest) {
        map.setCenter([14.5058, 46.0569]);
        return;
      }
      addMarker(dest[0], dest[1], '#0A3D32');

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const from: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          const to: [number, number] = dest;
          addMarker(from[0], from[1], '#1d4ed8');
          fitToBounds(from, to);
          await getRoute(from, to);
        },
        () => { map.setCenter(dest); map.zoomTo(13); },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    })();

    return () => { map.remove(); mapRef.current = null; };
  }, [destinationQuery]);

  return <div ref={containerRef} className="mapContainer" />;
}