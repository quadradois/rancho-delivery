import { EventEmitter } from 'events';

export type RealtimeEventName = 'pedido:novo' | 'pedido:atualizado' | 'mensagem:nova' | 'metricas:atualizadas';

interface RealtimeEventPayload {
  type: RealtimeEventName;
  data: any;
  timestamp: string;
}

class RealtimeService {
  private emitter = new EventEmitter();

  subscribe(listener: (event: RealtimeEventPayload) => void) {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }

  emit(type: RealtimeEventName, data: any) {
    this.emitter.emit('event', {
      type,
      data,
      timestamp: new Date().toISOString(),
    } satisfies RealtimeEventPayload);
  }
}

export default new RealtimeService();
