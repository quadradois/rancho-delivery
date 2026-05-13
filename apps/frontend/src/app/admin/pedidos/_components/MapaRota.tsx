'use client';

import { GrupoRota } from '@/lib/api';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const LOJA_ICON = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;background:#16a34a;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:14px">🏪</span></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function paradaIcon(ordem: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;background:#2563eb;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:11px;font-weight:bold;color:white">${ordem}</span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

interface Props {
  grupo: GrupoRota;
}

export default function MapaRota({ grupo }: Props) {
  const { lojaLat, lojaLng, pedidos } = grupo;

  const pontos: [number, number][] = [
    [lojaLat, lojaLng],
    ...pedidos.filter((p) => p.lat != null && p.lng != null).map((p) => [p.lat!, p.lng!] as [number, number]),
  ];

  return (
    <MapContainer
      center={[lojaLat, lojaLng]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Loja */}
      <Marker position={[lojaLat, lojaLng]} icon={LOJA_ICON}>
        <Tooltip permanent direction="top" offset={[0, -30]}>Loja (partida)</Tooltip>
      </Marker>

      {/* Paradas */}
      {pedidos.map((parada) =>
        parada.lat != null && parada.lng != null ? (
          <Marker
            key={parada.pedidoId}
            position={[parada.lat, parada.lng]}
            icon={paradaIcon(parada.ordem)}
          >
            <Tooltip direction="top" offset={[0, -26]}>
              <strong>{parada.clienteNome}</strong><br />
              {parada.enderecoEntrega}
            </Tooltip>
          </Marker>
        ) : null
      )}

      {/* Linha de rota */}
      {pontos.length > 1 && (
        <Polyline positions={pontos} color="#2563eb" weight={2} dashArray="6 4" />
      )}
    </MapContainer>
  );
}
