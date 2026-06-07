import crypto from 'crypto';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../config/logger';
import prisma from '../config/database';

interface EnviarMensagemInput {
  numero: string;
  mensagem: string;
  conexao?: string; // nome da conexão a usar; ausente = conexão principal
}

interface InstanciaResolvida {
  id: string;
  token: string;
  name: string;
}

// Configurações da instância (forma usada pelo painel/admin)
interface ConfigInstancia {
  rejectCall?: boolean;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

export class EvolutionService {
  private api: AxiosInstance;
  // Evolution Go tem auth em 2 níveis:
  //  - GLOBAL_API_KEY → endpoints de gestão (/instance/all, /instance/create, /instance/delete)
  //  - token da instância → endpoints por-instância (/send/text, /instance/status, /qr, /connect...)
  private globalKey: string;
  private webhookUrl: string;
  private webhookEvents: string[];
  // Cache de id+token por NOME de instância (suporta várias conexões)
  private cache = new Map<string, InstanciaResolvida>();

  constructor() {
    this.globalKey = process.env.EVOLUTION_API_KEY || '';
    this.webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || '';
    this.webhookEvents = (process.env.WHATSAPP_WEBHOOK_EVENTS || 'MESSAGE,CONNECTION')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    this.api = axios.create({
      baseURL: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
    });

    logger.info('EvolutionService inicializado (Evolution Go)');
  }

  private cfgGlobal(extra?: AxiosRequestConfig): AxiosRequestConfig {
    return { ...extra, headers: { ...extra?.headers, apikey: this.globalKey } };
  }

  /** Nome da conexão a usar: o informado, ou a principal do banco (fallback: única cadastrada). */
  private async resolverNome(nome?: string): Promise<string> {
    if (nome) return nome;
    const principal = await (prisma as any).conexaoWhatsApp.findFirst({ where: { principal: true } });
    if (principal?.nome) return principal.nome;
    const todas = await (prisma as any).conexaoWhatsApp.findMany({ take: 2, select: { nome: true } });
    if (todas.length === 1) return todas[0].nome;
    throw new Error('Nenhuma conexão WhatsApp principal definida');
  }

  /** Descobre id+token de uma instância pelo NOME via /instance/all (auth global). Cacheia. */
  private async resolverInstancia(nome: string, forcar = false): Promise<InstanciaResolvida> {
    if (!forcar) {
      const c = this.cache.get(nome);
      if (c) return c;
    }
    const resp = await this.api.get('/instance/all', this.cfgGlobal());
    const lista: any[] = resp.data?.data || [];
    const alvo = lista.find((i) => i?.name === nome);
    if (!alvo?.token) {
      throw new Error(`Instância '${nome}' não encontrada no servidor Evolution (disponíveis: ${lista.map((i) => i?.name).join(', ')})`);
    }
    const r: InstanciaResolvida = { id: alvo.id, token: alvo.token, name: alvo.name };
    this.cache.set(nome, r);
    return r;
  }

  /** Config axios autenticando com o token da instância (per-instância). */
  private async cfgInstancia(nome: string, extra?: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    const inst = await this.resolverInstancia(nome);
    return { ...extra, headers: { ...extra?.headers, apikey: inst.token } };
  }

