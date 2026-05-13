import { Router, type Router as ExpressRouter } from 'express';
import adminMineracaoController from '../controllers/admin.mineracao.controller';
import { autorizarAdmin } from '../middlewares/adminAuth.middleware';

const router: ExpressRouter = Router();

router.post('/executar', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.executar.bind(adminMineracaoController));
router.get('/jobs/:runId', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.obterStatusJob.bind(adminMineracaoController));
// Geo360 — carga e consulta
router.post('/geo360/sincronizar', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.sincronizarGeo360.bind(adminMineracaoController));
router.post('/geo360/enriquecer', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.enriquecerGeo360.bind(adminMineracaoController));
router.get('/geo360/status', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.statusGeo360.bind(adminMineracaoController));
router.get('/locais', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.buscarLocais.bind(adminMineracaoController));
router.get('/iptus', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.listarIptus.bind(adminMineracaoController));
router.get('/execucoes', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.listarExecucoes.bind(adminMineracaoController));
router.get('/leads', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.listarLeads.bind(adminMineracaoController));
router.get('/leads-engajados', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.listarLeadsEngajados.bind(adminMineracaoController));
router.get('/leads/:id/conversa', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.obterConversaLead.bind(adminMineracaoController));
router.post('/campanhas/gerar-mensagem', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.gerarVariacoesMensagem.bind(adminMineracaoController));
router.post('/campanhas', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.criarCampanha.bind(adminMineracaoController));
router.get('/campanhas', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.listarCampanhas.bind(adminMineracaoController));
router.get('/campanhas/:id/metricas', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.obterMetricasCampanha.bind(adminMineracaoController));
router.get('/campanhas/:id', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.obterCampanha.bind(adminMineracaoController));
router.patch('/campanhas/:id/status', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.atualizarStatusCampanha.bind(adminMineracaoController));
router.patch('/campanhas/:id/mensagem', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.atualizarMensagemCampanha.bind(adminMineracaoController));
router.post('/campanhas/:id/agendar', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.agendarCampanha.bind(adminMineracaoController));
router.post('/campanhas/:id/cancelar-agendamento', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.cancelarAgendamentoCampanha.bind(adminMineracaoController));
router.delete('/campanhas/:id', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.excluirCampanha.bind(adminMineracaoController));
router.post('/campanhas/:id/disparar', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.dispararCampanha.bind(adminMineracaoController));
router.post('/campanhas/:id/reenviar-falhas', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.reenviarFalhasCampanha.bind(adminMineracaoController));
router.post('/campanhas/:id/adicionar-lead', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.adicionarLeadManualCampanha.bind(adminMineracaoController));
router.delete('/campanhas/:id/destinatarios/:destinatarioId', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.removerDestinatarioCampanha.bind(adminMineracaoController));
router.post('/prefeitura/sincronizar-coordenadas', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.sincronizarCoordenadas.bind(adminMineracaoController));
router.get('/mapa/cobertura', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.coberturaMapa.bind(adminMineracaoController));
router.get('/analytics', autorizarAdmin('clientes:gerenciar'), adminMineracaoController.analytics.bind(adminMineracaoController));

export default router;
