'use client';

import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DESTINO_ICON = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;background:#2563eb;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface Props {
  lat: number;
  lng: number;
  nome: string;
  endereco: string;
}

export default function MapaEntregador({ lat, lng, nome, endereco }: Props) {
  return (
    <MapContainer center={[lat, lng]} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={DESTINO_ICON}>
        <Tooltip permanent direction="top" offset={[0, -30]}>
          <strong>{nome}</strong><br />{endereco}
        </Tooltip>
      </Marker>
    </MapContainer>
  );
}
