import { Router, type Router as ExpressRouter } from 'express';
import adminClienteController from '../controllers/admin.cliente.controller';

const router: ExpressRouter = Router();

router.get('/whatsapp/status', adminClienteController.statusWhatsApp.bind(adminClienteController));
router.post('/whatsapp/setup', adminClienteController.prepararConexaoWhatsApp.bind(adminClienteController));
router.post('/whatsapp/qrcode', adminClienteController.atualizarQrCodeWhatsApp.bind(adminClienteController));
router.get('/conversas/nao-lidas', adminClienteController.conversasNaoLidas.bind(adminClienteController));
router.get('/clientes/buscar', adminClienteController.buscarClienteRapido.bind(adminClienteController));
router.get('/clientes/:telefone/mensagens', adminClienteController.listarMensagens.bind(adminClienteController));
router.post('/clientes/:telefone/mensagens', adminClienteController.enviarMensagem.bind(adminClienteController));
router.get('/clientes/:telefone', adminClienteController.resumoCliente.bind(adminClienteController));
router.post('/clientes/:telefone/lista-negra', adminClienteController.adicionarListaNegra.bind(adminClienteController));
router.patch('/clientes/:telefone/lista-negra/nivel', adminClienteController.atualizarNivelListaNegra.bind(adminClienteController));
router.get('/clientes/:telefone/lista-negra/ocorrencias', adminClienteController.listarOcorrencias.bind(adminClienteController));
router.delete('/clientes/:telefone/lista-negra', adminClienteController.removerListaNegra.bind(adminClienteController));

export default router;
