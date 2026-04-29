import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './config/logger';

// Carregar variáveis de ambiente
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota de health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'sabor-express-api'
  });
});

// Rota raiz
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Sabor Express API',
    version: '0.1.0',
    docs: '/api/docs'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
