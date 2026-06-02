import fs from 'fs';
import { SKILLS, Skill } from './skills/SKILLS_REGISTRY';
import { logger } from '../config/logger';

// Cache em memória do conteúdo dos .md para evitar leitura de disco em cada mensagem
const conteudoCache = new Map<string, string>();

function lerConteudoSkill(skill: Skill): string {
  if (conteudoCache.has(skill.id)) return conteudoCache.get(skill.id)!;

  try {
    const conteudo = fs.readFileSync(skill.arquivo, 'utf-8');
    conteudoCache.set(skill.id, conteudo);
    return conteudo;
  } catch {
    logger.warn(`classificador-skills: arquivo não encontrado para skill=${skill.id} path=${skill.arquivo}`);
    return '';
  }
}

export function classificarSkills(texto: string): Skill[] {
  const ativas: Skill[] = [];

  for (const skill of SKILLS) {
    // regras-whatsapp é sempre injetada
    if (skill.id === 'regras-whatsapp') {
      ativas.push(skill);
      continue;
    }

    if (skill.triggers.some((t) => t.test(texto))) {
      ativas.push(skill);
    }
  }

  return ativas;
}

export function carregarConteudoSkills(skills: Skill[]): string {
  if (skills.length === 0) return '';

  const blocos = skills
    .map((s) => lerConteudoSkill(s))
    .filter(Boolean);

  if (blocos.length === 0) return '';

  return `\n\n---\n## Instruções adicionais para esta mensagem\n\n${blocos.join('\n\n---\n\n')}`;
}

export function invalidarCacheSkills(): void {
  conteudoCache.clear();
}
