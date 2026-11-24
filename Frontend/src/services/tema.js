// Identidade visual: fontes do Google Fonts, temas prontos, paletas e variáveis CSS do tema

export const FONTES = [
  { nome: 'Inter', grupo: 'Sem serifa' },
  { nome: 'Poppins', grupo: 'Sem serifa' },
  { nome: 'Roboto', grupo: 'Sem serifa' },
  { nome: 'Montserrat', grupo: 'Sem serifa' },
  { nome: 'Nunito', grupo: 'Sem serifa' },
  { nome: 'DM Sans', grupo: 'Sem serifa' },
  { nome: 'Outfit', grupo: 'Sem serifa' },
  { nome: 'Space Grotesk', grupo: 'Sem serifa' },
  { nome: 'Lora', grupo: 'Com serifa' },
  { nome: 'Merriweather', grupo: 'Com serifa' },
  { nome: 'Playfair Display', grupo: 'Com serifa' },
  { nome: 'Caveat', grupo: 'Manuscrita' },
];

// Temas completos: mudam cores, fontes, fundo e estilo dos campos de uma vez só.
// Logo, capa, textos e links da pesquisa são mantidos.
export const TEMAS_PRONTOS = [
  {
    nome: 'Padrão',
    tema: { corPrimaria: '#6d28d9', corFundo: '#f5f3ff', corTexto: '#1f2937', corCampo: '#ffffff', fonte: 'Inter', fonteTitulo: '', cantos: 12, fundoTipo: 'cor', estiloCampo: 'caixa', estiloBotao: 'cheio' },
  },
  {
    nome: 'Minimalista',
    tema: { corPrimaria: '#111827', corFundo: '#ffffff', corTexto: '#111827', corCampo: '#ffffff', fonte: 'DM Sans', fonteTitulo: '', cantos: 4, fundoTipo: 'cor', estiloCampo: 'linha', estiloBotao: 'cheio' },
  },
  {
    nome: 'Noite',
    tema: { corPrimaria: '#a78bfa', corFundo: '#0f172a', corFundo2: '#312e81', corTexto: '#f8fafc', corCampo: '#1e293b', fonte: 'Outfit', fonteTitulo: '', cantos: 14, fundoTipo: 'gradiente', estiloCampo: 'caixa', estiloBotao: 'cheio' },
  },
  {
    nome: 'Oceano',
    tema: { corPrimaria: '#0369a1', corFundo: '#e0f2fe', corFundo2: '#f0fdfa', corTexto: '#0c4a6e', corCampo: '#ffffff', fonte: 'Poppins', fonteTitulo: '', cantos: 16, fundoTipo: 'gradiente', estiloCampo: 'caixa', estiloBotao: 'cheio' },
  },
  {
    nome: 'Pastel',
    tema: { corPrimaria: '#db2777', corFundo: '#fdf2f8', corFundo2: '#ede9fe', corTexto: '#500724', corCampo: '#ffffff', fonte: 'Nunito', fonteTitulo: '', cantos: 24, fundoTipo: 'gradiente', estiloCampo: 'caixa', estiloBotao: 'cheio' },
  },
  {
    nome: 'Editorial',
    tema: { corPrimaria: '#b45309', corFundo: '#faf7f2', corTexto: '#292524', corCampo: '#faf7f2', fonte: 'Lora', fonteTitulo: 'Playfair Display', cantos: 2, fundoTipo: 'cor', estiloCampo: 'linha', estiloBotao: 'contorno' },
  },
  {
    nome: 'Neon',
    tema: { corPrimaria: '#22d3ee', corFundo: '#09090b', corTexto: '#fafafa', corCampo: '#18181b', fonte: 'Space Grotesk', fonteTitulo: '', cantos: 8, fundoTipo: 'cor', estiloCampo: 'caixa', estiloBotao: 'contorno' },
  },
  {
    nome: 'Natureza',
    tema: { corPrimaria: '#15803d', corFundo: '#f7fee7', corFundo2: '#dcfce7', corTexto: '#1a2e05', corCampo: '#ffffff', fonte: 'Merriweather', fonteTitulo: '', cantos: 10, fundoTipo: 'gradiente', estiloCampo: 'caixa', estiloBotao: 'cheio' },
  },
];

// Só as cores (para quem quer trocar a paleta sem mudar fonte e estilo)
export const PALETAS = [
  { nome: 'Violeta', corPrimaria: '#6d28d9', corFundo: '#f5f3ff', corTexto: '#1f2937' },
  { nome: 'Oceano', corPrimaria: '#0369a1', corFundo: '#f0f9ff', corTexto: '#0c4a6e' },
  { nome: 'Menta', corPrimaria: '#0f766e', corFundo: '#f0fdfa', corTexto: '#134e4a' },
  { nome: 'Pôr do sol', corPrimaria: '#ea580c', corFundo: '#fff7ed', corTexto: '#431407' },
  { nome: 'Rosa', corPrimaria: '#db2777', corFundo: '#fdf2f8', corTexto: '#500724' },
  { nome: 'Noite', corPrimaria: '#a78bfa', corFundo: '#111827', corTexto: '#f9fafb' },
  { nome: 'Grafite', corPrimaria: '#111827', corFundo: '#ffffff', corTexto: '#111827' },
  { nome: 'Floresta', corPrimaria: '#15803d', corFundo: '#f7fee7', corTexto: '#1a2e05' },
];

