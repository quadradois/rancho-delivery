import { EventEmitter } from 'events';

export type RealtimeEventName =
  | 'pedido:novo'
  | 'pedido:atualizado'
  | 'mensagem:nova'
  | 'metricas:atualizadas'
  | 'loja:status'
  | 'mineracao:progresso'
  | 'campanha:envio_progresso'
  | 'campanha:envio_concluido'
  | 'lead:mensagem'
  | 'motoboy:localizacao'
  | 'entregador:novo_pedido';

interface RealtimeEventPayload {
  type: RealtimeEventName;
  data: any;
  timestamp: string;
}

class RealtimeService {
  private emitter = new EventEmitter();
  private ultimasPosicoes = new Map<string, { lat: number; lng: number; nome: string; ts: number }>();

  subscribe(listener: (event: RealtimeEventPayload) => void) {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }

  emit(type: RealtimeEventName, data: any) {
    if (type === 'motoboy:localizacao' && data?.motoboyId) {
      this.ultimasPosicoes.set(data.motoboyId, {
        lat: data.lat,
        lng: data.lng,
        nome: data.nome,
        ts: data.ts ?? Date.now(),
      });
    }
    this.emitter.emit('event', {
      type,
      data,
      timestamp: new Date().toISOString(),
    } satisfies RealtimeEventPayload);
  }

  getUltimaPosicao(motoboyId: string) {
    return this.ultimasPosicoes.get(motoboyId) ?? null;
  }
}

export default new RealtimeService();
