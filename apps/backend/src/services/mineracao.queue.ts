type JobStatus = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'FALHA';

export interface JobProgresso {
  processados: number;
  total: number;
  fase: 'LOOKUP' | 'SCRAPING' | 'ASSERTIVA' | 'SALVANDO';
  percentual: number;
}

export interface Job {
  runId: string;
  status: JobStatus;
  progresso: JobProgresso | null;
  resultado?: unknown;
  erro?: string;
  criadoEm: Date;
}

const jobs = new Map<string, Job>();

export function enfileirar(runId: string, fn: () => Promise<unknown>): void {
  jobs.set(runId, { runId, status: 'PENDENTE', progresso: null, criadoEm: new Date() });
  setImmediate(async () => {
    const job = jobs.get(runId);
    if (job) job.status = 'PROCESSANDO';
    try {
      const resultado = await fn();
      const atual = jobs.get(runId)!;
      jobs.set(runId, { ...atual, status: 'CONCLUIDO', resultado });
    } catch (err: any) {
      const atual = jobs.get(runId)!;
      jobs.set(runId, { ...atual, status: 'FALHA', erro: err?.message || 'erro' });
    }
  });
}

export function obterJob(runId: string): Job | undefined {
  return jobs.get(runId);
}

export function atualizarProgresso(runId: string, progresso: JobProgresso): void {
  const job = jobs.get(runId);
  if (job) job.progresso = progresso;
}
