'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { mineracaoApi } from '@/lib/api';

type Periodo = '30d' | '90d' | 'all';

interface Analytics {
  periodo: Periodo;
  resumo: {
    totalLeads: number;
    totalConvertidos: number;
    taxaConversaoGeral: string;
  };
  porBairro: Array<{ bairro: string; leads: number; convertidos: number; taxaConversao: string }>;
  porCampanha: Array<{ campanhaId: string; nome: string; enviados: number; convertidos: number; roi: string }>;
  evolucaoSemanal: Array<{ semana: string; novosLeads: number; conversoes: number }>;
}

export default function AnalyticsTerritorios() {
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [dados, setDados] = useState<Analytics | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    mineracaoApi.analytics(periodo)
      .then(setDados)
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [periodo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Analytics de Território</h3>
        <div className="flex gap-1">
          {(['30d', '90d', 'all'] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                periodo === p
                  ? 'bg-green-600 text-white border-green-600'
                  : 'text-gray-600 border-gray-200 hover:border-green-400'
              }`}
            >
              {p === 'all' ? 'Tudo' : p}
            </button>
          ))}
        </div>
      </div>

      {carregando && (
        <div className="h-40 flex items-center justify-center text-gray-400">Carregando...</div>
      )}

      {!carregando && dados && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{dados.resumo.totalLeads.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total de Leads</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{dados.resumo.totalConvertidos.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Convertidos</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{dados.resumo.taxaConversaoGeral}</p>
              <p className="text-xs text-gray-500 mt-1">Taxa de Conversão</p>
            </div>
          </div>

          {dados.evolucaoSemanal.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Evolução Semanal</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dados.evolucaoSemanal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="novosLeads" name="Novos Leads" stroke="#6366f1" dot={false} />
                  <Line type="monotone" dataKey="conversoes" name="Conversões" stroke="#22c55e" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Sem dados para o período selecionado</p>
          )}

          {dados.porBairro.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Conversão por Bairro</p>
              <ResponsiveContainer width="100%" height={Math.max(160, dados.porBairro.slice(0, 10).length * 28)}>
                <BarChart
                  data={dados.porBairro.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 8, right: 24, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="bairro" type="category" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="leads" name="Leads" fill="#e0e7ff" />
                  <Bar dataKey="convertidos" name="Convertidos" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {dados.porCampanha.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">ROI por Campanha</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b">
                      <th className="text-left py-2 font-medium">Campanha</th>
                      <th className="text-right py-2 font-medium">Enviados</th>
                      <th className="text-right py-2 font-medium">Convertidos</th>
                      <th className="text-right py-2 font-medium">Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.porCampanha.map((c) => (
                      <tr key={c.campanhaId} className="border-b border-gray-50">
                        <td className="py-2 text-gray-700 truncate max-w-[180px]">{c.nome}</td>
                        <td className="py-2 text-right text-gray-600">{c.enviados}</td>
                        <td className="py-2 text-right text-green-600 font-medium">{c.convertidos}</td>
                        <td className="py-2 text-right text-blue-600">{c.roi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
