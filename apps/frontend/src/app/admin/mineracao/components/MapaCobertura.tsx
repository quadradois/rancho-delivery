'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mineracaoApi } from '@/lib/api';
import api from '@/lib/api';

interface BairroCobertura {
  nome: string;
  totalImoveis: number;
  totalLeads: number;
  totalClientes: number;
  taxaPenetracao: number;
  centroide: { lat: number; lng: number } | null;
  nivelCobertura: 'VIRGEM' | 'BAIXO' | 'MEDIO' | 'ALTO';
}

const LOJA_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:50% 50% 50% 0;
    background:#16a34a;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    transform:rotate(-45deg);
    display:flex;align-items:center;justify-content:center;
  "><span style="transform:rotate(45deg);font-size:16px;line-height:1;">🏪</span></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const CLIENTE_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:14px;height:14px;border-radius:50%;
    background:#3b82f6;border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const GOIANIA_DEFAULT: [number, number] = [-16.6864, -49.2643];

const COR_NIVEL: Record<string, string> = {
  VIRGEM: '#9ca3af',
  BAIXO: '#facc15',
  MEDIO: '#f97316',
  ALTO: '#22c55e',
};

interface Props {
  onMinerarBairro: (bairro: string) => void;
}

export default function MapaCobertura({ onMinerarBairro }: Props) {
  const [bairros, setBairros] = useState<BairroCobertura[]>([]);
  const [confirmar, setConfirmar] = useState<BairroCobertura | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [loja, setLoja] = useState<{ endereco: string | null; lat: number | null; lng: number | null } | null>(null);
  const [clientes, setClientes] = useState<Array<{ telefone: string; nome: string; endereco: string; lat: number; lng: number; totalPedidos: number }>>([]);

  function carregarBairros() {
    setCarregando(true);
    mineracaoApi.coberturaMapa()
      .then((data) => setBairros(data.filter((b: BairroCobertura) => b.centroide)))
      .catch(() => {})
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarBairros();
    api.adminPedidos.obterLocalizacaoLoja().then(setLoja).catch(() => {});
    api.adminPedidos.clientesGeolocalizados().then(setClientes).catch(() => {});
  }, []);

  async function iniciarSincronizacao() {
    setSincronizando(true);
    setProgresso(0);
    try {
      const { runId } = await mineracaoApi.sincronizarCoordenadas();
      const iv = setInterval(async () => {
        try {
          const job = await mineracaoApi.obterStatusJob(runId);
          setProgresso(job.progresso?.percentual ?? 0);
          if (job.status === 'CONCLUIDO' || job.status === 'FALHA') {
            clearInterval(iv);
            setSincronizando(false);
            setProgresso(null);
            carregarBairros();
          }
        } catch { clearInterval(iv); setSincronizando(false); setProgresso(null); }
      }, 3000);
    } catch {
      setSincronizando(false);
      setProgresso(null);
    }
  }

  if (carregando) {
    return <div className="h-96 flex items-center justify-center text-gray-400">Carregando mapa...</div>;
  }

  if (bairros.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4 text-gray-400">
        <p>Sem dados de cobertura. Sincronize as coordenadas para ver o mapa.</p>
        <button
          onClick={() => void iniciarSincronizacao()}
          disabled={sincronizando}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {sincronizando ? `Sincronizando... ${progresso ?? 0}%` : 'Sincronizar coordenadas'}
        </button>
        {sincronizando && (
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${progresso ?? 0}%` }} />
          </div>
        )}
      </div>
    );
  }

  const mapCenter: [number, number] =
    loja?.lat && loja?.lng ? [loja.lat, loja.lng] : GOIANIA_DEFAULT;

  return (
    <div className="relative">
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{ height: '480px', width: '100%', borderRadius: '8px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {loja?.lat && loja?.lng ? (
          <Marker position={[loja.lat, loja.lng]} icon={LOJA_ICON}>
            <Tooltip permanent direction="top" offset={[0, -36]}>
              <span className="text-xs font-semibold">🏪 Rancho Delivery</span>
              {loja.endereco ? <><br /><span className="text-xs">{loja.endereco}</span></> : null}
            </Tooltip>
          </Marker>
        ) : null}
        {clientes.map((c) => (
          <Marker key={c.telefone} position={[c.lat, c.lng]} icon={CLIENTE_ICON}>
            <Tooltip direction="top" offset={[0, -8]}>
              <div className="text-xs">
                <strong>{c.nome}</strong><br />
                {c.endereco}<br />
                {c.totalPedidos} {c.totalPedidos === 1 ? 'pedido' : 'pedidos'}
              </div>
            </Tooltip>
          </Marker>
        ))}
        {bairros.map((b) =>
          b.centroide ? (
            <CircleMarker
              key={b.nome}
              center={[b.centroide.lat, b.centroide.lng]}
              radius={Math.max(6, Math.min(20, Math.sqrt(b.totalImoveis / 50)))}
              pathOptions={{
                color: COR_NIVEL[b.nivelCobertura],
                fillColor: COR_NIVEL[b.nivelCobertura],
                fillOpacity: 0.7,
                weight: 1,
              }}
              eventHandlers={{
                click: () => {
                  if (b.nivelCobertura === 'VIRGEM' || b.nivelCobertura === 'BAIXO') {
                    setConfirmar(b);
                  }
                },
              }}
            >
              <Tooltip>
                <div className="text-xs">
                  <strong>{b.nome}</strong><br />
                  {b.totalImoveis.toLocaleString()} imóveis · {b.totalLeads} leads · {b.totalClientes} clientes<br />
                  Penetração: {(b.taxaPenetracao * 100).toFixed(1)}% — <span style={{ color: COR_NIVEL[b.nivelCobertura] }}>{b.nivelCobertura}</span>
                </div>
              </Tooltip>
            </CircleMarker>
          ) : null
        )}
      </MapContainer>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500 items-center">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
          Clientes ({clientes.length})
        </span>
        {Object.entries(COR_NIVEL).map(([nivel, cor]) => (
          <span key={nivel} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: cor }} />
            {nivel}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-3">
          {sincronizando && (
            <span className="flex items-center gap-2">
              <span>Sincronizando {progresso ?? 0}%</span>
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-1.5 bg-green-500 rounded-full transition-all" style={{ width: `${progresso ?? 0}%` }} />
              </div>
            </span>
          )}
          <button
            onClick={() => void iniciarSincronizacao()}
            disabled={sincronizando}
            className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:border-green-500 hover:text-green-600 disabled:opacity-40 transition-colors"
          >
            {sincronizando ? 'Sincronizando...' : 'Sincronizar coordenadas'}
          </button>
          <span>· Clique em VIRGEM/BAIXO para minerar</span>
          {!loja?.lat && (
            <a
              href="/admin/configuracoes"
              className="ml-2 px-3 py-1 text-xs border border-yellow-400 text-yellow-700 rounded-full hover:bg-yellow-50 transition-colors"
            >
              Defina a localização da loja →
            </a>
          )}
        </span>
      </div>

      {confirmar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="font-semibold text-gray-900 mb-2">Minerar {confirmar.nome}?</h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmar.totalImoveis.toLocaleString()} imóveis neste bairro serão processados.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmar(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onMinerarBairro(confirmar.nome); setConfirmar(null); }}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
