-- P1 Etapa 1: adiciona status PRONTO ao enum de status do pedido
ALTER TYPE "StatusPedido" ADD VALUE IF NOT EXISTS 'PRONTO';
