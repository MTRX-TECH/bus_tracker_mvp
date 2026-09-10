import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

// Generate custom SVG HTML markers to render crisp buses without needing external icon downloads
const createCustomBusIcon = (heading: number = 0, isDelayed: boolean = false) => {
  const color = isDelayed ? "#F43F5E" : "#D4AF37"; // Rose for delayed, Gold for normal
  const svgIcon = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" fill="${color}" stroke="#000000" stroke-width="3"/>
      <g transform="rotate(${heading}, 20, 20)">
        <path d="M20 10 L26 25 L20 22 L14 25 Z" fill="#000000"/>
      </g>
    </svg>
  `;
  return L.divIcon({
    className: "custom-bus-marker",
    html: svgIcon,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const stopIcon = L.divIcon({
  className: "custom-stop-marker",
  html: `<div style="width: 14px; height: 14px; background: #FFFFFF; border: 3px solid #D4AF37; border-radius: 50%;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface MapViewProps {
  buses?: Array<{
    id: string;
    busNumber: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    isDelayed?: boolean;
    etaMins?: number;
  }>;
  routeStops?: Array<{ name: string; latitude: number; longitude: number }>;
  routePolyline?: [number, number][];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  height?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  buses = [],
  routeStops = [],
  routePolyline = [],
  centerLat = 9.4975, // Default Ramco Institute of Technology campus latitude
  centerLng = 77.5582,
  zoom = 13,
  height = "450px",
}) => {
  return (
    <div style={{ height }} className="w-full rounded-xl overflow-hidden border border-gold-500/20 shadow-2xl relative z-0">
      <MapContainer center={[centerLat, centerLng]} zoom={zoom} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        {/* Zero-cost OpenStreetMap tile servers with CartoDB Dark Matter luxury styling */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Route Polyline Path */}
        {routePolyline && routePolyline.length > 1 && (
          <Polyline positions={routePolyline} pathOptions={{ color: "#D4AF37", weight: 4, opacity: 0.8, dashArray: "10, 10" }} />
        )}

        {/* Route Bus Stops */}
        {routeStops.map((stop, index) => (
          <Marker key={`stop-${index}`} position={[stop.latitude, stop.longitude]} icon={stopIcon}>
            <Popup>
              <div className="text-xs">
                <span className="font-bold text-gold-400">Stop #{index + 1}:</span>
                <p className="text-white font-medium text-sm mt-0.5">{stop.name}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Real-time Bus Markers */}
        {buses.map((bus) => (
          <Marker
            key={`bus-${bus.id}`}
            position={[bus.latitude || centerLat, bus.longitude || centerLng]}
            icon={createCustomBusIcon(bus.heading || 0, bus.isDelayed)}
          >
            <Popup>
              <div className="min-w-[180px] p-1">
                <h4 className="font-bold text-gold-400 text-sm border-b border-zinc-700 pb-1">{bus.busNumber}</h4>
                <div className="mt-2 text-xs text-silver-300 space-y-1">
                  <p><span className="text-gray-400">Speed:</span> <strong className="text-white">{bus.speed || 0} km/h</strong></p>
                  {bus.etaMins !== undefined && (
                    <p><span className="text-gray-400">Estimated ETA:</span> <strong className="text-emerald-400">{bus.etaMins} mins</strong></p>
                  )}
                  <p><span className="text-gray-400">Status:</span> {bus.isDelayed ? <span className="text-rose-400 font-bold">Delayed</span> : <span className="text-gold-400 font-medium">On Schedule</span>}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
