// Regras de ramificação e validação das respostas.
// É a MESMA lógica de frontend/src/services/regras.js: ao mudar uma, mude a outra.

export interface Condicao {
  perguntaId: string;
  operador: string;
  valor?: string | number;
}

export interface Pergunta {
  id: string;
  tipo: string;
  titulo: string;
  obrigatoria: boolean;
  opcoes?: string[];
  condicoes?: Condicao[];
  logica?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function estaRespondida(valor: unknown): boolean {
  if (valor === undefined || valor === null) return false;
  if (typeof valor === 'string') return valor.trim() !== '';
  if (Array.isArray(valor)) return valor.length > 0;
  return true;
}

// Opções possíveis de uma pergunta (usado na validação, nos gráficos e no Excel)
export function opcoesDaPergunta(p: Pergunta): string[] {
  if (p.tipo === 'simnao') return ['Sim', 'Não'];
  if (p.tipo === 'nps') return Array.from({ length: 11 }, (_, i) => String(i));
  if (p.tipo === 'csat') return ['1', '2', '3', '4', '5'];
  if (['unica', 'multipla', 'lista'].includes(p.tipo)) return p.opcoes ?? [];
  return [];
}

function igual(valor: unknown, esperado: unknown): boolean {
  if (Array.isArray(valor)) return valor.map(String).includes(String(esperado));
  return String(valor ?? '') === String(esperado ?? '');
}

export function testarCondicao(c: Condicao, respostas: Record<string, unknown>): boolean {
  const valor = respostas[c.perguntaId];
  const respondida = estaRespondida(valor);
  switch (c.operador) {
    case 'respondida':
      return respondida;
    case 'igual':
      return respondida && igual(valor, c.valor);
    case 'diferente':
      return respondida && !igual(valor, c.valor);
    case 'contem': {
      const texto = Array.isArray(valor) ? valor.join(' ') : String(valor ?? '');
      return respondida && texto.toLowerCase().includes(String(c.valor ?? '').toLowerCase());
    }
    case 'maior':
      return respondida && Number(valor) > Number(c.valor);
    case 'menor':
      return respondida && Number(valor) < Number(c.valor);
    default:
      return true;
  }
}

export function perguntaVisivel(p: Pergunta, respostas: Record<string, unknown>): boolean {
  const condicoes = p.condicoes ?? [];
  if (condicoes.length === 0) return true;
  const resultados = condicoes.map((c) => testarCondicao(c, respostas));
  return p.logica === 'qualquer' ? resultados.some(Boolean) : resultados.every(Boolean);
}

// Percorre as perguntas em ordem. Uma pergunta escondida não conta como respondida,
// então as que dependem dela também somem (ramificação em cascata).
export function aplicarRamificacao(perguntas: Pergunta[], respostas: Record<string, unknown>) {
  const visiveis: Pergunta[] = [];
  const limpas: Record<string, unknown> = {};
  for (const p of perguntas) {
    if (!perguntaVisivel(p, limpas)) continue;
    visiveis.push(p);
    if (estaRespondida(respostas[p.id])) limpas[p.id] = respostas[p.id];
  }
  return { visiveis, limpas };
}

// Devolve a mensagem de erro, ou '' se o valor estiver certo
export function validarValor(p: Pergunta, valor: unknown): string {
  if (!estaRespondida(valor)) return p.obrigatoria ? 'Esta pergunta é obrigatória' : '';
  const opcoes = opcoesDaPergunta(p);
  switch (p.tipo) {
    case 'email':
      return EMAIL.test(String(valor).trim()) ? '' : 'Digite um e-mail válido';
    case 'numero':
      return Number.isFinite(Number(valor)) ? '' : 'Digite um número';
    case 'data':
      return Number.isNaN(Date.parse(String(valor))) ? 'Data inválida' : '';
    case 'nps':
    case 'csat':
    case 'unica':
    case 'lista':
    case 'simnao':
      return opcoes.includes(String(valor)) ? '' : 'Opção inválida';
    case 'multipla':
      return Array.isArray(valor) && valor.every((v) => opcoes.includes(String(v))) ? '' : 'Opção inválida';
    default:
      return String(valor).length > 5000 ? 'Texto muito longo' : '';
  }
}
