// TODAS as chamadas HTTP do site ficam aqui.
// VITE_API_URL é gravado no build (compose.yaml); quem chama a API é o navegador.
const URL_API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Função base: lança erro com a mensagem da API se a resposta não for ok; 204 => null
export async function pedir(caminho, { metodo = 'GET', corpo } = {}) {
  let resposta;
  try {
    resposta = await fetch(URL_API + caminho, {
      method: metodo,
      headers: corpo !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error('Não foi possível falar com a API. Ela está rodando em ' + URL_API + '?');
  }

  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const erro = await resposta.json();
      mensagem = Array.isArray(erro.message) ? erro.message.join(' · ') : erro.message || mensagem;
    } catch {
      /* resposta sem JSON: fica a mensagem padrão */
    }
    throw new Error(mensagem);
  }
  if (resposta.status === 204) return null;
  return resposta.json();
}

// Link público que é enviado aos clientes
export function linkPublico(id) {
  return `${window.location.origin}/f/${id}`;
}

// ---------- Produtos ----------
export const listarProdutos = () => pedir('/api/produtos');
export const buscarProduto = (id) => pedir(`/api/produtos/${id}`);
export const criarProduto = (dados) => pedir('/api/produtos', { metodo: 'POST', corpo: dados });
export const alterarProduto = (id, dados) => pedir(`/api/produtos/${id}`, { metodo: 'PUT', corpo: dados });
export const excluirProduto = (id) => pedir(`/api/produtos/${id}`, { metodo: 'DELETE' });

// ---------- Pesquisas ----------
export const listarFormularios = () => pedir('/api/formularios');
export const buscarFormulario = (id) => pedir(`/api/formularios/${id}`);
export const criarFormulario = (dados) => pedir('/api/formularios', { metodo: 'POST', corpo: dados });
export const alterarFormulario = (id, dados) => pedir(`/api/formularios/${id}`, { metodo: 'PUT', corpo: dados });
export const excluirFormulario = (id) => pedir(`/api/formularios/${id}`, { metodo: 'DELETE' });
export const duplicarFormulario = (id) => pedir(`/api/formularios/${id}/duplicar`, { metodo: 'POST' });
export const registrarVisualizacao = (id) => pedir(`/api/formularios/${id}/visualizacoes`, { metodo: 'POST' });

// ---------- Respostas ----------
export const listarRespostas = (id) => pedir(`/api/formularios/${id}/respostas`);
export const enviarResposta = (id, dados, duracaoSegundos, sessao) =>
  pedir(`/api/formularios/${id}/respostas`, { metodo: 'POST', corpo: { dados, duracaoSegundos, sessao } });

// ---------- Funil e segmentos (dashboard) ----------
// perguntas = ids das perguntas que a pessoa já respondeu nesta visita
export const registrarProgresso = (id, sessao, perguntas) =>
  pedir(`/api/formularios/${id}/progresso`, { metodo: 'POST', corpo: { sessao, perguntas } });
export const listarSessoes = (id) => pedir(`/api/formularios/${id}/sessoes`);
export const salvarSegmentos = (id, segmentos) => pedir(`/api/formularios/${id}/segmentos`, { metodo: 'PUT', corpo: { segmentos } });
export const excluirResposta = (id) => pedir(`/api/respostas/${id}`, { metodo: 'DELETE' });

// Ação em várias pesquisas de uma vez: acao = mover | etiquetar | desetiquetar | arquivar | desarquivar |
// favoritar | desfavoritar | encerrar | reabrir | excluir. extra = { pastaId } ou { etiqueta }
export const acaoEmLote = (ids, acao, extra = {}) =>
  pedir('/api/formularios/lote', { metodo: 'POST', corpo: { ids, acao, ...extra } });

// ---------- Pastas ----------
export const listarPastas = () => pedir('/api/pastas');
export const criarPasta = (nome, cor) => pedir('/api/pastas', { metodo: 'POST', corpo: { nome, cor } });
export const alterarPasta = (id, nome, cor) => pedir(`/api/pastas/${id}`, { metodo: 'PUT', corpo: { nome, cor } });
export const excluirPasta = (id) => pedir(`/api/pastas/${id}`, { metodo: 'DELETE' });

// ---------- Temas salvos ("Meus temas") ----------
export const listarTemas = () => pedir('/api/temas');
export const criarTema = (nome, tema) => pedir('/api/temas', { metodo: 'POST', corpo: { nome, tema } });
export const excluirTema = (id) => pedir(`/api/temas/${id}`, { metodo: 'DELETE' });

// Baixa o Excel gerado pela API (não é JSON, por isso não usa pedir())
export async function baixarExcel(id, titulo) {
  let resposta;
  try {
    resposta = await fetch(`${URL_API}/api/formularios/${id}/exportar`);
  } catch {
    throw new Error('Não foi possível falar com a API.');
  }
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao gerar o Excel`);
  const arquivo = await resposta.blob();
  const nome = (titulo || `pesquisa-${id}`).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(arquivo);
  link.download = `${nome.toLowerCase()}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}
