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
export const enviarResposta = (id, dados, duracaoSegundos) =>
  pedir(`/api/formularios/${id}/respostas`, { metodo: 'POST', corpo: { dados, duracaoSegundos } });
export const excluirResposta = (id) => pedir(`/api/respostas/${id}`, { metodo: 'DELETE' });

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
