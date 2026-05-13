'use client';

import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MOTOBOY_ICON = L.divIcon({
  className: '',
  html: '<div style="width:40px;height:40px;background:#e8231a;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:20px">🛵</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface Props {
  lat: number;
  lng: number;
  nome: string;
}

export default function MapaRastreioCliente({ lat, lng, nome }: Props) {
  return (
    <MapContainer
      key={`${lat}-${lng}`}
      center={[lat, lng]}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
      zoomControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={MOTOBOY_ICON}>
        <Tooltip permanent direction="top" offset={[0, -24]}>
          🛵 {nome} está chegando!
        </Tooltip>
      </Marker>
    </MapContainer>
  );
}