const carregadas = new Set(['Inter']);

// Coloca o <link> do Google Fonts na página só quando a fonte é usada
export function carregarFonte(nome) {
  if (!nome || carregadas.has(nome)) return;
  carregadas.add(nome);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(nome).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// Clareia/escurece uma cor #rrggbb misturando com branco (fator > 0) ou preto (fator < 0)
export function misturar(hex, fator) {
  const n = parseInt(hex.slice(1), 16);
  const canais = [n >> 16, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(fator >= 0 ? c + (255 - c) * fator : c * (1 + fator)),
  );
  return '#' + canais.map((c) => c.toString(16).padStart(2, '0')).join('');
}

// true se a cor for escura (para decidir se o texto em cima dela é branco ou preto)
export function corEscura(hex) {
  const n = parseInt((hex || '#ffffff').slice(1), 16);
  const luz = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luz < 150;
}

// Aceita só imagem enviada (data:image) ou endereço http(s), sem aspas/parênteses (protege o CSS)
export function imagemSegura(endereco) {
  if (!endereco) return '';
  return /^data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+$|^https?:\/\/[^\s"'()]+$/.test(endereco) ? endereco : '';
}

// Fundo da página: cor lisa, degradê ou imagem (com película escura opcional)
export function fundoDoTema(t) {
  const imagem = imagemSegura(t.fundoImagem);
  if (t.fundoTipo === 'imagem' && imagem) {
    const p = (t.fundoEscurecer ?? 0) / 100;
    return `linear-gradient(rgba(0,0,0,${p}), rgba(0,0,0,${p})), url("${imagem}") center / cover no-repeat, ${t.corFundo}`;
  }
  if (t.fundoTipo === 'gradiente') return `linear-gradient(135deg, ${t.corFundo}, ${t.corFundo2 || t.corFundo})`;
  return t.corFundo;
}

const LARGURAS = { estreita: '560px', normal: '720px', larga: '920px' };
const ESCALAS = { p: 0.92, m: 1, g: 1.1 };
const LOGOS = { p: '36px', m: '56px', g: '84px' };
const CAPAS = { baixa: '140px', media: '220px', alta: '320px' };

// Variáveis CSS usadas pelo formulário público e pela prévia do editor
export function variaveisDoTema(tema) {
  const t = tema ?? {};
  const primaria = t.corPrimaria || '#6d28d9';
  const fundo = t.corFundo || '#ffffff';
  const texto = t.corTexto || '#1f2937';
  const fundoEscuro = corEscura(fundo);
  const campo = t.corCampo || (fundoEscuro ? misturar(fundo, 0.08) : '#ffffff');
  const linha = t.estiloCampo === 'linha';
  const contorno = t.estiloBotao === 'contorno';
  const sobrePrimaria = corEscura(primaria) ? '#ffffff' : '#111827';
  // Se o campo tiver "claridade" diferente do fundo, o texto do campo precisa de outra cor
  const textoCampo = corEscura(campo) === corEscura(fundo) ? texto : corEscura(campo) ? '#f9fafb' : '#111827';

  return {
    '--f-primaria': primaria,
    '--f-sobre-primaria': sobrePrimaria,
    '--f-fundo': fundo,
    '--f-fundo-pagina': fundoDoTema({ ...t, corFundo: fundo }),
    '--f-cartao': fundoEscuro ? misturar(fundo, 0.06) : '#ffffff',
    '--f-texto': texto,
    '--f-suave': primaria + '1f',
    '--f-borda': fundoEscuro ? '#ffffff26' : '#0000001a',
    '--f-fonte': `'${t.fonte || 'Inter'}', system-ui, sans-serif`,
    '--f-fonte-titulo': `'${t.fonteTitulo || t.fonte || 'Inter'}', system-ui, sans-serif`,
    '--f-cantos': `${t.cantos ?? 12}px`,
    '--f-escala': ESCALAS[t.tamanhoFonte] ?? 1,
    '--f-largura': LARGURAS[t.largura] ?? LARGURAS.normal,
    '--f-alinhamento': t.alinhamento === 'centro' ? 'center' : 'left',
    '--f-logo-altura': LOGOS[t.logoTamanho] ?? LOGOS.m,
    '--f-capa-altura': CAPAS[t.capaAltura] ?? CAPAS.media,
    // Campos: "caixa" (borda inteira) ou "linha" (só a linha de baixo, fundo transparente)
    '--f-campo-fundo': linha ? 'transparent' : campo,
    '--f-campo-texto': linha ? texto : textoCampo,
    '--f-campo-bordas': linha ? '0 0 2px 0' : '1.5px',
    '--f-campo-raio': linha ? '0' : `${t.cantos ?? 12}px`,
    '--f-campo-recuo': linha ? '10px 2px' : '12px 14px',
    // Opções (botões de escolha, notas, rostinhos) usam sempre a cor dos campos
    '--f-opcao-fundo': campo,
    '--f-opcao-texto': textoCampo,
    // Botão: cheio (cor principal) ou contorno (só a borda)
    '--f-botao-fundo': contorno ? 'transparent' : primaria,
    '--f-botao-texto': contorno ? primaria : sobrePrimaria,
    '--f-botao-borda': primaria,
  };
}