  /** Cria uma instância no Evolution Go (gestão → chave global). */
  async criarInstancia(nome: string): Promise<boolean> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      await this.api.post('/instance/create', { name: nome, token }, this.cfgGlobal());
      this.cache.delete(nome);
      logger.info('Instância WhatsApp criada', { nome });
      return true;
    } catch (error: any) {
      logger.error('Erro ao criar instância WhatsApp:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Envia mensagem de texto via WhatsApp (pela conexão informada ou pela principal)
   */
  async enviarMensagem(dados: EnviarMensagemInput): Promise<boolean> {
    const r = await this.enviarMensagemDetalhado(dados);
    return r.ok;
  }

  async enviarMensagemDetalhado(dados: EnviarMensagemInput): Promise<{ ok: boolean; motivo?: string; transitorio?: boolean; status?: number | null }> {
    const digits = dados.numero.replace(/\D/g, '');
    const numeroFormatado = digits.startsWith('55') ? digits : `55${digits}`;
    const payload = { number: numeroFormatado, text: dados.mensagem };

    let nome: string;
    try {
      nome = await this.resolverNome(dados.conexao);
    } catch (e: any) {
      logger.error('Envio WhatsApp sem conexão definida:', e?.message);
      return { ok: false, motivo: 'SEM_CONEXAO', transitorio: false, status: null };
    }

    let ultimoStatus: number | null = null;
    let ultimoMotivo = 'ERRO_DESCONHECIDO';

    for (let tentativa = 0; tentativa <= 2; tentativa++) {
      try {
        const response = await this.api.post('/send/text', payload, await this.cfgInstancia(nome));
        const ok = response.status === 200 || response.status === 201;
        if (ok) {
          logger.info(`Mensagem WhatsApp enviada para ${numeroFormatado} (conexão ${nome})`);
          return { ok: true, status: response.status };
        }
        ultimoStatus = response.status;
        ultimoMotivo = `HTTP_${response.status}`;
      } catch (error: any) {
        const status = error?.response?.status ?? null;
        ultimoStatus = status;
        const providerData = error?.response?.data;
        const providerMsg = (providerData?.message || providerData?.error || error?.message || '').toString().toLowerCase();

        // Token pode ter rotacionado — invalida cache e re-resolve no próximo retry
        if (status === 401) this.cache.delete(nome);

        if (status === 400 && /(not.*exists|invalid.*number|wrong.*format)/.test(providerMsg)) {
          ultimoMotivo = 'NUMERO_INVALIDO';
        } else if (status === 401 || status === 403) {
          ultimoMotivo = 'INSTANCIA_NAO_AUTORIZADA';
        } else if (/instance.*not.*connected|disconnected|close|not.*logged/.test(providerMsg)) {
          ultimoMotivo = 'INSTANCIA_DESCONECTADA';
        } else if (status === 429) {
          ultimoMotivo = 'RATE_LIMIT';
        } else if (status && status >= 500) {
          ultimoMotivo = `EVOLUTION_${status}`;
        } else if (status && status >= 400 && status < 500) {
          ultimoMotivo = `CLIENTE_${status}`;
        } else if (!status) {
          ultimoMotivo = 'REDE';
        }

        const providerError = { status, message: error?.message, data: providerData, numero: numeroFormatado, conexao: nome, motivo: ultimoMotivo };

        if (status && status >= 400 && status < 500 && status !== 429 && status !== 401) {
          logger.error('Erro ao enviar mensagem WhatsApp (4xx, sem retry):', providerError);
          return { ok: false, motivo: ultimoMotivo, transitorio: false, status };
        }
        if (tentativa < 2) {
          const delay = 800 * 2 ** tentativa;
          logger.warn(`WhatsApp: tentativa ${tentativa + 1}/2 falhou (${ultimoMotivo}) — retry em ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          logger.error('Erro ao enviar mensagem WhatsApp após retries:', providerError);
        }
      }
    }
    return { ok: false, motivo: ultimoMotivo, transitorio: true, status: ultimoStatus };
  }

  /** GET /instance/status (token) → data.Connected / data.LoggedIn */
  private async lerStatus(nome: string): Promise<{ conectado: boolean; socket: boolean; nome: string }> {
    const response = await this.api.get('/instance/status', await this.cfgInstancia(nome));
    const d = response.data?.data || {};
    return {
      conectado: d.LoggedIn === true, // logado no WhatsApp (consegue enviar). Connected = só o socket.
      socket: d.Connected === true,
      nome: d.Name || nome,
    };
  }

  async verificarConexao(nome?: string): Promise<boolean> {
    try {
      const n = await this.resolverNome(nome);
      const { conectado } = await this.lerStatus(n);
      logger[conectado ? 'info' : 'warn'](conectado ? 'WhatsApp conectado' : 'WhatsApp desconectado');
      return conectado;
    } catch (error: any) {
      logger.error('Erro ao verificar conexão WhatsApp:', error.response?.data || error.message);
      return false;
    }
  }

  async obterStatusInstancia(nome?: string) {
    let n = nome;
    try {
      n = await this.resolverNome(nome);
      const { conectado, nome: nm } = await this.lerStatus(n);
      return { instanceName: nm, conectado, state: conectado ? 'open' : 'close' };
    } catch (error: any) {
      logger.error('Erro ao obter status detalhado do WhatsApp:', error.response?.data || error.message);
      return { instanceName: n || '', conectado: false, state: 'not_found' };
    }
  }

  /**
   * Garante a instância (cria se não existir), configura webhook e retorna QR se não estiver logado.
   */
  async garantirInstanciaEObterQrCode(nome?: string) {
    const n = await this.resolverNome(nome);

    // Cria a instância se ela ainda não existir no Evolution Go
    try {
      await this.resolverInstancia(n, true);
    } catch {
      const criada = await this.criarInstancia(n);
      if (!criada) {
        throw new Error(`Falha ao criar instância '${n}' no servidor Evolution`);
      }
      await this.resolverInstancia(n, true);
    }

    const status = await this.obterStatusInstancia(n);
    if (status.conectado) {
      return { instanceName: status.instanceName, state: status.state, conectado: true, qrCodeBase64: null as string | null };
    }
    await this.configurarConexao(n).catch(() => null);
    const qr = await this.obterQrCode(n);
    if (!qr) {
      throw new Error(`QR Code não retornado pela Evolution para a instância '${n}'`);
    }
    return { instanceName: status.instanceName, state: status.state, conectado: false, qrCodeBase64: qr };
  }

  /** POST /instance/connect (token) — webhook + eventos */
  async configurarConexao(nome?: string): Promise<boolean> {
    try {
      const n = await this.resolverNome(nome);
      await this.api.post(
        '/instance/connect',
        { webhookUrl: this.webhookUrl || undefined, subscribe: this.webhookEvents },
        await this.cfgInstancia(n),
      );
      logger.info('Instância WhatsApp conectada/configurada', { conexao: n, webhookUrl: this.webhookUrl });
      return true;
    } catch (error: any) {
      logger.error('Erro ao configurar conexão WhatsApp:', error.response?.data || error.message);
      return false;
    }
  }

  async obterQrCode(nome?: string): Promise<string | null> {
    try {
      const n = await this.resolverNome(nome);
      // Evolution Go: GET /instance/qr (token) → data.Qrcode (data URI) + data.Code
      const response = await this.api.get('/instance/qr', await this.cfgInstancia(n));
      const qr = response.data?.data?.Qrcode || response.data?.Qrcode || null;
      if (!qr) return null;
      const s = String(qr);
      return s.startsWith('data:') ? s : `data:image/png;base64,${s}`;
    } catch (error: any) {
      logger.error('Erro ao obter QR Code da instância WhatsApp:', error.response?.data || error.message);
      return null;
    }
  }

  async desconectarInstancia(nome?: string): Promise<boolean> {
    try {
      const n = await this.resolverNome(nome);
      // Evolution Go: POST /instance/disconnect (token) — desloga mas mantém a instância
      await this.api.post('/instance/disconnect', {}, await this.cfgInstancia(n));
      logger.info('Instância WhatsApp desconectada', { conexao: n });
      return true;
    } catch (error: any) {
      logger.error('Erro ao desconectar instância WhatsApp:', error.response?.data || error.message);
      return false;
    }
  }

  async apagarInstancia(nome?: string): Promise<boolean> {
    try {
      const n = await this.resolverNome(nome);
      const inst = await this.resolverInstancia(n);
      // DELETE /instance/delete/{instanceId} (gestão → chave global)
      await this.api.delete(`/instance/delete/${inst.id}`, this.cfgGlobal());
      this.cache.delete(n);
      logger.info('Instância WhatsApp apagada', { conexao: n, instanceId: inst.id });
      return true;
    } catch (error: any) {
      logger.error('Erro ao apagar instância WhatsApp:', error.response?.data || error.message);
      return false;
    }
  }

  async obterDetalhesInstancia(nome?: string) {
    let n = nome;
    try {
      n = await this.resolverNome(nome);
      const resp = await this.api.get('/instance/all', this.cfgGlobal());
      const lista: any[] = resp.data?.data || [];
      const inst = lista.find((i) => i?.name === n) || {};
      if (inst.id) this.cache.set(n, { id: inst.id, token: inst.token, name: inst.name });
      const conectado = inst.connected === true;
      return {
        instanceName: inst.name || n,
        existe: Boolean(inst.id),
        conectado,
        state: conectado ? 'open' : 'close',
        telefone: inst.jid ? String(inst.jid).split('@')[0].split(':')[0] : null,
        nomePerfil: inst.name || null,
        fotoPerfil: null as string | null,
        ultimaConexao: inst.createdAt || null,
      };
    } catch (error: any) {
      logger.error('Erro ao obter detalhes da instância WhatsApp:', error.response?.data || error.message);
      return {
        instanceName: n || '',
        existe: false, conectado: false, state: 'close',
        telefone: null, nomePerfil: null, fotoPerfil: null, ultimaConexao: null,
      };
    }
  }

  /** GET /instance/{id}/advanced-settings (token) → mapeia p/ a forma do painel */
  async obterConfigInstancia(nome?: string): Promise<ConfigInstancia> {
    try {
      const n = await this.resolverNome(nome);
      const inst = await this.resolverInstancia(n);
      const resp = await this.api.get(`/instance/${inst.id}/advanced-settings`, await this.cfgInstancia(n));
      const s = resp.data?.data || resp.data || {};
      return {
        rejectCall: Boolean(s.rejectCall),
        groupsIgnore: Boolean(s.ignoreGroups),
        alwaysOnline: Boolean(s.alwaysOnline),
        readMessages: Boolean(s.readMessages),
        readStatus: Boolean(s.ignoreStatus),
      };
    } catch (error: any) {
      logger.warn('Erro ao obter configurações da instância:', error.response?.data || error.message);
      return {};
    }
  }

  /** PUT /instance/{id}/advanced-settings (token) — mapeia chaves do painel p/ o Go */
  async atualizarConfigInstancia(configs: ConfigInstancia, nome?: string): Promise<boolean> {
    try {
      const n = await this.resolverNome(nome);
      const inst = await this.resolverInstancia(n);
      const body = {
        rejectCall: configs.rejectCall,
        ignoreGroups: configs.groupsIgnore,
        alwaysOnline: configs.alwaysOnline,
        readMessages: configs.readMessages,
        ignoreStatus: configs.readStatus,
      };
      await this.api.put(`/instance/${inst.id}/advanced-settings`, body, await this.cfgInstancia(n));
      logger.info('Configurações da instância WhatsApp atualizadas', { conexao: n, body });
      return true;
    } catch (error: any) {
      logger.error('Erro ao atualizar configurações da instância:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Formata mensagem de novo pedido
   */
  formatarMensagemPedido(pedido: any): string {
    const { id, cliente, itens, subtotal, taxaEntrega, total, observacao } = pedido;

    let mensagem = `🟢 *NOVO PEDIDO - Rancho*\n\n`;
    mensagem += `📋 *Pedido:* #${id.slice(-8)}\n\n`;

    mensagem += `👤 *Cliente:* ${cliente.nome}\n`;
    mensagem += `📱 *WhatsApp:* ${this.formatarTelefone(cliente.telefone)}\n`;
    mensagem += `📍 *Endereço:* ${cliente.endereco}\n`;
    mensagem += `🏘️ *Bairro:* ${cliente.bairro}\n`;
    mensagem += `💰 *Taxa de Entrega:* R$ ${Number(taxaEntrega).toFixed(2)}\n\n`;

    mensagem += `🍽️ *Itens do Pedido:*\n`;
    itens.forEach((item: any) => {
      mensagem += `\n• ${item.quantidade}x ${item.produto.nome}`;
      if (item.observacao) {
        mensagem += `\n  _Obs: ${item.observacao}_`;
      }
      mensagem += `\n  R$ ${Number(item.precoUnit).toFixed(2)} cada = R$ ${Number(item.subtotal).toFixed(2)}`;
    });

    mensagem += `\n\n💵 *Subtotal:* R$ ${Number(subtotal).toFixed(2)}`;
    mensagem += `\n🚚 *Taxa:* R$ ${Number(taxaEntrega).toFixed(2)}`;
    mensagem += `\n✅ *TOTAL:* R$ ${Number(total).toFixed(2)}`;

    if (observacao) {
      mensagem += `\n\n📝 *Observação:*\n${observacao}`;
    }

    mensagem += `\n\n💳 *Pagamento:* CONFIRMADO`;
    mensagem += `\n⏰ *Horário:* ${new Date().toLocaleString('pt-BR')}`;

    return mensagem;
  }

  /**
   * Formata telefone para exibição
   */
  private formatarTelefone(telefone: string): string {
    const limpo = telefone.replace(/\D/g, '');

    if (limpo.length === 13) {
      return `+${limpo.slice(0, 2)} (${limpo.slice(2, 4)}) ${limpo.slice(4, 9)}-${limpo.slice(9)}`;
    } else if (limpo.length === 11) {
      return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
    }

    return telefone;
  }

  /**
   * Notifica dono sobre novo pedido (conexão principal)
   */
  async notificarNovoPedido(pedido: any): Promise<boolean> {
    try {
      const numeroDono = process.env.WHATSAPP_DONO;

      if (!numeroDono) {
        logger.warn('WHATSAPP_DONO não configurado - notificação não enviada');
        return false;
      }

      const mensagem = this.formatarMensagemPedido(pedido);
      const enviado = await this.enviarMensagem({ numero: numeroDono, mensagem });

      if (enviado) {
        logger.info(`Notificação de pedido ${pedido.id} enviada para o dono`);
      } else {
        logger.error(`Falha ao enviar notificação do pedido ${pedido.id}`);
      }

      return enviado;
    } catch (error) {
      logger.error('Erro ao notificar novo pedido:', error);
      return false;
    }
  }

  formatarMensagemStatusPedido(pedido: any, status: string, motivoCancelamento?: string): string | null {
    const nome = pedido?.cliente?.nome || 'cliente';
    const numeroPedido = String(pedido?.numero || pedido?.id || '').replace('#', '');
    const pedidoRef = numeroPedido ? `#${numeroPedido}` : 'seu pedido';

    if (status === 'AGUARDANDO_PAGAMENTO') {
      return `Olá ${nome}! Recebemos ${pedidoRef} e estamos aguardando a confirmação do pagamento.`;
    }
    if (status === 'CONFIRMADO') {
      return `Olá ${nome}! Pagamento confirmado. ${pedidoRef} entrou na fila da cozinha.`;
    }
    if (status === 'PREPARANDO') {
      return `Olá ${nome}! ${pedidoRef} já está em preparo na cozinha.`;
    }
    if (status === 'PRONTO') {
      return `Olá ${nome}! ${pedidoRef} ficou pronto e será despachado em instantes.`;
    }
    if (status === 'SAIU_ENTREGA') {
      return `Olá ${nome}! ${pedidoRef} saiu para entrega.`;
    }
    if (status === 'ENTREGUE') {
      return `Pedido entregue! ${nome}, bom apetite!`;
    }
    if (status === 'CANCELADO') {
      const base = `Infelizmente precisamos cancelar ${pedidoRef}${motivoCancelamento ? `: ${motivoCancelamento}` : '.'}`;
      return `${base} Se o pagamento já foi feito, nossa equipe vai tratar o estorno com você.`;
    }
    if (status === 'EXPIRADO' || status === 'ABANDONADO') {
      return `Olá ${nome}! O pagamento do ${pedidoRef} não foi confirmado dentro do prazo e o pedido foi cancelado automaticamente. Se quiser, te ajudamos a finalizar agora.`;
    }

    return null;
  }

  async notificarClienteStatusPedido(pedido: any, status: string, motivoCancelamento?: string): Promise<boolean> {
    try {
      const numero = pedido?.cliente?.telefone;
      if (!numero) {
        logger.warn('Cliente sem telefone para notificação de status', { pedidoId: pedido?.id, status });
        return false;
      }

      const mensagem = this.formatarMensagemStatusPedido(pedido, status, motivoCancelamento);
      if (!mensagem) return false;

      const enviado = await this.enviarMensagem({ numero, mensagem });
      if (enviado) {
        logger.info('Mensagem automática de status enviada ao cliente', { pedidoId: pedido?.id, status });
      } else {
        logger.warn('Falha ao enviar mensagem automática de status ao cliente', { pedidoId: pedido?.id, status });
      }

      return enviado;
    } catch (error) {
      logger.error('Erro ao notificar cliente por status do pedido:', error);
      return false;
    }
  }
}

export default new EvolutionService();
