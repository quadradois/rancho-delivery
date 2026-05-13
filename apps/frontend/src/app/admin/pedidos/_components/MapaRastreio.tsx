'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MotoboyLocalizacao } from '@/hooks/useCockpitSocket';

function motoboyIcon(nome: string) {
  const inicial = nome.charAt(0).toUpperCase();
  return L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:15px">${inicial}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// Move o mapa quando novas coords chegam
function MapaUpdater({ posicoes }: { posicoes: MotoboyLocalizacao[] }) {
  const map = useMap();
  const prevLen = useRef(0);
  useEffect(() => {
    if (posicoes.length === 0) return;
    if (posicoes.length !== prevLen.current) {
      prevLen.current = posicoes.length;
      const bounds = L.latLngBounds(posicoes.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [posicoes, map]);
  return null;
}

interface Props {
  posicoes: MotoboyLocalizacao[];
  lojaLat?: number | null;
  lojaLng?: number | null;
}

const LOJA_ICON = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;background:#16a34a;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px">🏪</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const DEFAULT_CENTER: [number, number] = [-16.6864, -49.2643]; // Goiânia

export default function MapaRastreio({ posicoes, lojaLat, lojaLng }: Props) {
  const center: [number, number] = posicoes.length > 0
    ? [posicoes[0].lat, posicoes[0].lng]
    : lojaLat && lojaLng
    ? [lojaLat, lojaLng]
    : DEFAULT_CENTER;

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapaUpdater posicoes={posicoes} />

      {lojaLat && lojaLng && (
        <Marker position={[lojaLat, lojaLng]} icon={LOJA_ICON}>
          <Tooltip permanent direction="top" offset={[0, -16]}>Loja</Tooltip>
        </Marker>
      )}

      {posicoes.map((p) => (
        <Marker key={p.motoboyId} position={[p.lat, p.lng]} icon={motoboyIcon(p.nome)}>
          <Tooltip permanent direction="top" offset={[0, -20]}>
            🛵 {p.nome}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
