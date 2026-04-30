import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './config/logger';
import apiRoutes from './routes';
import webhookRoutes from './routes/webhook.routes';
import { errorHandler, notFoundHandler, requestLogger } from './middlewares/error.middleware';

// Carregar variáveis de ambiente
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

function getFrontendOrigins() {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) return [];

  try {
    const url = new URL(frontendUrl);
    const origins = [url.origin];

    if (!url.hostname.startsWith('www.')) {
      url.hostname = `www.${url.hostname}`;
      origins.push(url.origin);
    }

    if (!url.hostname.startsWith('app.')) {
      url.hostname = url.hostname.replace(/^www\./, '');
      url.hostname = `app.${url.hostname}`;
      origins.push(url.origin);
    }

    return origins;
  } catch {
    return [frontendUrl];
  }
}

// Middlewares de segurança
app.use(helmet());

// Configuração de CORS
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      ...getFrontendOrigins()
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS bloqueou origem: ${origin}`);
      callback(null, true); // Em dev, permitir mesmo assim
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'asaas-access-token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
};

app.use(cors(corsOptions));

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de log de requisições
app.use(requestLogger);

// Rota de health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'rancho-delivery-api'
  });
});

// Rota raiz
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Rancho API',
    version: '0.1.1',
    docs: '/api/docs',
    endpoints: {
      produtos: '/api/produtos',
      bairros: '/api/bairros',
      health: '/health'
    }
  });
});

// Rotas da API
app.use('/api', apiRoutes);

// Rotas de webhook (sem autenticação)
app.use('/webhook', webhookRoutes);

// Middleware de rota não encontrada
app.use(notFoundHandler);

// Middleware de tratamento de erros
app.use(errorHandler);

// Iniciar servidor
app.listen(Number(PORT), HOST, () => {
  logger.info(`🚀 Servidor rodando em ${HOST}:${PORT}`);
  logger.info(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📡 API disponível em http://${HOST}:${PORT}/api`);
});

export default app;
