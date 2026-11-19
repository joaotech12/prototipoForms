// Catálogo dos tipos de pergunta (a mesma lista existe na API, em formulario.dto.ts)
export const TIPOS_PERGUNTA = [
  { valor: 'texto', rotulo: 'Texto curto', icone: 'Aa', grupo: 'Texto' },
  { valor: 'paragrafo', rotulo: 'Parágrafo', icone: '¶', grupo: 'Texto' },
  { valor: 'email', rotulo: 'E-mail', icone: '@', grupo: 'Texto' },
  { valor: 'numero', rotulo: 'Número', icone: '#', grupo: 'Texto' },
  { valor: 'data', rotulo: 'Data', icone: '📅', grupo: 'Texto' },
  { valor: 'unica', rotulo: 'Escolha única', icone: '◉', grupo: 'Escolha', temOpcoes: true },
  { valor: 'multipla', rotulo: 'Múltipla escolha', icone: '☑', grupo: 'Escolha', temOpcoes: true },
  { valor: 'lista', rotulo: 'Lista suspensa', icone: '▾', grupo: 'Escolha', temOpcoes: true },
  { valor: 'simnao', rotulo: 'Sim ou não', icone: '⇄', grupo: 'Escolha' },
  { valor: 'nps', rotulo: 'NPS (0 a 10)', icone: '⓾', grupo: 'Métricas' },
  { valor: 'csat', rotulo: 'Satisfação (1 a 5)', icone: '★', grupo: 'Métricas' },
];

export function infoDoTipo(tipo) {
  return TIPOS_PERGUNTA.find((t) => t.valor === tipo) ?? TIPOS_PERGUNTA[0];
}

export const temOpcoesEditaveis = (tipo) => Boolean(infoDoTipo(tipo).temOpcoes);

// Tipos que podem ser usados para cruzar dados ou separar abas do Excel
export const TIPOS_DE_GRUPO = ['unica', 'lista', 'simnao', 'multipla'];
export const TIPOS_DE_METRICA = ['nps', 'csat', 'numero'];

// id curto e único, ex.: "p_k3j9x2"
export function gerarId() {
  return 'p_' + Math.random().toString(36).slice(2, 8);
}

const TITULOS_PADRAO = {
  nps: 'De 0 a 10, quanto você nos recomendaria a um amigo?',
  csat: 'Qual é o seu nível de satisfação?',
  simnao: 'Você voltaria a comprar conosco?',
  email: 'Qual é o seu e-mail?',
};

export function novaPergunta(tipo = 'texto') {
  return {
    id: gerarId(),
    tipo,
    titulo: TITULOS_PADRAO[tipo] ?? '',
    descricao: '',
    obrigatoria: false,
    opcoes: temOpcoesEditaveis(tipo) ? ['Opção 1', 'Opção 2'] : [],
    condicoes: [],
    logica: 'todas',
  };
}

export const TEMA_PADRAO = {
  logo: '',
  corPrimaria: '#6d28d9',
  corFundo: '#f5f3ff',
  corTexto: '#1f2937',
  fonte: 'Inter',
  cantos: 12,
};

export function novoFormulario() {
  return {
    titulo: 'Pesquisa sem título',
    descricao: '',
    perguntas: [novaPergunta('texto')],
    tema: { ...TEMA_PADRAO },
    modo: 'conversacional',
    perguntaRamificacao: null,
    mensagemFinal: 'Obrigado! Sua resposta foi registrada.',
    ativo: true,
  };
}

// Só os campos que a API aceita (o DTO), sem id, datas e totais
export function dadosParaEnvio(f) {
  return {
    titulo: f.titulo,
    descricao: f.descricao ?? '',
    perguntas: f.perguntas,
    tema: f.tema,
    modo: f.modo,
    perguntaRamificacao: f.perguntaRamificacao || null,
    mensagemFinal: f.mensagemFinal ?? '',
    ativo: f.ativo ?? true,
  };
}
