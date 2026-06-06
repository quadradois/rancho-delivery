import { Router, type Router as ExpressRouter } from 'express';
import adminClienteController from '../controllers/admin.cliente.controller';

const router: ExpressRouter = Router();

router.get('/whatsapp/status', adminClienteController.statusWhatsApp.bind(adminClienteController));
router.post('/whatsapp/setup', adminClienteController.prepararConexaoWhatsApp.bind(adminClienteController));
router.post('/whatsapp/qrcode', adminClienteController.atualizarQrCodeWhatsApp.bind(adminClienteController));
router.get('/whatsapp/detalhes', adminClienteController.detalhesWhatsApp.bind(adminClienteController));
router.post('/whatsapp/desconectar', adminClienteController.desconectarWhatsApp.bind(adminClienteController));
router.delete('/whatsapp/apagar', adminClienteController.apagarWhatsApp.bind(adminClienteController));
router.patch('/whatsapp/config', adminClienteController.atualizarConfigWhatsApp.bind(adminClienteController));
// Conexões WhatsApp (multi-instância)
router.get('/whatsapp/conexoes', adminClienteController.listarConexoesWhatsApp.bind(adminClienteController));
router.post('/whatsapp/conexoes', adminClienteController.criarConexaoWhatsApp.bind(adminClienteController));
router.get('/whatsapp/conexoes/:nome/qrcode', adminClienteController.qrcodeConexaoWhatsApp.bind(adminClienteController));
router.get('/whatsapp/conexoes/:nome/detalhes', adminClienteController.detalhesConexaoWhatsApp.bind(adminClienteController));
router.post('/whatsapp/conexoes/:nome/desconectar', adminClienteController.desconectarConexaoWhatsApp.bind(adminClienteController));
router.patch('/whatsapp/conexoes/:nome/principal', adminClienteController.definirPrincipalWhatsApp.bind(adminClienteController));
router.patch('/whatsapp/conexoes/:nome/config', adminClienteController.configConexaoWhatsApp.bind(adminClienteController));
router.delete('/whatsapp/conexoes/:nome', adminClienteController.apagarConexaoWhatsApp.bind(adminClienteController));
router.get('/conversas', adminClienteController.listarTodasConversas.bind(adminClienteController));
router.get('/conversas/nao-lidas', adminClienteController.conversasNaoLidas.bind(adminClienteController));
router.get('/leads/:leadId/mensagens', adminClienteController.listarMensagensLead.bind(adminClienteController));
router.post('/clientes', adminClienteController.criarManual.bind(adminClienteController));
router.get('/clientes', adminClienteController.listarGestao.bind(adminClienteController));
router.get('/clientes/metricas', adminClienteController.metricasGestao.bind(adminClienteController));
router.get('/clientes/buscar', adminClienteController.buscarClienteRapido.bind(adminClienteController));
router.patch('/clientes/:telefone/ativo', adminClienteController.atualizarAtivo.bind(adminClienteController));
router.delete('/clientes/:telefone', adminClienteController.excluir.bind(adminClienteController));
router.get('/clientes/:telefone/mensagens', adminClienteController.listarMensagens.bind(adminClienteController));
router.post('/clientes/:telefone/mensagens', adminClienteController.enviarMensagem.bind(adminClienteController));
router.get('/clientes/:telefone', adminClienteController.resumoCliente.bind(adminClienteController));
router.post('/clientes/:telefone/lista-negra', adminClienteController.adicionarListaNegra.bind(adminClienteController));
router.patch('/clientes/:telefone/lista-negra/nivel', adminClienteController.atualizarNivelListaNegra.bind(adminClienteController));
router.get('/clientes/:telefone/lista-negra/ocorrencias', adminClienteController.listarOcorrencias.bind(adminClienteController));
router.delete('/clientes/:telefone/lista-negra', adminClienteController.removerListaNegra.bind(adminClienteController));

export default router;
