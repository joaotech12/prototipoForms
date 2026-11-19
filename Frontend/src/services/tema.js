// Identidade visual: fontes do Google Fonts, paletas prontas e variáveis CSS do tema

export const FONTES = [
  'Inter',
  'Poppins',
  'Roboto',
  'Montserrat',
  'Nunito',
  'Space Grotesk',
  'Lora',
  'Playfair Display',
];

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
  const n = parseInt(hex.slice(1), 16);
  const luz = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luz < 150;
}

// Variáveis CSS usadas pelo formulário público e pela prévia do editor
export function variaveisDoTema(tema) {
  const t = tema ?? {};
  const primaria = t.corPrimaria || '#6d28d9';
  const fundo = t.corFundo || '#ffffff';
  const fundoEscuro = corEscura(fundo);
  return {
    '--f-primaria': primaria,
    '--f-sobre-primaria': corEscura(primaria) ? '#ffffff' : '#111827',
    '--f-fundo': fundo,
    '--f-cartao': fundoEscuro ? misturar(fundo, 0.08) : '#ffffff',
    '--f-texto': t.corTexto || '#1f2937',
    '--f-suave': primaria + '1f',
    '--f-borda': fundoEscuro ? '#ffffff26' : '#0000001a',
    '--f-fonte': `'${t.fonte || 'Inter'}', system-ui, sans-serif`,
    '--f-cantos': `${t.cantos ?? 12}px`,
  };
}
